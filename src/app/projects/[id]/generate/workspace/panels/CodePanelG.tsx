"use client";

import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useVideoState } from '~/stores/videoState';
import { Button } from '~/components/ui/button';
import { toast } from 'sonner';
import * as Sucrase from 'sucrase';

interface Scene {
  id: string;
  type: "image" | "custom" | "text" | "background-color" | "shape" | "simple-shape" | "gradient" | "particles" | "text-animation" | "split-screen" | "zoom-pan" | "svg-animation" | "simple-colored-shape";
  start: number;
  duration: number;
  data: Record<string, unknown>;
  props?: any;
  transitionToNext?: any;
}

// Sucrase compilation function (same as PreviewPanelG)
function compileWithSucrase(code: string): string {
  try {
    const result = Sucrase.transform(code, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'automatic',
      production: false,
    });
    return result.code;
  } catch (error) {
    console.error('[CodePanelG] Sucrase compilation failed:', error);
    throw new Error(`Compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Create blob URL for dynamic import
function createBlobUrl(code: string): string {
  const blob = new Blob([code], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

export function CodePanelG({ 
  projectId,
  selectedSceneId 
}: { 
  projectId: string;
  selectedSceneId?: string | null;
}) {
  const { getCurrentProps, replace } = useVideoState();
  const [localCode, setLocalCode] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState(false);
  
  // Get current props and scenes
  const currentProps = getCurrentProps();
  const scenes = (currentProps?.scenes || []) as Scene[];
  
  // Find the selected scene or default to first scene
  const selectedScene = selectedSceneId 
    ? scenes.find((s: Scene) => s.id === selectedSceneId) 
    : scenes[0];

  // Update local code when scene changes
  React.useEffect(() => {
    const sceneCode = selectedScene?.data?.code;
    if (sceneCode && typeof sceneCode === 'string') {
      setLocalCode(sceneCode);
    } else {
      setLocalCode("");
    }
  }, [selectedScene?.id, selectedScene?.data?.code]);

  // Helper function to get scene name for display
  const getSceneName = (scene: Scene) => {
    return (scene.data?.name as string) || (scene.props?.name as string) || scene.type || `Scene ${scene.id}`;
  };

  // Compile and update the scene code
  const handleCompile = useCallback(async () => {
    if (!selectedScene || !localCode.trim()) {
      toast.error("No code to compile");
      return;
    }

    setIsCompiling(true);
    
    try {
      // Validate that the code has export default
      if (!localCode.includes('export default')) {
        throw new Error('Component must have a default export');
      }

      // Try to compile with Sucrase
      const compiledCode = compileWithSucrase(localCode);
      
      // Update the scene in the video state
      const updatedProps = {
        ...currentProps,
        meta: currentProps?.meta || {
          duration: 300,
          title: "Video Project",
          backgroundColor: "#000000"
        },
        scenes: scenes.map((scene: Scene) => 
          scene.id === selectedScene.id 
            ? {
                ...scene,
                data: {
                  ...scene.data,
                  code: localCode
                }
              }
            : scene
        )
      };

      replace(projectId, updatedProps);
      
      toast.success("Code compiled and updated successfully!");
    } catch (error) {
      console.error('[CodePanelG] Compilation failed:', error);
      toast.error(`Compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCompiling(false);
    }
  }, [selectedScene, localCode, currentProps, scenes, projectId, replace]);

  // Auto-save on code change (debounced)
  const handleCodeChange = useCallback((value: string | undefined) => {
    setLocalCode(value || "");
  }, []);

  if (!selectedScene) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50/30">
        <div className="text-center p-8 max-w-md bg-white/95 rounded-[15px] shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold mb-2">No Scene Selected</h3>
          <p className="text-sm text-gray-600">
            Select a scene from the storyboard or create a new scene to edit its code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Code Editor</h2>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
            {getSceneName(selectedScene)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleCompile}
            disabled={isCompiling || !localCode.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCompiling ? 'Compiling...' : 'Compile & Update'}
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 p-4">
        <div className="h-full border border-gray-200 rounded-lg overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="typescript"
            value={localCode}
            onChange={handleCodeChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>
      </div>

      {/* Footer with helpful info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="mb-1">
            <strong>Tips:</strong> Use <code>const {"{ AbsoluteFill, useCurrentFrame }"} = window.Remotion;</code> for imports
          </p>
          <p>
            Always include <code>export default function ComponentName(props) {"{ ... }"}</code>
          </p>
        </div>
      </div>
    </div>
  );
} 