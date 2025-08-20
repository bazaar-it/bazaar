/**
 * Font Registry for Bazaar-Vid
 * Defines all supported fonts and their R2 URLs
 */

export type FontVariant = { 
  url: string; 
  weight?: string; 
  variable?: boolean; 
  weightRange?: string;
};

export type FontEntry = { 
  family: string; 
  variants: FontVariant[];
  category: 'sans' | 'serif' | 'display' | 'mono' | 'script';
};

// R2 base URL for fonts
const FONT_BASE_URL = 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/fonts';

/**
 * Core Font Pack - 15 essential fonts that cover 90% of use cases
 * These will be loaded for every render to ensure they're always available
 */
export const CORE_FONTS: Record<string, FontEntry> = {
  // Essential Sans-Serif
  'Inter': {
    family: 'Inter',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/Inter-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/Inter-Medium.woff2`, weight: '500' },
      { url: `${FONT_BASE_URL}/Inter-Bold.woff2`, weight: '700' },
    ]
  },
  'Roboto': {
    family: 'Roboto',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/Roboto-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/Roboto-Bold.woff2`, weight: '700' },
    ]
  },
  'DM Sans': {
    family: 'DM Sans',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/DMSans-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/DMSans-Bold.woff2`, weight: '700' },
    ]
  },
  'Poppins': {
    family: 'Poppins',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/Poppins-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/Poppins-Bold.woff2`, weight: '700' },
    ]
  },
  'Montserrat': {
    family: 'Montserrat',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/Montserrat-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/Montserrat-Bold.woff2`, weight: '700' },
    ]
  },
  
  // Essential Serif
  'Playfair Display': {
    family: 'Playfair Display',
    category: 'serif',
    variants: [
      { url: `${FONT_BASE_URL}/PlayfairDisplay-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/PlayfairDisplay-Bold.woff2`, weight: '700' },
    ]
  },
  'Merriweather': {
    family: 'Merriweather',
    category: 'serif',
    variants: [
      { url: `${FONT_BASE_URL}/Merriweather-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/Merriweather-Bold.woff2`, weight: '700' },
    ]
  },
  
  // Essential Display
  'Bebas Neue': {
    family: 'Bebas Neue',
    category: 'display',
    variants: [
      { url: `${FONT_BASE_URL}/BebasNeue-Regular.woff2`, weight: '400' },
    ]
  },
  
  // Essential Script
  'Lobster': {
    family: 'Lobster',
    category: 'script',
    variants: [
      { url: `${FONT_BASE_URL}/Lobster-Regular.woff2`, weight: '400' },
    ]
  },
  'Dancing Script': {
    family: 'Dancing Script',
    category: 'script',
    variants: [
      { url: `${FONT_BASE_URL}/DancingScript-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/DancingScript-Bold.woff2`, weight: '700' },
    ]
  },
  'Pacifico': {
    family: 'Pacifico',
    category: 'script',
    variants: [
      { url: `${FONT_BASE_URL}/Pacifico-Regular.woff2`, weight: '400' },
    ]
  },
  
  // Essential Mono
  'Fira Code': {
    family: 'Fira Code',
    category: 'mono',
    variants: [
      { url: `${FONT_BASE_URL}/FiraCode-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/FiraCode-Bold.woff2`, weight: '700' },
    ]
  },
  'JetBrains Mono': {
    family: 'JetBrains Mono',
    category: 'mono',
    variants: [
      { url: `${FONT_BASE_URL}/JetBrainsMono-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/JetBrainsMono-Bold.woff2`, weight: '700' },
    ]
  },
  
  // Additional essentials
  'Raleway': {
    family: 'Raleway',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/Raleway-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/Raleway-Bold.woff2`, weight: '700' },
    ]
  },
  'Ubuntu': {
    family: 'Ubuntu',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/Ubuntu-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/Ubuntu-Bold.woff2`, weight: '700' },
    ]
  },
};

/**
 * Extended Font Pack - Additional fonts available on demand
 * These are loaded only when specifically requested
 */
export const EXTENDED_FONTS: Record<string, FontEntry> = {
  'Plus Jakarta Sans': {
    family: 'Plus Jakarta Sans',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/PlusJakartaSans-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/PlusJakartaSans-Bold.woff2`, weight: '700' },
    ]
  },
  'Space Grotesk': {
    family: 'Space Grotesk',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/SpaceGrotesk-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/SpaceGrotesk-Bold.woff2`, weight: '700' },
    ]
  },
  'Lato': {
    family: 'Lato',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/Lato-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/Lato-Bold.woff2`, weight: '700' },
    ]
  },
  'Open Sans': {
    family: 'Open Sans',
    category: 'sans',
    variants: [
      { url: `${FONT_BASE_URL}/OpenSans-Regular.woff2`, weight: '400' },
      { url: `${FONT_BASE_URL}/OpenSans-Bold.woff2`, weight: '700' },
    ]
  },
  // Add more extended fonts as needed
};

// Combine all fonts
export const ALL_FONTS = { ...CORE_FONTS, ...EXTENDED_FONTS };

// Font fallback mapping for unsupported fonts
export const FONT_FALLBACKS: Record<string, string> = {
  'Helvetica': 'Inter',
  'Arial': 'Inter',
  'SF Pro': 'Inter',
  'Segoe UI': 'Inter',
  'Gotham': 'DM Sans',
  'Proxima Nova': 'Montserrat',
  'Lora': 'Playfair Display',
  'Georgia': 'Merriweather',
  'Times': 'Merriweather',
  'Courier': 'Fira Code',
  'Monaco': 'JetBrains Mono',
  'Comic Sans': 'Pacifico', // Yes, really
  'Brush Script': 'Dancing Script',
};

// Helper to get font entry
export function getFontEntry(fontFamily: string): FontEntry | null {
  // Direct match
  if (ALL_FONTS[fontFamily]) {
    return ALL_FONTS[fontFamily];
  }
  
  // Try fallback
  const fallback = FONT_FALLBACKS[fontFamily];
  if (fallback && ALL_FONTS[fallback]) {
    console.log(`[Font Registry] Mapping ${fontFamily} to ${fallback}`);
    return ALL_FONTS[fallback];
  }
  
  // Default to Inter
  console.warn(`[Font Registry] Unknown font ${fontFamily}, using Inter`);
  return ALL_FONTS['Inter'];
}