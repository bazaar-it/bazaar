/**
 * Extracts the actual duration from generated Remotion code by analyzing
 * interpolate() calls, animation timings, and frame-based logic.
 * 
 * This fixes the issue where scenes always show 6 seconds (180 frames) instead
 * of the actual animation duration specified in the generated code.
 */

interface AnimationRange {
  startFrame: number;
  endFrame: number;
  purpose: string; // fadeIn, slideUp, etc.
}

/**
 * Calculate intelligent scene duration by adding buffers based on animation complexity
 */
function calculateSmartDuration(rawAnimationDuration: number, code: string, ranges: AnimationRange[]): number {
  const MIN_PRACTICAL_DURATION = 60; // 2 seconds minimum for any scene
  const BUFFER_FRAMES = 30; // 1 second buffer for breathing room
  
  // Start with the raw animation duration
  let smartDuration = rawAnimationDuration;
  
  // Always add a basic buffer for breathing room
  smartDuration += BUFFER_FRAMES;
  
  // Add complexity-based adjustments
  const codeLength = code.length;
  const animationCount = ranges.length;
  const hasMultipleAnimations = animationCount > 1;
  const hasComplexLogic = code.includes('if') || code.includes('switch') || code.includes('map');
  
  // Extra buffer for complex scenes
  if (codeLength > 2000 || hasMultipleAnimations || hasComplexLogic) {
    smartDuration += 15; // Extra 0.5 seconds for complex scenes
  }
  
  // Ensure minimum practical duration
  smartDuration = Math.max(smartDuration, MIN_PRACTICAL_DURATION);
  
  return smartDuration;
}

export function extractDurationFromCode(code: string): number {
  const DEFAULT_DURATION = 180; // 6 seconds at 30fps - fallback only
  const MIN_ANIMATION_DURATION = 30; // 1 second minimum for valid animation detection
  const MIN_PRACTICAL_DURATION = 60; // 2 seconds minimum for a practical scene
  const MAX_DURATION = 900; // 30 seconds maximum
  
  try {
    // Remove comments and clean the code for parsing
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    
    const ranges: AnimationRange[] = [];
    
    // Pattern 1: Direct interpolate calls with frame ranges
    // Example: interpolate(frame, [0, 90], [0, 1])
    const interpolateRegex = /interpolate\s*\(\s*\w+\s*,\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g;
    let match;
    
    while ((match = interpolateRegex.exec(cleanCode)) !== null) {
      const startFrame = match[1] ? parseInt(match[1], 10) : NaN;
      const endFrame = match[2] ? parseInt(match[2], 10) : NaN;
      
      if (!isNaN(startFrame) && !isNaN(endFrame) && endFrame > startFrame) {
        ranges.push({
          startFrame,
          endFrame,
          purpose: 'interpolate'
        });
      }
    }
    
    // Pattern 2: Spring animations with durationInFrames
    // Example: spring({frame, fps, from: 0, to: 1, durationInFrames: fps * 0.8})
    const springRegex = /spring\s*\(\s*\{[^}]*durationInFrames:\s*fps\s*\*\s*([\d.]+)[^}]*\}/g;
    while ((match = springRegex.exec(cleanCode)) !== null) {
      const multiplier = match[1] ? parseFloat(match[1]) : NaN;
      if (!isNaN(multiplier) && multiplier > 0) {
        const durationFrames = Math.round(30 * multiplier); // Assume 30fps
        ranges.push({
          startFrame: 0,
          endFrame: durationFrames,
          purpose: 'spring-animation'
        });
      }
    }
    
    // Pattern 3: Frame offset patterns (for staggered animations)
    // Example: frame - 38, frame - 16
    const frameOffsetRegex = /frame\s*-\s*(\d+)/g;
    while ((match = frameOffsetRegex.exec(cleanCode)) !== null) {
      const offset = match[1] ? parseInt(match[1], 10) : NaN;
      if (!isNaN(offset) && offset > 0) {
        ranges.push({
          startFrame: offset,
          endFrame: offset + 30, // Assume at least 1 second of animation after offset
          purpose: 'frame-offset'
        });
      }
    }
    
    // Pattern 4: FPS-based duration patterns
    // Example: fps * 0.8, fps * 1.5
    const fpsDurationRegex = /fps\s*\*\s*([\d.]+)/g;
    while ((match = fpsDurationRegex.exec(cleanCode)) !== null) {
      const multiplier = match[1] ? parseFloat(match[1]) : NaN;
      if (!isNaN(multiplier) && multiplier > 0) {
        const durationFrames = Math.round(30 * multiplier); // Assume 30fps
        ranges.push({
          startFrame: 0,
          endFrame: durationFrames,
          purpose: 'fps-duration'
        });
      }
    }

    // Pattern 5: useCurrentFrame with explicit frame checks
    // Example: frame < 60, frame > 120
    const frameComparisonRegex = /frame\s*[<>]=?\s*(\d+)/g;
    while ((match = frameComparisonRegex.exec(cleanCode)) !== null) {
      const frameValue = match[1] ? parseInt(match[1], 10) : NaN;
      if (!isNaN(frameValue) && frameValue > 0) {
        ranges.push({
          startFrame: 0,
          endFrame: frameValue,
          purpose: 'frame-comparison'
        });
      }
    }
    
    // Pattern 6: Animation duration comments or constants
    // Example: // Duration: 3 seconds, const DURATION = 90
    const durationCommentRegex = /(?:duration|DURATION).*?(\d+).*?(?:second|frame)/gi;
    while ((match = durationCommentRegex.exec(cleanCode)) !== null) {
      const value = match[1] ? parseInt(match[1], 10) : NaN;
      if (!isNaN(value)) {
        // If it's seconds, convert to frames (assuming 30fps)
        const frames = match[0] && match[0].toLowerCase().includes('second') ? value * 30 : value;
        if (frames > 0) {
          ranges.push({
            startFrame: 0,
            endFrame: frames,
            purpose: 'duration-comment'
          });
        }
      }
    }
    
    // Pattern 7: Sequence-based animations with delays
    // Example: delay + duration patterns
    const sequenceRegex = /(\w+)\s*\+\s*(\d+)|delay.*?(\d+).*?duration.*?(\d+)/gi;
    while ((match = sequenceRegex.exec(cleanCode)) !== null) {
      // Look for delay + duration patterns
      const delay = match[3] ? parseInt(match[3], 10) : 0;
      const duration = match[4] ? parseInt(match[4], 10) : (match[2] ? parseInt(match[2], 10) : 0);
      
      if (!isNaN(delay) && !isNaN(duration) && duration > 0) {
        ranges.push({
          startFrame: delay,
          endFrame: delay + duration,
          purpose: 'sequence'
        });
      }
    }
    
    // If no ranges found, look for any numeric values that might represent frames
    if (ranges.length === 0) {
      const numberRegex = /\b(\d{2,3})\b/g;
      const numbers: number[] = [];
      
      while ((match = numberRegex.exec(cleanCode)) !== null) {
        const num = match[1] ? parseInt(match[1], 10) : NaN;
        // Only consider reasonable frame numbers (between 30 and 900)
        if (!isNaN(num) && num >= MIN_ANIMATION_DURATION && num <= MAX_DURATION) {
          numbers.push(num);
        }
      }
      
      if (numbers.length > 0) {
        // Use the largest reasonable number as likely duration
        const maxFrames = Math.max(...numbers);
        ranges.push({
          startFrame: 0,
          endFrame: maxFrames,
          purpose: 'numeric-heuristic'
        });
      }
    }
    
    // Calculate the maximum end frame from all ranges
    if (ranges.length > 0) {
      const rawAnimationDuration = Math.max(...ranges.map(r => r.endFrame));
      
      // Validate the extracted animation duration
      if (rawAnimationDuration >= MIN_ANIMATION_DURATION && rawAnimationDuration <= MAX_DURATION) {
        // 🧠 SMART DURATION: Add intelligent buffer based on animation complexity
        const smartDuration = calculateSmartDuration(rawAnimationDuration, code, ranges);
        
        console.log(`[CodeDurationExtractor] Raw animation: ${rawAnimationDuration} frames → Smart duration: ${smartDuration} frames from ${ranges.length} range(s)`);
        console.log(`[CodeDurationExtractor] Ranges found:`, ranges);
        return smartDuration;
      } else {
        console.warn(`[CodeDurationExtractor] Extracted duration ${rawAnimationDuration} frames is outside valid range (${MIN_ANIMATION_DURATION}-${MAX_DURATION}), using default`);
      }
    }
    
    console.warn(`[CodeDurationExtractor] No valid animation ranges found in code, using default ${DEFAULT_DURATION} frames`);
    return DEFAULT_DURATION;
    
  } catch (error) {
    console.error('[CodeDurationExtractor] Error parsing code:', error);
    return DEFAULT_DURATION;
  }
}

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
  
  // Determine confidence based on what was found in the code
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let source = 'default fallback';
  
  if (code.includes('spring(') && code.includes('durationInFrames')) {
    confidence = 'high';
    source = 'spring animations + smart buffer';
  } else if (code.includes('interpolate(')) {
    confidence = 'high';
    source = 'interpolate calls + smart buffer';
  } else if (code.includes('fps *') || /frame\s*-\s*\d+/.test(code)) {
    confidence = 'medium';
    source = 'fps timing + frame offsets + smart buffer';
  } else if (code.includes('frame')) {
    confidence = 'medium';
    source = 'frame logic + smart buffer';
  } else if (/\b\d{2,3}\b/.test(code)) {
    confidence = 'low';
    source = 'numeric heuristics + smart buffer';
  }
  
  return {
    frames,
    seconds,
    confidence,
    source
  };
} 