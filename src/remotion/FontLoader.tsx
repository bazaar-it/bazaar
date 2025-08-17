// src/remotion/FontLoader.tsx
import React from 'react';
import { continueRender, delayRender } from 'remotion';

// Common Google Fonts that users might use
const GOOGLE_FONTS = [
  'Inter:wght@100;200;300;400;500;600;700;800;900',
  'Roboto:wght@100;300;400;500;700;900',
  'Poppins:wght@100;200;300;400;500;600;700;800;900',
  'Montserrat:wght@100;200;300;400;500;600;700;800;900',
  'Open+Sans:wght@300;400;500;600;700;800',
  'Lato:wght@100;300;400;700;900',
  'Playfair+Display:wght@400;500;600;700;800;900',
  'Raleway:wght@100;200;300;400;500;600;700;800;900',
  'Ubuntu:wght@300;400;500;700',
  'Oswald:wght@200;300;400;500;600;700',
  'Bebas+Neue:wght@400',
  'Roboto+Condensed:wght@300;400;700',
  'Source+Sans+Pro:wght@200;300;400;600;700;900',
  'Nunito:wght@200;300;400;500;600;700;800;900',
  'Work+Sans:wght@100;200;300;400;500;600;700;800;900',
];

// Load fonts via link tags (works in both browser and Lambda)
export const loadFonts = () => {
  // Only load fonts in Lambda/render environment
  if (typeof window === 'undefined' || !window.document) {
    return;
  }
  
  // Check if fonts are already loaded
  const existingLink = document.querySelector('link[data-font-loader="bazaar"]');
  if (existingLink) {
    console.log('[FontLoader] Fonts already loaded');
    return;
  }
  
  // Create a single link tag for all fonts
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://fonts.googleapis.com';
  document.head.appendChild(link);
  
  const link2 = document.createElement('link');
  link2.rel = 'preconnect';
  link2.href = 'https://fonts.gstatic.com';
  link2.crossOrigin = 'anonymous';
  document.head.appendChild(link2);
  
  // Load all fonts in one request
  const fontsLink = document.createElement('link');
  fontsLink.rel = 'stylesheet';
  fontsLink.setAttribute('data-font-loader', 'bazaar');
  const fontFamilies = GOOGLE_FONTS.map(font => `family=${font}`).join('&');
  fontsLink.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
  
  document.head.appendChild(fontsLink);
  
  console.log('[FontLoader] Loading Google Fonts:', GOOGLE_FONTS.length, 'font families');
};

// Font loading component for Remotion compositions
export const FontLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  
  React.useEffect(() => {
    let handle: number | null = null;
    
    const loadAndWaitForFonts = async () => {
      // Load fonts via link tags
      loadFonts();
      
      // In Remotion render, delay until fonts are loaded
      if (typeof window !== 'undefined' && 'document' in window && 'fonts' in document) {
        try {
          handle = delayRender('Loading fonts...');
          
          // Wait for fonts to load (with timeout)
          await Promise.race([
            document.fonts.ready,
            new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
          ]);
          
          console.log('[FontLoader] Fonts loaded successfully');
          setFontsLoaded(true);
        } catch (error) {
          console.error('[FontLoader] Error loading fonts:', error);
        } finally {
          if (handle !== null) {
            continueRender(handle);
          }
        }
      } else {
        // Not in a browser environment, just mark as loaded
        setFontsLoaded(true);
      }
    };
    
    loadAndWaitForFonts();
    
    return () => {
      if (handle !== null) {
        continueRender(handle);
      }
    };
  }, []);
  
  return <>{children}</>;
};

// Helper to ensure a font is available
export const ensureFont = (fontFamily: string): string => {
  // Clean up the font family string
  const cleanedFont = fontFamily.replace(/['"]/g, '').trim();
  
  // Check if it's one of our supported fonts
  const supportedFont = GOOGLE_FONTS.find(font => {
    const fontName = font.split(':')[0]?.replace(/\+/g, ' ');
    return fontName?.toLowerCase() === cleanedFont.toLowerCase();
  });
  
  if (supportedFont) {
    const fontName = supportedFont.split(':')[0]?.replace(/\+/g, ' ');
    return `'${fontName}', sans-serif`;
  }
  
  // Return the original font family as fallback
  return fontFamily;
};