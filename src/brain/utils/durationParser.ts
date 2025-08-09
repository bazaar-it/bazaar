/**
 * Duration Parser Utility
 * Extracts duration from natural language prompts and converts to frames
 * 
 * Examples:
 * - "5 seconds" → 150 frames
 * - "2.5s" → 75 frames  
 * - "90 frames" → 90 frames
 * - "make it 3 sec" → 90 frames
 */

export function parseDurationFromPrompt(prompt: string): number | undefined {
  // IMPORTANT: Exclude YouTube URL parameters like t=51s
  // Remove YouTube URLs before parsing to avoid confusion
  const cleanedPrompt = prompt.replace(/[?&]t=\d+s?/g, '');
  
  // Match various duration patterns
  // Patterns for seconds: "5 seconds", "5 second", "5s", "5 sec", "5.5 seconds"
  const secondsMatch = cleanedPrompt.match(/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/i);
  
  // Patterns for frames: "90 frames", "90 frame", "90f"
  const framesMatch = cleanedPrompt.match(/(\d+)\s*(?:frames?|f)\b/i);
  
  // Convert seconds to frames (30fps standard)
  if (secondsMatch && secondsMatch[1]) {
    const seconds = parseFloat(secondsMatch[1]);
    const frames = Math.round(seconds * 30);
    
    // Sanity check: between 0.5 seconds (15 frames) and 60 seconds (1800 frames)
    if (frames >= 15 && frames <= 1800) {
      console.log(`🕐 [DurationParser] Parsed "${prompt}" → ${seconds}s → ${frames} frames`);
      return frames;
    }
  }
  
  // Direct frame specification
  if (framesMatch && framesMatch[1]) {
    const frames = parseInt(framesMatch[1], 10);
    
    // Sanity check: between 15 frames (0.5s) and 1800 frames (60s)
    if (frames >= 15 && frames <= 1800) {
      console.log(`🕐 [DurationParser] Parsed "${prompt}" → ${frames} frames`);
      return frames;
    }
  }
  
  // No explicit duration found
  return undefined;
}

/**
 * Helper to format frames as human readable duration
 */
export function framesToReadable(frames: number): string {
  const seconds = frames / 30;
  if (seconds % 1 === 0) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  return `${seconds.toFixed(1)} seconds`;
}