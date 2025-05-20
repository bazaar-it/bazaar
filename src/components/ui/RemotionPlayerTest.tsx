//src/components/ui/RemotionPlayerTest.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Player } from "@remotion/player";
import { ErrorBoundary } from "react-error-boundary";

interface RemotionPlayerTestProps {
  componentUrl: string;
  width?: number;
  height?: number;
  durationInFrames?: number;
  fps?: number;
}

export function RemotionPlayerTest({ 
  componentUrl,
  width = 1280,
  height = 720,
  durationInFrames = 150,
  fps = 30
}: RemotionPlayerTestProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Reset state when URL changes
    setComponent(null);
    setError(null);
    
    // Dynamic import of the component
    import(/* @vite-ignore */ componentUrl)
      .then(module => {
        if (module.default) {
          setComponent(() => module.default);
        } else {
          setError(new Error(`Component at ${componentUrl} has no default export`));
        }
      })
      .catch(err => {
        console.error('Failed to load component:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      });
  }, [componentUrl]);
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
        <h3 className="font-bold">Error Loading Component</h3>
        <p>{error.message}</p>
      </div>
    );
  }
  
  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 rounded">
        <div className="animate-pulse text-slate-500">Loading component...</div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
          <h3 className="font-bold">Rendering Error</h3>
          <p>The component failed to render</p>
        </div>
      }
    >
      <Player
        component={Component}
        durationInFrames={durationInFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        controls
      />
    </ErrorBoundary>
  );
}
