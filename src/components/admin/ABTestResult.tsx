"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Code, Clock, Star, Copy, Check, Maximize2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { Player, type PlayerRef } from "@remotion/player";
import { transform } from 'sucrase';
import * as Remotion from "remotion";
import React from "react";

// Extend window interface for TypeScript
declare global {
  interface Window {
    Remotion: typeof Remotion;
    React: typeof React;
    IconifyIcon: any;
  }
}

// Set up window.Remotion and React if they don't exist
if (typeof window !== 'undefined') {
  if (!window.Remotion) {
    window.Remotion = Remotion;
  }
  if (!window.React) {
    window.React = React;
  }
  // Set up IconifyIcon placeholder if not exists
  if (!window.IconifyIcon) {
    // Simple placeholder that renders an icon
    window.IconifyIcon = ({ icon, style }: any) => {
      return React.createElement('div', { style: { ...style, display: 'inline-block' } }, '🎯');
    };
  }
}

interface TestResult {
  version: string;
  code: string;
  duration: number;
  name: string;
  generationTime: number;
  tokenUsage?: number;
}

interface ABTestResultProps {
  result: TestResult;
  testPrompt: string;
}

// Hook to compile the generated code into a React component
const useCompiledCode = (code: string, version: string) => {
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [isCompiling, setIsCompiling] = useState(true);
  const [compilationError, setCompilationError] = useState<Error | null>(null);

  useEffect(() => {
    setIsCompiling(true);
    let blobUrl: string | null = null;

    const compileCode = async () => {
      try {
        // The code already has window.Remotion and works perfectly - just compile it as-is
        // Transform TypeScript/JSX to JavaScript using sucrase (same as templates)
        const { code: transformed } = transform(code, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });
        
        const finalCode = transformed;
        
        // Create a blob URL for the module
        const blob = new Blob([finalCode], { 
          type: 'application/javascript'
        });
        blobUrl = URL.createObjectURL(blob);
        
        // Import the module dynamically with webpack ignore comment
        const module = await import(/* webpackIgnore: true */ blobUrl);
        
        if (module.default && typeof module.default === 'function') {
          setComponent(() => module.default);
          setCompilationError(null);
        } else {
          throw new Error('No default export found in generated code');
        }
      } catch (error) {
        console.error(`Failed to compile code for ${version}:`, error);
        setCompilationError(error instanceof Error ? error : new Error('Unknown compilation error'));
        
        // Try a fallback approach using Function constructor
        try {
          // The code already has window.Remotion destructuring, just remove export
          const codeWithoutExport = code.replace(/export\s+default\s+/g, '').replace(/export\s+const\s+\w+\s*=\s*/g, 'const ');
          
          // Extract component name from the code
          const componentMatch = code.match(/(?:export\s+default\s+)?(?:function|const)\s+(\w+)/);
          const componentName = componentMatch ? componentMatch[1] : 'Component';
          
          // Create a function wrapper that returns the component
          // Don't add Remotion destructuring since it's already in the code
          const funcBody = `
            ${codeWithoutExport}
            return typeof ${componentName} !== 'undefined' ? ${componentName} : null;
          `;
          
          const func = new Function(funcBody);
          const FallbackComponent = func();
          
          if (FallbackComponent) {
            setComponent(() => FallbackComponent);
            setCompilationError(null);
          }
        } catch (fallbackError) {
          console.error('Fallback compilation also failed:', fallbackError);
        }
      } finally {
        setIsCompiling(false);
        // Clean up blob URL after import
        if (blobUrl) {
          // Delay cleanup to ensure import is complete
          setTimeout(() => URL.revokeObjectURL(blobUrl!), 1000);
        }
      }
    };

    compileCode();
    
    // Cleanup on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [code, version]);

  return { component, isCompiling, compilationError };
};

export default function ABTestResult({ result, testPrompt }: ABTestResultProps) {
  const [showCode, setShowCode] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [rating, setRating] = useState(0);
  const [copied, setCopied] = useState(false);
  const playerRef = useRef<PlayerRef | null>(null);

  // Compile the code into a component
  const { component, isCompiling, compilationError } = useCompiledCode(result.code, result.version);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied to clipboard");
  };

  const versionColors = {
    original: "bg-blue-500",
    v2: "bg-green-500",
    "v3-taste": "bg-purple-500",
    "v4-balanced": "bg-orange-500"
  };

  const versionLabels = {
    original: "Original",
    v2: "V2 (Few-Shot)",
    "v3-taste": "V3 (Taste)",
    "v4-balanced": "V4 (Balanced)"
  };

  // Format generation time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Memoize player configuration
  const playerConfig = useMemo(() => ({
    durationInFrames: result.duration || 180,
    fps: 30,
    compositionWidth: 1920,
    compositionHeight: 1080
  }), [result.duration]);

  return (
    <>
      <Card className="bg-gray-800 border-gray-700 overflow-hidden h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Badge className={`${versionColors[result.version as keyof typeof versionColors]} text-white`}>
                {versionLabels[result.version as keyof typeof versionLabels]}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-gray-300 border-gray-600">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(result.generationTime)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 flex-1 flex flex-col">
          {/* Remotion Player Preview */}
          <div 
            className="relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer group flex-1 min-h-[200px]" 
            style={{ aspectRatio: "16/9" }}
            onClick={() => setShowFullPreview(true)}
          >
            {isCompiling ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-gray-400 text-sm">Compiling preview...</p>
                </div>
              </div>
            ) : compilationError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-yellow-400 font-semibold mb-2">Preview Error</p>
                  <p className="text-gray-400 text-sm mb-2">Failed to compile preview</p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCode(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  >
                    View Code
                  </Button>
                </div>
              </div>
            ) : component ? (
              <Player
                ref={playerRef}
                component={component}
                {...playerConfig}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                loop
                controls={false}
                autoPlay={true}
                clickToPlay={false}
              />
            ) : null}
            
            {/* Overlay on hover */}
            {!isCompiling && !compilationError && (
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg px-3 py-2">
                  <Maximize2 className="h-6 w-6 text-white mx-auto mb-1" />
                  <p className="text-white text-xs">Click for full view</p>
                </div>
              </div>
            )}
          </div>

          {/* Scene Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Scene:</span>
              <span className="text-white font-medium truncate ml-2" title={result.name}>
                {result.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Duration:</span>
              <span className="text-white">{result.duration}f / {(result.duration / 30).toFixed(1)}s</span>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-between border-t border-gray-700 pt-3">
            <span className="text-sm text-gray-400">Quality:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-colors"
                >
                  <Star
                    className={`h-4 w-4 ${
                      star <= rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-gray-600 hover:text-gray-400"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-auto pt-2">
            <Button
              onClick={() => setShowCode(true)}
              variant="outline"
              size="sm"
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              <Code className="h-4 w-4 mr-1" />
              Code
            </Button>
            <Button
              onClick={handleCopyCode}
              variant="outline"
              size="sm"
              className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Preview Dialog */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Full Preview - {versionLabels[result.version as keyof typeof versionLabels]}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {result.name} • {formatTime(result.generationTime)} • {result.duration} frames
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4" style={{ aspectRatio: "16/9" }}>
            {component && !compilationError && (
              <Player
                component={component}
                {...playerConfig}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                loop
                controls
                autoPlay
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Code Dialog */}
      <Dialog open={showCode} onOpenChange={setShowCode}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span>Generated Code - {versionLabels[result.version as keyof typeof versionLabels]}</span>
              <Button
                onClick={handleCopyCode}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] mt-4">
            <SyntaxHighlighter
              language="javascript"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              {result.code}
            </SyntaxHighlighter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}