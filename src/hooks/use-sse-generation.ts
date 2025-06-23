import { useCallback, useRef } from 'react';
import { useVideoState } from '~/stores/videoState';

interface UseSSEGenerationOptions {
  projectId: string;
  onMessageCreated?: (messageId: string) => void;
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
          case 'message':
            // Initial message from server with DB ID
            currentMessageId = data.id;
            addAssistantMessage(projectId, data.id, data.content);
            // Call the callback so parent can trigger mutation
            onMessageCreated?.(data.id);
            break;
            
          case 'update':
            // Update existing message content
            if (currentMessageId) {
              updateMessage(projectId, data.id, {
                content: data.content,
                status: data.status
              });
            }
            break;
            
          case 'complete':
            // Final message state
            if (currentMessageId) {
              updateMessage(projectId, data.id, {
                content: data.content,
                status: 'success'
              });
              onComplete?.(data.id);
            }
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