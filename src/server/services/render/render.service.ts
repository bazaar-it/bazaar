// src/server/services/render/render.service.ts
// This file prepares the render configuration but doesn't execute rendering
// Actual rendering happens via Lambda

// Font loading is now handled by MainCompositionSimple using @remotion/fonts
// The old injectFontLoadingCode function has been removed as it used browser APIs (document.fonts)
// that don't exist in Lambda's Node environment

export interface AudioTrack {
  url: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  volume: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  playbackRate?: number;
}

export interface RenderConfig {
  projectId: string;
  scenes: any[];
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  projectProps?: any;
  audio?: AudioTrack;
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
    // Mark scene as having an error so it gets filtered out
    return {
      ...scene,
      jsCode: null,
      compiledCode: null,
      error: 'Scene has no code to render'
    };
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
    
    // Keep export default for Lambda compatibility - Lambda expects proper ES6 modules
    // Only convert to const Component if there's no export default
    if (!transformedCode.includes('export default')) {
      // If there's a function without export, wrap it as export default
      transformedCode = transformedCode.replace(
        /^function\s+(\w+)/gm,
        'export default function $1'
      );
    }
    
    // Keep arrow function exports as export default for Lambda
    // No need to convert them to const Component
    
    // Lambda will import the export default function directly
    // No need for Component assignment since we're preserving export default
    
    // No need for return Component since we're using proper export default for Lambda
    
    // Replace window.React with React
    transformedCode = transformedCode.replace(/window\.React/g, 'React');
    
    // Replace window.RemotionGoogleFonts with actual @remotion/fonts loading
    transformedCode = transformedCode.replace(
      /window\.RemotionGoogleFonts\.loadFont[^;]+;/g,
      '// Font loading handled by @remotion/fonts injection'
    );

    // Font loading is now handled by MainCompositionSimple using @remotion/fonts
    // No need to inject font loading code into the scene
    
    // Replace window.IconifyIcon with actual SVG icons
    // CRITICAL: This must happen AFTER TypeScript compilation but BEFORE any destructive replacements
    transformedCode = await replaceIconifyIcons(transformedCode);
    
    // Fix avatar URLs - replace window.BazaarAvatars with actual URLs
    // This handles the window.BazaarAvatars['avatar-name'] pattern
    transformedCode = transformedCode.replace(
      /window\.BazaarAvatars\[['"]([^'"]+)['"]\]/g,
      (match: string, avatarId: string) => {
        // Map avatar IDs to their full public R2 URLs
        const avatarUrls: Record<string, string> = {
          'asian-woman': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/asian-woman.png',
          'black-man': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/black-man.png',
          'hispanic-man': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/hispanic-man.png',
          'middle-eastern-man': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/middle-eastern-man.png',
          'white-woman': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/white-woman.png'
        };
        console.log(`[Preprocess] Replacing avatar: ${avatarId} with URL: ${avatarUrls[avatarId]}`);
        return `"${avatarUrls[avatarId] || 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/default.png'}"`;
      }
    );
    
    // Also fix direct avatar path references (fallback)
    transformedCode = transformedCode.replace(
      /\/avatars\/(asian-woman|black-man|hispanic-man|middle-eastern-man|white-woman)\.png/g,
      'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/$1.png'
    );
    
    // FOR LAMBDA: Function constructor cannot handle ANY export statements
    // Remove ALL export statements and convert to variable assignments
    transformedCode = transformedCode
      .replace(/export\s+default\s+function\s+(\w+)/g, 'const Component = function $1')  // export default function -> const Component
      .replace(/export\s+default\s+([a-zA-Z_$][\w$]*);?\s*$/gm, 'const Component = $1;')  // export default variable -> const Component
      .replace(/export\s+const\s+\w+\s*=\s*[^;]+;?/g, '')  // Remove export const
      .replace(/export\s+{\s*[^}]*\s*};?/g, '');            // Remove export { ... }
    
    console.log(`[Preprocess] Scene ${scene.id} transformed for Lambda`);
    console.log(`[Preprocess] Transformation summary:`, {
      sceneId: scene.id,
      sceneName: scene.name,
      originalCodeLength: tsxCode.length,
      transformedCodeLength: transformedCode.length,
      hasExportDefault: transformedCode.includes('export default'),
      hasComponent: transformedCode.includes('function') || transformedCode.includes('const Component'),
      hasReturn: transformedCode.includes('return'),
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
  
  // First, extract all icon names from data structures
  const iconNames = new Set<string>();
  
  // Find icon data arrays like: { icon: "mdi:home", ... }
  const iconDataRegex = /\{\s*icon:\s*["']([^"']+)["']/g;
  let match;
  while ((match = iconDataRegex.exec(code)) !== null) {
    if (match[1]) {
      iconNames.add(match[1]);
      console.log(`[Preprocess] Found icon in data: ${match[1]}`);
    }
  }
  
  // Also find direct icon usage with literal strings
  const directIconRegex = /<window\.IconifyIcon\s+icon=["']([^"']+)["']/g;
  while ((match = directIconRegex.exec(code)) !== null) {
    if (match[1]) {
      iconNames.add(match[1]);
      console.log(`[Preprocess] Found direct icon: ${match[1]}`);
    }
  }

  // Capture variable-based icon references like: icon: myIcon
  const variableIconRefRegex = /\b(icon|iconName|tabIcon)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/g;
  const variableNames = new Set<string>();
  let vmatch;
  while ((vmatch = variableIconRefRegex.exec(code)) !== null) {
    if (vmatch[2]) variableNames.add(vmatch[2]);
  }
  // Resolve variable assignments: const myIcon = 'prefix:name'
  for (const varName of variableNames) {
    const assignRegex = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*["']([^"']+)["']`,'g');
    let amatch;
    while ((amatch = assignRegex.exec(code)) !== null) {
      const val = amatch[1];
      if (val && val.includes(':')) {
        iconNames.add(val);
        console.log(`[Preprocess] Resolved variable icon ${varName} -> ${val}`);
      }
    }
  }
  
  // Load all icons first
  const iconMap = new Map<string, string>();
  console.log(`[Preprocess] Loading ${iconNames.size} unique icons...`);
  
  // Loader with smart fallbacks for common outline names
  async function loadWithFallback(name: string): Promise<string | null> {
    const [collection, icon] = name.split(':');
    if (!collection || !icon) return null;
    
    // Try loading the exact icon first
    try {
      const svg = await loadNodeIcon(collection, icon);
      if (svg) {
        console.log(`[Preprocess] Loaded exact icon: ${name}`);
        return svg;
      }
    } catch (e) {
      console.log(`[Preprocess] Could not load exact icon: ${name}`);
    }
    
    // Handle material-symbols outline variants
    if (collection === 'material-symbols' && icon.endsWith('-outline')) {
      const base = icon.replace(/-outline$/, '');
      
      // Map common outline names to their actual icon names
      const iconMapping: Record<string, string[]> = {
        'favorite-outline': ['favorite', 'heart', 'favorite-border'],
        'home-outline': ['home', 'house', 'home-work'],
        'chat-outline': ['chat', 'message', 'chat-bubble'],
        'person-outline': ['person', 'account-circle', 'person-2'],
        'search-outline': ['search', 'search-rounded']
      };
      
      // Try mapped alternatives
      const mappedAlternatives = iconMapping[icon] || [base];
      
      for (const alt of mappedAlternatives) {
        const candidates = [
          `material-symbols:${alt}`,
          `material-symbols:${alt}-outline`,
          `material-symbols:${alt}-rounded`,
          `mdi:${alt}`,
          `mdi:${alt}-outline`
        ];
        
        for (const cand of candidates) {
          const [c2, i2] = cand.split(':');
          try {
            const svg2 = await loadNodeIcon(c2 || '', i2 || '');
            if (svg2) {
              console.log(`[Preprocess] Using fallback: ${name} -> ${cand}`);
              return svg2;
            }
          } catch {}
        }
      }
    }
    
    // Try removing -outline suffix as last resort
    if (icon.endsWith('-outline')) {
      const baseIcon = icon.replace(/-outline$/, '');
      try {
        const svg = await loadNodeIcon(collection, baseIcon);
        if (svg) {
          console.log(`[Preprocess] Using base icon without outline: ${name} -> ${collection}:${baseIcon}`);
          return svg;
        }
      } catch {}
    }
    
    console.warn(`[Preprocess] No icon found for: ${name}`);
    return null;
  }

  for (const iconName of iconNames) {
    const svgString = await loadWithFallback(iconName);
    if (svgString) {
      iconMap.set(iconName, svgString);
      console.log(`[Preprocess] Loaded icon: ${iconName}`);
    } else {
      console.warn(`[Preprocess] Icon "${iconName}" not found, using fallback`);
      // Use a generic icon shape as fallback that's less obtrusive
      const fallbackSvg = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      iconMap.set(iconName, fallbackSvg);
    }
  }
  
  console.log(`[Preprocess] Loaded ${iconNames.size} icons from initial scan`);
  
  // Broaden detection: include any literal that looks like an icon name with allowed prefixes
  // Do this BEFORE building the icon map entries
  try {
    const allowedPrefixes = ['material-symbols', 'simple-icons', 'mdi', 'tabler', 'lucide', 'ph', 'bi', 'fa', 'ri', 'ion', 'iconicons'];
    const allStringLikeIcons = code.match(/["']([a-z0-9_-]+:[a-z0-9_\-]+)["']/gi) || [];
    for (const m of allStringLikeIcons) {
      const val = m.slice(1, -1).toLowerCase(); // Ensure lowercase
      const prefix = val.split(':')[0];
      if (prefix && allowedPrefixes.includes(prefix) && !iconMap.has(val)) {
        const svgString = await loadWithFallback(val);
        if (svgString && !iconMap.has(val)) {
          iconMap.set(val, svgString);
          console.log(`[Preprocess] Added additional icon: ${val}`);
        }
      }
    }
  } catch (e) {
    console.error('[Preprocess] Error loading additional icons:', e);
  }
  
  console.log(`[Preprocess] Total icons loaded: ${iconMap.size}`);
  
  // NOW build the icon map entries with ALL collected icons
  const iconMapEntries = [];
  for (const [name, svg] of iconMap.entries()) {
    // Extract viewBox and inner content
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";
    
    // Extract inner SVG markup to preserve all shapes (paths, circles, rects, etc.)
    const innerMatch = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    const inner = innerMatch?.[1]?.replace(/`/g, '\\`') || '';
    iconMapEntries.push(`"${name}": function(props) { return React.createElement("svg", Object.assign({viewBox:"${viewBox}",width:"1em",height:"1em",fill:"currentColor", dangerouslySetInnerHTML: { __html: \`${inner}\` }}, props)); }`);
  }
  
  // Create the icon map code that will be injected (top-level shim)
  const iconMapCode = `
    const __iconMap = {
      ${iconMapEntries.join(',\n      ')}
    };
    const IconifyIcon = function(props) {
      const _p = props || {};
      const iconName = _p.icon;
      const rest = (function(p){ var r={}; for (var k in p){ if(k!== 'icon' && Object.prototype.hasOwnProperty.call(p,k)) r[k]=p[k]; } return r; })(_p);
      if (!iconName) {
        // Return empty span for missing icon prop
        return React.createElement("span", {style: Object.assign({display:"inline-block",width:"1em",height:"1em"}, rest && rest.style)});
      }
      const IconComponent = __iconMap[iconName];
      if (IconComponent) {
        return IconComponent(rest);
      }
      // Fallback: simple square icon shape
      console.warn('Icon not in map:', iconName);
      return React.createElement("svg", Object.assign({viewBox:"0 0 24 24",width:"1em",height:"1em",fill:"currentColor"}, rest), 
        React.createElement("rect", {x:"4",y:"4",width:"16",height:"16",rx:"2",fill:"none",stroke:"currentColor",strokeWidth:"2"})
      );
    };
  `;

  // Replace window.IconifyIcon with our local IconifyIcon
  // This handles both JSX and React.createElement forms
  code = code.replace(/window\.IconifyIcon/g, 'IconifyIcon');
  
  // Also handle React.createElement calls that already exist
  code = code.replace(/React\.createElement\(\s*IconifyIcon\s*,/g, 'React.createElement(IconifyIcon,');
  
  // Always inject the shim at the beginning so IconifyIcon exists in any scope
  code = iconMapCode + '\n' + code;
  console.log(`[Preprocess] Injected top-level Iconify shim with ${iconMap.size} icons`);
  
  // Log a sample of the transformed code to verify injection
  const codePreview = code.substring(0, 1500);
  console.log('[Preprocess] Code after icon injection (first 1500 chars):');
  console.log(codePreview);
  
  // Check if IconifyIcon is actually being used in the code
  const iconifyUsageCount = (code.match(/IconifyIcon/g) || []).length;
  console.log(`[Preprocess] IconifyIcon is referenced ${iconifyUsageCount} times in the transformed code`);
  
  // Check for the actual compiled form
  const createElementIconCount = (code.match(/React\.createElement\(\s*IconifyIcon/g) || []).length;
  console.log(`[Preprocess] React.createElement(IconifyIcon) found ${createElementIconCount} times`);
  
  // Look for any icon references
  const iconReferences = code.match(/icon(?:Item)?\.icon/g) || [];
  console.log(`[Preprocess] Found ${iconReferences.length} icon property references`);
  
  return code;
}

// Prepare render configuration for Lambda
export async function prepareRenderConfig({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
  projectProps,
  audio,
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
  
  // Filter out any scenes that failed preprocessing or have no code
  const validScenes = processedScenes.filter(scene => {
    // Skip scenes that have an error
    if (scene.error) {
      console.error(`[prepareRenderConfig] Skipping scene ${scene.id} due to error:`, scene.error);
      return false;
    }
    
    // Skip scenes that have no compiled code
    if (!scene.jsCode && !scene.compiledCode) {
      console.error(`[prepareRenderConfig] Skipping scene ${scene.id} - no compiled code available`);
      return false;
    }
    
    // Skip scenes that originally had no tsxCode
    if (!scene.tsxCode || scene.tsxCode.trim().length === 0) {
      console.error(`[prepareRenderConfig] Skipping scene ${scene.id} - no source code`);
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
    audio,
    // This will be used by Lambda
    inputProps: {
      scenes: validScenes,
      projectId,
      width: renderWidth,
      height: renderHeight,
      audio,
    },
  };
}

// Temporary mock function until Lambda is set up
export async function renderVideo(_config: RenderConfig) {
  throw new Error(
    "Direct rendering is not available. Please set up AWS Lambda following the guide in /memory-bank/sprints/sprint63_export/lambda-setup.md"
  );
}