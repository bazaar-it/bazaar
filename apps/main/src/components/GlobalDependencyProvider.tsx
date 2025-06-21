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
      
      console.log('React, ReactDOM, Remotion, Heroicons, RemotionShapes, Lucide, and Rough.js exposed on window object.');
    }
  }, []);

  return <>{children}</>;
}
