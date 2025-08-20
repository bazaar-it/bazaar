/**
 * Utility to fix missing Remotion imports in generated code
 * This is a critical issue causing many auto-fix failures
 * 
 * Common missing imports:
 * - spring, interpolate, Easing from Remotion
 * - fps from useVideoConfig when using spring
 * - useEffect, useState from React
 */

interface ImportAnalysis {
  hasSpring: boolean;
  hasInterpolate: boolean;
  hasEasing: boolean;
  hasSequence: boolean;
  hasUseCurrentFrame: boolean;
  hasUseVideoConfig: boolean;
  needsFps: boolean;
  hasUseEffect: boolean;
  hasUseState: boolean;
  hasImg: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  hasStaticFile: boolean;
}

export function analyzeRemotionUsage(code: string): ImportAnalysis {
  return {
    // Remotion functions
    hasSpring: /\bspring\s*\(/g.test(code),
    hasInterpolate: /\binterpolate\s*\(/g.test(code),
    hasEasing: /\bEasing\./g.test(code),
    hasSequence: /\<Sequence\b/g.test(code),
    hasUseCurrentFrame: /\buseCurrentFrame\s*\(/g.test(code),
    hasUseVideoConfig: /\buseVideoConfig\s*\(/g.test(code),
    needsFps: /\bspring\s*\(/g.test(code), // spring requires fps
    // React hooks
    hasUseEffect: /window\.React\.useEffect|useEffect\s*\(/g.test(code),
    hasUseState: /window\.React\.useState|useState\s*\(/g.test(code),
    // Media components
    hasImg: /\<Img\b/g.test(code),
    hasAudio: /\<Audio\b/g.test(code),
    hasVideo: /\<Video\b/g.test(code),
    hasStaticFile: /\bstaticFile\s*\(/g.test(code),
  };
}

export function fixMissingRemotionImports(code: string): string {
  console.log('[REMOTION IMPORTS FIX] Starting analysis');
  
  const usage = analyzeRemotionUsage(code);
  
  // Check if we already have the destructuring statement
  const hasDestructuring = /const\s*\{[^}]*\}\s*=\s*window\.Remotion/g.test(code);
  
  if (!hasDestructuring) {
    console.log('[REMOTION IMPORTS FIX] No Remotion destructuring found - adding complete import');
    // Add complete destructuring at the beginning
    const imports = buildRemotionImports(usage);
    return imports + '\n\n' + code;
  }
  
  // Fix existing destructuring
  const destructuringMatch = code.match(/const\s*\{([^}]*)\}\s*=\s*window\.Remotion/);
  if (!destructuringMatch) return code;
  
  const currentImports = destructuringMatch[1].split(',').map(s => s.trim());
  const neededImports = getNeededImports(usage);
  
  // Check what's missing
  const missingImports = neededImports.filter(imp => 
    !currentImports.some(curr => curr === imp || curr.startsWith(imp + ':'))
  );
  
  if (missingImports.length === 0) {
    console.log('[REMOTION IMPORTS FIX] All required imports present');
    
    // Special case: Check if spring is used but fps is not available
    if (usage.hasSpring && !usage.hasUseVideoConfig) {
      console.warn('[REMOTION IMPORTS FIX] spring used but useVideoConfig not imported - adding it');
      return fixMissingFpsForSpring(code);
    }
    
    return code;
  }
  
  console.warn(`[REMOTION IMPORTS FIX] Missing imports: ${missingImports.join(', ')}`);
  
  // Add missing imports to the destructuring
  const allImports = [...currentImports, ...missingImports];
  const newDestructuring = `const { ${allImports.join(', ')} } = window.Remotion`;
  
  let fixed = code.replace(
    /const\s*\{[^}]*\}\s*=\s*window\.Remotion/,
    newDestructuring
  );
  
  // If spring is used, ensure fps is available
  if (usage.hasSpring && !usage.hasUseVideoConfig) {
    fixed = fixMissingFpsForSpring(fixed);
  }
  
  return fixed;
}

function buildRemotionImports(usage: ImportAnalysis): string {
  const imports = ['AbsoluteFill']; // Always include AbsoluteFill
  
  if (usage.hasUseCurrentFrame) imports.push('useCurrentFrame');
  if (usage.hasUseVideoConfig || usage.needsFps) imports.push('useVideoConfig');
  if (usage.hasInterpolate) imports.push('interpolate');
  if (usage.hasSpring) imports.push('spring');
  if (usage.hasEasing) imports.push('Easing');
  if (usage.hasSequence) imports.push('Sequence');
  if (usage.hasImg) imports.push('Img');
  if (usage.hasAudio) imports.push('Audio');
  if (usage.hasVideo) imports.push('Video');
  if (usage.hasStaticFile) imports.push('staticFile');
  
  return `const { ${imports.join(', ')} } = window.Remotion;`;
}

function getNeededImports(usage: ImportAnalysis): string[] {
  const imports: string[] = [];
  
  if (usage.hasUseCurrentFrame) imports.push('useCurrentFrame');
  if (usage.hasUseVideoConfig || usage.needsFps) imports.push('useVideoConfig');
  if (usage.hasInterpolate) imports.push('interpolate');
  if (usage.hasSpring) imports.push('spring');
  if (usage.hasEasing) imports.push('Easing');
  if (usage.hasSequence) imports.push('Sequence');
  if (usage.hasImg) imports.push('Img');
  if (usage.hasAudio) imports.push('Audio');
  if (usage.hasVideo) imports.push('Video');
  if (usage.hasStaticFile) imports.push('staticFile');
  
  return imports;
}

function fixMissingFpsForSpring(code: string): string {
  // Check if fps is already being extracted from useVideoConfig
  if (/const\s*\{[^}]*fps[^}]*\}\s*=\s*useVideoConfig\(\)/.test(code)) {
    console.log('[REMOTION IMPORTS FIX] fps already extracted from useVideoConfig');
    return code;
  }
  
  // Check if useVideoConfig is called but fps not extracted
  const configMatch = code.match(/const\s*\{([^}]*)\}\s*=\s*useVideoConfig\(\)/);
  if (configMatch) {
    const currentExtracts = configMatch[1].split(',').map(s => s.trim());
    if (!currentExtracts.includes('fps')) {
      console.warn('[REMOTION IMPORTS FIX] Adding fps to useVideoConfig destructuring');
      currentExtracts.push('fps');
      const newExtract = `const { ${currentExtracts.join(', ')} } = useVideoConfig()`;
      return code.replace(/const\s*\{[^}]*\}\s*=\s*useVideoConfig\(\)/, newExtract);
    }
  } else {
    // No useVideoConfig call at all - add it after useCurrentFrame
    console.warn('[REMOTION IMPORTS FIX] Adding useVideoConfig() call for fps');
    const frameMatch = code.match(/(const\s+frame\s*=\s*useCurrentFrame\(\);?)/);
    if (frameMatch) {
      const insertion = frameMatch[0] + '\n  const { fps } = useVideoConfig();';
      return code.replace(frameMatch[0], insertion);
    }
  }
  
  return code;
}

/**
 * Fix spring animations that are missing fps parameter
 */
export function fixSpringFpsParameter(code: string): string {
  console.log('[SPRING FPS FIX] Checking for spring calls without fps');
  
  // Check if any spring calls exist
  if (!code.includes('spring(')) {
    console.log('[SPRING FPS FIX] No spring usage detected');
    return code;
  }
  
  let fixed = code;
  let changesMade = false;
  
  // Pattern 1: spring({ frame, config: ... }) -> spring({ frame, fps, config: ... })
  if (/spring\s*\(\s*\{\s*frame\s*:\s*\w+\s*,\s*(?!fps)/.test(fixed)) {
    fixed = fixed.replace(
      /spring\s*\(\s*\{\s*frame\s*:\s*(\w+)\s*,\s*(?!fps)/g,
      'spring({ frame: $1, fps, '
    );
    changesMade = true;
  }
  
  // Pattern 2: spring({ frame, ... }) without colon -> spring({ frame, fps, ... })
  if (/spring\s*\(\s*\{\s*frame\s*,\s*(?!fps)/.test(fixed)) {
    fixed = fixed.replace(
      /spring\s*\(\s*\{\s*frame\s*,\s*(?!fps)/g,
      'spring({ frame, fps, '
    );
    changesMade = true;
  }
  
  // Pattern 3: spring({ frame }) -> spring({ frame, fps })
  if (/spring\s*\(\s*\{\s*frame\s*\}\s*\)/.test(fixed)) {
    fixed = fixed.replace(
      /spring\s*\(\s*\{\s*frame\s*\}\s*\)/g,
      'spring({ frame, fps })'
    );
    changesMade = true;
  }
  
  // Pattern 4: spring({ frame: varName }) -> spring({ frame: varName, fps })
  if (/spring\s*\(\s*\{\s*frame\s*:\s*\w+\s*\}\s*\)/.test(fixed)) {
    fixed = fixed.replace(
      /spring\s*\(\s*\{\s*frame\s*:\s*(\w+)\s*\}\s*\)/g,
      'spring({ frame: $1, fps })'
    );
    changesMade = true;
  }
  
  if (changesMade) {
    console.warn('[SPRING FPS FIX] Fixed spring calls to include fps parameter');
  } else {
    console.log('[SPRING FPS FIX] All spring calls already have fps parameter');
  }
  
  return fixed;
}

/**
 * Main export - applies all Remotion import fixes
 */
export function fixAllRemotionImports(code: string): string {
  let fixed = code;
  
  // First fix missing imports
  fixed = fixMissingRemotionImports(fixed);
  
  // Then fix spring fps parameters
  fixed = fixSpringFpsParameter(fixed);
  
  return fixed;
}