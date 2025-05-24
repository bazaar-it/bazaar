export interface TextRatioResult {
  textRatio: number;
  passes: boolean;
  textElements: string[];
  totalElements: number;
  recommendation?: string;
}

/**
 * Analyzes generated component code to determine text vs animation ratio
 * Helps ensure components focus on visual animations rather than text
 */
export function analyzeTextRatio(componentCode: string, threshold = 0.25): TextRatioResult {
  // Remove comments and strings to avoid false positives
  const cleanCode = componentCode
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/`[^`]*`/g, '') // Remove template literals
    .replace(/"[^"]*"/g, '') // Remove double-quoted strings
    .replace(/'[^']*'/g, ''); // Remove single-quoted strings

  // Count text-related elements
  const textElements: string[] = [];
  
  // JSX text elements
  const jsxTextMatches = cleanCode.match(/<(h[1-6]|p|span|div|text|title)[^>]*>.*?<\/\1>/gi) || [];
  textElements.push(...jsxTextMatches.map(match => match.trim()));
  
  // Text content in JSX
  const textContentMatches = cleanCode.match(/>\s*[A-Za-z][^<>]*\s*</g) || [];
  textElements.push(...textContentMatches.map(match => match.trim()));
  
  // String literals that look like display text (not CSS values)
  const stringLiterals = componentCode.match(/"[A-Za-z][^"]{3,}"/g) || [];
  const displayStrings = stringLiterals.filter(str => 
    !str.includes('#') && // Not a color
    !str.includes('px') && // Not a CSS value
    !str.includes('%') && // Not a percentage
    !str.includes('rgb') && // Not a color
    !str.includes('url') && // Not a URL
    str.length > 6 // Meaningful text
  );
  textElements.push(...displayStrings);

  // Count total visual/animation elements
  const animationElements = [
    // Animation functions
    ...(cleanCode.match(/interpolate\s*\(/g) || []),
    ...(cleanCode.match(/spring\s*\(/g) || []),
    ...(cleanCode.match(/interpolateColors\s*\(/g) || []),
    
    // Visual style properties
    ...(cleanCode.match(/transform\s*:/g) || []),
    ...(cleanCode.match(/scale\s*:/g) || []),
    ...(cleanCode.match(/rotate\s*:/g) || []),
    ...(cleanCode.match(/translate\s*:/g) || []),
    ...(cleanCode.match(/opacity\s*:/g) || []),
    ...(cleanCode.match(/backgroundColor\s*:/g) || []),
    ...(cleanCode.match(/borderRadius\s*:/g) || []),
    
    // Visual elements
    ...(cleanCode.match(/<div[^>]*style/gi) || []),
    ...(cleanCode.match(/<circle/gi) || []),
    ...(cleanCode.match(/<rect/gi) || []),
    ...(cleanCode.match(/<path/gi) || []),
    ...(cleanCode.match(/<svg/gi) || [])
  ];

  const totalElements = textElements.length + animationElements.length;
  const textRatio = totalElements > 0 ? textElements.length / totalElements : 0;
  const passes = textRatio <= threshold;

  let recommendation: string | undefined;
  if (!passes) {
    if (textRatio > 0.5) {
      recommendation = "Component is heavily text-focused. Consider replacing text with visual animations, shapes, or effects.";
    } else if (textRatio > threshold) {
      recommendation = "Component has moderate text content. Try to replace some text elements with visual animations.";
    }
  }

  return {
    textRatio: Math.round(textRatio * 100) / 100, // Round to 2 decimal places
    passes,
    textElements: textElements.slice(0, 5), // Show first 5 examples
    totalElements,
    recommendation
  };
}

/**
 * Quick test to check if a component passes the text ratio threshold
 */
export function passesTextRatioTest(componentCode: string, threshold = 0.25): boolean {
  return analyzeTextRatio(componentCode, threshold).passes;
}

/**
 * Generate a human-readable report of the text ratio analysis
 */
export function generateTextRatioReport(result: TextRatioResult): string {
  const status = result.passes ? '✅ PASS' : '❌ FAIL';
  const percentage = Math.round(result.textRatio * 100);
  
  let report = `Text Ratio Analysis: ${status}\n`;
  report += `Text ratio: ${percentage}% (threshold: 25%)\n`;
  report += `Total elements analyzed: ${result.totalElements}\n`;
  
  if (result.textElements.length > 0) {
    report += `\nText elements found:\n`;
    result.textElements.forEach((element, index) => {
      report += `  ${index + 1}. ${element.slice(0, 50)}${element.length > 50 ? '...' : ''}\n`;
    });
  }
  
  if (result.recommendation) {
    report += `\nRecommendation: ${result.recommendation}\n`;
  }
  
  return report;
} 