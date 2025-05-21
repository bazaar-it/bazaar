//src/app/test/component-harness/page.tsx
"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "~/components/ui/button";
import { Player } from '@remotion/player';
import { v4 as uuidv4 } from 'uuid';
import { transform } from 'sucrase';

// Monaco editor for code editing with proper typing
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// Component to render dynamically loaded Remotion component
function RemotionPreview({
  componentModule,
  durationInFrames,
  fps,
  width,
  height,
  refreshToken,
  inputProps,
}: {
  componentModule: any;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  refreshToken: string;
  inputProps: Record<string, unknown>;
}) {
  // Create a component that will be used as the container
  const RemotionComp = React.useMemo(() => {
    // Get the default export or first export that's a function
    const Component = componentModule.default || 
      Object.values(componentModule).find(exp => typeof exp === 'function');
    
    if (!Component) {
      throw new Error('No valid component export found');
    }
    
    // Create a container component
    // Pass inputProps to the dynamically loaded component
    return () => <Component {...inputProps} />;
  }, [componentModule, inputProps]);

  return (
    <Player
      key={refreshToken}
      component={RemotionComp}
      durationInFrames={durationInFrames}
      fps={fps}
      compositionWidth={width}
      compositionHeight={height}
      inputProps={inputProps}
      style={{ 
        width: '100%', 
        height: '100%',
        maxWidth: width,
        maxHeight: height
      }}
      controls
    />
  );
}

export default function ComponentTestHarness() {
  const [tsxCode, setTsxCode] = useState(initialComponentCode);
  const [compiledCode, setCompiledCode] = useState(''); 
  const [componentUrl, setComponentUrl] = useState<string | null>(null);
  const [componentModule, setComponentModule] = useState<any>(null);
  const [componentId, setComponentId] = useState('test-component-' + uuidv4());
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState<string>('initial');
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
        id: 'test-scene-' + uuidv4(),
        type: 'custom' as const,
        start: 0,
        duration: 150,
        data: {
          componentId: componentId,
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

  // Clean up old blob URLs when component unmounts or when new ones are created
  useEffect(() => {
    return () => {
      if (componentUrl) {
        URL.revokeObjectURL(componentUrl);
      }
    };
  }, [componentUrl]);

  // Setup import map once on initial render
  useEffect(() => {
    // Create or update import map for ESM dependencies
    const importMapId = 'remotion-import-map';
    let importMapScript = document.getElementById(importMapId) as HTMLScriptElement | null;
    
    if (!importMapScript) {
      importMapScript = document.createElement('script');
      importMapScript.id = importMapId;
      importMapScript.type = 'importmap';
      document.head.appendChild(importMapScript);
      console.log('Added Remotion import map');
    }
    
    importMapScript.textContent = JSON.stringify({
      imports: {
        'react': 'https://esm.sh/react@18.2.0',
        'react-dom': 'https://esm.sh/react-dom@18.2.0',
        'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime',
        'remotion': 'https://esm.sh/remotion@4.0.290',
        '@remotion/player': 'https://esm.sh/@remotion/player@4.0.290',
        'remotion/': 'https://esm.sh/remotion@4.0.290/'
      }
    });
  }, []);

  const compileComponent = async () => {
    setIsCompiling(true);
    setError(null);
    setComponentModule(null); // Clear previous component
    setRefreshToken(uuidv4()); // Force re-render of Player

    try {
      console.log('Starting compilation...');
      console.log('TSX Code:', tsxCode);

      // Transpile TSX to JS using Sucrase
      const { code: transformedCode } = transform(tsxCode, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic', // Changed from 'automatic' to 'classic'
        production: false, // Or true, depending on your needs
      });

      console.log('Transformed Code (JavaScript):', transformedCode);
      
      setCompiledCode(transformedCode);
      
      // Clean up previous blob URL if it exists
      if (componentUrl) {
        URL.revokeObjectURL(componentUrl);
        setComponentUrl(null);
      }
      
      // Create blob URL for the compiled JS
      const blob = new Blob([transformedCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      setComponentUrl(url);
      
      // Use dynamic import to load the module
      try {
        // Import the module dynamically
        const module = await import(/* webpackIgnore: true */ url);
        
        // Store the entire module
        setComponentModule(module);
        
        // Update the refresh token to force re-render
        setRefreshToken(Date.now().toString());
      } catch (importError: unknown) {
        console.error('Error importing module:', importError);
        setError(new Error(`Module import error: ${importError instanceof Error ? importError.message : String(importError)}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Component Test Harness</h1>
      <p className="mb-4 text-gray-600">Edit and test custom components using the same rendering pipeline as the main application.</p>
      
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
              <p><strong>Component ID:</strong> {componentId}</p>
              <p><strong>Refresh Token:</strong> {refreshToken}</p>
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
            ) : componentModule ? (
              <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Loading component via Suspense...</div>}> 
                <div className="player-container rounded-lg overflow-hidden w-full h-full flex items-center justify-center">
                  <RemotionPreview
                    componentModule={componentModule}
                    durationInFrames={videoConfig.meta.duration}
                    fps={videoConfig.meta.fps}
                    width={videoConfig.meta.width}
                    height={videoConfig.meta.height}
                    refreshToken={refreshToken}
                    inputProps={inputProps}
                  />
                </div>
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Edit code and click "Compile & Test" to preview.
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2">Scene Configuration</h3>
            <div className="h-[200px] border rounded">
              <MonacoEditor
                height="200px"
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
            <div className="h-[200px] border rounded">
              <MonacoEditor
                height="200px"
                defaultLanguage="json"
                value={inputPropsString}
                onChange={(value) => setInputPropsString(value || '')}
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

export default function MyComponent() {
  const frame = useCurrentFrame();
  
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
          transform: \`translateY(\${Math.sin(frame / 10) * 20}px)\` 
        }}>
          Hello Remotion
        </h1>
        <p style={{ fontSize: 30, color: "gray" }}>
          Frame: {frame}
        </p>
      </div>
    </AbsoluteFill>
  );
}`;
