/**
 * Complete Motion Graphics Font Library
 * 100 carefully selected fonts for software demos, SaaS products, and modern motion graphics
 * All fonts are open-source (OFL/Apache/Ubuntu licenses) and safe to self-host
 */

export const MOTION_GRAPHICS_FONTS = {
  // === CORE UI SANS (20) - Always loaded ===
  'core-ui': [
    { family: 'Inter', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Roboto Flex', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Open Sans', weights: ['300', '400', '500', '600', '700', '800'], variable: true },
    { family: 'Noto Sans', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { family: 'Source Sans 3', weights: ['200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'IBM Plex Sans', weights: ['100', '200', '300', '400', '500', '600', '700'] },
    { family: 'Lato', weights: ['100', '300', '400', '700', '900'] },
    { family: 'Montserrat', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Poppins', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { family: 'Work Sans', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'DM Sans', weights: ['400', '500', '700'], variable: true },
    { family: 'Manrope', weights: ['200', '300', '400', '500', '600', '700', '800'], variable: true },
    { family: 'Plus Jakarta Sans', weights: ['200', '300', '400', '500', '600', '700', '800'], variable: true },
    { family: 'Outfit', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Sora', weights: ['100', '200', '300', '400', '500', '600', '700', '800'], variable: true },
    { family: 'Urbanist', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { family: 'Mulish', weights: ['200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Nunito Sans', weights: ['200', '300', '400', '600', '700', '800', '900'] },
    { family: 'Space Grotesk', weights: ['300', '400', '500', '600', '700'], variable: true },
    { family: 'Geist Sans', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
  ],

  // === DISPLAY SANS / TITLES (12) ===
  'display-sans': [
    { family: 'Bebas Neue', weights: ['400'] },
    { family: 'Anton', weights: ['400'] },
    { family: 'League Spartan', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Oswald', weights: ['200', '300', '400', '500', '600', '700'], variable: true },
    { family: 'Archivo', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Exo 2', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Chivo', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Teko', weights: ['300', '400', '500', '600', '700'] },
    { family: 'Rajdhani', weights: ['300', '400', '500', '600', '700'] },
    { family: 'Righteous', weights: ['400'] },
    { family: 'Tomorrow', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { family: 'Saira', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
  ],

  // === SERIF / EDITORIAL & ELEGANT (12) ===
  'serif': [
    { family: 'Noto Serif', weights: ['400', '700'] },
    { family: 'Source Serif 4', weights: ['200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Playfair Display', weights: ['400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Lora', weights: ['400', '500', '600', '700'], variable: true },
    { family: 'Merriweather', weights: ['300', '400', '700', '900'] },
    { family: 'EB Garamond', weights: ['400', '500', '600', '700', '800'], variable: true },
    { family: 'Spectral', weights: ['200', '300', '400', '500', '600', '700', '800'] },
    { family: 'Cormorant', weights: ['300', '400', '500', '600', '700'], variable: true },
    { family: 'Crimson Pro', weights: ['200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Newsreader', weights: ['200', '300', '400', '500', '600', '700', '800'], variable: true },
    { family: 'Libre Baskerville', weights: ['400', '700'] },
    { family: 'DM Serif Display', weights: ['400'] },
  ],

  // === SLAB / BOLD EDITORIAL (8) ===
  'slab': [
    { family: 'Roboto Slab', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Zilla Slab', weights: ['300', '400', '500', '600', '700'] },
    { family: 'Josefin Slab', weights: ['100', '200', '300', '400', '500', '600', '700'], variable: true },
    { family: 'Bitter', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Arvo', weights: ['400', '700'] },
    { family: 'Rokkitt', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Patua One', weights: ['400'] },
    { family: 'Alfa Slab One', weights: ['400'] },
  ],

  // === MONOSPACE / CODE (8) ===
  'monospace': [
    { family: 'JetBrains Mono', weights: ['100', '200', '300', '400', '500', '600', '700', '800'], variable: true },
    { family: 'Fira Code', weights: ['300', '400', '500', '600', '700'], variable: true },
    { family: 'Source Code Pro', weights: ['200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'IBM Plex Mono', weights: ['100', '200', '300', '400', '500', '600', '700'] },
    { family: 'Inconsolata', weights: ['200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Space Mono', weights: ['400', '700'] },
    { family: 'Ubuntu Mono', weights: ['400', '700'] },
    { family: 'Cascadia Code', weights: ['200', '300', '400', '500', '600', '700'], variable: true },
  ],

  // === CONDENSED / NARROW (8) ===
  'condensed': [
    { family: 'Barlow Condensed', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { family: 'Roboto Condensed', weights: ['300', '400', '700'] },
    { family: 'Archivo Narrow', weights: ['400', '500', '600', '700'], variable: true },
    { family: 'PT Sans Narrow', weights: ['400', '700'] },
    { family: 'Cabin Condensed', weights: ['400', '500', '600', '700'] },
    { family: 'Yanone Kaffeesatz', weights: ['200', '300', '400', '500', '600', '700'], variable: true },
    { family: 'IBM Plex Sans Condensed', weights: ['100', '200', '300', '400', '500', '600', '700'] },
    { family: 'News Cycle', weights: ['400', '700'] },
  ],

  // === ROUNDED / FRIENDLY UI (6) ===
  'rounded': [
    { family: 'Nunito', weights: ['200', '300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Quicksand', weights: ['300', '400', '500', '600', '700'], variable: true },
    { family: 'Varela Round', weights: ['400'] },
    { family: 'M PLUS Rounded 1c', weights: ['100', '300', '400', '500', '700', '800', '900'] },
    { family: 'Rubik', weights: ['300', '400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Asap Rounded', weights: ['400', '500', '600', '700', '800', '900'], variable: true },
  ],

  // === IMPACT / ULTRA-BLACK (6) ===
  'impact': [
    { family: 'Archivo Black', weights: ['400'] },
    { family: 'Bungee', weights: ['400'] },
    { family: 'Kanit', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { family: 'Saira Extra Condensed', weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { family: 'League Gothic', weights: ['400'], variable: true },
    { family: 'Chivo Black', weights: ['900'] }, // Part of Chivo family
  ],

  // === SCRIPTS & HAND (12) ===
  'script': [
    { family: 'Lobster', weights: ['400'] },
    { family: 'Pacifico', weights: ['400'] },
    { family: 'Dancing Script', weights: ['400', '500', '600', '700'], variable: true },
    { family: 'Great Vibes', weights: ['400'] },
    { family: 'Sacramento', weights: ['400'] },
    { family: 'Satisfy', weights: ['400'] },
    { family: 'Cookie', weights: ['400'] },
    { family: 'Caveat', weights: ['400', '500', '600', '700'], variable: true },
    { family: 'Amatic SC', weights: ['400', '700'] },
    { family: 'Shadows Into Light', weights: ['400'] },
    { family: 'Patrick Hand', weights: ['400'] },
    { family: 'Yellowtail', weights: ['400'] },
  ],

  // === NUMERALS / TECH / HUD (8) ===
  'tech': [
    { family: 'Orbitron', weights: ['400', '500', '600', '700', '800', '900'], variable: true },
    { family: 'Audiowide', weights: ['400'] },
    { family: 'Share Tech Mono', weights: ['400'] },
    { family: 'Oxanium', weights: ['200', '300', '400', '500', '600', '700', '800'], variable: true },
    { family: 'Aldrich', weights: ['400'] },
    { family: 'Quantico', weights: ['400', '700'] },
    { family: 'VT323', weights: ['400'] },
    { family: 'Major Mono Display', weights: ['400'] },
  ],
};

// Flatten all fonts for easy access
export const ALL_FONTS_LIST = Object.values(MOTION_GRAPHICS_FONTS).flat();

/**
 * Smart fallback mapping for unsupported fonts
 */
export const SMART_FONT_FALLBACKS: Record<string, string> = {
  // Apple/Mac fonts
  'SF Pro': 'Inter',
  'SF Pro Display': 'Inter',
  'SF Pro Text': 'Inter',
  'San Francisco': 'Inter',
  'Helvetica': 'Inter',
  'Helvetica Neue': 'Inter',
  
  // Windows fonts
  'Segoe UI': 'Inter',
  'Calibri': 'Open Sans',
  'Arial': 'Open Sans',
  'Verdana': 'Open Sans',
  'Tahoma': 'Work Sans',
  
  // Google Product Sans alternatives
  'Product Sans': 'DM Sans',
  'Google Sans': 'Plus Jakarta Sans',
  
  // Adobe fonts
  'Proxima Nova': 'Montserrat',
  'Futura': 'Montserrat',
  'Avenir': 'Nunito',
  'Myriad Pro': 'Source Sans 3',
  'Acumin Pro': 'IBM Plex Sans',
  'Brandon Grotesque': 'Work Sans',
  
  // Popular web fonts
  'Circular': 'DM Sans',
  'Gotham': 'Montserrat',
  'Gilroy': 'Plus Jakarta Sans',
  'Aeonik': 'Space Grotesk',
  'Graphik': 'Inter',
  'Apercu': 'Outfit',
  'Aktiv Grotesk': 'Manrope',
  
  // Serif alternatives
  'Georgia': 'Merriweather',
  'Times New Roman': 'Noto Serif',
  'Times': 'Noto Serif',
  'Baskerville': 'Libre Baskerville',
  'Didot': 'Playfair Display',
  'Bodoni': 'Playfair Display',
  'Caslon': 'EB Garamond',
  'Minion Pro': 'Crimson Pro',
  
  // Display alternatives
  'Impact': 'Anton',
  'Knockout': 'Bebas Neue',
  'Druk': 'Archivo Black',
  'Tungsten': 'Teko',
  'Univers': 'Archivo',
  
  // Monospace alternatives
  'Monaco': 'JetBrains Mono',
  'Courier': 'IBM Plex Mono',
  'Courier New': 'Source Code Pro',
  'Consolas': 'Fira Code',
  'Menlo': 'JetBrains Mono',
  'SF Mono': 'Fira Code',
  
  // Fun alternatives
  'Comic Sans': 'Caveat',
  'Comic Sans MS': 'Caveat',
  'Brush Script': 'Dancing Script',
  'Marker Felt': 'Patrick Hand',
  'Chalkboard': 'Amatic SC',
};

/**
 * Get the best fallback for an unsupported font
 */
export function getBestFallback(requestedFont: string): string {
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
 * Check if a font should use variable font file
 */
export function isVariableFont(family: string): boolean {
  const font = ALL_FONTS_LIST.find(f => f.family === family);
  return font?.variable === true;
}

/**
 * Get all weights for a font family
 */
export function getFontWeights(family: string): string[] {
  const font = ALL_FONTS_LIST.find(f => f.family === family);
  return font?.weights || ['400'];
}