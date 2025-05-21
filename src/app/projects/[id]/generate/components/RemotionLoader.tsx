"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Player, 
  type PlayerRef
} from '@remotion/player';

// Type for the input props passed to the component
interface RemotionLoaderProps {
  componentCode: string;
  storyboard: {
    fps: number;
    width: number;
    height: number;
    durationInFrames: number;
  };
  inputProps?: Record<string, unknown>;
}

// Error boundary fallback component
function ErrorDisplay({ error }: { error: Error }) {
  return (
    <div className="p-4 bg-red-50 text-red-700 rounded overflow-auto h-full">
      <h3 className="font-bold mb-2">Error Loading Component</h3>
      <p className="mb-2">{error.message}</p>
      <pre className="text-xs overflow-auto bg-red-100 p-2 rounded">
        {error.stack}
      </pre>
    </div>
  );
}

export default function RemotionLoader({
  componentCode,
  storyboard,
  inputProps = {}
}: RemotionLoaderProps) {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = React.useRef<PlayerRef>(null);
  
  // Create unique module ID based on the component code
  const moduleId = useMemo(() => `dynamic-${Math.random().toString(36).substring(2, 9)}`, []);
  
  // Dynamically create an importable component
  const DynamicComponent = useMemo(() => {
    return React.lazy(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Create a blob URL from the component code
        const blob = new Blob([componentCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        
        // Create a module script to load the component
        const module = document.createElement('script');
        module.type = 'module';
        module.textContent = `
          import React from 'react';
          import { AbsoluteFill, useCurrentFrame, interpolate } from '@remotion/core';
          
          // Load the component code
          const rawModule = await import('${url}');
          
          // Expose the component to the window so we can access it
          window['${moduleId}'] = rawModule.default;
        `;
        
        // Add the script to the document
        document.head.appendChild(module);
        
        // Wait for the module to load
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Component loading timed out'));
          }, 5000);
          
          const checkComponent = () => {
            // Check if the component has been loaded into the window
            if ((window as any)[moduleId]) {
              clearTimeout(timeout);
              resolve();
              return;
            }
            
            // Keep checking until the component is loaded
            setTimeout(checkComponent, 100);
          };
          
          checkComponent();
        });
        
        // Get the component from the window
        const Component = (window as any)[moduleId];
        if (!Component) {
          throw new Error('Component failed to load');
        }
        
        // Return the component as a module
        return { default: Component };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        // Create a fallback component to display the error
        const ErrorComponent = () => <ErrorDisplay error={error} />;
        return { default: ErrorComponent };
      } finally {
        setIsLoading(false);
      }
    });
  }, [componentCode, moduleId]);
  
  // Effects
  useEffect(() => {
    // Clean up when the component unmounts
    return () => {
      // Remove the component from the window
      if ((window as any)[moduleId]) {
        delete (window as any)[moduleId];
      }
    };
  }, [moduleId]);
  
  // Player configuration
  const {
    fps,
    width,
    height,
    durationInFrames
  } = storyboard;
  
  // Render the player
  return (
    <div className="w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 text-white">
          Loading component...
        </div>
      )}
      
      <React.Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
        <Player
          ref={playerRef}
          component={DynamicComponent}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={width}
          compositionHeight={height}
          fps={fps}
          style={{
            width: '100%',
            height: '100%',
          }}
          controls
        />
      </React.Suspense>
    </div>
  );
} 