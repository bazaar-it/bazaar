/**
 * Font Registry V2 - Complete Motion Graphics Font Library
 * Manages 100 fonts with intelligent loading and fallback
 */

import { MOTION_GRAPHICS_FONTS, SMART_FONT_FALLBACKS } from './motion-graphics-fonts';

// R2 base URL for fonts
const FONT_BASE_URL = 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/fonts';

export type FontVariant = { 
  url: string; 
  weight?: string;
  style?: string;
};

export type FontEntry = { 
  family: string; 
  variants: FontVariant[];
  category: string;
  variable?: boolean;
};

/**
 * Convert font definition to FontEntry with R2 URLs
 */
function createFontEntry(fontDef: any, category: string): FontEntry {
  const { family, weights, variable } = fontDef;
  
  // If variable font exists, use single file
  if (variable) {
    const variableUrl = `${FONT_BASE_URL}/${family.replace(/\s+/g, '')}-Variable.woff2`;
    
    // Check if variable file exists (we'll try it first)
    return {
      family,
      category,
      variable: true,
      variants: [{
        url: variableUrl,
        weight: weights.join(','), // Store all weights for reference
      }]
    };
  }
  
  // Otherwise create individual weight entries
  const variants: FontVariant[] = weights.map((weight: string) => {
    const weightName = getWeightName(weight);
    const filename = `${family.replace(/\s+/g, '')}-${weightName}.woff2`;
    
    return {
      url: `${FONT_BASE_URL}/${filename}`,
      weight,
      style: 'normal',
    };
  });
  
  return {
    family,
    category,
    variable: false,
    variants,
  };
}

/**
 * Convert weight number to filename part
 */
function getWeightName(weight: string): string {
  const names: Record<string, string> = {
    '100': 'Thin',
    '200': 'ExtraLight',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
    '900': 'Black',
  };
  return names[weight] || weight;
}

/**
 * Core fonts that are always loaded (top 20 UI fonts)
 */
export const CORE_FONTS_LIST = MOTION_GRAPHICS_FONTS['core-ui'].map(font => 
  createFontEntry(font, 'core-ui')
);

/**
 * All fonts organized by category
 */
export const ALL_FONTS_BY_CATEGORY: Record<string, FontEntry[]> = {};
for (const [category, fonts] of Object.entries(MOTION_GRAPHICS_FONTS)) {
  ALL_FONTS_BY_CATEGORY[category] = fonts.map(font => 
    createFontEntry(font, category)
  );
}

/**
 * Flat list of all fonts
 */
export const ALL_FONTS_LIST = Object.values(ALL_FONTS_BY_CATEGORY).flat();

/**
 * Quick lookup map for all fonts
 */
export const FONT_LOOKUP_MAP: Record<string, FontEntry> = {};
for (const category of Object.values(ALL_FONTS_BY_CATEGORY)) {
  for (const font of category) {
    FONT_LOOKUP_MAP[font.family] = font;
  }
}

/**
 * Get the best fallback for an unsupported font
 */
function getBestFallback(requestedFont: string): string {
  // Clean the font name
  const cleanFont = requestedFont.trim().replace(/['"]/g, '');
  
  // Check if it's already supported
  if (ALL_FONTS_LIST.some(f => f.family === cleanFont)) {
    return cleanFont;
  }
  
  // Check direct fallback mapping
  if (SMART_FONT_FALLBACKS[cleanFont]) {
    console.log(`[Font Fallback] ${cleanFont} → ${SMART_FONT_FALLBACKS[cleanFont]}`);
    return SMART_FONT_FALLBACKS[cleanFont];
  }
  
  // Try to match by similarity (e.g., "Inter UI" → "Inter")
  const lowerFont = cleanFont.toLowerCase();
  for (const font of ALL_FONTS_LIST) {
    if (lowerFont.includes(font.family.toLowerCase()) || 
        font.family.toLowerCase().includes(lowerFont)) {
      console.log(`[Font Fallback] ${cleanFont} → ${font.family} (partial match)`);
      return font.family;
    }
  }
  
  // Default fallback
  console.log(`[Font Fallback] ${cleanFont} → Inter (default)`);
  return 'Inter';
}

/**
 * Get font entry with intelligent fallback
 */
export function getFontEntry(fontFamily: string): FontEntry | null {
  // Clean the font name
  const cleanFont = fontFamily.trim().replace(/['"]/g, '');
  
  // Direct match
  if (FONT_LOOKUP_MAP[cleanFont]) {
    return FONT_LOOKUP_MAP[cleanFont];
  }
  
  // Try fallback
  const fallback = getBestFallback(cleanFont);
  if (fallback && FONT_LOOKUP_MAP[fallback]) {
    console.log(`[Font Registry] Mapping ${cleanFont} to ${fallback}`);
    return FONT_LOOKUP_MAP[fallback];
  }
  
  // Default to Inter
  console.warn(`[Font Registry] Unknown font ${cleanFont}, using Inter`);
  return FONT_LOOKUP_MAP['Inter'];
}

/**
 * Extract font families from scene code
 */
export function extractFontsFromCode(code: string): string[] {
  const fontFamilies = new Set<string>();
  
  // Match fontFamily in various formats
  const patterns = [
    /fontFamily:\s*["']([^"']+)["']/g,
    /fontFamily:\s*`([^`]+)`/g,
    /font-family:\s*["']([^"']+)["']/g,
  ];
  
  for (const pattern of patterns) {
    const matches = [...code.matchAll(pattern)];
    for (const match of matches) {
      const fontString = match[1];
      // Extract just the first font if it's a font stack
      const primaryFont = fontString.split(',')[0].trim().replace(/["']/g, '');
      fontFamilies.add(primaryFont);
    }
  }
  
  return Array.from(fontFamilies);
}

/**
 * Get URLs for fonts that need to be loaded
 */
export function getFontUrlsToLoad(fontFamilies: string[]): Array<{family: string, url: string, weight?: string}> {
  const urls: Array<{family: string, url: string, weight?: string}> = [];
  const processedFamilies = new Set<string>();
  
  for (const family of fontFamilies) {
    // Avoid duplicates
    if (processedFamilies.has(family)) continue;
    processedFamilies.add(family);
    
    const fontEntry = getFontEntry(family);
    if (!fontEntry) continue;
    
    // Add all variants for this font
    for (const variant of fontEntry.variants) {
      urls.push({
        family: fontEntry.family,
        url: variant.url,
        weight: variant.weight,
      });
    }
  }
  
  return urls;
}

/**
 * Check if a font is in the core set (always loaded)
 */
export function isCoreFont(family: string): boolean {
  return CORE_FONTS_LIST.some(font => font.family === family);
}

/**
 * Get category for a font
 */
export function getFontCategory(family: string): string | null {
  for (const [category, fonts] of Object.entries(ALL_FONTS_BY_CATEGORY)) {
    if (fonts.some(f => f.family === family)) {
      return category;
    }
  }
  return null;
}

// Export for use in other components
export { FONT_BASE_URL };