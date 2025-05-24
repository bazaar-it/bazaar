"use client";
// src/app/projects/[id]/generate/GenerateVideoClient.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import * as RemotionLib from 'remotion';
import { sharedModuleRegistry } from '~/shared/modules/registry';
import { transform } from 'sucrase';
import { setModuleVersion } from '~/shared/modules/versions';
import { PromptOrchestrator, type GenerationCallbacks } from './agents/promptOrchestrator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import PromptForm from './components/PromptForm';
import GenerationProgress from './components/GenerationProgress';
import StoryboardViewer from './components/StoryboardViewer';
import RemotionPreview from './components/RemotionPreview';
import SceneEditor from './components/SceneEditor';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "~/components/ui/card";
import type { Storyboard, GenerationState, Scene } from './types/storyboard';
import { ErrorBoundary } from 'react-error-boundary';
import { api } from '~/trpc/react';
import { Badge } from "~/components/ui/badge";
import { Loader2, Play, Code, FileText, Palette, Image, AlertCircle } from "lucide-react";
import { toast } from 'sonner';

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
  initialProjects?: { id: string; name: string; }[];
  initialProps?: any;
}

export function GenerateVideoClient({ projectId, initialProjects, initialProps }: GenerateVideoClientProps) {
  const [promptOrchestrator] = useState(() => new PromptOrchestrator());
  const [generationState, setGenerationState] = useState<GenerationState>({
    stage: 'idle',
    progress: 0,
    message: 'Enter a prompt to generate your video'
  });
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [componentCodes, setComponentCodes] = useState<Record<string, string>>({});
  
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

  // tRPC mutations for LLM calls
  const planScenesMutation = api.generation.planScenes.useMutation();
  const generateStyleMutation = api.generation.generateStyle.useMutation();
  const identifyAssetsMutation = api.generation.identifyAssets.useMutation();
  const generateComponentCodeMutation = api.generation.generateComponentCode.useMutation();
  
  // NEW: Scene-first generation mutations
  const generateSceneCodeMutation = api.generation.generateSceneCode.useMutation();
  const getProjectScenesQuery = api.generation.getProjectScenes.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Helper function to detect if a message is likely an edit command
  const isLikelyEdit = useCallback((message: string): boolean => {
    const trimmed = message.trim();
    const words = trimmed.split(/\s+/);
    
    // Must be 5 words or fewer
    if (words.length > 5) return false;
    
    // Must contain edit verbs
    const editVerbs = ['make', 'set', 'change', 'turn', 'add', 'remove', 'fix', 'update', 'modify'];
    const hasEditVerb = editVerbs.some(verb => trimmed.toLowerCase().includes(verb));
    
    return hasEditVerb;
  }, []);

  // Helper function to auto-tag messages with @scene(id) when appropriate
  const autoTagMessage = useCallback((message: string): string => {
    // If already tagged, return as-is
    if (message.startsWith('@scene(')) return message;
    
    // If no scene selected, return as-is
    if (!selectedScene?.id) return message;
    
    // If it's a likely edit command, auto-tag it
    if (isLikelyEdit(message)) {
      return `@scene(${selectedScene.id}) ${message}`;
    }
    
    return message;
  }, [selectedScene, isLikelyEdit]);

  // Register shared utilities once the component mounts
  useEffect(() => {
    registerSharedUtilities();
    
    // Make React available to dynamically loaded modules
    (window as any).React = React;
    // Make Remotion available to dynamically loaded modules
    (window as any).Remotion = RemotionLib;
    // Make shared module registry available globally
    (window as any).sharedModuleRegistry = sharedModuleRegistry;
    
    console.log('[GenerateVideoClient] Host dependencies exposed to window globals for ESM modules');
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
  const generatePlaceholderCode = useCallback((scene: Scene, storyboard: Storyboard | null) => {
    const sceneNameClean = scene.name?.replace(/\s+/g, '') || 'DefaultScene';
    const componentName = `${sceneNameClean}Component`;
    // Basic template following Sprint 25/26 ESM patterns
    return `//src/remotion/components/scenes/${componentName}.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

interface ${componentName}Props {
  title?: string;
  backgroundColor?: string;
  textColor?: string;
}

export default function ${componentName}({ 
  title = "${scene.name || 'Scene Title'}", 
  backgroundColor = "#1a1a1a",
  textColor = "white"
}: ${componentName}Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, 30], [0, 1], { 
    extrapolateLeft: 'clamp', 
    extrapolateRight: 'clamp' 
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        color: textColor, 
        opacity, 
        padding: 20, 
        textAlign: 'center' 
      }}>
        <h1 style={{ fontSize: Math.max(20, 70 - (title.length / 2)) }}>
          {title}
        </h1>
      </div>
    </AbsoluteFill>
  );
}`;
  }, []); // Assuming no external dependencies from GenerateVideoClient's direct state needed here, or pass them.

  // Validate component code follows Sprint 25/26 ESM patterns
  const validateComponentCode = useCallback((code: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check for forbidden imports
    if (/import\s+React/.test(code)) {
      errors.push('Component contains forbidden "import React" statement');
    }
    
    if (/import\s+.*from\s+['"]remotion['"]/.test(code)) {
      errors.push('Component contains forbidden "import ... from \'remotion\'" statement');
    }
    
    // Check for required window.Remotion pattern
    if (!code.includes('window.Remotion')) {
      errors.push('Component must use window.Remotion destructuring pattern');
    }
    
    // Check for default export
    if (!/export\s+default/.test(code)) {
      errors.push('Component must have a default export');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  const compileComponent = useCallback(async (codeToCompile: string) => {
    if (!codeToCompile.trim()) {
      setComponentError(new Error('No code to compile.'));
      return;
    }
    
    // Validate code before compilation
    const validation = validateComponentCode(codeToCompile);
    if (!validation.isValid) {
      setComponentError(new Error(`Code validation failed:\n${validation.errors.join('\n')}`));
      return;
    }
    
    setIsCompiling(true);
    setComponentError(null);
    setComponentImporter(null); // Clear previous importer

    // Revoke old URL if it exists
    if (componentUrl) {
      URL.revokeObjectURL(componentUrl);
      setComponentUrl(null);
    }

    try {
      console.log('Transforming code with Sucrase...');
      const { code: transformedCode } = transform(codeToCompile, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic', // Important for Remotion context with global React
        production: false, // Set to true for production builds if needed
        disableESTransforms: true, // Remotion handles modern JS, preserve import/export
      });
      console.log('Sucrase transformation successful.');

      const newBlobUrl = createBlobUrl(transformedCode);
      setComponentUrl(newBlobUrl);
      console.log('Created new blob URL:', newBlobUrl);

      setComponentImporter(() => async () => {
        console.log(`Attempting to import module from: ${newBlobUrl}`);
        try {
          const module = await import(/* webpackIgnore: true */ newBlobUrl);
          if (!module.default) {
            console.error('Dynamic import succeeded, but module.default is missing.', module);
            throw new Error('Component loaded, but default export is missing.');
          }
          console.log('Dynamic import successful, component loaded.');
          setCompiledCode(transformedCode); // Store successfully compiled code
          return module;
        } catch (e) {
          console.error('Error during dynamic import:', e);
          setComponentError(e instanceof Error ? e : new Error(String(e)));
          // Fallback or error display will be handled by RemotionPreview's ErrorBoundary
          return { default: () => <ErrorFallback error={e instanceof Error ? e : new Error(String(e))} /> }; 
        }
      });
      setRefreshToken(`compiled-${Date.now()}`); // Refresh RemotionPreview
    } catch (error) {
      console.error('Error during compilation or blob creation:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      setComponentError(err);
      setCompiledCode(null);
      // Ensure importer is set to something that shows an error
      setComponentImporter(() => Promise.resolve({ default: () => <ErrorFallback error={err} /> }));
    } finally {
      setIsCompiling(false);
    }
  }, [setComponentImporter, setComponentUrl, setRefreshToken, setIsCompiling, setCompiledCode, setComponentError]);

  const handleGenerateVideo = useCallback(async (prompt: string, additionalInstructions?: string) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setActiveTab('storyboard');
    setComponentCodes({});
    
    const callbacks: GenerationCallbacks = {
      onStateChange: (state) => {
        setGenerationState(state);
        if (state.stage === 'complete' || state.stage === 'error') {
          setIsGenerating(false);
        }
      },
      onStoryboardUpdate: (updatedStoryboard) => {
        setStoryboard(updatedStoryboard);
        
        // If we get a new storyboard, select the first scene
        if (updatedStoryboard.scenes && updatedStoryboard.scenes.length > 0) {
          const firstScene = updatedStoryboard.scenes[0];
          if (firstScene) {
            setSelectedScene(firstScene);
            const placeholderCode = generatePlaceholderCode(firstScene, updatedStoryboard);
            setCurrentComponentCode(placeholderCode);
          }
        }
      },
      onComponentGenerated: (sceneId, code) => {
        setComponentCodes(prev => ({ ...prev, [sceneId]: code }));
      }
    };
    
    try {
      // Start with fallback generation
      const fallbackStoryboard = await promptOrchestrator.generateFallbackStoryboard(
        prompt, 
        callbacks, 
        5
      );
      
      // Now enhance with real LLM calls
      await enhanceStoryboardWithLLM(fallbackStoryboard, prompt, additionalInstructions, callbacks);
      
    } catch (error) {
      console.error('Error generating video:', error);
      callbacks.onStateChange({
        stage: 'error',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsGenerating(false);
    }
  }, [isGenerating, promptOrchestrator, planScenesMutation, generateStyleMutation, identifyAssetsMutation, generateComponentCodeMutation]);
  
  // NEW: Simple scene-first generation
  const generateSingleScene = useCallback(async (
    prompt: string,
    callbacks?: GenerationCallbacks
  ) => {
    if (isGenerating) return;
    
    // Check if no scene is selected for edit commands
    if (isLikelyEdit(prompt) && !selectedScene) {
      // Show console warning and callback error
      // console.warn('No scene selected for edit command:', prompt); // Keep for debugging if needed
      toast.error('Please select a scene to edit first, or create a new scene with a descriptive prompt.');
      
      callbacks?.onStateChange({
        stage: 'error',
        progress: 0,
        message: 'Please select a scene to edit first, or create a new scene with a descriptive prompt.',
        error: 'No scene selected for edit command'
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      callbacks?.onStateChange({
        stage: 'planning',
        progress: 10,
        message: 'Analyzing prompt and generating scene...'
      });
      
      // Auto-tag the prompt if it's an edit command and a scene is selected
      const processedPrompt = autoTagMessage(prompt);
      
      // Generate scene code using the new scene-first approach
      const result = await generateSceneCodeMutation.mutateAsync({
        projectId,
        userPrompt: processedPrompt,
        sceneName: 'Generated Scene',
        sceneOrder: 0,
      });
      
      callbacks?.onStateChange({
        stage: 'components',
        progress: 50,
        message: 'Compiling scene code...'
      });
      
      // Create a simple single-scene storyboard
      const singleSceneStoryboard: Storyboard = {
        scenes: [{
          id: result.sceneId,
          name: result.isEdit ? selectedScene?.name || 'Edited Scene' : 'Generated Scene',
          template: 'CustomScene',
          start: 0,
          duration: 150, // 5 seconds at 30fps
          props: {
            userPrompt: prompt,
            insight: result.insight,
          },
          metadata: {
            description: prompt,
            prompt: prompt,
            isEdit: result.isEdit,
          }
        }],
        style: {
          colorPalette: ['#3B82F6', '#8B5CF6', '#F59E0B', '#FFFFFF', '#1F2937'],
          fontPrimary: 'Inter',
          fontSecondary: 'Inter',
          mood: 'modern',
          visualStyle: 'modern',
          pacing: 'medium'
        },
        assets: []
      };
      
      // Update state with the generated scene
      setStoryboard(singleSceneStoryboard);
      setCurrentComponentCode(result.code);
      
      // Safely access the first scene
      const firstScene = singleSceneStoryboard.scenes?.[0];
      if (firstScene) {
        setSelectedScene(firstScene);
      }
      
      // Store the generated code for this scene
      setComponentCodes(prev => ({ ...prev, [result.sceneId]: result.code }));
      
      // Switch to code tab to show the generated code
      setActiveTab('code');
      
      // Compile the component for immediate preview
      await compileComponent(result.code);
      
      callbacks?.onStateChange({
        stage: 'complete',
        progress: 100,
        message: result.isEdit ? 'Scene updated successfully!' : 'Scene generated successfully!'
      });
      
      // Log success
      console.log(result.isEdit ? 'Scene updated successfully!' : 'Scene generated successfully!');
      
    } catch (error) {
      console.error('Error generating scene:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      callbacks?.onStateChange({
        stage: 'error',
        progress: 0,
        message: `Error: ${errorMessage}`,
        error: errorMessage
      });
      
      // Log error
      console.error('Generation failed:', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating, 
    selectedScene, 
    projectId, 
    generateSceneCodeMutation, 
    compileComponent, 
    autoTagMessage,
    isLikelyEdit
  ]);
  
  const enhanceStoryboardWithLLM = async (
    fallbackStoryboard: Storyboard,
    prompt: string,
    additionalInstructions?: string,
    callbacks?: GenerationCallbacks
  ) => {
    try {
      // Stage 1: Enhance scenes with LLM
      callbacks?.onStateChange({
        stage: 'planning',
        progress: 20,
        message: 'Enhancing scenes with AI...',
        storyboard: fallbackStoryboard
      });
      
      const enhancedScenes = await planScenesMutation.mutateAsync({
        userPrompt: prompt,
        additionalInstructions,
        maxScenes: 5
      });
      
      const enhancedStoryboard = {
        ...fallbackStoryboard,
        scenes: enhancedScenes,
        duration: enhancedScenes.reduce((total, scene) => total + scene.duration, 0)
      };
      
      // Log the complete storyboard JSON for debugging
      console.log('📋 COMPLETE STORYBOARD JSON:', JSON.stringify(enhancedStoryboard, null, 2));
      
      callbacks?.onStoryboardUpdate(enhancedStoryboard);
      
      // Stage 2: Enhance style with LLM
      callbacks?.onStateChange({
        stage: 'styling',
        progress: 40,
        message: 'Enhancing visual style with AI...',
        storyboard: enhancedStoryboard
      });
      
             const enhancedStyle = await generateStyleMutation.mutateAsync({
         userPrompt: prompt,
         scenes: enhancedScenes
       });
       
       enhancedStoryboard.style = enhancedStyle;
      callbacks?.onStoryboardUpdate(enhancedStoryboard);
      
      // Stage 3: Enhance assets with LLM
      callbacks?.onStateChange({
        stage: 'assets',
        progress: 60,
        message: 'Identifying assets with AI...',
        storyboard: enhancedStoryboard
      });
      
      const enhancedAssets = await identifyAssetsMutation.mutateAsync({
        userPrompt: prompt,
        scenes: enhancedScenes
      });
      
      enhancedStoryboard.assets = enhancedAssets;
      callbacks?.onStoryboardUpdate(enhancedStoryboard);
      
      // Stage 4: Generate component code with LLM
      callbacks?.onStateChange({
        stage: 'components',
        progress: 80,
        message: 'Generating component code with AI...',
        storyboard: enhancedStoryboard
      });
      
      for (let i = 0; i < enhancedScenes.length; i++) {
        const scene = enhancedScenes[i];
        if (!scene) continue;
        
        try {
          const componentResult = await generateComponentCodeMutation.mutateAsync({
            scene,
            style: enhancedStyle,
            userPrompt: prompt
          });
          
          console.log('Generated component code for scene:', scene.id, 'Code length:', componentResult.code.length);
          
          // Store the AI-generated code with the correct scene ID
          setComponentCodes(prev => {
            const updated = { ...prev, [scene.id]: componentResult.code };
            console.log('Updated componentCodes with scene ID:', scene.id);
            console.log('All available component codes:', Object.keys(updated));
            
            // If this is the currently selected scene, update the code immediately
            if (selectedScene && selectedScene.id === scene.id) {
              console.log('Updating code for currently selected scene:', scene.id);
              setCurrentComponentCode(componentResult.code);
            }
            
            return updated;
          });
          
          callbacks?.onComponentGenerated(scene.id || `scene-${i}`, componentResult.code);
          
          const progress = 80 + (i + 1) / enhancedScenes.length * 15;
          callbacks?.onStateChange({
            stage: 'components',
            progress,
            message: `Generated AI component for ${scene.name}...`,
            storyboard: enhancedStoryboard
          });
        } catch (error) {
          console.error(`Error generating component for scene ${scene.id}:`, error);
        }
      }
      
      // Complete
      callbacks?.onStateChange({
        stage: 'complete',
        progress: 100,
        message: 'AI-enhanced video generation complete!',
        storyboard: enhancedStoryboard
      });
      
      setStoryboard(enhancedStoryboard);
      
      // Auto-select first scene with AI code if available
      if (enhancedScenes.length > 0) {
        const firstScene = enhancedScenes[0];
        if (firstScene) {
          // Wait a bit for componentCodes state to update
          setTimeout(() => {
            handleSceneSelect(firstScene);
          }, 100);
        }
      }
      
    } catch (error) {
      console.error('Error enhancing storyboard with LLM:', error);
      // Keep the fallback storyboard if LLM enhancement fails
    }
  };
  
  const handleSceneSelect = (scene: Scene) => {
    console.log('🎬 Scene selected:', scene.id, scene.name);
    console.log('📦 Available component codes:', Object.keys(componentCodes));
    
    setSelectedScene(scene);
    
    // Look up the component code for this scene
    const sceneId = scene.id;
    if (sceneId && componentCodes[sceneId]) {
      console.log('✅ Found AI-generated code for scene:', sceneId);
      setCurrentComponentCode(componentCodes[sceneId]);
    } else {
      console.log('⚠️ No AI code found for scene:', sceneId, 'using template');
      // Generate a template component for this scene using Sprint 25/26 patterns
      const templateCode = `//src/remotion/components/scenes/${scene.name?.replace(/\s+/g, '')}Scene.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

interface ${scene.name?.replace(/\s+/g, '')}SceneProps {
  title?: string;
}

export default function ${scene.name?.replace(/\s+/g, '')}Scene({ title = "${scene.name}" }: ${scene.name?.replace(/\s+/g, '')}SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          fontSize: 60,
          color: 'white',
          opacity,
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
}`;
      setCurrentComponentCode(templateCode);
    }
    
    // Switch to code tab when scene is selected
    setActiveTab('code');
  };
  
  const handleSceneUpdate = useCallback(
    (updated: Scene) => {
      setStoryboard(prev => {
        if (!prev?.scenes) return prev;
        const scenes = prev.scenes.map(s =>
          s.id === updated.id ? updated : s
        );
        return { ...prev, scenes };
      });
      setSelectedScene(updated);
      if (storyboard) {
        const code = generatePlaceholderCode(updated, storyboard);
        setCurrentComponentCode(code);
      }
    },
    [storyboard]
  );
  
  // Effect to handle scene selection and code availability
  useEffect(() => {
    if (selectedScene) {
      const sceneId = selectedScene.id || '';
      let codeToUse = '';
      let source = 'template';

      if (componentCodes[sceneId]) {
        console.log('✅ Found AI-generated code for scene:', sceneId);
        codeToUse = componentCodes[sceneId];
        source = 'ai-generated';
      } else {
        console.log('⚠️ No AI code found for scene:', sceneId, 'generating template.');
        codeToUse = generatePlaceholderCode(selectedScene, storyboard); 
        source = 'template';
      }
      
      setCurrentComponentCode(codeToUse); // Update editor view

      if (codeToUse) {
        console.log(`[useEffect selectedScene/componentCodes] Compiling ${source} code for ${sceneId}`);
        compileComponent(codeToUse); // Automatically compile the determined code
      } else {
        setComponentImporter(null);
        setComponentUrl(null); // Clear URL if no code
        setCurrentComponentCode(''); // Clear editor if no scene/code
      }
    } else {
      // No scene selected
      setCurrentComponentCode('');
      setComponentImporter(null);
      setComponentUrl(null);
      setCompiledCode(null);
      setComponentError(null);
    }
  }, [selectedScene, componentCodes, compileComponent, storyboard, generatePlaceholderCode]);
  
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
            onSubmitSingleScene={generateSingleScene}
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
          {/* Main tabs - only Storyboard and Component Code */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
              <TabsTrigger value="code">Component Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="storyboard" className="border rounded-md p-4 min-h-[300px]">
              {storyboard ? (
                <div className="space-y-4">
                  <StoryboardViewer 
                    storyboard={storyboard} 
                    onSelectScene={handleSceneSelect}
                  />
                  {selectedScene && (
                    <SceneEditor 
                      scene={selectedScene}
                      onSave={handleSceneUpdate}
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  No storyboard generated yet. Enter a prompt to begin.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="code" className="border rounded-md min-h-[300px]">
              <div className="flex flex-col h-full gap-4">
                {/* Scene tabs within Component Code */}
                {storyboard?.scenes && storyboard.scenes.length > 0 && (
                  <div className="border-b">
                    <div className="flex flex-wrap gap-1 p-2">
                      {storyboard.scenes.map((scene, index) => (
                        <Button
                          key={scene.id || index}
                          variant={selectedScene?.id === scene.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSceneSelect(scene)}
                          className="text-xs"
                        >
                          {scene.name || `Scene ${index + 1}`}
                          {componentCodes[scene.id || ''] && (
                            <span className="ml-1 w-2 h-2 bg-green-500 rounded-full"></span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex-grow">
                  <MonacoEditor
                    height="250px"
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
                    {selectedScene ? (
                      <span>
                        Editing component for scene: <strong>{selectedScene.name}</strong>
                        {componentCodes[selectedScene.id || ''] ? (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            AI-generated
                          </span>
                        ) : (
                          <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            Template
                          </span>
                        )}
                      </span>
                    ) : (
                      'No scene selected'
                    )}
                  </div>
                  <Button 
                    onClick={() => compileComponent(currentComponentCode)} 
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
          </Tabs>
          
          {/* Always visible preview below the main tabs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-gray-800 rounded-lg overflow-hidden h-[400px]">
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
                      ? 'Compile your component code to preview it here, or wait for auto-compile.'
                      : 'Select a scene from the storyboard to preview it'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 