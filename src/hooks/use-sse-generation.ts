import { useCallback, useRef } from 'react';
import { useVideoState } from '~/stores/videoState';

interface UseSSEGenerationOptions {
  projectId: string;
  onMessageCreated?: (messageId: string | undefined, data?: { userMessage?: string; imageUrls?: string[] }) => void;
  onComplete?: (messageId: string) => void;
  onError?: (error: string) => void;
}

export function useSSEGeneration({ projectId, onMessageCreated, onComplete, onError }: UseSSEGenerationOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { addAssistantMessage, updateMessage } = useVideoState();

  const generate = useCallback(async (
    userMessage: string,
    imageUrls?: string[]
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
              imageUrls: data.imageUrls
            });
            eventSource.close();
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
  }, [projectId, addAssistantMessage, updateMessage, onMessageCreated, onComplete, onError]);

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  return { generate, cancel };
}