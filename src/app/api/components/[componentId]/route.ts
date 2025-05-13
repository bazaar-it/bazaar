// src/app/api/components/[componentId]/route.ts
import { NextResponse } from 'next/server';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import logger from '~/lib/logger';

// Helper functions for component code processing

/**
 * Preprocess the component code to fix common issues before evaluation.
 * This handles import statements, export patterns, and other syntax issues.
 */
function preprocessComponentCode(code: string, componentId: string): string {
  // Track all fixes applied for logging
  const fixes: string[] = [];
  let processedCode = code;
  
  // Fix React imports that might be causing issues
  if (processedCode.match(/import\s+([a-z])\s+from\s*["']react["']/)) {
    processedCode = processedCode.replace(/import\s+([a-z])\s+from\s*["']react["']/g, 'import React from "react"');
    fixes.push('Fixed single-letter React import');
  }
  
  // Fix namespace imports
  if (processedCode.match(/import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s*["']react["']/)) {
    processedCode = processedCode.replace(
      /import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s*["']react["']/g, 
      'import React from "react"'
    );
    fixes.push('Fixed namespace React import');
  }
  
  // Fix naked destructuring imports (import { useState } from 'react')
  if (processedCode.match(/import\s*\{[^}]*\}\s*from\s*["']react["']/)) {
    processedCode = processedCode.replace(
      /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react["']/g,
      'import React, {$1} from "react"'
    );
    fixes.push('Fixed naked destructuring imports');
  }
  
  // Fix invalid ES module syntax
  processedCode = processedCode.replace(
    /import\s+React\s+from\s*["']react["']\s*;?\s*import\s+\{/g, 
    'import React, {'
  );
  
  // Ensure Remotion is imported properly
  if (!processedCode.includes('from "remotion"') && !processedCode.includes('from \'remotion\'')) {
    processedCode = `import { useCurrentFrame, useVideoConfig } from 'remotion';\n${processedCode}`;
    fixes.push('Added missing Remotion imports');
  }
  
  // Fix createElement variable mismatches (a.createElement -> React.createElement)
  // This is specific to the issue we found in the component
  if (processedCode.includes('.createElement') && processedCode.includes('import React')) {
    // Find all potential React aliases used with createElement
    const creatorMatches = [...processedCode.matchAll(/([a-zA-Z0-9_$]+)\.createElement/g)];
    const creatorVariables = new Set<string>();
    
    creatorMatches.forEach(match => {
      // Safely extract the matched group and ensure it's a string
      const varName = match[1] || '';
      // Only add non-empty strings that aren't 'React'
      if (varName && varName !== 'React') {
        creatorVariables.add(varName);
      }
    });
    
    // Replace all non-React createElement calls
    creatorVariables.forEach(varName => {
      // Ensure varName is defined before using it in RegExp
      if (varName) {
        const pattern = new RegExp(`${varName}\.createElement`, 'g');
        processedCode = processedCode.replace(pattern, 'React.createElement');
      }
    });
    
    if (creatorVariables.size > 0) {
      fixes.push(`Fixed createElement calls (${Array.from(creatorVariables).join(', ')} → React)`);
    }
  }
  
  // Strip any import assertions which might cause issues
  processedCode = processedCode.replace(/import\s+.*\s+assert\s+\{[^}]*\};?/g, '// Removed import assertion');
  fixes.push('Removed any import assertions');
  
  // Add a logging line at start of the file
  if (fixes.length > 0) {
    processedCode = `// Component ${componentId} - Preprocessed with ${fixes.length} fixes: ${fixes.join(', ')}\n${processedCode}`;
  }
  
  return processedCode;
}

/**
 * Analyze the component code to extract information about exports and component variables.
 */
function analyzeComponentCode(code: string, componentId: string): { mainComponent: string | null } {
  // Default result
  const result = { mainComponent: null as string | null };

  try {
    // Check for different export patterns
    // 1. Named exports with "as" keyword: export { ComponentA as RenamedComponent }
    const namedExportAsMatch = code.match(
      /export\s*\{\s*([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)\s*\}/
    );
    if (namedExportAsMatch && namedExportAsMatch[1]) {
      result.mainComponent = namedExportAsMatch[1]; // Original component name, not the renamed one
      return result;
    }

    // 2. Simple named exports: export { ComponentName }
    const namedExportMatch = code.match(/export\s*\{\s*([A-Za-z0-9_$]+)\s*\}/);
    if (namedExportMatch && namedExportMatch[1]) {
      result.mainComponent = namedExportMatch[1];
      return result;
    }

    // 3. Default exports: export default ComponentName
    const defaultExportMatch = code.match(/export\s+default\s+([A-Za-z0-9_$]+)/);
    if (defaultExportMatch && defaultExportMatch[1]) {
      result.mainComponent = defaultExportMatch[1];
      return result;
    }

    // 4. Look for React component declarations (function or const patterns)
    // First try to find component names that include "Scene" which is common in our components
    const sceneComponentMatch = code.match(
      /(?:var|const|let|function)\s+([A-Z][A-Za-z0-9_$]*Scene[A-Za-z0-9_$]*)/
    );
    if (sceneComponentMatch && sceneComponentMatch[1]) {
      result.mainComponent = sceneComponentMatch[1];
      return result;
    }

    // 5. Look for any capitalized variable which might be a React component
    const capitalizedVarMatch = code.match(
      /(?:var|const|let|function)\s+([A-Z][A-Za-z0-9_$]*)/
    );
    if (capitalizedVarMatch && capitalizedVarMatch[1]) {
      result.mainComponent = capitalizedVarMatch[1];
      return result;
    }
    
    // 6. Look for JSX component functions (const Component = () => {})
    const arrowFunctionMatch = code.match(
      /(?:var|const|let)\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*(\(|\w+)\s*=>/
    );
    if (arrowFunctionMatch && arrowFunctionMatch[1]) {
      result.mainComponent = arrowFunctionMatch[1];
      return result;
    }
    
    // 7. Look for any module.exports pattern (common in older JS)
    const moduleExportsMatch = code.match(
      /module\.exports\s*=\s*([A-Za-z0-9_$]+)/
    );
    if (moduleExportsMatch && moduleExportsMatch[1]) {
      result.mainComponent = moduleExportsMatch[1];
      return result;
    }
  } catch (error) {
    // If analysis fails, log it but return empty result
    logger.error(`[API:COMPONENT:ERROR][ID:${componentId}] Component analysis failed`, { error });
  }

  return result;
}

// Create a specialized logger for component API requests
const apiRouteLogger = {
  request: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[API:COMPONENT:REQUEST][ID:${componentId}] ${message}`, meta);
  },
  redirect: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[API:COMPONENT:REDIRECT][ID:${componentId}] ${message}`, meta);
  },
  error: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[API:COMPONENT:ERROR][ID:${componentId}] ${message}`, meta);
  },
  debug: (componentId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[API:COMPONENT:DEBUG][ID:${componentId}] ${message}`, meta);
  }
};

export async function GET(
  request: Request,
  { params }: { params: { componentId: string } }
) {
  // In Next.js App Router, params need to be handled carefully
  // It's safer to destructure inside the function body
  const componentId = params.componentId;
  
  apiRouteLogger.request(componentId, "Component request received", {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });
  
  try {
    // Get the component job from the database
    const job = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentId),
      columns: {
        status: true,
        outputUrl: true,
        errorMessage: true,
        effect: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    // Handle not found case
    if (!job) {
      apiRouteLogger.error(componentId, "Component job not found");
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }
    
    // Check if the component is ready
    if (job.status !== "complete" || !job.outputUrl) {
      if (job.status === "error") {
        apiRouteLogger.error(componentId, "Component job failed", { 
          error: job.errorMessage || "Unknown error" 
        });
        return NextResponse.json({ 
          error: "Component build failed", 
          message: job.errorMessage || "Unknown error" 
        }, { status: 500 });
      }
      
      apiRouteLogger.debug(componentId, "Component job not ready", { status: job.status });
      return NextResponse.json({ 
        status: job.status,
        message: "Component is still being processed"
      }, { status: 202 });
    }
    
    // Fetch the JS content from the bundle URL
    const r2Response = await fetch(job.outputUrl);
    if (!r2Response.ok) {
      apiRouteLogger.error(componentId, "Failed to fetch component bundle", { 
        status: r2Response.status,
        url: job.outputUrl 
      });
      return NextResponse.json({ error: "Failed to fetch component bundle" }, { status: 502 });
    }

    // Get the JS content
    let jsContent = await r2Response.text();
    
    // --- Log raw content BEFORE any processing for debugging syntax errors ---
    apiRouteLogger.debug(componentId, `Raw component content fetched:\n---\n${jsContent}\n---`);
    
    // --- Critical Client-Side Fixes ---
    
    // 1. Remove "use client"; directive if present - it causes syntax errors in direct browser script execution
    jsContent = jsContent.replace(/^\s*["']use client["'];?\s*/m, '// "use client" directive removed for browser compatibility\n');
    
    // 2. Check for Remotion registration
    const hasRemotionRegistration = jsContent.includes('window.__REMOTION_COMPONENT') || jsContent.includes('global.__REMOTION_COMPONENT');
    
    // 3. IMPROVED: Always add an explicit component registration at the end
    // First analyze the code to find the main component name
    const analysis = analyzeComponentCode(jsContent, componentId);
    const mainComponentName = analysis.mainComponent;
    
    // 4. Process the code for common issues
    jsContent = preprocessComponentCode(jsContent, componentId);
    
    // 5. Add component registration code if needed
    if (!hasRemotionRegistration && mainComponentName) {
      // Add registration code to the end of the file
      const registrationCode = `
// Auto-registered component for Remotion
if (typeof window !== 'undefined') {
  console.log('[Component ${componentId}] Auto-registering component ${mainComponentName} to window.__REMOTION_COMPONENT');
  window.__REMOTION_COMPONENT = ${mainComponentName};
} else if (typeof global !== 'undefined') {
  console.log('[Component ${componentId}] Auto-registering component ${mainComponentName} to global.__REMOTION_COMPONENT');
  global.__REMOTION_COMPONENT = ${mainComponentName};
}
`;
      jsContent += registrationCode;
      apiRouteLogger.debug(componentId, `Added auto-registration for component: ${mainComponentName}`);
    }
    
    // If we don't have explicit registration or a detected component name,
    // add a fallback mechanism that tries to find any React component in the global scope
    if (!hasRemotionRegistration && !mainComponentName) {
      // Add a fallback global component detection mechanism
      const fallbackCode = `
// Fallback component detection for Remotion
(function detectAndRegisterComponent() {
  if (typeof window === 'undefined') return;
  
  console.log('[Component ${componentId}] Running fallback component detection');
  
  // Component already registered - nothing to do
  if (window.__REMOTION_COMPONENT) {
    console.log('[Component ${componentId}] Component already registered, skipping fallback detection');
    return;
  }
  
  // Look for likely component functions in the global scope
  const componentCandidates = Object.keys(window).filter(key => {
    // Skip known non-component globals
    if (['React', 'Remotion', 'document', 'window', 'location'].includes(key)) return false;
    
    // Component names typically start with capital letter
    if (!/^[A-Z]/.test(key)) return false;
    
    // Must be a function
    return typeof window[key] === 'function';
  });
  
  console.log('[Component ${componentId}] Found ' + componentCandidates.length + ' potential component candidates');
  
  if (componentCandidates.length > 0) {
    // First try to find a component with Scene or Component in the name
    const bestCandidate = componentCandidates.find(c => 
      c.includes('Scene') || c.includes('Component')
    ) || componentCandidates[0];
    
    console.log('[Component ${componentId}] Auto-registering component ' + bestCandidate + ' to window.__REMOTION_COMPONENT');
    window.__REMOTION_COMPONENT = window[bestCandidate];
  } else {
    console.warn('[Component ${componentId}] No component candidates found in global scope');
    // Create a simple fallback component in case no component is found
    window.__REMOTION_COMPONENT = (props) => {
      const React = window.React;
      const { AbsoluteFill } = window.Remotion || {};
      
      return React.createElement(
        AbsoluteFill || 'div',
        { style: { background: '#f44336', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' } },
        React.createElement('div', { style: { textAlign: 'center' } }, [
          React.createElement('h2', { key: 'title' }, 'Component Error'),
          React.createElement('p', { key: 'message' }, 'Failed to find a valid component. Check browser console for details.'),
          React.createElement('pre', { key: 'id', style: { fontSize: '12px' } }, '${componentId}')
        ])
      );
    };
  }
})();
`;
      jsContent += fallbackCode;
      apiRouteLogger.debug(componentId, "Added fallback component detection mechanism");
    }
    
    // 6. Return the enhanced component code with proper content type
    const headers = {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    };
    
    return new NextResponse(jsContent, { status: 200, headers });
    
  } catch (error) {
    // Handle any unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    apiRouteLogger.error(componentId, `Unexpected error processing component request: ${errorMessage}`, { error });
    
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
} 