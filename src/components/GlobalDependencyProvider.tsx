// src/components/GlobalDependencyProvider.tsx
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';
import * as HeroiconsSolid from '@heroicons/react/24/solid';
import * as HeroiconsOutline from '@heroicons/react/24/outline';
import * as RemotionShapes from '@remotion/shapes';
import * as LucideIcons from 'lucide-react';
import rough from 'roughjs';
import { Icon } from '@iconify/react';

// Import our custom font system
import { ensureFontLoaded } from '../remotion/fonts/loader';

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Preload common fonts for the preview
      const preloadCommonFonts = async () => {
        const commonFonts = [
          'Inter', 'DM Sans', 'Roboto', 'Poppins', 'Montserrat',
          'Playfair Display', 'Merriweather', 'Lobster', 'Dancing Script',
          'Pacifico', 'Fira Code', 'JetBrains Mono', 'Raleway', 'Ubuntu',
          'Bebas Neue', 'Plus Jakarta Sans'
        ];
        
        console.log('[Preview] Preloading common fonts...');
        
        for (const font of commonFonts) {
          try {
            await ensureFontLoaded(font, '400');
            await ensureFontLoaded(font, '700');
          } catch (error) {
            console.warn(`[Preview] Failed to preload ${font}:`, error);
          }
        }
        
        console.log('[Preview] Font preloading complete');
      };
      
      // Start preloading fonts in the background
      preloadCommonFonts();
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
      // CRITICAL: Preserve native Audio constructor
      // Store the native Audio constructor before Remotion might override it
      (window as any).NativeAudio = window.Audio;
      
      // NEW: Add Heroicons
      (window as any).HeroiconsSolid = HeroiconsSolid;
      (window as any).HeroiconsOutline = HeroiconsOutline;
      
      // NEW: Add Remotion Shapes
      (window as any).RemotionShapes = RemotionShapes;
      
      // NEW: Add Lucide Icons
      (window as any).LucideIcons = LucideIcons;
      
      // NEW: Add Rough.js
      (window as any).Rough = rough;
      
      // NEW: Add Iconify
      // Create a wrapper that ensures the Icon component is properly bound
      const IconifyWrapper = (props: any) => React.createElement(Icon, props);
      
      // Test the wrapper to make sure it works
      try {
        const testIcon = React.createElement(IconifyWrapper, { icon: 'mdi:home' });
        console.log('✅ IconifyWrapper test successful');
      } catch (error) {
        console.error('❌ IconifyWrapper test failed:', error);
      }
      
      (window as any).IconifyIcon = IconifyWrapper;
      
      // NEW: Add Font loader using our bundled fonts
      (window as any).RemotionGoogleFonts = {
        loadFont: async (fontNameOrOptions: string | any, options?: { weights?: string[], subsets?: string[] }) => {
          // Handle case where AI passes options as first parameter
          let fontName: string;
          let weights: string[] = ['400', '700']; // Default weights
          
          if (typeof fontNameOrOptions === 'object' && fontNameOrOptions !== null) {
            // If first param is object, try to extract font name
            fontName = fontNameOrOptions.family || fontNameOrOptions.fontFamily || 'Inter';
            weights = fontNameOrOptions.weights || options?.weights || weights;
          } else {
            fontName = String(fontNameOrOptions || 'Inter');
            weights = options?.weights || weights;
          }
          
          console.log(`[Preview Font Loading] Loading ${fontName} with weights:`, weights);
          
          try {
            // Load all requested weights for this font
            for (const weight of weights) {
              await ensureFontLoaded(fontName, weight);
            }
            console.log(`[Preview Font Loading] Successfully loaded ${fontName}`);
          } catch (error) {
            console.warn(`[Preview Font Loading] Failed to load ${fontName}, using fallback:`, error);
            // Fallback to Inter if the specific font fails
            await ensureFontLoaded('Inter', '400');
          }
        }
      };
      
      // NEW: Add Avatar System - Ultra Simple (R2 Storage URLs)
      (window as any).BazaarAvatars = {
        'asian-woman': 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/asian-woman.png',
        'black-man': 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/black-man.png', 
        'hispanic-man': 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/hispanic-man.png',
        'middle-eastern-man': 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/middle-eastern-man.png',
        'white-woman': 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Bazaar%20avatars/white-woman.png'
      };
      
      console.log('✅ GlobalDependencyProvider: All dependencies loaded successfully');
      console.log('🎭 BazaarAvatars loaded:', (window as any).BazaarAvatars);
    }
  }, []);

  return <>{children}</>;
}
