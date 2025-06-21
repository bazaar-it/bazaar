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
            // Check if this is a temporary message
            if (data.isTemporary) {
              // Temporary "Generating code..." message - show in UI but don't save to state
              currentMessageId = data.id;
              // Don't call addAssistantMessage for temporary messages
              // Just signal that we're ready for the real mutation
              onMessageCreated?.(data.id);
            } else {
              // Real message from server with DB ID
              currentMessageId = data.id;
              addAssistantMessage(projectId, data.id, data.content);
              onMessageCreated?.(data.id);
            }
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
      // Check if this is just the connection closing normally
      // The SSE connection closes after sending the initial message, which is expected
      if (eventSource.readyState === EventSource.CLOSED || eventSource.readyState === EventSource.CONNECTING) {
        // This is expected behavior - not an error
        // The server closes the connection after creating the initial message
        // The actual generation happens through tRPC mutations
        return;
      }
      
      // Only show error for actual connection failures
      console.error('[SSE] Connection error:', error);
      // Don't show error toast for normal connection closes
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