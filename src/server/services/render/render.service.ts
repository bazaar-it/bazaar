// src/server/services/render/render.service.ts
// This file prepares the render configuration but doesn't execute rendering
// Actual rendering happens via Lambda

export interface RenderConfig {
  projectId: string;
  scenes: any[];
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
}

// Quality presets that will be used by Lambda
export const qualitySettings = {
  low: { 
    crf: 28, 
    jpegQuality: 70,
    resolution: { width: 854, height: 480 },  // 480p
    videoBitrate: '1M',
  },
  medium: { 
    crf: 23, 
    jpegQuality: 80,
    resolution: { width: 1280, height: 720 },  // 720p
    videoBitrate: '2.5M',
  },
  high: { 
    crf: 18, 
    jpegQuality: 90,
    resolution: { width: 1920, height: 1080 }, // 1080p
    videoBitrate: '5M',
  },
};

// Pre-compile TypeScript to JavaScript for Lambda
async function preprocessSceneForLambda(scene: any) {
  console.log(`[Preprocess] Checking scene:`, {
    id: scene.id,
    name: scene.name,
    hasTsxCode: !!scene.tsxCode,
    hasData: !!scene.data,
    dataKeys: scene.data ? Object.keys(scene.data) : []
  });
  
  // Check both direct tsxCode and nested data.code
  const tsxCode = scene.tsxCode || (scene.data && scene.data.code);
  
  if (!tsxCode) {
    console.log(`[Preprocess] No code found for scene ${scene.id}`);
    return scene;
  }
  
  try {
    // Import sucrase for server-side compilation
    const { transform } = require('sucrase');
    
    // Transform TypeScript/JSX to JavaScript
    let { code: transformedCode } = transform(tsxCode, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'classic',
      production: true,
    });
    
    // Extract Remotion components being used (if any)
    const remotionComponents = [];
    const remotionMatch = transformedCode.match(/const\s*{\s*([^}]+)\s*}\s*=\s*window\.Remotion\s*;?/);
    if (remotionMatch) {
      remotionComponents.push(...remotionMatch[1].split(',').map((h: string) => h.trim()));
    }
    
    // Remove the window.Remotion destructuring line (we'll provide it differently)
    transformedCode = transformedCode.replace(
      /const\s*{\s*[^}]+\s*}\s*=\s*window\.Remotion\s*;?/g,
      ''
    );
    
    // Extract React hooks being used (if any)
    const reactHooks = [];
    const hookMatch = transformedCode.match(/const\s*{\s*([^}]+)\s*}\s*=\s*window\.React\s*;?/);
    if (hookMatch) {
      reactHooks.push(...hookMatch[1].split(',').map((h: string) => h.trim()));
      // Remove the window.React destructuring line
      transformedCode = transformedCode.replace(
        /const\s*{\s*[^}]+\s*}\s*=\s*window\.React\s*;?/g,
        ''
      );
    }
    
    // Add React hooks at the beginning if needed
    if (reactHooks.length > 0 || transformedCode.includes('useEffect')) {
      transformedCode = `\nconst { ${reactHooks.length > 0 ? reactHooks.join(', ') : 'useState, useEffect'} } = React;\n` + transformedCode;
    }
    
    // Add Remotion components at the beginning if needed
    if (remotionComponents.length > 0) {
      // Simply declare the components as available - MainCompositionSimple will provide them
      transformedCode = `// Remotion components will be provided by the runtime\n` + transformedCode;
    }
    
    // Replace export default with a direct assignment
    transformedCode = transformedCode.replace(
      /export\s+default\s+function\s+(\w+)/g,
      '\nconst Component = function $1'
    );
    
    // Ensure the component is returned at the end
    if (!transformedCode.includes('return Component;')) {
      transformedCode = transformedCode + '\n\nreturn Component;';
    }
    
    // Replace window.React with React
    transformedCode = transformedCode.replace(/window\.React/g, 'React');
    
    // Remove or replace window.RemotionGoogleFonts (not available in Lambda)
    transformedCode = transformedCode.replace(
      /window\.RemotionGoogleFonts\.loadFont[^;]+;/g,
      '// Font loading removed for Lambda'
    );
    
    // Replace window.IconifyIcon with actual SVG icons
    transformedCode = await replaceIconifyIcons(transformedCode);
    
    // Fix avatar URLs - replace local paths with R2 URLs
    transformedCode = transformedCode.replace(
      /\/avatars\/(asian-woman|black-man|hispanic-man|middle-eastern-man|white-woman)\.png/g,
      'https://pyyqiqdbiygijqaj.public.blob.vercel-storage.com/$1-avatar.png'
    );
    
    console.log(`[Preprocess] Scene ${scene.id} transformed for Lambda`);
    console.log(`[Preprocess] Original code starts with:`, tsxCode.substring(0, 100));
    console.log(`[Preprocess] Transformed code starts with:`, transformedCode.substring(0, 100));
    
    // Return scene with compiled JavaScript code
    return {
      ...scene,
      jsCode: transformedCode,
      compiledCode: transformedCode, // Lambda expects this field
      // Keep tsxCode for reference but Lambda will use jsCode
      tsxCode: tsxCode,
    };
  } catch (error) {
    console.error(`Failed to preprocess scene ${scene.id}:`, error);
    // Return scene as-is if compilation fails
    return scene;
  }
}

// Helper function to replace Iconify icons with actual SVGs
async function replaceIconifyIcons(code: string): Promise<string> {
  const { loadNodeIcon } = await import('@iconify/utils/lib/loader/node-loader');
  
  // Find all IconifyIcon references
  const iconRegex = /<window\.IconifyIcon\s+icon="([^"]+)"([^>]*?)\/>/g;
  const matches = [...code.matchAll(iconRegex)];
  
  console.log(`[Preprocess] Found ${matches.length} icons to replace`);
  
  // Process each icon
  for (const match of matches) {
    const [fullMatch, iconName, attrs = ''] = match;
    
    if (!iconName) {
      console.warn(`[Preprocess] Empty icon name found, using placeholder`);
      code = code.replace(fullMatch, '<span style={{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}} />');
      continue;
    }
    
    try {
      // Split icon name into collection and icon (e.g., "material-symbols:play-arrow" -> ["material-symbols", "play-arrow"])
      const [collection, icon] = iconName.split(':');
      
      if (!collection || !icon) {
        console.warn(`[Preprocess] Invalid icon name format "${iconName}", using placeholder`);
        code = code.replace(fullMatch, '<span style={{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}} />');
        continue;
      }
      
      // Load the icon data - loadNodeIcon returns SVG string directly
      const svgString = await loadNodeIcon(collection, icon);
      
      if (!svgString) {
        console.warn(`[Preprocess] Icon "${iconName}" not found, using placeholder`);
        code = code.replace(fullMatch, '<span style={{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}} />');
        continue;
      }
      
      // Extract style and className from original attributes
      const styleMatch = attrs?.match(/style=\{([^}]+)\}/);
      const classMatch = attrs?.match(/className="([^"]+)"/);
      
      // Build React-compatible SVG from the string
      let reactSvg = svgString
        .replace(/class=/g, 'className=')
        .replace(/(\w+)-(\w+)=/g, (_match, p1, p2) => `${p1}${p2.charAt(0).toUpperCase() + p2.slice(1)}=`);
      
      // Apply style if present
      if (styleMatch) {
        reactSvg = reactSvg.replace('<svg', `<svg style={${styleMatch[1]}}`);
      }
      
      // Apply className if present
      if (classMatch) {
        reactSvg = reactSvg.replace('<svg', `<svg className="${classMatch[1]}"`);
      }
      
      // Ensure proper sizing
      if (!reactSvg.includes('width=') && !reactSvg.includes('height=')) {
        reactSvg = reactSvg.replace('<svg', '<svg width="1em" height="1em"');
      }
      
      console.log(`[Preprocess] Replaced icon "${iconName}" with SVG`);
      code = code.replace(fullMatch, reactSvg);
      
    } catch (error) {
      console.error(`[Preprocess] Failed to load icon "${iconName}":`, error);
      // Fallback to placeholder
      code = code.replace(fullMatch, '<span style={{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}} />');
    }
  }
  
  return code;
}

// Prepare render configuration for Lambda
export async function prepareRenderConfig({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
}: RenderConfig) {
  const settings = qualitySettings[quality];
  
  // Pre-compile all scenes for Lambda
  const processedScenes = await Promise.all(
    scenes.map(scene => preprocessSceneForLambda(scene))
  );
  
  // Calculate total duration
  const totalDuration = processedScenes.reduce((sum, scene) => {
    return sum + (scene.duration || 150); // Default 5 seconds at 30fps
  }, 0);
  
  const estimatedDurationMinutes = totalDuration / 30 / 60; // frames to minutes
  
  return {
    projectId,
    scenes: processedScenes,
    format,
    quality,
    settings,
    totalDuration,
    estimatedDurationMinutes,
    // This will be used by Lambda
    inputProps: {
      scenes: processedScenes,
      projectId,
    },
  };
}

// Temporary mock function until Lambda is set up
export async function renderVideo(_config: RenderConfig) {
  throw new Error(
    "Direct rendering is not available. Please set up AWS Lambda following the guide in /memory-bank/sprints/sprint63_export/lambda-setup.md"
  );
}