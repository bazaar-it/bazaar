//src/app/test/component-harness/page.tsx
"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "~/components/ui/button";
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';
import { Player } from '@remotion/player';
import { v4 as uuidv4 } from 'uuid';

// Monaco editor for code editing with proper typing
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ComponentTestHarness() {
  const [tsxCode, setTsxCode] = useState(initialComponentCode);
  const [compiledCode, setCompiledCode] = useState('');
  const [componentId, setComponentId] = useState('test-component-' + uuidv4());
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState<string>('initial');
  
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
      backgroundColor: '#000000'
    }
  });

  const compileComponent = async () => {
    setIsCompiling(true);
    setError(null);
    
    try {
      // Call the compilation endpoint
      const response = await fetch('/api/test/compile-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tsxCode }),
      });
      
      if (!response.ok) throw new Error(`Compilation failed: ${response.statusText}`);
      
      const result = await response.json();
      setCompiledCode(result.compiledCode);
      
      // Create blob URL for the compiled JS
      const blob = new Blob([result.compiledCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      // Define the global REMOTION_COMPONENT for this component
      const scriptId = `remotion-component-${componentId}`;
      
      // Remove any existing script with the same ID
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
      
      // Create a script tag to make the component globally available
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'module';
      script.textContent = `
        import * as Component from "${url}";
        // Store the component on the window object
        window.__REMOTION_COMPONENT = window.__REMOTION_COMPONENT || {};
        window.__REMOTION_COMPONENT["${componentId}"] = Component.default;
        console.log("Registered component ${componentId} globally");
      `;
      document.head.appendChild(script);
      
      // Force a refresh of the component by updating the refresh token
      setRefreshToken('refresh-' + Date.now());
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsCompiling(false);
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
          <h2 className="text-xl font-bold mb-2">Preview (using DynamicVideo)</h2>
          <div className="border rounded h-[500px] bg-gray-800">
            {compiledCode ? (
              <Player
                component={DynamicVideo}
                inputProps={{
                  scenes: videoConfig.scenes,
                  meta: videoConfig.meta,
                  refreshToken: refreshToken
                }}
                durationInFrames={videoConfig.meta.duration}
                fps={30}
                style={{ width: '100%', height: '100%' }}
                compositionWidth={1280}
                compositionHeight={720}
                controls
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Compile a component to preview</p>
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
