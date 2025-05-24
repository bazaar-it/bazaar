//src/app/test/component-harness/page.tsx
"use client";

import React, { useState, useEffect, Suspense, useRef, lazy, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "~/components/ui/button";
import { Player } from '@remotion/player';
import { transform } from 'sucrase';
import * as RemotionLib from 'remotion';
import { sharedModuleRegistry } from '~/shared/modules/registry';
import { setModuleVersion } from '~/shared/modules/versions';
import { RUNTIME_DEPENDENCIES } from '~/server/constants/runtime-dependencies';
import { ErrorBoundary } from 'react-error-boundary';

// We'll be using the Player component which already includes the necessary context providers

// Monaco editor for code editing with proper typing
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200 overflow-auto">
      <h3 className="font-bold mb-2">Error Loading Component</h3>
      <p className="mb-2">{error.message}</p>
      <pre className="text-xs bg-red-100 p-2 rounded overflow-auto">
        {error.stack}
      </pre>
    </div>
  );
}

// Component to render dynamically loaded Remotion component
interface RemotionPreviewProps {
  lazyComponent: () => Promise<any>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  refreshToken: string;
  inputProps: Record<string, any>;
}

function RemotionPreview({
  lazyComponent,
  durationInFrames,
  fps,
  width,
  height,
  refreshToken,
  inputProps,
}: RemotionPreviewProps) {
  console.log('RemotionPreview rendering with props:', { durationInFrames, fps, width, height });
  console.log('Input props for component:', inputProps);
  
  // Player component already includes the necessary context providers
  return (
    <Player
      lazyComponent={lazyComponent}
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
      showVolumeControls
      doubleClickToFullscreen
      clickToPlay
      key={refreshToken} // Use key to force remount when refreshToken changes
      acknowledgeRemotionLicense
    />
  );
}

// Register utilities for components to use
function registerSharedUtilities() {
  // Example shared utilities that components can use
  sharedModuleRegistry.register('animation-utils', '1.0.0', {
    easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    spring: (frame: number, config = { damping: 10, stiffness: 100 }) => {
      const { damping, stiffness } = config;
      return 1 - Math.exp(-damping * frame) * Math.cos(Math.sqrt(stiffness) * frame);
    }
  });
  
  // Register version info
  setModuleVersion({ 
    name: 'animation-utils', 
    version: '1.0.0',
    description: 'Animation utility functions for Remotion components'
  });
  
  // Could add more shared modules here
}

// Create a blob URL for the transpiled code
function createBlobUrl(code: string): string {
  const blob = new Blob([code], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

// Create a module cache to avoid recreating modules
const moduleCache = new Map<string, any>();

export default function ComponentTestHarness() {
  // Register shared utilities once the component mounts
  useEffect(() => {
    registerSharedUtilities();
  }, []);
  // Expose the host's React and Remotion instances to dynamically loaded modules
  useEffect(() => {
    // Make React available to dynamically loaded modules
    (window as any).React = React;
    // Make Remotion available to dynamically loaded modules
    (window as any).Remotion = RemotionLib;
    // Make shared module registry available globally
    (window as any).sharedModuleRegistry = sharedModuleRegistry;
    
    console.log('[ComponentHarness] Host dependencies exposed to window globals for ESM modules');
  }, []);
  const [tsxCode, setTsxCode] = useState(initialComponentCode);
  const [compiledCode, setCompiledCode] = useState(''); 
  const [componentUrl, setComponentUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a state variable for the lazy component importer function
  const [componentImporter, setComponentImporter] = useState<(() => Promise<any>) | null>(null);
  
  // Use refs for values generated on client that shouldn't trigger hydration issues
  const componentIdRef = useRef<string>('');
  const refreshTokenRef = useRef<string>('initial');
  const [inputProps, setInputProps] = useState<Record<string, unknown>>({
    // Default or example props
    text: 'Hello from ComponentTestHarness!',
    value: 123,
  });
  const [inputPropsString, setInputPropsString] = useState<string>(
    JSON.stringify(inputProps, null, 2)
  );
  
  // Create a simple scene configuration that matches the application's Scene type
  const [videoConfig, setVideoConfig] = useState({
    scenes: [
      {
        id: 'test-scene-' + Math.random().toString(36).substring(2, 15),
        type: 'custom' as const,
        start: 0,
        duration: 150,
        data: {
          componentId: componentIdRef.current,
        }
      }
    ],
    meta: {
      duration: 150,
      title: 'Test Component',
      backgroundColor: '#000000',
      fps: 30,
      width: 1280,
      height: 720
    }
  });

  // Generate IDs on client-side only to avoid hydration issues
  useEffect(() => {
    // Generate a random component ID
    componentIdRef.current = `test-component-${Math.random().toString(36).substring(2, 15)}`;
    refreshTokenRef.current = Math.random().toString(36).substring(2, 10);
    
    // Update video config with the component ID
    setVideoConfig(prev => {
      const updatedScenes = [...prev.scenes];
      if (updatedScenes[0]) {
        updatedScenes[0] = {
          ...updatedScenes[0],
          data: {
            ...updatedScenes[0].data,
            componentId: componentIdRef.current
          }
        };
      }
      return {
        ...prev,
        scenes: updatedScenes
      };
    });
  }, []);

  // Clean up old blob URLs when component unmounts or when new ones are created
  useEffect(() => {
    return () => {
      if (componentUrl) {
        URL.revokeObjectURL(componentUrl);
      }
    };
  }, [componentUrl]);

  const compileComponent = async () => {
    setIsCompiling(true);
    setError(null);
    setComponentImporter(null); // Clear previous importer function
    // Update refresh token to force Player re-render
    refreshTokenRef.current = '';

    // Setup Import Map before compilation and import attempt
    console.log('[ComponentHarness] compileComponent: RUNTIME_DEPENDENCIES:', JSON.stringify(RUNTIME_DEPENDENCIES, null, 2));
    const importMapId = 'dynamic-remotion-importmap';
    if (!document.getElementById(importMapId)) {
      console.log('[ComponentHarness] compileComponent: Creating import map...');
      const importMap = {
        imports: {
          // no remotion entries – the blob uses the host instance via window.Remotion
        },
      };
      const importMapScript = document.createElement('script');
      importMapScript.type = 'importmap';
      importMapScript.id = importMapId;
      importMapScript.textContent = JSON.stringify(importMap);
      document.head.appendChild(importMapScript);
      console.log('[ComponentHarness] compileComponent: Import map appended to head:', importMapScript.textContent);
    } else {
      console.log('[ComponentHarness] compileComponent: Import map already exists.');
    }

    try {
      console.log('Starting compilation...');
      console.log('TSX Code:', tsxCode);

      // --- Transpile TSX -> plain JS (classic JSX runtime) --------------------
      const { code: raw } = transform(tsxCode, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: false,
      });

      // ----- Minimal component implementation that is guaranteed to work -----
      
      // Find the React component name in the source
      const componentMatch = (/export\s+default\s+function\s+(\w+)/.exec(raw))
        || (/function\s+(\w+)\s*\(/.exec(raw))
        || (/const\s+(\w+)\s*=/.exec(raw))
        || ['', 'MyComponent'];
      
      const componentName = componentMatch[1];
      console.log('Component name detected:', componentName);
      
      // We need to ensure the component works correctly with Remotion Player
      // by preserving the component structure while avoiding React/Remotion duplicates
      
      console.log('Starting component transformation for Remotion Player compatibility...');
      
      // Step 1: Identify imports to replace with globals
      const remotionImportRegex = /import\s+{([^}]+)}\s+from\s+['"](remotion|'remotion')['"](;?)/g;
      const reactImportRegex = /import\s+React.*?from\s+['"](react|'react')['"](;?)/g;
      
      // Extract any Remotion imports for mapping
      const remotionImports: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = remotionImportRegex.exec(raw)) !== null) {
        if (match[1]) {
          remotionImports.push(...match[1].split(',').map(s => s.trim()));
        }
      }
      console.log('Detected Remotion imports:', remotionImports);
      
      // Step 2: Remove imports but keep track of what was imported
      let processedCode = raw.replace(reactImportRegex, '// React import removed');
      processedCode = processedCode.replace(remotionImportRegex, 
        (match, imports) => `// Remotion imports: ${imports}`);
        
      // Step 3: Check for potential variable conflicts
      const hasAnimUtils = /const\s+animUtils/.test(processedCode);
      const hasDefaultExport = /export\s+default/.test(processedCode);
      
      // Step 4: Create the ESM module with proper globals
      const blobContent = `
// ESM Module for Remotion Component
// Dynamically loaded with access to host React and Remotion instances

// Access React from host
const React = window.React;

// Access Remotion exports from host
const {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
  Video,
  Img,
  Series,
  spring,
  interpolate,
  useRef,
  useState,
  useEffect
} = window.Remotion;

// Access shared module registry
const sharedModuleRegistry = window.sharedModuleRegistry || {};
${!hasAnimUtils ? 'const animUtils = sharedModuleRegistry.get ? sharedModuleRegistry.get(\'animation-utils\') : undefined;' : '// animUtils is defined in user code'}

// Setup special hooks to ensure proper frame updates
const _useRemotion = () => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  return { frame, config };
};

${processedCode}

// Export correct component for Remotion Player
${!hasDefaultExport ? `export default ${componentName};` : ''}
`;

      console.log('Created ESM compatible component blob with Remotion integration');

      
      console.log('Created isolated component wrapper with controlled environment');
      
      console.log('Created clean blob with explicit references to window.React and window.Remotion');
      console.log('Avoiding import conflicts by using window globals instead of imports');

      setCompiledCode(blobContent);

      // Clean up previous blob URL if it exists
      if (componentUrl) {
        URL.revokeObjectURL(componentUrl);
        setComponentUrl(null);
      }

      // Create blob URL for the compiled JS with proper module type
      const url = createBlobUrl(blobContent);
      setComponentUrl(url);
      
      // Create a new random refresh token to force Player remount
      refreshTokenRef.current = Date.now() + '-' + Math.random().toString(36).substring(2);
      console.log('Generated new refresh token:', refreshTokenRef.current);

      // Create the importer function for Remotion's lazyComponent prop
      const importer = () => {
        console.log('Lazy component import triggered from URL:', url);
        return import(/* webpackIgnore: true */ url)
          .then(module => {
            console.log('Module loaded successfully:', module);
            const defaultExport = module?.default;
            if (typeof defaultExport === 'function') {
              console.log('Default export is a function, returning module');
              return module;               // React.lazy expects { default: Component }
            }
            throw new Error('Dynamic component loaded, but default export is not a function or is missing.');
          })
          .catch(err => {
            console.error('Error importing dynamic component:', err);
            throw err; // Re-throw to let Player or ErrorBoundary handle it
          });
      };
      setComponentImporter(() => importer);
    } catch (error: unknown) {
      console.error('Error compiling component:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsCompiling(false);
    }
  };

  const handlePropsUpdate = () => {
    try {
      setInputProps(JSON.parse(inputPropsString));
      setError(null); // Clear error on successful parsing
    } catch (e) {
      if (e instanceof Error) {
        setError(e); // Set the caught error object
      } else {
        setError(new Error('Invalid JSON: Failed to parse input props.')); // Set a new Error object for unknown errors
      }
    }
  };
  
  // Function to ensure the code has a default export
  const ensureDefaultExport = (code: string): string => {
    // If the code already has a default export, return it unchanged
    if (/export\s+default\s+/.test(code)) {
      return code;
    }
    
    // Try to find a component function or class to export
    // Look for function declarations or variable declarations with functions/classes
    const componentNameMatch = /function\s+([A-Za-z0-9_]+)\s*\(/.exec(code);
    const constComponentMatch = /const\s+([A-Za-z0-9_]+)\s*=/.exec(code);
    
    let componentName = '';
    
    if (componentNameMatch?.[1]) {
      componentName = componentNameMatch[1];
    } else if (constComponentMatch?.[1]) {
      componentName = constComponentMatch[1];
    } else {
      // If no obvious component name found, create a wrapper
      return `${code}\n\nconst DefaultComponent = () => null;\nexport default DefaultComponent;`;
    }
    
    // Add default export if not already present
    return `${code}\n\nexport default ${componentName};`;
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Component Test Harness</h1>
      <p className="mb-4 text-gray-600">
        Edit and test custom components using the ESM + lazy loading approach from Sprint 25.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold mb-2">Component Code (TSX)</h2>
          <div className="h-[500px] border rounded">
            <MonacoEditor
              height="400px"
              defaultLanguage="typescript"
              value={tsxCode}
              onChange={(value: string | undefined) => setTsxCode(value || '')}
              options={{
                minimap: { enabled: false },
              }}
            />
          </div>
          
          <div className="mt-4 space-y-2">
            <Button 
              onClick={compileComponent} 
              disabled={isCompiling}
              className="w-full"
            >
              {isCompiling ? 'Compiling...' : 'Compile & Test Component'}
            </Button>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded">
                {error.message}
              </div>
            )}
            
            <div className="bg-gray-100 p-3 rounded text-sm">
              <p><strong>Component ID:</strong> {componentIdRef.current}</p>
              <p><strong>Refresh Token:</strong> {refreshTokenRef.current}</p>
              <p><strong>Runtime Dependencies:</strong> React {RUNTIME_DEPENDENCIES.react}, Remotion {RUNTIME_DEPENDENCIES.remotion}</p>
              <p>
                <strong>Shared Modules:</strong> animation-utils@1.0.0 
                (<code className="bg-gray-200 px-1 rounded text-xs">sharedModuleRegistry.get('animation-utils')</code>)
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col">
          <h2 className="text-xl font-bold mb-2">Preview</h2>
          <div className="border rounded h-[500px] bg-gray-800">
            {isCompiling ? (
              <div className="flex items-center justify-center h-full text-gray-400">Compiling...</div>
            ) : error ? (
              <div className="p-4 text-red-500 whitespace-pre-wrap">{error.message}</div>
            ) : componentImporter ? (
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Loading component via Suspense...</div>}> 
                  <div className="player-container rounded-lg overflow-hidden w-full h-full flex items-center justify-center">
                    <RemotionPreview
                      lazyComponent={componentImporter}
                      durationInFrames={videoConfig.meta.duration}
                      fps={videoConfig.meta.fps}
                      width={videoConfig.meta.width}
                      height={videoConfig.meta.height}
                      refreshToken={refreshTokenRef.current}
                      inputProps={inputProps}
                    />
                  </div>
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Edit code and click "Compile & Test" to preview.
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2">Scene Configuration</h3>
            <div className="h-[150px] border rounded">
              <MonacoEditor
                height="150px"
                defaultLanguage="json"
                value={JSON.stringify(videoConfig, null, 2)}
                onChange={(value: string | undefined) => {
                  try {
                    if (value) {
                      setVideoConfig(JSON.parse(value));
                    }
                  } catch (e) {
                    // Don't update if JSON is invalid
                  }
                }}
                options={{ minimap: { enabled: false } }}
              />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2">Input Props</h3>
            <div className="h-[150px] border rounded">
              <MonacoEditor
                height="150px"
                defaultLanguage="json"
                value={inputPropsString}
                onChange={(value) => setInputPropsString(value || '')}
                options={{ minimap: { enabled: false } }}
              />
            </div>
            <Button onClick={handlePropsUpdate} className="mt-2">
              Update Props
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const initialComponentCode = `import { AbsoluteFill, useCurrentFrame } from "remotion";
import React from "react";

// Example of using the shared module registry
// Access animation utilities from the shared registry
const animUtils = window.sharedModuleRegistry?.get('animation-utils');

export default function MyComponent({ text = "Hello Remotion", value = 100 }) {
  const frame = useCurrentFrame();
  
  // Use the spring function from animation utils if available
  const scale = animUtils?.spring 
    ? animUtils.spring(frame, { damping: 15, stiffness: 150 }) 
    : Math.min(1, frame / 30);
  
  // Use easeInOut from animation utils if available
  const opacity = animUtils?.easeInOut 
    ? animUtils.easeInOut(frame / 60) 
    : Math.min(1, frame / 30);
  
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%",
        flexDirection: "column" 
      }}>
        <h1 style={{ 
          fontSize: 60, 
          color: "blue",
          transform: \`scale(\${scale})\`,
          opacity: opacity,
        }}>
          {text}
        </h1>
        <p style={{ fontSize: 30, color: "gray" }}>
          Value: {value}, Frame: {frame}
        </p>
      </div>
    </AbsoluteFill>
  );
}`;
