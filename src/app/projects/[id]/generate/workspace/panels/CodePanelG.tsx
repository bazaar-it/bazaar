// src/app/projects/[id]/generate/workspace/panels/CodePanelG.tsx
"use client";

import React, { useState, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useTheme } from '~/components/theme-provider';
import { useVideoState } from '~/stores/videoState';
import { Button } from '~/components/ui/button';
import { toast } from 'sonner';
import { PlayIcon, XIcon } from 'lucide-react';
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
  selectedSceneId,
  onClose
}: { 
  projectId: string;
  selectedSceneId?: string | null;
  onClose?: () => void;
}) {
  const { getCurrentProps, replace } = useVideoState();
  const [localCode, setLocalCode] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState(false);
  const monaco = useMonaco();
  const { theme } = useTheme();

  // Disable TypeScript semantic diagnostics to remove red underline
  React.useEffect(() => {
    if (monaco) {
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSuggestionDiagnostics: true,
      });
    }
  }, [monaco]);
  
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
      <div className="flex flex-col h-full bg-white">
        {/* Header matching other panels exactly */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
          <span className="font-medium text-sm">Code Editor</span>
          <div className="flex items-center gap-1">
            {onClose && (
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
                aria-label="Close Code Editor panel"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center h-full bg-gray-50/30">
          <div className="text-center p-8 max-w-md bg-white/95 rounded-[15px] shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold mb-2">No Scene Selected</h3>
            <p className="text-sm text-gray-600">
              Select a scene from the storyboard or create a new scene to edit its code.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header matching other panels exactly */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="font-medium text-sm">Code Editor</span>
        <div className="flex items-center gap-1">
          <Button 
            onClick={handleCompile}
            disabled={isCompiling || !localCode.trim()}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 h-6 text-xs flex items-center gap-1"
          >
            <PlayIcon className="h-3 w-3" />
            {isCompiling ? 'Running...' : 'Run'}
          </Button>
          {onClose && (
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
              aria-label="Close Code Editor panel"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor - direct integration without extra padding/borders */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          value={localCode}
          onChange={handleCodeChange}
          theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 10,
            lineHeight: 20,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 12,
              horizontalScrollbarSize: 12,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            renderLineHighlight: 'line',
            codeLens: false,
            contextmenu: false,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: 'off',
            parameterHints: { enabled: false },
            hover: { enabled: false },
            links: false,
            colorDecorators: false,
            stickyScroll: { enabled: false },
            smoothScrolling: false,
            find: {
              addExtraSpaceOnTop: false,
            },
          }}
        />
      </div>
    </div>
  );
} 