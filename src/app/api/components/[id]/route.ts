//src/app/api/components/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

/**
 * Prepares component code to be loaded via script tag
 * 
 * Instead of trying to transform ES modules with regex (which is error-prone),
 * we'll use a simple wrapper pattern where we completely isolate the component code
 * and then manually extract the component from any export patterns.
 */
function prepareComponentCode(code: string): string {
  // First, look for patterns that will help us identify the component after execution
  const defaultExportMatch = code.match(/export\s+default\s+(\w+)/i);
  const namedExportMatch = code.match(/export\s+(const|function|var|let)\s+(\w+)/i);
  
  // Get component name if available (for better error messages)
  let probableComponentName = 'Component';
  if (defaultExportMatch && defaultExportMatch[1]) {
    probableComponentName = defaultExportMatch[1];
  } else if (namedExportMatch && namedExportMatch[2]) {
    probableComponentName = namedExportMatch[2];
  }

  // ---------------------------------------------------------------
  //  NEW: Make the raw component code browser-runnable by stripping
  //  ESM import/export statements and replacing them with globals.
  // ---------------------------------------------------------------
  let transformed = code;

  // 1. Replace default React import alias (e.g. `import r from "react";`)
  transformed = transformed.replace(/import\s+(\w+)\s+from\s*["']react["'];?/gm, 'const $1 = React;');

  // 2. Replace named Remotion imports (also handles aliasing)
  transformed = transformed.replace(/import\s*\{([^}]+)\}\s*from\s*["']remotion["'];?/gm, (_match, group) => {
    // Convert `spring as g` to `spring: g`
    const mapped = group
      .split(',')
      .map((seg: string) => seg.trim())
      .filter(Boolean)
      .map((seg: string) => {
        const [orig, alias] = seg.split(/\s+as\s+/);
        if (alias && orig) {
          return `${orig.trim()}: ${alias.trim()}`;
        }
        return seg.trim();
      })
      .join(', ');
    return `const { ${mapped} } = Remotion;`;
  });

  // 3. Remove any remaining `import ...` lines (e.g. user utilities)
  transformed = transformed.replace(/^\s*import[^;]*;?\n?/gm, '');

  // 4. Handle `export default <expr>`   -> assign to module.exports.default
  transformed = transformed.replace(/export\s+default\s+(\w+)/gm, '$1; module.exports.default = $1');

  // 5a. Handle `export { variable as default };` pattern
  transformed = transformed.replace(/export\s*\{\s*([\w$]+)\s+as\s+default\s*\};?/gm, 'module.exports.default = $1');

  // 5b. Remove any remaining bare export braces statements
  transformed = transformed.replace(/export\s*\{[^}]+\};?/gm, '');

  // 6. Handle `export { variable };` pattern
  transformed = transformed.replace(/export\s*\{\s*([\w$]+)\s*\};?/gm, 'module.exports.$1 = $1');

  // 7. As a final safety net, strip ANY remaining standalone export statements
  //    (e.g. malformed ones we didn't predict). This keeps everything
  //    functional even if the regexes above miss an edge-case.
  transformed = transformed.replace(/\bexport\b[^;]*;/g, '');

  // 8. Strip trailing whitespace introduced by removals
  transformed = transformed.trim();

  // ------------------------------------------------------------------
  //  Build the wrapper string using JSON.stringify for safe embedding
  // ------------------------------------------------------------------
  const transformedLiteral = JSON.stringify(transformed);

  return `/* Dynamically loaded custom component */
  (function(window) {
    if (!window.React) window.React = window.react || {};
    if (!window.Remotion) window.Remotion = window.remotion || {};

    const React = window.React;
    const Remotion = window.Remotion;
    const { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence, Audio, Video, Img, Series, random } = Remotion;

    const module = { exports: {} };
    const exports = module.exports;

    try {
      // Evaluate the component code in an isolated scope
      const __code = ${transformedLiteral};
      const __fn = new Function('React', 'Remotion', 'module', 'exports', __code + '\n//# sourceURL=custom-component.js');
      __fn(React, Remotion, module, exports);

      // Attempt to detect the exported component
      let detectedComponent = exports.default || null;

      if (!detectedComponent) {
        const probableName = '${probableComponentName}';
        if (exports[probableName]) {
          detectedComponent = exports[probableName];
          console.log('Found component by probable name:', probableName);
        } else {
          for (const key in exports) {
            if (typeof exports[key] === 'function') {
              detectedComponent = exports[key];
              console.log('Found component in named exports:', key);
              break;
            }
          }
        }
      }

      // Fallback for global C variable (common in AI-generated code)
      if (!detectedComponent && typeof window.C === 'function') {
        detectedComponent = window.C;
        console.log('Found component named C');
      }

      if (detectedComponent) {
        window.__REMOTION_COMPONENT = detectedComponent;
        console.log('Successfully registered custom component');
      } else {
        throw new Error('Could not find a component to register');
      }
    } catch (err) {
      console.error('Component execution error:', err);
      window.__REMOTION_COMPONENT = function ErrorComponent() {
        return React.createElement(
          'div',
          { style: { padding: '1rem', backgroundColor: '#222', color: 'red' } },
          'Error loading component: ' + (err && err.message ? err.message : 'Unknown error')
        );
      };
    }
  })(window);
  `;
}

/**
 * Proxy API for fetching custom component scripts from R2 storage
 * 
 * This route serves as a proxy between the client and R2 storage to avoid
 * CORS and SSL certificate issues when loading scripts directly in the browser.
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Next.js 13+ requires awaiting at least once before accessing params
  await Promise.resolve();

  const { id } = context.params;
  
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new NextResponse('Invalid component ID', { status: 400 });
  }

  try {
    // Create S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
      }
    });

    // Get component file from R2
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || '',
      Key: `custom-components/${id}.js`
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return new NextResponse('Component not found', { status: 404 });
    }
    
    // Convert Body to readable stream
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const buffer = Buffer.concat(chunks);
    const originalContent = buffer.toString('utf-8');
    
    // Prepare the component code to work with our app
    const transformedContent = prepareComponentCode(originalContent);

    console.log(`Prepared component ${id} for browser compatibility`);

    // Return the transformed JavaScript with proper headers
    return new NextResponse(transformedContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      }
    });
  } catch (error) {
    console.error('Error fetching component from R2:', error);
    return new NextResponse('Error fetching component', { status: 500 });
  }
}
