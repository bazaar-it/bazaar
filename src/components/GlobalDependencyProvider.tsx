// src/components/GlobalDependencyProvider.tsx
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';
import { BazAnimations } from '~/lib/animations';

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      (window as any).BazAnimations = BazAnimations;
      console.log('React, ReactDOM, Remotion, and BazAnimations exposed on window object.');
    }
  }, []);

  return <>{children}</>;
}
