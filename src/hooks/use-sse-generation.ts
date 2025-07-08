import { useCallback, useRef } from 'react';
import { useVideoState } from '~/stores/videoState';
import { api } from '~/trpc/react';

interface UseSSEGenerationOptions {
  projectId: string;
  onMessageCreated?: (assistantMessageId?: string, metadata?: { userMessage: string; imageUrls?: string[]; videoUrls?: string[]; modelOverride?: string }) => void;
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
    modelOverride?: string
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
    
    if (modelOverride) {
      params.append('modelOverride', modelOverride);
    }

    // Create new EventSource
    const eventSource = new EventSource(`/api/generate-stream?${params.toString()}`);
    eventSourceRef.current = eventSource;

    let currentMessageId: string | null = null;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'ready':
            // SSE is ready, trigger the generation
            // Don't pass empty string - let the mutation create the assistant message
            onMessageCreated?.(undefined, {
              userMessage: data.userMessage,
              imageUrls: data.imageUrls,
              videoUrls: data.videoUrls,
              modelOverride: data.modelOverride
            });
            eventSource.close();
            break;
          
          // ✅ NEW: Handle title updates
          case 'title_updated':
            console.log(`[SSE] Title updated to: "${data.title}"`);
            // Invalidate project queries to refresh the UI
            utils.project.getById.invalidate({ id: projectId });
            utils.project.list.invalidate();
            break;
            
          case 'error':
            onError?.(data.error);
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error('[SSE] Failed to parse message:', error);
      }
    };

    eventSource.onerror = (error) => {
      // Check if we've already received a message - if so, this is likely just the connection closing normally
      if (currentMessageId || eventSource.readyState === EventSource.CLOSED) {
        // This is expected - the server closed the connection after creating the message
        console.log('[SSE] Connection closed normally');
        return;
      }
      
      // Only log and show error if we haven't received any messages yet
      console.error('[SSE] Connection error:', error);
      onError?.('Connection lost. Please try again.');
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