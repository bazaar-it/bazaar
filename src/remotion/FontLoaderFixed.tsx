// FontLoaderFixed.tsx - Synchronous font loading for Lambda
import React from 'react';
import { continueRender, delayRender } from 'remotion';

// Define fonts to load
const FONT_FAMILIES = [
  'Inter:wght@100;200;300;400;500;600;700;800;900',
  'Roboto:wght@100;300;400;500;700;900', 
  'DM+Sans:wght@400;500;700',
  'Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800',
  'Playfair+Display:wght@400;500;600;700;800;900',
  'Merriweather:wght@300;400;700;900',
  'Lobster:wght@400',
  'Dancing+Script:wght@400;500;600;700',
  'Pacifico:wght@400',
  'Bebas+Neue:wght@400',
  'Fira+Code:wght@300;400;500;600;700',
  'JetBrains+Mono:wght@100;200;300;400;500;600;700;800',
  'Raleway:wght@100;200;300;400;500;600;700;800;900',
  'Ubuntu:wght@300;400;500;700',
  'Poppins:wght@100;200;300;400;500;600;700;800;900',
  'Montserrat:wght@100;200;300;400;500;600;700;800;900',
];

export const FontLoaderFixed: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  React.useEffect(() => {
    const handle = delayRender('Loading fonts...');

    // Create @import style for fonts
    const style = document.createElement('style');
    style.textContent = FONT_FAMILIES.map(font => 
      `@import url('https://fonts.googleapis.com/css2?family=${font}&display=swap');`
    ).join('\n');
    document.head.appendChild(style);

    // Give fonts time to load
    const checkFonts = async () => {
      // Wait a bit for fonts to start loading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if document.fonts API is available
      if ('fonts' in document) {
        try {
          await document.fonts.ready;
          console.log('[FontLoaderFixed] Fonts ready via API');
        } catch (e) {
          console.log('[FontLoaderFixed] Font API error, waiting fallback time');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } else {
        // Fallback: just wait a bit
        console.log('[FontLoaderFixed] No font API, using timeout');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setFontsLoaded(true);
      continueRender(handle);
    };

    checkFonts();

    return () => {
      // Cleanup if component unmounts
      try {
        continueRender(handle);
      } catch {}
    };
  }, []);

  // Always render children, fonts will load in background
  return <>{children}</>;
};