/**
 * Smart transition context extraction
 * Provides previous scene context for smooth transitions without overwhelming the AI
 */

export function getSmartTransitionContext(previousCode: string): string {
  // For reasonable sized scenes, include everything
  if (previousCode.length <= 15000) { // ~400 lines worth
    return previousCode;
  }
  
  // For bigger scenes, find the return statement
  const returnIndex = previousCode.indexOf('return (');
  
  if (returnIndex !== -1) {
    // Get ~1000 chars before return + everything after
    const startIndex = Math.max(0, returnIndex - 1000);
    const extracted = previousCode.slice(startIndex);
    
    // Add a comment to indicate this is partial
    return `// ... previous code omitted for brevity ...\n\n${extracted}`;
  }
  
  // Fallback: last third of the code
  const lastThirdStart = Math.floor(previousCode.length * 0.66);
  return `// ... first part of code omitted ...\n\n${previousCode.slice(lastThirdStart)}`;
}

/**
 * Check if we should treat this as a continuation vs new scene
 */
export function shouldContinueScene(userPrompt: string, previousSceneDuration?: number): boolean {
  const promptLower = userPrompt.toLowerCase();
  
  // Keywords that suggest continuation
  const continueKeywords = ['add', 'continue', 'then', 'next', 'also', 'and then', 'after that'];
  const hasContinueKeyword = continueKeywords.some(keyword => promptLower.includes(keyword));
  
  // Don't continue if previous scene is already long
  const previousSceneIsShort = !previousSceneDuration || previousSceneDuration < 150; // 5 seconds
  
  return hasContinueKeyword && previousSceneIsShort;
}