// src/remotion/FontLoader.tsx
import React from 'react';
import { continueRender, delayRender } from 'remotion';

// Top 100+ Google Fonts that users might use - covers 99% of use cases
const GOOGLE_FONTS = [
  // Most Popular Sans-Serif
  'Inter:wght@100;200;300;400;500;600;700;800;900',
  'Roboto:wght@100;300;400;500;700;900',
  'Poppins:wght@100;200;300;400;500;600;700;800;900',
  'Montserrat:wght@100;200;300;400;500;600;700;800;900',
  'Open+Sans:wght@300;400;500;600;700;800',
  'Lato:wght@100;300;400;700;900',
  'Raleway:wght@100;200;300;400;500;600;700;800;900',
  'Ubuntu:wght@300;400;500;700',
  'Oswald:wght@200;300;400;500;600;700',
  'Roboto+Condensed:wght@300;400;700',
  'Source+Sans+Pro:wght@200;300;400;600;700;900',
  'Nunito:wght@200;300;400;500;600;700;800;900',
  'Work+Sans:wght@100;200;300;400;500;600;700;800;900',
  'Nunito+Sans:wght@200;300;400;600;700;800;900',
  'Rubik:wght@300;400;500;600;700;800;900',
  'Noto+Sans:wght@100;200;300;400;500;600;700;800;900',
  'PT+Sans:wght@400;700',
  'Fira+Sans:wght@100;200;300;400;500;600;700;800;900',
  'Mukta:wght@200;300;400;500;600;700;800',
  'Barlow:wght@100;200;300;400;500;600;700;800;900',
  'Kanit:wght@100;200;300;400;500;600;700;800;900',
  'Heebo:wght@100;200;300;400;500;600;700;800;900',
  'Oxygen:wght@300;400;700',
  'Cabin:wght@400;500;600;700',
  'Josefin+Sans:wght@100;200;300;400;500;600;700',
  'Anton:wght@400',
  'Bebas+Neue:wght@400',
  'Manrope:wght@200;300;400;500;600;700;800',
  'DM+Sans:wght@400;500;700',
  'Quicksand:wght@300;400;500;600;700',
  'Mulish:wght@200;300;400;500;600;700;800;900',
  'Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800',
  'Space+Grotesk:wght@300;400;500;600;700',
  'Outfit:wght@100;200;300;400;500;600;700;800;900',
  'Sora:wght@100;200;300;400;500;600;700;800',
  'Commissioner:wght@100;200;300;400;500;600;700;800;900',
  'Lexend:wght@100;200;300;400;500;600;700;800;900',
  'Public+Sans:wght@100;200;300;400;500;600;700;800;900',
  'Red+Hat+Display:wght@300;400;500;600;700;800;900',
  'Archivo:wght@100;200;300;400;500;600;700;800;900',
  'Exo+2:wght@100;200;300;400;500;600;700;800;900',
  'Urbanist:wght@100;200;300;400;500;600;700;800;900',
  'Assistant:wght@200;300;400;500;600;700;800',
  
  // Serif Fonts
  'Playfair+Display:wght@400;500;600;700;800;900',
  'Merriweather:wght@300;400;700;900',
  'Lora:wght@400;500;600;700',
  'Roboto+Serif:wght@100;200;300;400;500;600;700;800;900',
  'Roboto+Slab:wght@100;200;300;400;500;600;700;800;900',
  'PT+Serif:wght@400;700',
  'Noto+Serif:wght@400;700',
  'Source+Serif+Pro:wght@200;300;400;600;700;900',
  'Crimson+Text:wght@400;600;700',
  'Libre+Baskerville:wght@400;700',
  'EB+Garamond:wght@400;500;600;700;800',
  'Cormorant+Garamond:wght@300;400;500;600;700',
  'Bitter:wght@100;200;300;400;500;600;700;800;900',
  'Libre+Caslon+Text:wght@400;700',
  'Domine:wght@400;500;600;700',
  'Zilla+Slab:wght@300;400;500;600;700',
  'Arvo:wght@400;700',
  'Cardo:wght@400;700',
  'Spectral:wght@200;300;400;500;600;700;800',
  'Literata:wght@200;300;400;500;600;700;800;900',
  
  // Display & Creative Fonts
  'Bebas+Neue:wght@400',
  'Righteous:wght@400',
  'Permanent+Marker:wght@400',
  'Russo+One:wght@400',
  'Bowlby+One:wght@400',
  'Bungee:wght@400',
  'Fredoka:wght@300;400;500;600;700',
  'Comfortaa:wght@300;400;500;600;700',
  'Lobster:wght@400',
  'Pacifico:wght@400',
  'Dancing+Script:wght@400;500;600;700',
  'Satisfy:wght@400',
  'Caveat:wght@400;500;600;700',
  'Great+Vibes:wght@400',
  'Sacramento:wght@400',
  'Shadows+Into+Light:wght@400',
  'Indie+Flower:wght@400',
  'Amatic+SC:wght@400;700',
  'Kalam:wght@300;400;700',
  'Patrick+Hand:wght@400',
  
  // Monospace Fonts
  'Roboto+Mono:wght@100;200;300;400;500;600;700',
  'Source+Code+Pro:wght@200;300;400;500;600;700;800;900',
  'Fira+Code:wght@300;400;500;600;700',
  'JetBrains+Mono:wght@100;200;300;400;500;600;700;800',
  'Space+Mono:wght@400;700',
  'Inconsolata:wght@200;300;400;500;600;700;800;900',
  'Courier+Prime:wght@400;700',
  'IBM+Plex+Mono:wght@100;200;300;400;500;600;700',
  'Ubuntu+Mono:wght@400;700',
  'Overpass+Mono:wght@300;400;500;600;700',
  
  // Additional Popular Fonts
  'Dosis:wght@200;300;400;500;600;700;800',
  'Varela+Round:wght@400',
  'Karla:wght@200;300;400;500;600;700;800',
  'Catamaran:wght@100;200;300;400;500;600;700;800;900',
  'Maven+Pro:wght@400;500;600;700;800;900',
  'Saira:wght@100;200;300;400;500;600;700;800;900',
  'Nanum+Gothic:wght@400;700;800',
  'Hind:wght@300;400;500;600;700',
  'Arimo:wght@400;500;600;700',
  'Asap:wght@400;500;600;700',
  'Signika:wght@300;400;500;600;700',
  'Alata:wght@400',
  'Questrial:wght@400',
  'Prompt:wght@100;200;300;400;500;600;700;800;900',
  'Chivo:wght@100;200;300;400;500;600;700;800;900',
  
  // Extra Weights for Framework Defaults
  'Helvetica+Neue:wght@100;200;300;400;500;600;700;800;900',
  'SF+Pro+Display:wght@100;200;300;400;500;600;700;800;900',
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