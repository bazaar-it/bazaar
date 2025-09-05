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

// Fonts are now loaded via CSS - no JavaScript loading needed

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Fonts now load automatically via CSS @import in fonts.css
      console.log('[Preview] Using CSS fonts - 99 Google Fonts available');
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
      
      // NEW: Add __InlineIcon for runtime SVG rendering
      (window as any).__InlineIcon = function InlineIcon({ icon, style, ...props }: { 
        icon: string; 
        style?: React.CSSProperties;
        [key: string]: any;
      }) {
        // Get icon data from registry
        const iconData = (window as any).__iconRegistry?.[icon];
        
        if (!iconData) {
          // Fallback for missing icons - show a question mark
          return React.createElement('div', {
            style: {
              width: '1em',
              height: '1em',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid currentColor',
              borderRadius: '50%',
              fontSize: '0.8em',
              color: 'currentColor',
              ...style
            },
            ...props
          }, '?');
        }
        
        // Render inline SVG from preloaded data
        return React.createElement('svg', {
          viewBox: iconData.attributes.viewBox || '0 0 24 24',
          width: iconData.attributes.width || '1em',
          height: iconData.attributes.height || '1em',
          fill: iconData.attributes.fill || 'currentColor',
          style: {
            display: 'inline-block',
            verticalAlign: 'middle',
            ...style
          },
          dangerouslySetInnerHTML: { __html: iconData.body },
          ...props
        });
      };
      
      // NEW: Add Font loader stub - fonts now load via CSS
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
          
          // Fonts are now loaded via CSS @import in fonts.css
          // This is just a compatibility stub for scenes that still call loadFont
          console.log(`[Font Stub] Font request for ${fontName} with weights ${weights.join(', ')} - loaded via CSS`);
          
          // Return immediately - fonts are already available via CSS
          return Promise.resolve();
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
