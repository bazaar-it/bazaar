//src/app/test/component-pipeline/page.tsx
"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "~/components/ui/button";
import { RemotionPlayerTest } from '~/components/ui/RemotionPlayerTest';

// Monaco editor for code editing with proper typing
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function ComponentPipelinePage() {
  const [tsxCode, setTsxCode] = useState(initialComponentCode);
  const [sanitizedCode, setSanitizedCode] = useState('');
  const [compiledCode, setCompiledCode] = useState('');
  const [componentUrl, setComponentUrl] = useState('');
  const [activeStep, setActiveStep] = useState('raw');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const processComponent = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Call API to process the component
      const response = await fetch('/api/test/process-component-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tsxCode }),
      });
      
      if (!response.ok) throw new Error(`Processing failed: ${response.statusText}`);
      
      const result = await response.json();
      setSanitizedCode(result.sanitizedCode);
      setCompiledCode(result.compiledCode);
      
      // Create blob URL for the compiled JS
      const blob = new Blob([result.compiledCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      setComponentUrl(url);
      
      // Move to sanitized tab
      setActiveStep('sanitized');
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Component Processing Pipeline Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <div className="flex border-b mb-4">
            <button 
              className={`px-4 py-2 ${activeStep === 'raw' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveStep('raw')}
            >
              1. Raw TSX
            </button>
            <button 
              className={`px-4 py-2 ${activeStep === 'sanitized' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveStep('sanitized')}
              disabled={!sanitizedCode}
            >
              2. Sanitized
            </button>
            <button 
              className={`px-4 py-2 ${activeStep === 'compiled' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => setActiveStep('compiled')}
              disabled={!compiledCode}
            >
              3. Compiled JS
            </button>
          </div>
          
          <div className="border rounded p-4 h-[600px]">
            {activeStep === 'raw' && (
              <>
                <h2 className="text-lg font-semibold mb-2">Raw Component Code</h2>
                <div className="h-[500px]">
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
                
                <div className="mt-4">
                  <Button onClick={processComponent} disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Process Component'}
                  </Button>
                </div>
              </>
            )}
            
            {activeStep === 'sanitized' && (
              <>
                <h2 className="text-lg font-semibold mb-2">Sanitized Code</h2>
                <div className="h-[500px]">
                  <MonacoEditor
                    height="400px"
                    defaultLanguage="typescript"
                    value={sanitizedCode}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                    }}
                  />
                </div>
                
                <div className="mt-4">
                  <Button onClick={() => setActiveStep('compiled')} disabled={!compiledCode}>
                    Next: View Compiled JS
                  </Button>
                </div>
              </>
            )}
            
            {activeStep === 'compiled' && (
              <>
                <h2 className="text-lg font-semibold mb-2">Compiled JavaScript</h2>
                <div className="h-[500px]">
                  <MonacoEditor
                    height="400px"
                    defaultLanguage="javascript"
                    value={compiledCode}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                    }}
                  />
                </div>
                
                <div className="mt-4">
                  <Button onClick={() => setActiveStep('raw')}>
                    Back to Step 1
                  </Button>
                </div>
              </>
            )}
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mt-4">
              <h3 className="font-bold">Error</h3>
              <p>{error.message}</p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold mb-2">Remotion Preview</h2>
          <div className="border rounded p-4 h-[600px]">
            {componentUrl ? (
              <RemotionPlayerTest componentUrl={componentUrl} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Process a component to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
