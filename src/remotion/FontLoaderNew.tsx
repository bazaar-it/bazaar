/**
 * FontLoaderNew - Proper font loading using @remotion/fonts
 * This replaces the broken FontLoader that used CSS link tags
 */

import React, { useEffect, useState } from 'react';
import { loadFont } from '@remotion/fonts';
import { delayRender, continueRender } from 'remotion';
import { 
  CORE_FONTS_LIST, 
  getFontEntry, 
  extractFontsFromCode,
  getFontUrlsToLoad,
  isCoreFont 
} from './fonts/_archive/font-registry-v2';

// Track loaded fonts to avoid duplicates
const loadedFonts = new Set<string>();

/**
 * Load a single font family with all its variants
 */
async function loadFontFamily(fontFamily: string): Promise<void> {
  // Skip if already loaded
  const key = fontFamily.toLowerCase();
  if (loadedFonts.has(key)) {
    console.log(`[FontLoader] ${fontFamily} already loaded, skipping`);
    return;
  }

  const fontEntry = getFontEntry(fontFamily);
  if (!fontEntry) {
    console.warn(`[FontLoader] No font entry found for ${fontFamily}`);
    return;
  }

  console.log(`[FontLoader] Loading ${fontFamily} with ${fontEntry.variants.length} variants`);

  try {
    // Load all variants of this font
    await Promise.all(
      fontEntry.variants.map(async (variant: any) => {
        try {
          await loadFont({
            family: fontEntry.family,
            url: variant.url,
            weight: variant.weight,
            style: 'normal',
          });
          console.log(`[FontLoader] Loaded ${fontEntry.family} weight ${variant.weight}`);
        } catch (err) {
          console.error(`[FontLoader] Failed to load ${fontEntry.family} weight ${variant.weight}:`, err);
        }
      })
    );

    loadedFonts.add(key);
    console.log(`[FontLoader] Successfully loaded all variants of ${fontFamily}`);
  } catch (error) {
    console.error(`[FontLoader] Error loading font family ${fontFamily}:`, error);
  }
}

/**
 * Load all core fonts at once
 */
export async function loadCoreFonts(): Promise<void> {
  console.log('[FontLoader] Starting to load core fonts...');
  const startTime = Date.now();

  try {
    // Load all core fonts in parallel
    await Promise.all(
      CORE_FONTS_LIST.map((font: any) => loadFontFamily(font.family))
    );

    const duration = Date.now() - startTime;
    console.log(`[FontLoader] All core fonts loaded in ${duration}ms`);
  } catch (error) {
    console.error('[FontLoader] Error loading core fonts:', error);
  }
}

/**
 * Load fonts used in a specific scene
 */
export async function loadSceneFonts(code: string): Promise<void> {
  // Extract font families from the code
  const fontFamilies = extractFontsFromCode(code);
  console.log(`[FontLoader] Scene uses fonts:`, fontFamilies);

  // Get font URLs to load (with fallback handling)
  const fontUrls = getFontUrlsToLoad(fontFamilies);
  
  // Load each font using @remotion/fonts
  await Promise.all(fontUrls.map(async ({ family, url, weight }: { family: string; url: string; weight: string }) => {
    try {
      await loadFont({
        family,
        url,
        weight: weight || '400',
        style: 'normal',
      });
      console.log(`[FontLoader] Loaded ${family} from ${url}`);
    } catch (error) {
      console.error(`[FontLoader] Failed to load ${family}:`, error);
    }
  }));
}

interface FontLoaderProps {
  children: React.ReactNode;
  sceneCodes?: string[];
}

/**
 * FontLoader Component
 * Wraps content and ensures fonts are loaded before rendering
 */
export const FontLoaderNew: React.FC<FontLoaderProps> = ({ children, sceneCodes = [] }) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [handle] = useState(() => {
    // Only delay render in Remotion context
    if (typeof window !== 'undefined' && window.remotion) {
      console.log('[FontLoader] Delaying render for font loading');
      return delayRender('Loading fonts');
    }
    return null;
  });

  useEffect(() => {
    const loadFonts = async () => {
      console.log('[FontLoader] Component mounted, starting font loading');
      
      try {
        // First load core fonts
        await loadCoreFonts();

        // Then load any scene-specific fonts
        if (sceneCodes.length > 0) {
          console.log(`[FontLoader] Loading fonts from ${sceneCodes.length} scenes`);
          for (const code of sceneCodes) {
            await loadSceneFonts(code);
          }
        }

        setFontsLoaded(true);
        console.log('[FontLoader] All fonts loaded successfully');
      } catch (error) {
        console.error('[FontLoader] Error during font loading:', error);
        setFontsLoaded(true); // Continue anyway
      } finally {
        // Continue render if we delayed it
        if (handle !== null) {
          console.log('[FontLoader] Continuing render');
          continueRender(handle);
        }
      }
    };

    loadFonts();
  }, [handle, sceneCodes]);

  // Show loading state during font loading (only in development)
  if (!fontsLoaded && process.env.NODE_ENV === 'development') {
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '24px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        Loading fonts...
      </div>
    );
  }

  return <>{children}</>;
};

// Export for use in other components
export { loadFontFamily };