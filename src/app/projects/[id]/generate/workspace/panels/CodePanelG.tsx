// src/app/projects/[id]/generate/workspace/panels/CodePanelG.tsx
"use client";

import React, { useState, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useTheme } from '~/components/theme-provider';
import { useVideoState } from '~/stores/videoState';
import { Button } from '~/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { toast } from 'sonner';
import { XIcon, SaveIcon, PlusIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '~/components/ui/dialog';
import { api } from "~/trpc/react";
import * as Sucrase from 'sucrase';

interface Scene {
  id: string;
  type: "custom";  // Only custom type now
  start: number;
  duration: number;
  data: Record<string, unknown>;
  tsxCode?: string;
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
  onClose,
  onSceneSelect,
  onSceneGenerated
}: { 
  projectId: string;
  selectedSceneId?: string | null;
  onClose?: () => void;
  onSceneSelect?: (sceneId: string) => void;
  onSceneGenerated?: () => void;
}) {
  const { getCurrentProps, replace, updateScene, updateAndRefresh } = useVideoState();
  const [localCode, setLocalCode] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [durationChoice, setDurationChoice] = useState<{ parsed?: number; current?: number } | null>(null);
  const utils = api.useUtils();
  const monaco = useMonaco();
  const { theme } = useTheme();

  // Disable TypeScript semantic diagnostics to remove red underline
  React.useEffect(() => {
    if (monaco) {
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSuggestionDiagnostics: true,
      });
      // Ensure TSX support and modern TS settings for better syntax validation
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        allowNonTsExtensions: true,
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        allowJs: true,
        checkJs: false,
        strict: false,
      });
    }
  }, [monaco]);
  
  // Get current props and scenes
  const currentProps = getCurrentProps();
  const scenes = (currentProps?.scenes || []) as Scene[];
  
  // 🚨 NEW: Add debugging to track state changes
  React.useEffect(() => {
    console.log('[CodePanelG] 📊 State changed - Current props:', currentProps);
    console.log('[CodePanelG] 📊 Scene count:', scenes.length);
    console.log('[CodePanelG] 📊 Scene IDs:', scenes.map(s => ({ id: s.id, name: s.data?.name })));
  }, [currentProps, scenes]);
  
  // 🚨 NEW: Listen for VideoState global updates
  React.useEffect(() => {
    const handleVideoStateUpdate = (event: CustomEvent) => {
      const { projectId: eventProjectId, type, sceneCount } = event.detail;
      
      if (eventProjectId === projectId && (type === 'scenes-updated' || type === 'emergency-refresh')) {
        console.log('[CodePanelG] 📡 VideoState update event received:', {
          eventProjectId,
          type,
          sceneCount,
          currentScenes: scenes.length
        });
        
        // Force a re-render by updating a local state
        setLocalCode(prev => prev); // Trigger re-render without changing code
        
        // If this is an emergency refresh, force a more aggressive update
        if (type === 'emergency-refresh') {
          console.log('[CodePanelG] 🚨 Emergency refresh triggered - forcing component remount');
          // Force a more aggressive refresh by updating all relevant state
          setTimeout(() => {
            setLocalCode(prev => prev + ''); // Force string update
          }, 100);
        }
      }
    };

    console.log('[CodePanelG] 📡 Setting up VideoState update listener');
    try {
      window.addEventListener('videostate-update', handleVideoStateUpdate as EventListener);
    } catch (error) {
      console.error('[CodePanelG] ❌ Failed to add event listener:', error);
    }
    
    return () => {
      console.log('[CodePanelG] 📡 Cleaning up VideoState update listener');
      try {
        window.removeEventListener('videostate-update', handleVideoStateUpdate as EventListener);
      } catch (error) {
        console.error('[CodePanelG] ❌ Failed to remove event listener:', error);
      }
    };
  }, [projectId, scenes.length]);
  
  // Find the selected scene or default to first scene
  const selectedScene = selectedSceneId 
    ? scenes.find((s: Scene) => s.id === selectedSceneId) 
    : scenes[0];

  // Get scene display name - position based numbering
  const getSceneName = (scene: Scene, index: number) => {
    // Always use position-based numbering for consistency
    return `Scene ${index + 1}`;
  };

  // Update local code when scene changes
  React.useEffect(() => {
    const sceneCode = selectedScene?.data?.code || selectedScene?.tsxCode;
    if (sceneCode && typeof sceneCode === 'string') {
      setLocalCode(sceneCode);
    } else {
      setLocalCode("");
    }
  }, [selectedScene?.id, selectedScene?.data?.code, selectedScene?.tsxCode]);

  // Save code mutation
  const saveCodeMutation = api.scenes.updateSceneCode.useMutation({
    onSuccess: async () => {
      toast.success("Code saved successfully!");
      setIsSaving(false);
      
      // Invalidate iterations query to ensure restore button updates
      await utils.generation.getBatchMessageIterations.invalidate();
      
      // 🚨 CRITICAL FIX: Use updateAndRefresh instead of updateScene to trigger proper video refresh
      if (selectedScene) {
        updateAndRefresh(projectId, (props) => {
          const sceneIndex = props.scenes.findIndex((s: any) => s.id === selectedScene.id);
          if (sceneIndex === -1) return props;
          
          const updatedScenes = [...props.scenes];
          const currentScene = updatedScenes[sceneIndex];
          if (currentScene) {
            updatedScenes[sceneIndex] = {
              ...currentScene,
              data: {
                ...currentScene.data,
                code: localCode // Update the code in the cache
              },
              // TypeScript safe assignment for tsxCode (Scene type may not include it)
              ...(localCode && { tsxCode: localCode })
            };
          }
          
          return {
            ...props,
            scenes: updatedScenes
          };
        });
        
        // Add system message to chat when scene is saved
        const sceneName = getSceneName(selectedScene, scenes.findIndex(s => s.id === selectedScene.id));
        useVideoState.getState().addSystemMessage(
          projectId, 
          `💾 Updated ${sceneName}`,
          'status'
        );
      }

      // Also invalidate React Query cache for project data
      utils.project.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to save code: ${error.message}`);
      setIsSaving(false);
    }
  });

  // Add scene mutation - use chat generation
  const addSceneMutation = api.generation.generateScene.useMutation({
    onSuccess: async (result) => {
      toast.success("Scene added successfully!");
      
      // Invalidate caches to refresh scenes
      await utils.generation.getProjectScenes.invalidate({ projectId });
      await utils.chat.getMessages.invalidate({ projectId });
      await utils.generation.getBatchMessageIterations.invalidate();
      
      // Update VideoState store immediately to ensure scene is available
      if (result.data) {
        // Add the new scene to VideoState store
        const newScene = {
          id: result.data.id,
          type: "custom" as const,
          start: 0, // New scenes start at the end, will be calculated properly
          duration: result.data.duration || 150,
          data: {
            name: result.data.name,
            code: result.data.tsxCode || "",
          },
          tsxCode: result.data.tsxCode || "",
          props: {} // Empty props for new scenes
        };
        
        // Update video state using the updateAndRefresh method for consistency
        updateAndRefresh(projectId, (props) => ({
          ...props,
          scenes: [...props.scenes, newScene],
          meta: {
            ...props.meta,
            duration: props.scenes.reduce((sum, scene) => sum + (scene.duration || 150), 0) + (newScene.duration || 150)
          }
        }));
      }
      
      // Update video state if callback provided (similar to TemplatesPanelG)
      if (onSceneGenerated) {
        onSceneGenerated();
      }
      
      // Select the newly added scene
      if (result.data && onSceneSelect) {
        onSceneSelect(result.data.id);
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to add scene: ${error.message}`);
    }
  });

  // Handle scene selection
  const handleSceneSelect = useCallback((sceneId: string) => {
    if (onSceneSelect) {
      onSceneSelect(sceneId);
    }
  }, [onSceneSelect]);

  // Handle add scene
  const handleAddScene = useCallback(async () => {
    try {
      await addSceneMutation.mutateAsync({
        projectId,
        userMessage: "add a new scene", // Simple prompt to add a scene
        userContext: {}
      });
    } catch (error) {
      console.error('[CodePanelG] Add scene failed:', error);
      // Error handling is already done in the mutation onError
    }
  }, [projectId, addSceneMutation]);

  const performSave = useCallback(async (overwriteDuration: boolean) => {
    if (!selectedScene) return;
    await saveCodeMutation.mutateAsync({
      projectId,
      sceneId: selectedScene.id,
      code: localCode,
      overwriteDuration
    });
  }, [selectedScene, localCode, projectId, saveCodeMutation]);

  // Save code to database
  const handleSave = useCallback(async () => {
    if (!selectedScene || !localCode.trim()) {
      toast.error("No code to save");
      return;
    }

    setIsSaving(true);
    
    try {
      // Validate that the code has export default
      if (!localCode.includes('export default')) {
        throw new Error('Component must have a default export');
      }

      // Try to compile with Sucrase first to validate
      compileWithSucrase(localCode);
      
      // Best-effort detect declared duration in code and compare with current
      const durationRegex = /durationInFrames\s*=\s*(\d+)/i;
      const match = localCode.match(durationRegex);
      const parsed = match?.[1] ? parseInt(match[1], 10) : undefined;
      const currentDuration = selectedScene.duration || 0;

      // If mismatch, open a nicer dialog and defer save based on choice
      if (parsed && parsed > 0 && parsed !== currentDuration) {
        setDurationChoice({ parsed, current: currentDuration });
        setDurationDialogOpen(true);
        return; // Wait for user choice; saving happens in dialog actions
      }

      await performSave(false);

    } catch (error) {
      console.error('[CodePanelG] Save failed:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save code");
      setIsSaving(false);
    }
  }, [selectedScene, localCode, performSave]);

  // Auto-save on code change (debounced)
  const handleCodeChange = useCallback((value: string | undefined) => {
    setLocalCode(value || "");
  }, []);

  if (!selectedScene) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header with scene selection */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Code Editor</span>
            {scenes.length > 0 && (
              <Select value="" onValueChange={handleSceneSelect}>
                <SelectTrigger className="w-32 h-6 text-xs">
                  <SelectValue placeholder="Select scene" />
                </SelectTrigger>
                <SelectContent>
                  {scenes.map((scene, index) => (
                    <SelectItem key={scene.id} value={scene.id}>
                      {getSceneName(scene, index)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* <Button 
              onClick={handleAddScene}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 h-6 text-xs flex items-center gap-1"
            >
              <PlusIcon className="h-3 w-3" />
              Add Scene
            </Button> */}
          </div>
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
              Select a scene from the dropdown above or create a new scene to edit its code.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentSceneIndex = scenes.findIndex(s => s.id === selectedScene.id);
  const sceneName = getSceneName(selectedScene, currentSceneIndex);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with scene selection dropdown */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Select value={selectedScene.id} onValueChange={handleSceneSelect}>
            <SelectTrigger className="w-32 h-6 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scenes.map((scene, index) => (
                <SelectItem key={scene.id} value={scene.id}>
                  {getSceneName(scene, index)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* <Button 
            onClick={handleAddScene}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 h-6 text-xs flex items-center gap-1"
          >
            <PlusIcon className="h-3 w-3" />
            Add Scene
          </Button> */}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            onClick={handleSave}
            disabled={isSaving || !localCode.trim()}
            size="sm"
            className="bg-gradient-to-r from-orange-400/80 to-orange-300/80 hover:from-orange-400 hover:to-orange-300 text-white px-2 py-1 h-6 text-xs flex items-center gap-1 transition-all"
          >
            <SaveIcon className="h-3 w-3" />
            {isSaving ? 'Saving...' : 'Save'}
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
          language="typescript"
          // Hint Monaco to parse TSX by giving the model a .tsx path
          path={`inmemory://model/${selectedScene.id}.tsx`}
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

      {/* Duration mismatch dialog */}
      <Dialog open={durationDialogOpen} onOpenChange={(o) => {
        setDurationDialogOpen(o);
        if (!o) setIsSaving(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duration mismatch detected</DialogTitle>
            <DialogDescription>
              The code declares a different duration than the current scene.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-gray-700 space-y-1">
            <div><span className="font-medium">Current:</span> {durationChoice?.current} frames</div>
            <div><span className="font-medium">From code:</span> {durationChoice?.parsed} frames</div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={async () => {
                setDurationDialogOpen(false);
                await performSave(false);
              }}
            >
              Keep current
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={async () => {
                setDurationDialogOpen(false);
                await performSave(true);
              }}
            >
              Update to code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
