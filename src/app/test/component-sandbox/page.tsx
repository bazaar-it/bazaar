// src/app/test/component-sandbox/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { Player } from "@remotion/player";
import { ErrorBoundary } from "react-error-boundary";
import dynamic from 'next/dynamic';
import { Button } from "~/components/ui/button";

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

export default function ComponentSandbox() {
  const [tsxCode, setTsxCode] = useState(initialComponentCode);
  const [compiledCode, setCompiledCode] = useState('');
  const [componentUrl, setComponentUrl] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const compileComponent = async () => {
    setIsCompiling(true);
    setError(null);
    
    try {
      // Call a local compilation endpoint (we'll create this)
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
      setComponentUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsCompiling(false);
    }
  };
  
  return (
    <div className="grid grid-cols-2 gap-4 p-4 h-screen">
      <div className="flex flex-col h-full">
        <h2 className="text-xl font-bold mb-2">TSX Component Code</h2>
        <div className="h-2/3 border rounded">
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
        
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={compileComponent} disabled={isCompiling}>
            {isCompiling ? 'Compiling...' : 'Compile & Preview'}
          </Button>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded">
              {error.message}
            </div>
          )}
          
          <h3 className="text-lg font-bold mt-2">Compiled JS</h3>
          <div className="h-1/3 border rounded overflow-auto">
            <pre className="p-2 text-xs">{compiledCode?.slice(0, 300)}...</pre>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col h-full">
        <h2 className="text-xl font-bold mb-2">Remotion Preview</h2>
        <div className="h-full border rounded">
          {componentUrl ? (
            <ErrorBoundary fallback={<div className="p-4 text-red-500">Component rendering failed</div>}>
              <Suspense fallback={<div className="p-4">Loading component...</div>}>
                <DynamicRemotionPreview url={componentUrl} />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Compile a component to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dynamic component that loads the remote component via URL
function DynamicRemotionPreview({ url }: { url: string }) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  
  useEffect(() => {
    // Load component from blob URL
    import(/* @vite-ignore */ url)
      .then(module => {
        setComponent(() => module.default);
      })
      .catch(err => console.error('Failed to load component:', err));
  }, [url]);
  
  if (!Component) return <div>Loading component...</div>;
  
  return (
    <Player
      component={Component}
      durationInFrames={150}
      compositionWidth={1280}
      compositionHeight={720}
      fps={30}
      controls
    />
  );
}

const initialComponentCode = `import { AbsoluteFill } from "remotion";
import React from "react";

export default function MyComponent() {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%" 
      }}>
        <h1 style={{ fontSize: 60, color: "blue" }}>Hello World</h1>
      </div>
    </AbsoluteFill>
  );
}`;
