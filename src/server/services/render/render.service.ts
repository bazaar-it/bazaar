// src/server/services/render/render.service.ts
// This file prepares the render configuration but doesn't execute rendering
// Actual rendering happens via Lambda

// Font loading is now handled by MainCompositionSimple using @remotion/fonts
// The old injectFontLoadingCode function has been removed as it used browser APIs (document.fonts)
// that don't exist in Lambda's Node environment

import { replaceIconifyIcons } from './replace-iconify-icons';
import { iconMetrics } from './icon-loader';
import { isFontSupported } from '~/lib/constants/fonts';

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
  playbackSpeed?: number;
  projectProps?: any;
  audio?: AudioTrack;
  onProgress?: (progress: number) => void;
  onWarning?: (warning: { type: string; message: string; sceneId?: string; data?: any }) => void;
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
async function preprocessSceneForLambda(scene: any, onWarning?: RenderConfig['onWarning']) {
  console.log(`[Preprocess] Checking scene:`, {
    id: scene.id,
    name: scene.name,
    hasTsxCode: !!scene.tsxCode,
    hasData: !!scene.data,
    dataKeys: scene.data ? Object.keys(scene.data) : [],
    codeLength: scene.tsxCode?.length || 0
  });
  
  // Database scenes have tsxCode directly, not in data.code
  let tsxCode = scene.tsxCode;
  // Ensure any third-party remote assets are cached to our R2 for Lambda reliability
  try {
    if (typeof scene.projectId === 'string' && tsxCode && tsxCode.includes('src="http')) {
      const { ensureRemoteAssetsCachedInCode } = await import('~/server/services/media/remoteCache.service');
      const cached = await ensureRemoteAssetsCachedInCode(tsxCode, scene.projectId);
      if (cached.rewrites.length > 0) {
        console.log(`[Preprocess] RemoteCache rewrote ${cached.rewrites.length} asset URL(s) for scene ${scene.id}`);
      }
      tsxCode = cached.code;
    }
  } catch (e) {
    console.warn('[Preprocess] RemoteCache step failed (continuing with original code):', e);
  }
  
  // Emergency switch: Force fallback component for all scenes
  const FORCE_FALLBACK = process.env.RENDER_FORCE_FALLBACK === '1';
  if (FORCE_FALLBACK) {
    const fallbackOnly = `const Component = function ComponentFallback() {\n  return React.createElement(\n    'div',\n    {\n      style: {\n        width: '100%',\n        height: '100%',\n        display: 'flex',\n        alignItems: 'center',\n        justifyContent: 'center',\n        backgroundColor: '#0f172a',\n        color: 'white',\n        fontFamily: 'Inter, system-ui, sans-serif',\n        fontSize: '32px'\n      }\n    },\n    'Scene unavailable — using fallback'\n  );\n};\n\nreturn Component;\n`;
    console.warn(`[Preprocess] FORCE_FALLBACK enabled - rendering fallback for scene ${scene.id}`);
    return {
      ...scene,
      jsCode: fallbackOnly,
      compiledCode: fallbackOnly,
      tsxCode,
    };
  }

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
    
    // Capture default export identifier from original TSX (before any mutations)
    let defaultExportName: string | null = null;
    try {
      const mFn = tsxCode.match(/export\s+default\s+function\s+(\w+)/);
      const mVar = tsxCode.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/);
      defaultExportName = (mFn && mFn[1]) || (mVar && mVar[1]) || null;
    } catch {}

    // Transform TypeScript/JSX to JavaScript
    let { code: transformedCode } = transform(tsxCode, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'classic',
      production: true,
    });
    // Remove ESM import statements for Lambda-compatible Function constructor
    transformedCode = transformedCode.replace(/^\s*import\s+[^;]+;?\s*$/gm, '');
    
    // Replace Iconify icons with inline SVGs for Lambda
    console.log(`[Preprocess] Replacing Iconify icons for scene ${scene.id}...`);
    transformedCode = await replaceIconifyIcons(transformedCode, {
      addWarning: onWarning,
      sceneId: scene.id,
    });
    
    // Extract Remotion components being used (if any)
    const remotionComponentSet = new Set<string>();
    const remotionDestructureRegex = /const\s*{\s*([^}]+)\s*}\s*=\s*window\.Remotion\s*;?\n?/g;
    transformedCode = transformedCode.replace(remotionDestructureRegex, (_match, group: string) => {
      group
        .split(',')
        .map((token: string) => token.trim())
        .filter((token: string) => token.length > 0)
        .forEach((token: string) => remotionComponentSet.add(token));
      return '';
    });

    const remotionComponents = Array.from(remotionComponentSet);
    
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
    
    // Do NOT inject `const { ... } = Remotion;` here.
    // In Lambda, Remotion primitives are provided as Function parameters (AbsoluteFill, useCurrentFrame, etc.)
    // We already removed the original `const { ... } = window.Remotion` line above so the code
    // can reference these identifiers directly from the function scope.
    
    // Keep export default for Lambda compatibility - Lambda expects proper ES6 modules
    // Note: We'll strip export statements later for Function constructor, but first
    // detect whether a default export exists so we can bind it to `Component`.
    const hasExportDefaultBeforeStrip = /export\s+default\s+/.test(transformedCode);
    
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
    
    // Warn for unsupported fonts in obviously literal styles
    try {
      const fontFamilyMatches = tsxCode.match(/fontFamily\s*:\s*['\"][^'\"]+['\"]/g) || [];
      for (const m of fontFamilyMatches) {
        const family = (m.match(/['\"]([^'\"]+)['\"]/ ) || [])[1];
        if (family && !isFontSupported(family)) {
          onWarning?.({ type: 'font_fallback', message: `Font not preloaded: ${family}. Using fallback.`, sceneId: scene.id, data: { fontFamily: family } });
        }
      }
    } catch {}

    // Replace window.IconifyIcon with actual SVG icons
    // CRITICAL: This must happen AFTER TypeScript compilation but BEFORE any destructive replacements
    transformedCode = await replaceIconifyIcons(transformedCode, {
      addWarning: onWarning,
      sceneId: scene.id,
    });

    // SAFETY: Provide a runtime helper for any remaining inline icon calls
    // Some transforms may emit __inlineIcon(svg, props). Ensure it's defined.
    if (transformedCode.includes('__inlineIcon(') && !/\b__inlineIcon\s*=/.test(transformedCode)) {
      const inlineIconHelper = `\n// Inline Icon helper injected by preprocess\nconst __inlineIcon = (svg, props = {}) => {\n  try {\n    return React.createElement('span', {\n      ...props,\n      dangerouslySetInnerHTML: { __html: svg }\n    });\n  } catch (_) {\n    return React.createElement('span', { ...props });\n  }\n};\n`;
      transformedCode = inlineIconHelper + transformedCode;
    }
    
    // Fix avatar URLs - replace window.BazaarAvatars with actual URLs
    // Compute URLs from env to avoid hardcoding domains/paths
    const publicBase = (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '');
    const avatarsDir = process.env.AVATARS_BASE_DIR || 'Bazaar avatars';
    const enc = (s: string) => s.split('/').map(encodeURIComponent).join('/');
    const urlFor = (file: string) => `${publicBase}/${encodeURIComponent(avatarsDir)}/${enc(file)}`;

    const avatarUrlMap: Record<string, string> = {
      // Canonical 5
      'asian-woman': urlFor('asian-woman.png'),
      'black-man': urlFor('black-man.png'),
      'hispanic-man': urlFor('hispanic-man.png'),
      'middle-eastern-man': urlFor('middle-eastern-man.png'),
      'white-woman': urlFor('white-woman.png'),
      // Expanded set
      'jackatar': urlFor('Jackatar.png'),
      'markatar': urlFor('Markatar.png'),
      'downie': urlFor('downie.png'),
      'hotrussian': urlFor('hotrussian.png'),
      'hottie': urlFor('hottie.png'),
      'irish-guy': urlFor('irish guy.png'),
      'nigerian-princess': urlFor('nigerian princess.png'),
      'norway-girl': urlFor('norway girl.png'),
      'wise-ceo': urlFor('wise-ceo.png'),
      // Aliases
      'Jackatar': urlFor('Jackatar.png'),
      'Markatar': urlFor('Markatar.png'),
    };

    transformedCode = transformedCode.replace(
      /window\.BazaarAvatars\[['"]([^'"]+)['"]\]/g,
      (match: string, avatarId: string) => {
        const to = avatarUrlMap[avatarId];
        if (to) {
          console.log(`[Preprocess] Replacing avatar: ${avatarId} -> ${to}`);
          return `"${to}"`;
        }
        return match; // leave untouched if not known
      }
    );

    // Also fix direct avatar path references under /avatars and /Bazaar avatars
    transformedCode = transformedCode
      .replace(/\/(?:Bazaar\s+avatars|avatars)\/(asian-woman|black-man|hispanic-man|middle-eastern-man|white-woman)\.png/gi, (_m, id) => urlFor(`${id}.png`))
      .replace(/\/(?:Bazaar\s+avatars|avatars)\/(Jackatar|Markatar|downie|hotrussian|hottie)\.png/gi, (_m, file) => urlFor(`${file}.png`))
      .replace(/\/(?:Bazaar\s+avatars|avatars)\/irish\s+guy\.png/gi, urlFor('irish guy.png'))
      .replace(/\/(?:Bazaar\s+avatars|avatars)\/nigerian\s+princess\.png/gi, urlFor('nigerian princess.png'))
      .replace(/\/(?:Bazaar\s+avatars|avatars)\/norway\s+girl\.png/gi, urlFor('norway girl.png'))
      .replace(/\/(?:Bazaar\s+avatars|avatars)\/wise-ceo\.png/gi, urlFor('wise-ceo.png'));

    // Handle dynamic avatar references: window.BazaarAvatars[avatarName]
    // Replace with runtime resolver and inject an inline registry for Lambda
    let dynamicAvatarUsages = 0;
    transformedCode = transformedCode.replace(/window\.BazaarAvatars\[(.*?)\]/g, (match, expr) => {
      dynamicAvatarUsages += 1;
      return `__ResolveAvatar(${expr})`;
    });

    if (dynamicAvatarUsages > 0) {
      const registryEntries = Object.entries(avatarUrlMap)
        .map(([k, v]) => `  "${k}": "${v}"`)
        .join(',\n');
      const avatarRuntime = `
// Inline avatar registry for dynamic avatar usage
const __AVATAR_REGISTRY = {
${registryEntries}
};
function __ResolveAvatar(name) {
  try {
    if (name == null) return '';
    const key = String(name);
    const url = __AVATAR_REGISTRY[key] || __AVATAR_REGISTRY[key.toLowerCase?.()] || '';
    if (url) return url;
  } catch (_) {}
  // Minimal placeholder (transparent PNG 1x1)
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAgUB6mY7tL8AAAAASUVORK5CYII=';
}
`;
      transformedCode = avatarRuntime + '\n' + transformedCode;
      console.log(`[Preprocess] Injected avatar runtime with ${Object.keys(avatarUrlMap).length} entries; dynamic usages: ${dynamicAvatarUsages}`);
    }
    
    // FOR LAMBDA: Function constructor cannot handle ANY export statements
    // Remove ALL export statements. Do not duplicate Component declarations.
    transformedCode = transformedCode
      .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')  // strip export default from function decl
      .replace(/export\s+default\s+([a-zA-Z_$][\w$]*);?\s*$/gm, '')    // remove bare export default lines
      .replace(/export\s+const\s+\w+\s*=\s*[^;]+;?/g, '')             // Remove export const
      .replace(/export\s+{\s*[^}]*\s*};?/g, '');                        // Remove export { ... }

    // If we had a default export, bind it to Component so Lambda can render it.
    if (!/\bconst\s+Component\s*=/.test(transformedCode)) {
      // Prefer the original default export name from TSX if available
      if (defaultExportName) {
        transformedCode += `\nconst Component = ${defaultExportName};\n`;
      } else if (hasExportDefaultBeforeStrip) {
        // Fallback: try to recover a default identifier from transformed code patterns
        const mVar = transformedCode.match(/export\s+default\s+([A-Za-z_$][\w$]*)/);
        const guess = mVar && mVar[1];
        if (guess) transformedCode += `\nconst Component = ${guess};\n`;
      }
    }

    // SAFETY NET: Ensure a valid React component is always defined for Lambda rendering
    // If transformation did not produce a Component, provide a minimal fallback to prevent React error #130
    if (!/\bconst\s+Component\s*=/.test(transformedCode)) {
      transformedCode += `\nconst Component = function ComponentFallback() {\n  return React.createElement(\n    'div',\n    {\n      style: {\n        width: '100%',\n        height: '100%',\n        display: 'flex',\n        alignItems: 'center',\n        justifyContent: 'center',\n        backgroundColor: '#0f172a',\n        color: 'white',\n        fontFamily: 'Inter, system-ui, sans-serif'\n      }\n    },\n    'Scene failed to compile — showing fallback'\n  );\n};\n`;
    }

    // Ensure the Function constructor returns the component to the Lambda runtime
    // CRITICAL: We must explicitly return; functions do NOT return the last expression implicitly
    if (!/\breturn\s+Component\s*;?\s*$/m.test(transformedCode)) {
      transformedCode += `\n// Explicitly return the component for Lambda Function execution\nreturn Component;\n`;
    }
    
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

// Prepare render configuration for Lambda
export async function prepareRenderConfig({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
  playbackSpeed = 1.0,
  projectProps,
  audio,
  onWarning,
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

  // Font extraction no longer needed - CSS fonts load automatically from fonts.css
  console.log(`[Fonts] Using CSS fonts - all 99 fonts available via fonts.css`);
  
  // Pre-compile all scenes for Lambda with resolution info
  const processedScenes = await Promise.all(
    scenes.map(scene => preprocessSceneForLambda({
      ...scene,
      // Fonts now load automatically via CSS - no detection needed
      detectedFonts: [],
      width: renderWidth,
      height: renderHeight
    }, onWarning))
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
  
  // Calculate original total duration before speed adjustment
  const originalTotalDuration = validScenes.reduce((sum, scene) => {
    return sum + (scene.duration || 150); // Default 5 seconds at 30fps
  }, 0);
  
  // Apply playback speed multiplier to scene durations
  // Higher speed = shorter video (e.g., 2x speed = half duration)
  // Lower speed = longer video (e.g., 0.5x speed = double duration)
  const speedAdjustedScenes = validScenes.map(scene => {
    const originalDuration = scene.duration || 150;
    // New Duration = Original Duration / Speed
    const adjustedDuration = Math.max(1, Math.round(originalDuration / playbackSpeed));
    
    if (playbackSpeed !== 1.0) {
      console.log(`[prepareRenderConfig] Scene ${scene.id} duration: ${originalDuration} → ${adjustedDuration} frames (${playbackSpeed}x speed)`);
    }
    
    return {
      ...scene,
      duration: adjustedDuration,
      originalDuration // Keep original for reference
    };
  });
  
  // Calculate adjusted total duration
  const totalDuration = speedAdjustedScenes.reduce((sum, scene) => {
    return sum + scene.duration;
  }, 0);
  
  console.log(`[prepareRenderConfig] Total duration: ${originalTotalDuration} → ${totalDuration} frames (${playbackSpeed}x speed)`);
  
  // Warning for very slow speeds that might timeout Lambda
  if (playbackSpeed < 0.5 && totalDuration > 1800) { // > 1 minute at 0.5x speed
    console.warn(`[prepareRenderConfig] Long render detected: ${totalDuration} frames at ${playbackSpeed}x speed might timeout`);
  }
  
  const estimatedDurationMinutes = totalDuration / 30 / 60; // frames to minutes
  
  // Log icon pipeline summary (log-only, no UI). Snapshot then reset.
  try {
    console.log(
      `[Icons] Summary — local: ${iconMetrics.localHits}, api: ${iconMetrics.apiSuccess}/${iconMetrics.apiRequests}` +
      `, cache(mem): ${iconMetrics.apiCachedHits}, r2(reads/hits/writes): ${iconMetrics.r2Reads}/${iconMetrics.r2ReadHits}/${iconMetrics.r2Writes}` +
      `, placeholders: ${iconMetrics.fallbacks}, rateLimited: ${iconMetrics.rateLimited}, retries: ${iconMetrics.retries}`
    );
  } catch (_) {}
  // Reset counters for next export
  Object.assign(iconMetrics, {
    apiRequests: 0,
    apiSuccess: 0,
    apiFailures: 0,
    apiCachedHits: 0,
    localHits: 0,
    fallbacks: 0,
    rateLimited: 0,
    retries: 0,
    r2Reads: 0,
    r2ReadHits: 0,
    r2Writes: 0,
  });

  return {
    projectId,
    scenes: speedAdjustedScenes, // Use speed-adjusted scenes
    format,
    quality,
    settings,
    totalDuration,
    estimatedDurationMinutes,
    renderWidth,
    renderHeight,
    audio,
    playbackSpeed, // Include for debugging
    originalDuration: originalTotalDuration,
    // This will be used by Lambda
    inputProps: {
      scenes: speedAdjustedScenes, // Use speed-adjusted scenes
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

// Test helper: process raw TSX scene code through the same pipeline
// Used by unit tests to validate preprocess + icon replacement without full render config
export async function processSceneCode(tsxCode: string, sceneId: string = 'test-scene') {
  const scene = {
    id: sceneId,
    name: `Scene-${sceneId}`,
    tsxCode,
    duration: 150,
    order: 0,
  } as any;

  const processed = await preprocessSceneForLambda(scene);
  return processed.jsCode || processed.compiledCode || tsxCode;
}
