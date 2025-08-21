/**
 * Simple Preview Font Loader
 * Loads ANY Google Font in the browser preview
 */

// Track loaded fonts to avoid duplicates
const loadedGoogleFonts = new Set<string>();

/**
 * Extract font families from code
 */
function extractFontsFromCode(code: string): string[] {
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
 * Load a Google Font in the browser preview
 */
export async function loadGoogleFontInPreview(fontFamily: string): Promise<void> {
  // Skip if already loaded
  if (loadedGoogleFonts.has(fontFamily)) {
    return;
  }

  try {
    // Create Google Fonts URL
    const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
    
    // Check if link already exists
    const existingLink = document.querySelector(`link[href*="${encodeURIComponent(fontFamily)}"]`);
    if (existingLink) {
      loadedGoogleFonts.add(fontFamily);
      return;
    }

    // Create and append link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.crossOrigin = 'anonymous';
    
    // Add to head
    document.head.appendChild(link);
    
    // Wait for font to load
    await new Promise<void>((resolve) => {
      link.onload = () => {
        console.log(`[Preview Font Loader] Loaded Google Font: ${fontFamily}`);
        loadedGoogleFonts.add(fontFamily);
        resolve();
      };
      
      link.onerror = () => {
        console.warn(`[Preview Font Loader] Failed to load Google Font: ${fontFamily}`);
        resolve();
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        console.warn(`[Preview Font Loader] Timeout loading: ${fontFamily}`);
        resolve();
      }, 5000);
    });

  } catch (error) {
    console.error(`[Preview Font Loader] Error loading ${fontFamily}:`, error);
  }
}

/**
 * Load all fonts from scene code in preview
 */
export async function loadPreviewFonts(sceneCodes: string[]): Promise<void> {
  if (typeof window === 'undefined') {
    return; // Only run in browser
  }

  const allFonts = new Set<string>();
  
  // Extract fonts from all scene codes
  for (const code of sceneCodes) {
    const fonts = extractFontsFromCode(code);
    fonts.forEach(font => allFonts.add(font));
  }

  if (allFonts.size === 0) {
    return;
  }

  console.log(`[Preview Font Loader] Loading ${allFonts.size} fonts for preview:`, Array.from(allFonts));

  // Load all fonts in parallel
  await Promise.all(
    Array.from(allFonts).map(font => loadGoogleFontInPreview(font))
  );
}

/**
 * Load common fallback fonts that might be referenced
 */
export async function loadCommonFallbacks(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const commonFonts = [
    'Inter',
    'Roboto',
    'Open Sans', 
    'Poppins',
    'Montserrat',
    'DM Sans',
    'Playfair Display',
    'Bebas Neue',
    'Fira Code',
  ];

  // Load common fonts in background for instant availability
  for (const font of commonFonts) {
    loadGoogleFontInPreview(font).catch(() => {
      // Silent fail for background loading
    });
  }
}

/**
 * Initialize preview font loading
 */
export function initializePreviewFonts(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Load common fallback fonts in background
  loadCommonFallbacks();

  console.log('[Preview Font Loader] Initialized - ready to load any Google Font');
}