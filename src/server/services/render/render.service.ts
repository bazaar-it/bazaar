// src/server/services/render/render.service.ts
// This file prepares the render configuration but doesn't execute rendering
// Actual rendering happens via Lambda

export interface RenderConfig {
  projectId: string;
  scenes: any[];
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  projectProps?: any;
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

// Format-specific quality adjustments
export const getQualityForFormat = (quality: string, format: string) => {
  const baseSettings = qualitySettings[quality as keyof typeof qualitySettings];
  
  if (format === 'webm') {
    // VP8 codec benefits from slightly higher CRF for similar visual quality
    return {
      ...baseSettings,
      crf: Math.min(baseSettings.crf + 2, 51), // VP8 max is 63 but we cap at 51
    };
  }
  
  if (format === 'gif') {
    // GIFs don't use CRF or video bitrate
    return {
      ...baseSettings,
      crf: undefined,
      videoBitrate: undefined,
      jpegQuality: undefined, // GIFs use PNG for better quality
    };
  }
  
  return baseSettings;
};

// Pre-compile TypeScript to JavaScript for Lambda
async function preprocessSceneForLambda(scene: any) {
  console.log(`[Preprocess] Checking scene:`, {
    id: scene.id,
    name: scene.name,
    hasTsxCode: !!scene.tsxCode,
    hasData: !!scene.data,
    dataKeys: scene.data ? Object.keys(scene.data) : [],
    codeLength: scene.tsxCode?.length || 0
  });
  
  // Database scenes have tsxCode directly, not in data.code
  const tsxCode = scene.tsxCode;
  
  if (!tsxCode || tsxCode.trim().length === 0) {
    console.error(`[Preprocess] No code found for scene ${scene.id} - scene structure:`, {
      hasId: !!scene.id,
      hasName: !!scene.name,
      hasTsxCode: !!scene.tsxCode,
      tsxCodeType: typeof scene.tsxCode,
      keys: Object.keys(scene)
    });
    return scene;
  }
  
  // Check if this is just a script array without a component
  // Use non-greedy match to avoid matching beyond the first script array
  const hasScriptArray = tsxCode.match(/const\s+script_\w+\s*=\s*\[[\s\S]*?\];/);
  const hasExportDefault = tsxCode.includes('export default');
  
  // More comprehensive check for function/component definitions
  const hasComponentFunction = 
    tsxCode.includes('export default function') ||
    tsxCode.includes('function Scene') ||
    tsxCode.match(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*[({]/) || // Arrow function component
    tsxCode.match(/function\s+\w+\s*\([^)]*\)\s*{/) || // Regular function
    tsxCode.match(/const\s+\w+\s*=\s*function/) || // Function expression
    tsxCode.match(/export\s+default\s+\w+/); // Export default variable
  
  // Only flag as incomplete if we have ONLY a script array and nothing else
  if (hasScriptArray && !hasExportDefault && !hasComponentFunction) {
    console.error(`[Preprocess] WARNING: Scene ${scene.id} appears to contain only a script array without a component!`);
    console.log(`[Preprocess] Code structure analysis:`, {
      hasScriptArray: !!hasScriptArray,
      hasExportDefault,
      hasComponentFunction: !!hasComponentFunction,
      codePreview: tsxCode.substring(0, 200) + '...'
    });
    
    // Double-check: Try to find ANY component-like pattern after the script array
    const scriptArrayMatch = hasScriptArray[0];
    const scriptArrayEndIndex = hasScriptArray.index + scriptArrayMatch.length;
    const codeAfterScript = tsxCode.substring(scriptArrayEndIndex).trim();
    
    console.log(`[Preprocess] Checking code after script array:`, {
      scriptArrayLength: scriptArrayMatch.length,
      codeAfterScriptLength: codeAfterScript.length,
      codeAfterScriptPreview: codeAfterScript.substring(0, 100) + '...'
    });
    
    // Check if there's substantial code after the script array
    if (codeAfterScript.length > 50 && (codeAfterScript.includes('return') || codeAfterScript.includes('function') || codeAfterScript.includes('=>'))) {
      console.log(`[Preprocess] Found code after script array, scene is likely complete`);
      // Continue processing - the scene has both script and component
    } else {
      console.error(`[Preprocess] CRITICAL: No component found in scene ${scene.id}. This will fail in Lambda.`);
      // Return scene without transformation - this will likely fail but at least we'll see the error
      return {
        ...scene,
        jsCode: null,
        compiledCode: null,
        tsxCode: tsxCode,
        error: 'No React component found in scene code - only script array found'
      };
    }
  }
  
  // Log if the original code seems incomplete
  if (!tsxCode.includes('export default function') && !tsxCode.includes('function Scene')) {
    console.warn(`[Preprocess] Scene ${scene.id} code might be incomplete - no export default function found`);
    console.log(`[Preprocess] Original code preview:`, tsxCode.substring(0, 300));
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
    
    // Remove ONLY the window.Remotion destructuring line (we'll provide it differently)
    // Make sure to only match the specific line, not remove other code
    transformedCode = transformedCode.replace(
      /const\s*{\s*[^}]+\s*}\s*=\s*window\.Remotion\s*;?\n?/g,
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
      'const Component = function $1'
    );
    
    // Also handle arrow function exports
    transformedCode = transformedCode.replace(
      /export\s+default\s+(\w+)\s*=\s*\(/g,
      'const Component = $1 = ('
    );
    
    // Check if we have a Component function
    if (!transformedCode.includes('const Component = function') && !transformedCode.includes('const Component =')) {
      // Try to find any function that looks like a component
      const functionMatch = transformedCode.match(/(?:function|const)\s+(\w*Scene\w*)\s*[=(]/);
      if (functionMatch) {
        console.log(`[Preprocess] Found component function: ${functionMatch[1]}, aliasing to Component`);
        transformedCode = transformedCode + `\n\nconst Component = ${functionMatch[1]};`;
      } else {
        console.warn(`[Preprocess] No Component function found after transformation for scene ${scene.id}`);
        console.log(`[Preprocess] Transformed code snippet:`, transformedCode.substring(0, 200));
      }
    }
    
    // Ensure the component is returned at the end
    if ((transformedCode.includes('const Component = function') || transformedCode.includes('const Component =')) && !transformedCode.includes('return Component;')) {
      transformedCode = transformedCode + '\n\nreturn Component;';
    }
    
    // Replace window.React with React
    transformedCode = transformedCode.replace(/window\.React/g, 'React');
    
    // Remove or replace window.RemotionGoogleFonts (not available in Lambda)
    transformedCode = transformedCode.replace(
      /window\.RemotionGoogleFonts\.loadFont[^;]+;/g,
      '// Font loading removed for Lambda'
    );
    
    // Replace ALL remaining window.IconifyIcon references with simple div placeholders
    // This handles any complex cases that weren't caught by the SVG replacement
    transformedCode = transformedCode.replace(
      /window\.IconifyIcon/g,
      '"div"'
    );
    
    // Replace window.IconifyIcon with actual SVG icons
    transformedCode = await replaceIconifyIcons(transformedCode);
    
    // Fix avatar URLs - replace local paths with R2 URLs
    transformedCode = transformedCode.replace(
      /\/avatars\/(asian-woman|black-man|hispanic-man|middle-eastern-man|white-woman)\.png/g,
      'https://pyyqiqdbiygijqaj.public.blob.vercel-storage.com/$1-avatar.png'
    );
    
    console.log(`[Preprocess] Scene ${scene.id} transformed for Lambda`);
    console.log(`[Preprocess] Transformation summary:`, {
      sceneId: scene.id,
      sceneName: scene.name,
      originalCodeLength: tsxCode.length,
      transformedCodeLength: transformedCode.length,
      hasExportDefault: tsxCode.includes('export default'),
      hasComponent: transformedCode.includes('const Component'),
      hasReturn: transformedCode.includes('return Component'),
      remotionComponents: remotionComponents.length > 0 ? remotionComponents : 'none',
      reactHooks: reactHooks.length > 0 ? reactHooks : 'none',
      transformedCodePreview: transformedCode.substring(0, 200) + '...'
    });
    
    // Check if we have a script array (this is normal - many scenes have both script arrays and components)
    const scriptMatch = transformedCode.match(/const\s+script_\w+\s*=\s*\[/);
    if (scriptMatch && !transformedCode.includes('const Component')) {
      // Only warn if we have a script array but no component
      console.log(`[Preprocess] WARNING: Found script array but no Component function`);
      console.log(`[Preprocess] Script array starts at position:`, scriptMatch.index);
    }
    
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
  
  // Find all IconifyIcon references - both JSX and React.createElement styles
  const jsxIconRegex = /<window\.IconifyIcon\s+icon="([^"]+)"([^>]*?)\/>/g;
  const createElementRegex = /React\.createElement\(window\.IconifyIcon,\s*\{[^}]*icon:\s*"([^"]+)"[^}]*\}[^)]*\)/g;
  
  // First handle JSX-style icons
  const jsxMatches = [...code.matchAll(jsxIconRegex)];
  console.log(`[Preprocess] Found ${jsxMatches.length} JSX-style icons to replace`);
  
  // Process JSX-style icons
  for (const match of jsxMatches) {
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
  
  // Now handle React.createElement style icons
  const createElementMatches = [...code.matchAll(createElementRegex)];
  console.log(`[Preprocess] Found ${createElementMatches.length} React.createElement icons to replace`);
  
  for (const match of createElementMatches) {
    const [fullMatch, iconName] = match;
    
    if (!iconName) {
      console.warn(`[Preprocess] Empty icon name found in createElement, using placeholder`);
      code = code.replace(fullMatch, 'React.createElement("span", {style:{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}})');
      continue;
    }
    
    try {
      // Split icon name into collection and icon
      const [collection, icon] = iconName.split(':');
      
      if (!collection || !icon) {
        console.warn(`[Preprocess] Invalid icon name format "${iconName}" in createElement, using placeholder`);
        code = code.replace(fullMatch, 'React.createElement("span", {style:{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}})');
        continue;
      }
      
      // Load the icon data
      const svgString = await loadNodeIcon(collection, icon);
      
      if (!svgString) {
        console.warn(`[Preprocess] Icon "${iconName}" not found, using placeholder`);
        code = code.replace(fullMatch, 'React.createElement("span", {style:{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}})');
        continue;
      }
      
      // Convert SVG string to React.createElement format
      // Extract viewBox and path data from SVG
      const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
      const pathMatch = svgString.match(/<path[^>]*d="([^"]+)"/);
      
      if (pathMatch && pathMatch[1]) {
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";
        const pathData = pathMatch[1];
        
        // Create React.createElement for SVG
        const svgElement = `React.createElement("svg", {viewBox:"${viewBox}",width:"1em",height:"1em",fill:"currentColor"}, React.createElement("path", {d:"${pathData}"}))`;
        
        console.log(`[Preprocess] Replaced createElement icon "${iconName}" with SVG`);
        code = code.replace(fullMatch, svgElement);
      } else {
        console.warn(`[Preprocess] Could not extract path from icon "${iconName}", using placeholder`);
        code = code.replace(fullMatch, 'React.createElement("span", {style:{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}})');
      }
      
    } catch (error) {
      console.error(`[Preprocess] Failed to load icon "${iconName}":`, error);
      // Fallback to placeholder
      code = code.replace(fullMatch, 'React.createElement("span", {style:{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}})');
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
  projectProps,
}: RenderConfig) {
  const settings = getQualityForFormat(quality, format);
  
  // Get project format dimensions or fallback to quality settings
  const projectFormat = projectProps?.meta?.format || 'landscape';
  const projectWidth = projectProps?.meta?.width || 1920;
  const projectHeight = projectProps?.meta?.height || 1080;
  
  // Calculate render dimensions based on project dimensions and quality settings
  let renderWidth: number;
  let renderHeight: number;
  
  // Scale project dimensions to match quality setting while maintaining aspect ratio
  const projectAspectRatio = projectWidth / projectHeight;
  const qualityMaxDimension = Math.max(settings.resolution.width, settings.resolution.height);
  
  if (projectFormat === 'portrait') {
    // For portrait (9:16), prioritize height
    renderHeight = Math.min(projectHeight, qualityMaxDimension);
    renderWidth = Math.round(renderHeight * projectAspectRatio);
  } else if (projectFormat === 'square') {
    // For square (1:1), use the smaller of width/height
    const maxSquareSize = Math.min(settings.resolution.width, settings.resolution.height);
    renderWidth = renderHeight = Math.min(projectWidth, maxSquareSize);
  } else {
    // For landscape (16:9), prioritize width
    renderWidth = Math.min(projectWidth, settings.resolution.width);
    renderHeight = Math.round(renderWidth / projectAspectRatio);
  }
  
  // Log incoming scenes structure
  console.log(`[prepareRenderConfig] Processing ${scenes.length} scenes for Lambda`);
  scenes.forEach((scene, index) => {
    console.log(`[prepareRenderConfig] Scene ${index}:`, {
      id: scene.id,
      name: scene.name,
      hasTsxCode: !!scene.tsxCode,
      tsxCodeLength: scene.tsxCode?.length || 0,
      duration: scene.duration,
      order: scene.order,
      keys: Object.keys(scene)
    });
  });

  // Pre-compile all scenes for Lambda with resolution info
  const processedScenes = await Promise.all(
    scenes.map(scene => preprocessSceneForLambda({
      ...scene,
      width: renderWidth,
      height: renderHeight
    }))
  );
  
  // Filter out any scenes that failed preprocessing
  const validScenes = processedScenes.filter(scene => {
    if (!scene.jsCode && !scene.compiledCode && scene.error) {
      console.error(`[prepareRenderConfig] Skipping scene ${scene.id} due to preprocessing error:`, scene.error);
      return false;
    }
    return true;
  });
  
  if (validScenes.length === 0) {
    throw new Error('No valid scenes to render after preprocessing');
  }
  
  console.log(`[prepareRenderConfig] ${validScenes.length} of ${scenes.length} scenes passed preprocessing`);
  
  // Calculate total duration
  const totalDuration = validScenes.reduce((sum, scene) => {
    return sum + (scene.duration || 150); // Default 5 seconds at 30fps
  }, 0);
  
  const estimatedDurationMinutes = totalDuration / 30 / 60; // frames to minutes
  
  return {
    projectId,
    scenes: validScenes,
    format,
    quality,
    settings,
    totalDuration,
    estimatedDurationMinutes,
    renderWidth,
    renderHeight,
    // This will be used by Lambda
    inputProps: {
      scenes: validScenes,
      projectId,
      width: renderWidth,
      height: renderHeight,
    },
  };
}

// Temporary mock function until Lambda is set up
export async function renderVideo(_config: RenderConfig) {
  throw new Error(
    "Direct rendering is not available. Please set up AWS Lambda following the guide in /memory-bank/sprints/sprint63_export/lambda-setup.md"
  );
}