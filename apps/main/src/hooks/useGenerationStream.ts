/**
 * Hook for streaming scene generation with real-time progress updates
 */

import { useState, useCallback, useRef } from 'react';
import { api } from '~/trpc/react';
import type { GenerationEvent } from '~/server/api/routers/generation.streaming';
import type { SceneEntity } from '~/generated/entities';

export interface GenerationProgress {
  stage: string;
  message: string;
  percentage: number;
  toolName?: string;
  reasoning?: string;
}

export interface UseGenerationStreamOptions {
  onSceneCreated?: (scene: SceneEntity) => void;
  onComplete?: (scene: SceneEntity, chatResponse?: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: GenerationProgress) => void;
}

export function useGenerationStream(options: UseGenerationStreamOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    message: '',
    percentage: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneEntity | null>(null);
  
  // Store subscription reference for cleanup
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Subscribe to streaming generation
  const generateScene = useCallback(async (
    projectId: string,
    userMessage: string,
    imageUrls?: string[]
  ) => {
    // Reset state
    setIsGenerating(true);
    setError(null);
    setCurrentScene(null);
    setProgress({
      stage: 'starting',
      message: 'Initializing generation...',
      percentage: 0,
    });

    try {
      // Clean up any existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      // Create new subscription
      const subscription = api.generationStreaming.generateSceneStream.useSubscription(
        {
          projectId,
          userMessage,
          userContext: imageUrls ? { imageUrls } : undefined,
        },
        {
          onData: (event: GenerationEvent) => {
            switch (event.type) {
              case 'status':
                setProgress(prev => ({
                  ...prev,
                  stage: event.stage,
                  message: event.message,
                }));
                break;
                
              case 'progress':
                setProgress(prev => ({
                  ...prev,
                  percentage: event.percentage,
                  stage: event.stage,
                }));
                options.onProgress?.({
                  stage: event.stage,
                  message: progress.message,
                  percentage: event.percentage,
                });
                break;
                
              case 'brain_decision':
                setProgress(prev => ({
                  ...prev,
                  toolName: event.toolName,
                  reasoning: event.reasoning,
                }));
                break;
                
              case 'tool_start':
                setProgress(prev => ({
                  ...prev,
                  stage: 'tool_execution',
                  message: `${event.tool}: ${event.prompt}`,
                }));
                break;
                
              case 'tool_progress':
                setProgress(prev => ({
                  ...prev,
                  message: `${event.tool}: ${event.detail}`,
                }));
                break;
                
              case 'scene_created':
                setCurrentScene(event.scene);
                options.onSceneCreated?.(event.scene);
                break;
                
              case 'complete':
                setIsGenerating(false);
                setCurrentScene(event.scene);
                setProgress({
                  stage: 'complete',
                  message: 'Generation complete!',
                  percentage: 100,
                });
                options.onComplete?.(event.scene, event.chatResponse);
                break;
                
              case 'error':
                setIsGenerating(false);
                setError(event.error);
                setProgress({
                  stage: 'error',
                  message: event.error,
                  percentage: 0,
                });
                options.onError?.(event.error);
                break;
            }
          },
          onError: (err: Error) => {
            setIsGenerating(false);
            const errorMessage = err.message || 'Generation failed';
            setError(errorMessage);
            setProgress({
              stage: 'error',
              message: errorMessage,
              percentage: 0,
            });
            options.onError?.(errorMessage);
          },
          onComplete: () => {
            // Subscription completed
            subscriptionRef.current = null;
          },
        }
      );

      subscriptionRef.current = subscription;
    } catch (err) {
      setIsGenerating(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start generation';
      setError(errorMessage);
      options.onError?.(errorMessage);
    }
  }, [options]);

  // Cancel ongoing generation
  const cancel = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    setIsGenerating(false);
    setProgress({
      stage: 'cancelled',
      message: 'Generation cancelled',
      percentage: 0,
    });
  }, []);

  // Cleanup on unmount
  useCallback(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    generateScene,
    cancel,
    isGenerating,
    progress,
    error,
    currentScene,
  };
}

// Hook for multi-scene generation
export function useMultiGenerationStream(options: UseGenerationStreamOptions = {}) {
  const [scenes, setScenes] = useState<SceneEntity[]>([]);
  
  const singleOptions: UseGenerationStreamOptions = {
    ...options,
    onSceneCreated: (scene) => {
      setScenes(prev => [...prev, scene]);
      options.onSceneCreated?.(scene);
    },
  };
  
  const { generateScene, ...rest } = useGenerationStream(singleOptions);
  
  const generateMultipleScenes = useCallback(async (
    projectId: string,
    userMessage: string,
    imageUrls?: string[]
  ) => {
    setScenes([]);
    return generateScene(projectId, userMessage, imageUrls);
  }, [generateScene]);
  
  return {
    generateMultipleScenes,
    scenes,
    ...rest,
  };
}