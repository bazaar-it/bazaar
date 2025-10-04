import { useCallback, useRef } from 'react';
import { useVideoState } from '~/stores/videoState';
import { api } from '~/trpc/react';

// Generate a UUID v4 in the browser
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

import type { UrlToVideoUserInputs } from '~/lib/types/url-to-video';

interface UseSSEGenerationOptions {
  projectId: string;
  onMessageCreated?: (assistantMessageId?: string, metadata?: { userMessage: string; imageUrls?: string[]; videoUrls?: string[]; audioUrls?: string[]; sceneUrls?: string[]; modelOverride?: string; useGitHub?: boolean }) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onAssistantChunk?: (message: string, isComplete: boolean) => void;
  onSceneProgress?: (event: { sceneId?: string; sceneIndex: number; sceneName: string; totalScenes: number; progress: number }) => void;
}

export function useSSEGeneration({ projectId, onMessageCreated, onComplete, onError, onAssistantChunk, onSceneProgress }: UseSSEGenerationOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { addAssistantMessage, updateMessage } = useVideoState();
  
  // ✅ NEW: Get tRPC utils for query invalidation
  const utils = api.useUtils();

  const generate = useCallback(async (
    userMessage: string,
    imageUrls?: string[],
    videoUrls?: string[],
    audioUrls?: string[],
    sceneUrls?: string[], 
    modelOverride?: string,
    useGitHub?: boolean,
    options?: {
      websiteUrl?: string;
      userInputs?: UrlToVideoUserInputs;
    }
  ) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Build URL with params
    const params = new URLSearchParams({
      projectId,
      message: userMessage,
    });
    
    if (imageUrls?.length) {
      params.append('imageUrls', JSON.stringify(imageUrls));
    }
    
    if (videoUrls?.length) {
      params.append('videoUrls', JSON.stringify(videoUrls));
    }
    
    if (audioUrls?.length) {
      params.append('audioUrls', JSON.stringify(audioUrls));
    }
    
    if (sceneUrls?.length) {
      params.append('sceneUrls', JSON.stringify(sceneUrls));
    }
    
    if (modelOverride) {
      params.append('modelOverride', modelOverride);
    }
    
    if (useGitHub) {
      params.append('useGitHub', 'true');
    }

    if (options?.websiteUrl) {
      params.append('websiteUrl', options.websiteUrl);
    }

    if (options?.userInputs) {
      try {
        params.append('userInputs', JSON.stringify(options.userInputs));
      } catch (error) {
        console.warn('[useSSEGeneration] Failed to serialize userInputs', error);
      }
    }

    // Create new EventSource
    const eventSource = new EventSource(`/api/generate-stream?${params.toString()}`);
    eventSourceRef.current = eventSource;

    let currentMessageId: string | null = null;
    let hasReceivedMessage = false;
    let aggregatedAssistantMessage = '';

    const appendAssistantMessage = (
      line: string | undefined,
      status: 'pending' | 'success' | 'error' = 'pending'
    ) => {
      if (!line) return;
      aggregatedAssistantMessage = aggregatedAssistantMessage
        ? `${aggregatedAssistantMessage}\n${line}`
        : line;

      if (currentMessageId) {
        updateMessage(projectId, currentMessageId, {
          content: aggregatedAssistantMessage,
          status,
        });
      } else {
        const newMessageId = generateUUID();
        addAssistantMessage(projectId, newMessageId, aggregatedAssistantMessage);
        currentMessageId = newMessageId;
        updateMessage(projectId, newMessageId, {
          status,
        });
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'ready':
            hasReceivedMessage = true;
            // SSE is ready, trigger the generation
            // Don't pass empty string - let the mutation create the assistant message
            onMessageCreated?.(undefined, {
              userMessage: data.userMessage,
              imageUrls: data.imageUrls,
              videoUrls: data.videoUrls,
              audioUrls: data.audioUrls,
              sceneUrls: data.sceneUrls,
              modelOverride: data.modelOverride,
              useGitHub: data.useGitHub
            });
            eventSource.close();
            break;
          
          // ✅ NEW: Handle streaming assistant message updates
          case 'assistant_message_chunk':
            hasReceivedMessage = true;
            onAssistantChunk?.(data.message, Boolean(data.isComplete));
            appendAssistantMessage(data.message, data.isComplete ? 'success' : 'pending');
            
            // Close stream if message is complete
            if (data.isComplete) {
              eventSource.close();
              onComplete?.();
            }
            break;
            
          // ✅ NEW: Handle scene streaming events
          case 'scene_added':
            console.log(`Scene ${data.data.progress}% complete:`, data.data.sceneName);
            
            // Trigger immediate video state refresh
            utils.project.getFullProject.invalidate({ id: projectId });
            onSceneProgress?.({
              sceneId: data.data.sceneId,
              sceneIndex: data.data.sceneIndex,
              sceneName: data.data.sceneName,
              totalScenes: data.data.totalScenes,
              progress: data.data.progress,
            });
            
            // Optional: Show progress notification
            // toast.success(`Scene added: ${data.data.sceneName}`);
            break;
          
          // ✅ NEW: Handle title updates
          case 'title_updated':
            console.log(`[SSE] Title updated to: "${data.title}"`);
            // Optimistically update caches so UI reflects the new title immediately
            utils.project.getById.setData({ id: projectId }, (old) =>
              old ? { ...old, title: data.title } : old
            );
            utils.project.list.setData(undefined, (old) =>
              Array.isArray(old)
                ? old.map((project) =>
                    project.id === projectId
                      ? { ...project, title: data.title }
                      : project
                  )
                : old
            );

            // Invalidate project queries to refresh the UI with server state
            void utils.project.getById.invalidate({ id: projectId });
            void utils.project.list.invalidate();
            break;
            
          case 'error':
            hasReceivedMessage = true;
            // ✅ NEW: Enhanced error handling with retry info
            let errorMessage = data.error || 'Unknown error occurred';
            
            // Add helpful context for common errors
            if (data.canRetry) {
              errorMessage = `${errorMessage} (Retryable error)`;
            }
            
            appendAssistantMessage(errorMessage, 'error');
            onError?.(errorMessage);
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error('[SSE] Failed to parse message:', error);
        onError?.('Failed to parse server response');
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] EventSource error:', error);
      
      // ✅ NEW: More intelligent error handling
      if (hasReceivedMessage) {
        // This is expected - the server closed the connection after creating the message
        console.log('[SSE] Connection closed normally after receiving message');
        return;
      }
      
      // Check connection state to provide better error messages
      if (eventSource.readyState === EventSource.CONNECTING) {
        onError?.('Connection failed. Please check your network and try again.');
      } else if (eventSource.readyState === EventSource.CLOSED) {
        onError?.('Connection lost. Please try again.');
      } else {
        onError?.('Connection error. Please try again.');
      }
      
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [projectId, onMessageCreated, onError, utils]);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { generate, cleanup };
}
