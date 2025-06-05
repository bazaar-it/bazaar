// src/app/projects/[id]/generate/workspace/panels/StoryboardPanelG.tsx
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useVideoState } from '~/stores/videoState';
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { PlusIcon, PlayIcon, TrashIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Separator } from "~/components/ui/separator";

interface Scene {
  id: string;
  type: string;
  start: number;
  duration: number;
  data?: any;
  props?: any;
}

export function StoryboardPanelG({ 
  projectId, 
  selectedSceneId, 
  onSceneSelect
}: { 
  projectId: string;
  selectedSceneId?: string | null;
  onSceneSelect?: (sceneId: string | null) => void;
}) {
  const { updateAndRefresh } = useVideoState();
  const [newScenePrompt, setNewScenePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Use internal state if no external selectedSceneId is provided
  const [internalSelectedSceneId, setInternalSelectedSceneId] = useState<string | null>(null);
  const currentSelectedSceneId = selectedSceneId !== undefined ? selectedSceneId : internalSelectedSceneId;
  const setCurrentSelectedSceneId = onSceneSelect || setInternalSelectedSceneId;

  // FIXED: Subscribe to video state changes properly using Zustand selector
  const currentProps = useVideoState((state) => {
    if (!state.currentProjectId || state.currentProjectId !== projectId) {
      return null;
    }
    return state.projects[projectId]?.props || null;
  });
  
  const scenes = currentProps?.scenes || [];
  
  console.log('StoryboardPanelG: Current props:', currentProps);
  console.log('StoryboardPanelG: Scenes:', scenes);

  // Debug: Track when scenes change
  useEffect(() => {
    console.log('[StoryboardPanelG] Scenes updated - count:', scenes.length);
    console.log('[StoryboardPanelG] Scene IDs:', scenes.map((s: any) => s.id));
  }, [scenes]);

  // Force refresh when projectId changes
  useEffect(() => {
    console.log('[StoryboardPanelG] Project ID changed to:', projectId);
    const { forceRefresh } = useVideoState.getState();
    forceRefresh(projectId);
  }, [projectId]);

  // Generate scene code mutation - Updated to use MCP API
  const generateSceneWithChatMutation = api.generation.generateScene.useMutation({
    onSuccess: (result: any) => {
      console.log("✅ Scene generation completed:", result);
      setIsGenerating(false);
      setNewScenePrompt("");
      toast.success("Scene generated successfully!");
      
      // Note: Video state update is handled by the unified mutation
      // The scene will appear here automatically when video state refreshes
      
      // Auto-select the new scene if it was created via the "Add Scene" button
      if (result.scene?.id) {
        setCurrentSelectedSceneId(result.scene.id);
      }
    },
    onError: (error: any) => {
      console.error("❌ Scene generation failed:", error);
      setIsGenerating(false);
      toast.error(`Scene generation failed: ${error.message}`);
    }
  });

  // Handle adding a new scene
  const handleAddScene = useCallback(async () => {
    if (!newScenePrompt.trim()) {
      toast.error("Please enter a prompt for the new scene");
      return;
    }

    setIsGenerating(true);
    
    try {
      await generateSceneWithChatMutation.mutateAsync({
        projectId,
        userMessage: newScenePrompt.trim(),
      });
    } catch (error) {
      console.error("Failed to add scene:", error);
    }
  }, [newScenePrompt, projectId, generateSceneWithChatMutation]);

  // Handle scene deletion (soft delete by hiding)
  const handleDeleteScene = useCallback((sceneId: string) => {
    // For now, just show a toast - actual deletion would require a mutation
    toast.info("Scene deletion not implemented yet");
  }, []);

  // Get selected scene data
  const selectedScene = currentSelectedSceneId ? scenes.find(s => s.id === currentSelectedSceneId) : null;

  // Format duration for display
  const formatDuration = (frames: number) => {
    const seconds = (frames / 30).toFixed(1);
    return `${seconds}s`;
  };

  // Get scene display name
  const getSceneName = (scene: Scene) => {
    if (scene.data?.name) return scene.data.name;
    if (scene.type === 'custom') return `Custom Scene`;
    return `${scene.type} Scene`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Storyboard</h2>
        <Button
          size="sm"
          onClick={() => setIsGenerating(true)}
          disabled={generateSceneWithChatMutation.isPending}
        >
          {generateSceneWithChatMutation.isPending ? (
            <Loader2Icon className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <PlusIcon className="w-4 h-4 mr-1" />
          )}
          Add Scene
        </Button>
      </div>

      {/* Add scene form - shown when triggered */}
      {isGenerating && (
        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-2">
            <Input
              value={newScenePrompt}
              onChange={(e) => setNewScenePrompt(e.target.value)}
              placeholder="Describe the new scene..."
              disabled={generateSceneWithChatMutation.isPending}
              autoFocus
            />
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={handleAddScene}
                disabled={generateSceneWithChatMutation.isPending || !newScenePrompt.trim()}
              >
                {generateSceneWithChatMutation.isPending ? (
                  <Loader2Icon className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <PlusIcon className="w-4 h-4 mr-1" />
                )}
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsGenerating(false);
                  setNewScenePrompt("");
                }}
                disabled={generateSceneWithChatMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scene List */}
      <div className="flex-1 overflow-y-auto">
        {scenes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="mb-2">No scenes yet</p>
              <p className="text-sm">Click "Add Scene" to get started</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {/* Deduplicate scenes by ID to prevent React key errors */}
            {scenes.reduce((uniqueScenes: Scene[], scene: any, index: number) => {
              // Check if we already have a scene with this ID
              const existingIndex = uniqueScenes.findIndex((s: any) => s.id === scene.id);
              if (existingIndex >= 0) {
                // Replace with the newer scene (last occurrence wins)
                uniqueScenes[existingIndex] = scene;
                console.warn(`[StoryboardPanelG] Duplicate scene ID detected: ${scene.id}, using latest version`);
              } else {
                uniqueScenes.push(scene);
              }
              return uniqueScenes;
            }, []).map((scene: any, index: number) => (
              <div
                key={`scene-${scene.id}-${index}`} // More robust key to prevent duplicates
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  currentSelectedSceneId === scene.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => {
                  console.log('[StoryboardPanelG] Scene selected:', scene.id);
                  setCurrentSelectedSceneId(scene.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                      <PlayIcon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{getSceneName(scene)}</div>
                      <div className="text-xs text-gray-500">
                        Scene {index + 1} • {formatDuration(scene.duration)}
                        {scenes.filter((s: any) => s.id === scene.id).length > 1 && (
                          <span className="ml-1 text-red-500">(duplicate ID)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(scene.id);
                    }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scene Details */}
      {selectedScene && (
        <div className="flex-shrink-0 border-t border-gray-200">
          <Tabs defaultValue="props" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="props">Props</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="props" className="p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Scene Properties</h4>
                <div className="bg-gray-50 rounded p-3 text-xs font-mono">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(selectedScene, null, 2)}
                  </pre>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="code" className="p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Scene Code</h4>
                {selectedScene.data?.code ? (
                  <div className="bg-gray-900 rounded p-3 text-xs font-mono text-green-400 overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {String(selectedScene.data.code) ? String(selectedScene.data.code) : 'No code available'}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-500">
                    No code available for this scene
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 