/**
 * Extracts colors from scene code for timeline visualization
 */

interface ExtractedColors {
  primary: string;
  secondary?: string;
  gradient?: string;
}

export function extractSceneColors(code: string): ExtractedColors {
  const colors: string[] = [];
  
  // Regex patterns for different color formats
  const patterns = [
    // Hex colors
    /#[a-fA-F0-9]{6}\b/g,
    /#[a-fA-F0-9]{3}\b/g,
    // RGB/RGBA
    /rgb\([^)]+\)/g,
    /rgba\([^)]+\)/g,
    // HSL/HSLA
    /hsl\([^)]+\)/g,
    /hsla\([^)]+\)/g,
    // Tailwind colors (common ones)
    /(?:bg-|text-|border-)(red|blue|green|yellow|purple|pink|orange|cyan|emerald|teal|indigo|violet|fuchsia|rose|sky|lime|amber)(?:-\d{1,3})?/g,
    // CSS color names
    /\b(red|blue|green|yellow|purple|pink|orange|cyan|black|white|gray|brown|violet|indigo|turquoise|magenta|lime|navy|teal|aqua|maroon|olive|silver|gold)\b/gi,
    // Linear gradients
    /linear-gradient\([^)]+\)/g,
    /radial-gradient\([^)]+\)/g,
  ];
  
  // Extract all colors from code
  patterns.forEach(pattern => {
    const matches = code.match(pattern) || [];
    colors.push(...matches);
  });
  
  // Process and normalize colors
  const processedColors = colors.map(color => {
    // Convert Tailwind colors to hex approximations
    if (color.includes('bg-') || color.includes('text-') || color.includes('border-')) {
      return tailwindToHex(color);
    }
    // Convert CSS color names to hex
    if (isColorName(color)) {
      return colorNameToHex(color);
    }
    return color;
  }).filter(Boolean);
  
  // Remove duplicates and prioritize
  const uniqueColors = [...new Set(processedColors)];
  
  // Check for gradients
  const gradientMatch = code.match(/linear-gradient\([^)]+\)|radial-gradient\([^)]+\)/);
  if (gradientMatch) {
    const gradientColors = extractGradientColors(gradientMatch[0]);
    if (gradientColors.length >= 2) {
      return {
        primary: gradientColors[0],
        secondary: gradientColors[1],
        gradient: `linear-gradient(90deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`
      };
    }
  }
  
  // Return extracted colors
  if (uniqueColors.length === 0) {
    // Default colors if none found
    return {
      primary: '#6366f1', // Indigo
      gradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)'
    };
  } else if (uniqueColors.length === 1) {
    return {
      primary: uniqueColors[0],
      gradient: createMonochromaticGradient(uniqueColors[0])
    };
  } else {
    return {
      primary: uniqueColors[0],
      secondary: uniqueColors[1],
      gradient: `linear-gradient(90deg, ${uniqueColors[0]} 0%, ${uniqueColors[1]} 100%)`
    };
  }
}

function extractGradientColors(gradient: string): string[] {
  const colors: string[] = [];
  const colorPattern = /(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\))/g;
  const matches = gradient.match(colorPattern) || [];
  return matches;
}

function createMonochromaticGradient(color: string): string {
  // Create a gradient from the color to a lighter/darker version
  const lighterColor = adjustColorBrightness(color, 20);
  return `linear-gradient(90deg, ${color} 0%, ${lighterColor} 100%)`;
}

function adjustColorBrightness(color: string, percent: number): string {
  // Simple brightness adjustment for hex colors
  if (color.startsWith('#')) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }
  return color;
}

function tailwindToHex(tailwindClass: string): string {
  // Extract color and shade
  const match = tailwindClass.match(/(red|blue|green|yellow|purple|pink|orange|cyan|emerald|teal|indigo|violet|fuchsia|rose|sky|lime|amber)(?:-(\d{1,3}))?/);
  if (!match) return '';
  
  const [, color, shade = '500'] = match;
  
  // Simplified Tailwind color palette (most common shades)
  const palette: Record<string, Record<string, string>> = {
    red: { '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c' },
    blue: { '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8' },
    green: { '500': '#10b981', '600': '#059669', '700': '#047857' },
    yellow: { '500': '#eab308', '600': '#ca8a04', '700': '#a16207' },
    purple: { '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce' },
    pink: { '500': '#ec4899', '600': '#db2777', '700': '#be185d' },
    orange: { '500': '#f97316', '600': '#ea580c', '700': '#c2410c' },
    cyan: { '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490' },
    emerald: { '500': '#10b981', '600': '#059669', '700': '#047857' },
    indigo: { '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca' },
    violet: { '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9' },
    teal: { '500': '#14b8a6', '600': '#0d9488', '700': '#0f766e' },
  };
  
  return palette[color]?.[shade] || palette[color]?.['500'] || '#6366f1';
}

function isColorName(str: string): boolean {
  const colorNames = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange', 'cyan', 'black', 'white', 'gray', 'brown', 'violet', 'indigo', 'turquoise', 'magenta', 'lime', 'navy', 'teal', 'aqua', 'maroon', 'olive', 'silver', 'gold'];
  return colorNames.includes(str.toLowerCase());
}

function colorNameToHex(name: string): string {
  const colors: Record<string, string> = {
    red: '#ff0000',
    blue: '#0000ff',
    green: '#008000',
    yellow: '#ffff00',
    purple: '#800080',
    pink: '#ffc0cb',
    orange: '#ffa500',
    cyan: '#00ffff',
    black: '#000000',
    white: '#ffffff',
    gray: '#808080',
    brown: '#a52a2a',
    violet: '#ee82ee',
    indigo: '#4b0082',
    turquoise: '#40e0d0',
    magenta: '#ff00ff',
    lime: '#00ff00',
    navy: '#000080',
    teal: '#008080',
    aqua: '#00ffff',
    maroon: '#800000',
    olive: '#808000',
    silver: '#c0c0c0',
    gold: '#ffd700',
  };
  return colors[name.toLowerCase()] || '#6366f1';
}