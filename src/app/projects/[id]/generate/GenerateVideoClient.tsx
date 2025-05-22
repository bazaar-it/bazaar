"use client";
// src/app/projects/[id]/generate/GenerateVideoClient.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import * as RemotionLib from 'remotion';
import { sharedModuleRegistry } from '~/shared/modules/registry';
import { transform } from 'sucrase';
import { setModuleVersion } from '~/shared/modules/versions';
import { PromptOrchestrator } from './agents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import PromptForm from './components/PromptForm';
import GenerationProgress from './components/GenerationProgress';
import StoryboardViewer from './components/StoryboardViewer';
import RemotionPreview from './components/RemotionPreview';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "~/components/ui/card";
import type { Storyboard, GenerationState, Scene } from './types/storyboard';
import { ErrorBoundary } from 'react-error-boundary';

// Monaco editor for code editing with proper typing - dynamically imported
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

// Register utilities for dynamically loaded components
function registerSharedUtilities() {
  sharedModuleRegistry.register('animation-utils', '1.0.0', {
    easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    spring: (frame: number, config = { damping: 10, stiffness: 100 }) => {
      const { damping, stiffness } = config;
      return 1 - Math.exp(-damping * frame) * Math.cos(Math.sqrt(stiffness) * frame);
    },
  });

  setModuleVersion({
    name: 'animation-utils',
    version: '1.0.0',
    description: 'Animation utility functions for Remotion components',
  });
}

function createBlobUrl(code: string): string {
  const blob = new Blob([code], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

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

export interface GenerateVideoClientProps {
  projectId: string;
}

export function GenerateVideoClient({ projectId }: GenerateVideoClientProps) {
  const [promptOrchestrator, setPromptOrchestrator] = useState<PromptOrchestrator | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({
    stage: 'idle',
    progress: 0,
    message: 'Enter a prompt to generate your video'
  });
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Component editor and preview state
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [currentComponentCode, setCurrentComponentCode] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledCode, setCompiledCode] = useState<string | null>(null);
  const [componentImporter, setComponentImporter] = useState<(() => Promise<any>) | null>(null);
  const [componentUrl, setComponentUrl] = useState<string | null>(null);
  const [componentError, setComponentError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState<string>(`initial-${Date.now()}`);
  const [activeTab, setActiveTab] = useState<string>('storyboard');

  // Initialize the prompt orchestrator when component mounts
  useEffect(() => {
    const orchestrator = new PromptOrchestrator(projectId);
    setPromptOrchestrator(orchestrator);
    
    // Register for updates
    const unsubscribe = orchestrator.onUpdate(state => {
      setGenerationState(state);
      
      if (state.storyboard) {
        setStoryboard(state.storyboard);
        
        // If we get a new storyboard, select the first scene
        if (state.storyboard.scenes && state.storyboard.scenes.length > 0) {
          setSelectedScene(state.storyboard.scenes[0]);
          
          // Generate placeholder code for the first scene
          const firstScene = state.storyboard.scenes[0];
          if (firstScene) {
            const placeholderCode = generatePlaceholderCode(firstScene, state.storyboard);
            setCurrentComponentCode(placeholderCode);
          }
        }
      }
      
      if (state.stage === 'complete' || state.stage === 'error') {
        setIsGenerating(false);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [projectId]);

  // Register shared utilities once on mount
  useEffect(() => {
    registerSharedUtilities();
  }, []);

  // Expose host dependencies for dynamically loaded components
  useEffect(() => {
    (window as any).React = React;
    (window as any).Remotion = RemotionLib;
    (window as any).sharedModuleRegistry = sharedModuleRegistry;
  }, []);

  // Clean up previously created blob URLs
  useEffect(() => {
    return () => {
      if (componentUrl) {
        URL.revokeObjectURL(componentUrl);
      }
    };
  }, [componentUrl]);
  
  // Generate a placeholder component for a scene
  const generatePlaceholderCode = (scene: Scene, storyboard: Storyboard) => {
    const style = storyboard.style || {};
    return `import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import React from "react";

export default function ${scene.template || 'CustomScene'}(props) {
  const frame = useCurrentFrame();
  
  // Animate opacity
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp'
  });
  
  // Animate scale
  const scale = interpolate(frame, [0, 45], [0.8, 1], {
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "${style.colorPalette?.[0] || '#000000'}",
        color: "white",
        fontFamily: "${style.fontPrimary || 'Inter'}, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 40,
      }}
    >
      <h1 
        style={{ 
          fontSize: 60, 
          marginBottom: 20,
          opacity,
          transform: \`scale(\${scale})\`
        }}
      >
        ${scene.props?.title || scene.name}
      </h1>
      
      ${scene.props?.text ? `<p style={{ fontSize: 30, opacity }}>${scene.props.text}</p>` : ''}
    </AbsoluteFill>
  );
}`;
  };
  
  const handleGenerateVideo = useCallback(async (prompt: string, additionalInstructions?: string) => {
    if (!promptOrchestrator || isGenerating) return;
    
    setIsGenerating(true);
    setActiveTab('storyboard');
    try {
      await promptOrchestrator.generateVideo(prompt, additionalInstructions);
    } catch (error) {
      console.error('Error generating video:', error);
    }
  }, [promptOrchestrator, isGenerating]);
  
  const handleSceneSelect = useCallback((scene: Scene) => {
    setSelectedScene(scene);
    
    // Generate placeholder code for the selected scene
    if (storyboard) {
      const code = generatePlaceholderCode(scene, storyboard);
      setCurrentComponentCode(code);
      setCompiledCode(null); // Reset compiled code when changing scenes
    }
    
    // Switch to code tab
    setActiveTab('code');
  }, [storyboard]);
  
  const compileComponent = useCallback(async () => {
    setIsCompiling(true);
    setComponentError(null);
    setComponentImporter(null);
    try {
      const { code: raw } = transform(currentComponentCode, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: false,
      });

      const componentMatch =
        raw.match(/export\s+default\s+function\s+(\w+)/) ||
        raw.match(/function\s+(\w+)\s*\()/ ||
        raw.match(/const\s+(\w+)\s*=/) || ['','MyComponent'];
      const componentName = componentMatch[1];

      const remotionImportRegex = /import\s+{([^}]+)}\s+from\s+['"](remotion|'remotion')['"](;?)/g;
      const reactImportRegex = /import\s+React.*?from\s+['"](react|'react')['"](;?)/g;

      const remotionImports: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = remotionImportRegex.exec(raw)) !== null) {
        if (match[1]) {
          remotionImports.push(...match[1].split(',').map(s => s.trim()));
        }
      }

      let processedCode = raw.replace(reactImportRegex, '// React import removed');
      processedCode = processedCode.replace(remotionImportRegex, (m, imports) => `// Remotion imports: ${imports}`);

      const hasAnimUtils = /const\s+animUtils/.test(processedCode);
      const hasDefaultExport = /export\s+default/.test(processedCode);

      const blobContent = `
// ESM Module for Remotion Component
const React = window.React;
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
const sharedModuleRegistry = window.sharedModuleRegistry || {};
${!hasAnimUtils ? "const animUtils = sharedModuleRegistry.get ? sharedModuleRegistry.get('animation-utils') : undefined;" : '// animUtils is defined in user code'}
const _useRemotion = () => {
  const frame = useCurrentFrame();
  const config = useVideoConfig();
  return { frame, config };
};
${processedCode}
${!hasDefaultExport ? `export default ${componentName};` : ''}
`;

      setCompiledCode(blobContent);
      if (componentUrl) {
        URL.revokeObjectURL(componentUrl);
      }
      const url = createBlobUrl(blobContent);
      setComponentUrl(url);

      const importer = () =>
        import(/* webpackIgnore: true */ url).then(mod => {
          const def = mod?.default;
          if (typeof def === 'function') return mod;
          throw new Error('Dynamic component loaded, but default export is missing');
        });
      setComponentImporter(() => importer);

      setRefreshToken(`refresh-${Date.now()}`);
    } catch (error) {
      setComponentError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsCompiling(false);
    }
  }, [currentComponentCode, componentUrl]);
  
  // Calculate props for the Remotion player based on the selected scene
  const playerProps = useMemo(() => {
    if (!selectedScene || !storyboard) return null;
    
    return {
      fps: storyboard.fps || 30,
      width: storyboard.width || 1920,
      height: storyboard.height || 1080,
      durationInFrames: selectedScene.duration,
      inputProps: selectedScene.props || {}
    };
  }, [selectedScene, storyboard]);
  
  return (
    <div className="flex flex-col w-full h-full gap-6 p-6">
      <h1 className="text-3xl font-bold">Generate Video</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6">
        <div className="flex flex-col gap-4">
          <PromptForm 
            projectId={projectId}
            onSubmit={handleGenerateVideo} 
            isGenerating={isGenerating}
          />
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Generation Status</CardTitle>
            </CardHeader>
            <CardContent>
              <GenerationProgress 
                generationState={generationState}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
              <TabsTrigger value="code">Component Code</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="storyboard" className="border rounded-md p-4 min-h-[500px]">
              {storyboard ? (
                <StoryboardViewer 
                  storyboard={storyboard} 
                  onSelectScene={handleSceneSelect}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  No storyboard generated yet. Enter a prompt to begin.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="code" className="border rounded-md min-h-[500px]">
              <div className="flex flex-col h-full gap-4">
                <div className="flex-grow">
                  <MonacoEditor
                    height="400px"
                    defaultLanguage="typescript"
                    value={currentComponentCode}
                    onChange={(value: string | undefined) => setCurrentComponentCode(value || '')}
                    options={{
                      minimap: { enabled: false },
                    }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {selectedScene ? `Editing component for scene: ${selectedScene.name}` : 'No scene selected'}
                  </div>
                  <Button 
                    onClick={compileComponent} 
                    disabled={!selectedScene || isCompiling || !currentComponentCode.trim()}
                  >
                    {isCompiling ? 'Compiling...' : 'Compile & Test'}
                  </Button>
                </div>
                {componentError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded">
                    {componentError.message}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="border rounded-md p-4 min-h-[500px]">
              <div className="bg-gray-800 rounded-lg overflow-hidden h-full min-h-[400px]">
                {componentImporter && playerProps ? (
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <RemotionPreview
                      lazyComponent={componentImporter}
                      durationInFrames={playerProps.durationInFrames}
                      fps={playerProps.fps}
                      width={playerProps.width}
                      height={playerProps.height}
                      inputProps={playerProps.inputProps}
                      refreshToken={refreshToken}
                    />
                  </ErrorBoundary>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    {selectedScene
                      ? 'Compile your component code to preview it here'
                      : 'Select a scene from the storyboard to preview it'}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 