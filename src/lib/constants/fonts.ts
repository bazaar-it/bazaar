// src/lib/constants/fonts.ts

/**
 * Canonical list of Google Font families that our Remotion render site preloads.
 * Keep this in sync with fontGroups injected in PreviewPanelG.
 */
export const SUPPORTED_RENDER_FONTS: readonly string[] = [
  // Core sans
  'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato', 'Raleway', 'Ubuntu', 'Oswald', 'Nunito',
  // Extended sans
  'Work Sans', 'Rubik', 'Barlow', 'Kanit', 'DM Sans', 'Plus Jakarta Sans', 'Space Grotesk', 'Outfit', 'Lexend', 'Manrope',
  // Serif & display
  'Playfair Display', 'Merriweather', 'Lora', 'Roboto Slab', 'Bebas Neue', 'Permanent Marker', 'Lobster', 'Dancing Script', 'Pacifico', 'Caveat',
  // Monospace & additional
  'Roboto Mono', 'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Quicksand', 'Comfortaa', 'Righteous', 'Anton', 'Fredoka', 'Bungee',
] as const;

/**
 * Normalize a font family string for comparison.
 * - Trims whitespace
 * - Removes surrounding quotes
 * - Collapses multiple spaces
 */
function normalizeFontFamily(fontFamily: string): string {
  return fontFamily
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Case-insensitive membership check against SUPPORTED_RENDER_FONTS.
 */
export function isFontSupported(fontFamily: string): boolean {
  const target = normalizeFontFamily(fontFamily).toLowerCase();
  return SUPPORTED_RENDER_FONTS.some((f) => f.toLowerCase() === target);
}

/**
 * Returns the canonical, properly cased family name if supported; otherwise undefined.
 */
export function getCanonicalFontFamily(fontFamily: string): string | undefined {
  const target = normalizeFontFamily(fontFamily).toLowerCase();
  return SUPPORTED_RENDER_FONTS.find((f) => f.toLowerCase() === target);
}




