import { useCallback, useRef } from 'react';
import { useVideoState } from '~/stores/videoState';
import { api } from '~/trpc/react';

interface UseSSEGenerationOptions {
  projectId: string;
  onMessageCreated?: (assistantMessageId?: string, metadata?: { userMessage: string; imageUrls?: string[]; videoUrls?: string[]; audioUrls?: string[]; modelOverride?: string; useGitHub?: boolean }) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useSSEGeneration({ projectId, onMessageCreated, onComplete, onError }: UseSSEGenerationOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { addAssistantMessage, updateMessage } = useVideoState();
  
  // ✅ NEW: Get tRPC utils for query invalidation
  const utils = api.useUtils();

  const generate = useCallback(async (
    userMessage: string,
    imageUrls?: string[],
    videoUrls?: string[],
    audioUrls?: string[],
    modelOverride?: string,
    useGitHub?: boolean,
    websiteUrl?: string
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
    
    if (modelOverride) {
      params.append('modelOverride', modelOverride);
    }
    
    if (useGitHub) {
      params.append('useGitHub', 'true');
    }
    
    if (websiteUrl) {
      params.append('websiteUrl', websiteUrl);
    }

    // Create new EventSource
    const eventSource = new EventSource(`/api/generate-stream?${params.toString()}`);
    eventSourceRef.current = eventSource;

    let currentMessageId: string | null = null;
    let hasReceivedMessage = false;

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
              modelOverride: data.modelOverride,
              useGitHub: data.useGitHub
            });
            eventSource.close();
            break;
          
          // ✅ NEW: Handle streaming assistant message updates
          case 'assistant_message_chunk':
            hasReceivedMessage = true;
            // Website pipeline streaming - update message in real-time
            if (currentMessageId) {
              updateMessage(projectId, currentMessageId, { 
                content: data.message,
                status: data.isComplete ? 'complete' : 'streaming'
              });
            } else {
              // Create new assistant message with a unique ID
              const newMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              addAssistantMessage(projectId, newMessageId, data.message);
              currentMessageId = newMessageId;
            }
            
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
            utils.scenes.getByProject.invalidate({ projectId });
            
            // Optional: Show progress notification
            // toast.success(`Scene added: ${data.data.sceneName}`);
            break;
          
          // ✅ NEW: Handle title updates
          case 'title_updated':
            console.log(`[SSE] Title updated to: "${data.title}"`);
            // Invalidate project queries to refresh the UI
            utils.project.getById.invalidate({ id: projectId });
            utils.project.list.invalidate();
            break;
            
          case 'error':
            hasReceivedMessage = true;
            // ✅ NEW: Enhanced error handling with retry info
            let errorMessage = data.error || 'Unknown error occurred';
            
            // Add helpful context for common errors
            if (data.canRetry) {
              errorMessage = `${errorMessage} (Retryable error)`;
            }
            
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