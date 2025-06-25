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

// Import specific Google Fonts
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadRoboto } from '@remotion/google-fonts/Roboto';
import { loadFont as loadOpenSans } from '@remotion/google-fonts/OpenSans';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
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
      
      // NEW: Add Google Fonts loader
      (window as any).RemotionGoogleFonts = {
        loadFont: (fontName: string) => {
          // Map common font names to their loaders
          const fontMap: { [key: string]: () => any } = {
            'Inter': loadInter,
            'Roboto': loadRoboto,
            'OpenSans': loadOpenSans,
            'Poppins': loadPoppins,
            'Montserrat': loadMontserrat,
          };
          
          const loader = fontMap[fontName];
          if (loader) {
            return loader();
          }
          
          // Default to Inter if font not found
          return loadInter();
        },
        Inter: () => loadInter(),
        Roboto: () => loadRoboto(),
        OpenSans: () => loadOpenSans(),
        Poppins: () => loadPoppins(),
        Montserrat: () => loadMontserrat(),
      };
      
      console.log('✅ GlobalDependencyProvider: All dependencies loaded successfully');
    }
  }, []);

  return <>{children}</>;
}
