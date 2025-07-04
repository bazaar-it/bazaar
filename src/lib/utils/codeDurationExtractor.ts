/**
 * Extracts the actual duration from generated Remotion code by analyzing
 * interpolate() calls, animation timings, and frame-based logic.
 * 
 * This fixes the issue where scenes always show 6 seconds (180 frames) instead
 * of the actual animation duration specified in the generated code.
 */

/**
 * Duration Extractor - Extract scene duration from generated code
 * Simplified approach: Look for "export const durationInFrames = X;"
 */

/**
 * Helper function to convert seconds to frames at 30fps
 */
export function secondsToFrames(seconds: number): number {
  return Math.round(seconds * 30);
}

/**
 * Helper function to convert frames to seconds at 30fps
 */
export function framesToSeconds(frames: number): number {
  return Math.round((frames / 30) * 10) / 10; // Round to 1 decimal place
}

/**
 * Analyze code and provide a human-readable duration summary
 */
export function analyzeDuration(code: string): {
  frames: number;
  seconds: number;
  confidence: 'high' | 'medium' | 'low';
  source: string;
} {
  const frames = extractDurationFromCode(code);
  const seconds = framesToSeconds(frames);
  
  // Determine confidence based on what pattern was found
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let source = 'default fallback (180 frames)';
  
  if (code.includes('export const durationInFrames')) {
    // Check for literal number pattern
    const literalRegex = /export\s+const\s+durationInFrames\s*=\s*(\d+);?/;
    const literalMatch = literalRegex.exec(code);
    
    if (literalMatch && literalMatch[1]) {
      confidence = 'high';
      source = `literal export: durationInFrames = ${literalMatch[1]}`;
    } else {
      // Check for variable reference pattern
      const variableRegex = /export\s+const\s+durationInFrames\s*=\s*(\w+);?/;
      const variableMatch = variableRegex.exec(code);
      
      if (variableMatch && variableMatch[1] && code.includes('script.reduce')) {
        confidence = 'high';
        source = `calculated export: durationInFrames = ${variableMatch[1]} (from script.reduce)`;
      } else {
        confidence = 'medium';
        source = 'export statement found but could not parse calculation';
      }
    }
  }
  
  return {
    frames,
    seconds,
    confidence,
    source
  };
}

export function extractDurationFromCode(code: string): number {
  const DEFAULT_DURATION = 180; // 6 seconds at 30fps - fallback only
  const MAX_DURATION = 3600; // 2 minutes maximum (reasonable limit)
  
  try {
    // Clean the code for parsing
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    
    // Pattern 1: Direct literal number - export const durationInFrames = 123;
    const literalRegex = /export\s+const\s+durationInFrames\s*=\s*(\d+);?/;
    const literalMatch = literalRegex.exec(cleanCode);
    
    if (literalMatch && literalMatch[1]) {
      const frames = parseInt(literalMatch[1], 10);
      
      if (frames > 0 && frames <= MAX_DURATION) {
        console.log(`[DurationExtractor] ✅ Found literal duration: ${frames} frames (${Math.round(frames/30*10)/10}s)`);
        return frames;
      }
    }
    
    // Pattern 2: Variable reference - export const durationInFrames = totalFrames;
    const variableRegex = /export\s+const\s+durationInFrames\s*=\s*(\w+);?/;
    const variableMatch = variableRegex.exec(cleanCode);
    
    if (variableMatch && variableMatch[1]) {
      const variableName = variableMatch[1];
      
      // Look for: const totalFrames = script_[ID].reduce((s,i) => s + i.frames, 0);
      const calcRegex = new RegExp(`const\\s+${variableName}\\s*=\\s*script_\\w+\\.reduce\\(\\([^)]+\\)\\s*=>\\s*[^,]+\\+[^,]+\\.frames,\\s*0\\);?`);
      
      if (calcRegex.test(cleanCode)) {
        // Extract individual frame values from script array
        const frameRegex = /frames:\s*(\d+)/g;
        let totalCalculated = 0;
        let frameMatch;
        
        while ((frameMatch = frameRegex.exec(cleanCode)) !== null) {
          const frameValue = frameMatch[1] ? parseInt(frameMatch[1], 10) : NaN;
          if (!isNaN(frameValue) && frameValue > 0) {
            totalCalculated += frameValue;
          }
        }
        
        if (totalCalculated > 0 && totalCalculated <= MAX_DURATION) {
          console.log(`[DurationExtractor] ✅ Found calculated duration: ${totalCalculated} frames (${Math.round(totalCalculated/30*10)/10}s)`);
          return totalCalculated;
        }
      }
    }
    
    console.log(`[DurationExtractor] ⚠️ No valid duration pattern found, using default: ${DEFAULT_DURATION}`);
    return DEFAULT_DURATION;
    
  } catch (error) {
    console.log(`[DurationExtractor] ❌ Error parsing code: ${error}, using default: ${DEFAULT_DURATION}`);
    return DEFAULT_DURATION;
  }
} 