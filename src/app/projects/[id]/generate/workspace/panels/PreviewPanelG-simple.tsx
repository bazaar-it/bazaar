'use client';

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { RemotionPreview } from '../../components/RemotionPreview';
import { Button } from '~/components/ui/button';
import { ChevronLeft, ChevronRight, Download, RotateCw, Play, Pause } from 'lucide-react';
import { api } from '~/trpc/react';
import { SceneDescription } from '~/lib/types';
import { useVideoState } from '~/stores/videoState-simple';
import * as Remotion from 'remotion';
import * as sucrase from 'sucrase';

// Make Remotion and other dependencies available globally
if (typeof window !== 'undefined') {
  (window as any).Remotion = Remotion;
  (window as any).React = React;
}

interface PreviewPanelGProps {
  projectId: string;
  selectedSceneId?: string;
}

export const PreviewPanelG: React.FC<PreviewPanelGProps> = ({ projectId, selectedSceneId }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [componentError, setComponentError] = useState<Error | null>(null);
  const [compiledModule, setCompiledModule] = useState<any>(null);
  
  // Direct subscription to VideoState - no complex refresh tokens
  const scenes = useVideoState((state) => {
    const project = state.projects[projectId];
    return project?.props?.scenes || [];
  });

  const currentScene = scenes[currentSceneIndex];
  const totalDuration = useMemo(() => 
    scenes.reduce((sum, s) => sum + (s.duration || 0), 0), 
    [scenes]
  );

  // Simple scene compilation
  const compileScene = useCallback(async (scene: SceneDescription) => {
    if (!scene.data?.code) {
      console.log('[PreviewPanelG-Simple] No code in scene');
      return null;
    }

    try {
      setIsCompiling(true);
      setComponentError(null);

      // Transform TypeScript to JavaScript
      const transformedCode = sucrase.transform(scene.data.code, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: true,
      }).code;

      // Create module
      const moduleCode = `
        ${transformedCode}
        
        if (typeof module !== 'undefined' && module.exports) {
          module.exports = typeof Component !== 'undefined' ? Component : 
                          typeof Scene !== 'undefined' ? Scene : 
                          exports.default || exports;
        }
      `;

      // Create blob URL
      const blob = new Blob([moduleCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      // Import module
      const module = await import(url);
      const Component = module.default || module;

      // Clean up
      URL.revokeObjectURL(url);

      console.log('[PreviewPanelG-Simple] ✅ Scene compiled successfully');
      return Component;
    } catch (error) {
      console.error('[PreviewPanelG-Simple] ❌ Compilation error:', error);
      setComponentError(error as Error);
      return null;
    } finally {
      setIsCompiling(false);
    }
  }, []);

  // Compile current scene when it changes
  useEffect(() => {
    if (currentScene) {
      compileScene(currentScene).then(setCompiledModule);
    }
  }, [currentScene, compileScene]);

  // Select scene when selectedSceneId changes
  useEffect(() => {
    if (selectedSceneId) {
      const index = scenes.findIndex(s => s.id === selectedSceneId);
      if (index !== -1) {
        setCurrentSceneIndex(index);
      }
    }
  }, [selectedSceneId, scenes]);

  // Render handlers
  const handleRender = async () => {
    try {
      setIsRendering(true);
      setRenderStatus('Starting render...');
      
      const result = await api.render.renderVideo.mutate({
        projectId,
        scenes: scenes.map(s => ({
          id: s.id,
          name: s.name || 'Untitled',
          duration: s.duration || 150,
          code: s.data?.code || ''
        }))
      });

      if (result.success && result.url) {
        setRenderStatus('Render complete! Downloading...');
        window.open(result.url, '_blank');
      } else {
        throw new Error(result.error || 'Render failed');
      }
    } catch (error) {
      console.error('Render error:', error);
      setRenderStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRendering(false);
      setTimeout(() => setRenderStatus(null), 5000);
    }
  };

  if (scenes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No scenes to preview</p>
      </div>
    );
  }

  if (componentError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="rounded-lg bg-destructive/10 p-4">
          <p className="text-sm text-destructive">Scene compilation error:</p>
          <pre className="mt-2 text-xs">{componentError.message}</pre>
        </div>
        <Button 
          onClick={() => currentScene && compileScene(currentScene).then(setCompiledModule)}
          size="sm"
        >
          <RotateCw className="mr-2 h-4 w-4" />
          Retry Compilation
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">Preview</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
          >
            {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRender}
            disabled={isRendering || scenes.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isRendering ? 'Rendering...' : 'Render'}
          </Button>
        </div>
      </div>

      {/* Scene Navigation */}
      {scenes.length > 1 && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))}
            disabled={currentSceneIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Scene {currentSceneIndex + 1} of {scenes.length}
            {currentScene?.name && ` - ${currentScene.name}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSceneIndex(Math.min(scenes.length - 1, currentSceneIndex + 1))}
            disabled={currentSceneIndex === scenes.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">
        {isCompiling ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Compiling scene...</p>
          </div>
        ) : compiledModule ? (
          <RemotionPreview
            Component={compiledModule}
            durationInFrames={currentScene?.duration || 150}
            fps={30}
            width={1280}
            height={720}
            key={currentScene?.id} // Force re-render on scene change
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No preview available</p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {renderStatus && (
        <div className="border-t bg-muted/50 px-4 py-2">
          <p className="text-sm">{renderStatus}</p>
        </div>
      )}
    </div>
  );
};