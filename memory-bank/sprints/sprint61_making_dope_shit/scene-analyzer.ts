/**
 * Analyzes a previous scene's code to extract style patterns
 * This helps maintain consistency when creating new scenes
 */
export function analyzePreviousScene(tsxCode: string) {
  const analysis = {
    timing: 'standard',
    colors: [] as string[],
    fonts: [] as string[],
    animationPatterns: [] as string[],
    layout: 'centered',
    averageAnimationDuration: 30,
    hasStagger: false,
    hasSpring: false,
    backgroundType: 'solid'
  };

  // Analyze timing by looking at interpolation ranges
  const interpolateMatches = tsxCode.matchAll(/interpolate\s*\(\s*\w+\s*,\s*\[(\d+)\s*,\s*(\d+)\]/g);
  const durations: number[] = [];
  
  for (const match of interpolateMatches) {
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    durations.push(end - start);
  }

  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    analysis.averageAnimationDuration = Math.round(avgDuration);
    
    if (avgDuration < 15) {
      analysis.timing = 'fast (8-15 frames)';
    } else if (avgDuration < 30) {
      analysis.timing = 'moderate (15-30 frames)';
    } else {
      analysis.timing = 'slow (30+ frames)';
    }
  }

  // Extract colors (hex, rgb, rgba)
  const hexColors = tsxCode.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) || [];
  const rgbColors = tsxCode.match(/rgba?\([^)]+\)/g) || [];
  analysis.colors = [...new Set([...hexColors, ...rgbColors])].slice(0, 5);

  // Extract font information
  const fontSizes = tsxCode.match(/fontSize:\s*["']([^"']+)["']/g) || [];
  const fontFamilies = tsxCode.match(/fontFamily:\s*["']([^"']+)["']/g) || [];
  const fontWeights = tsxCode.match(/fontWeight:\s*["']([^"']+)["']/g) || [];
  
  if (fontSizes.length > 0) {
    analysis.fonts.push(`sizes: ${fontSizes.map(f => f.split(':')[1].trim().replace(/['"]/g, '')).join(', ')}`);
  }
  if (fontFamilies.length > 0) {
    analysis.fonts.push(`family: ${fontFamilies[0].split(':')[1].trim().replace(/['"]/g, '')}`);
  }
  if (fontWeights.length > 0) {
    analysis.fonts.push(`weights: ${fontWeights.map(f => f.split(':')[1].trim().replace(/['"]/g, '')).join(', ')}`);
  }

  // Detect animation patterns
  if (tsxCode.includes('spring(')) {
    analysis.hasSpring = true;
    analysis.animationPatterns.push('spring physics');
  }
  
  if (tsxCode.includes('.map(') && tsxCode.includes('delay')) {
    analysis.hasStagger = true;
    analysis.animationPatterns.push('staggered entries');
  }

  if (tsxCode.includes('scale') || tsxCode.includes('transform')) {
    analysis.animationPatterns.push('scale transforms');
  }

  if (tsxCode.includes('opacity')) {
    analysis.animationPatterns.push('opacity fades');
  }

  if (tsxCode.includes('translateY') || tsxCode.includes('translateX')) {
    analysis.animationPatterns.push('position slides');
  }

  // Detect layout style
  if (tsxCode.includes('flexDirection')) {
    if (tsxCode.includes('"row"')) {
      analysis.layout = 'horizontal flex';
    } else if (tsxCode.includes('"column"')) {
      analysis.layout = 'vertical flex';
    }
  } else if (tsxCode.includes('grid')) {
    analysis.layout = 'grid';
  } else if (tsxCode.includes('position: "absolute"')) {
    analysis.layout = 'absolute positioning';
  }

  // Detect background type
  if (tsxCode.includes('gradient')) {
    analysis.backgroundType = 'gradient';
  } else if (tsxCode.includes('<Video')) {
    analysis.backgroundType = 'video';
  } else if (tsxCode.includes('<Img')) {
    analysis.backgroundType = 'image';
  }

  return analysis;
}

/**
 * Formats the analysis into a concise string for the prompt
 */
export function formatSceneAnalysis(analysis: ReturnType<typeof analyzePreviousScene>): string {
  const parts = [
    `Timing: ${analysis.timing}`,
    `Colors: ${analysis.colors.slice(0, 3).join(', ')}`,
    `Layout: ${analysis.layout}`,
    `Animations: ${analysis.animationPatterns.join(', ')}`,
  ];

  if (analysis.hasStagger) {
    parts.push('Uses staggered animations');
  }

  if (analysis.backgroundType !== 'solid') {
    parts.push(`Background: ${analysis.backgroundType}`);
  }

  return parts.join('\\n');
}