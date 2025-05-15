// src/client/hooks/sse/useSSE.ts

import { useCallback, useEffect, useRef, useState } from 'react';
// import { api } from '~/trpc/react'; // No longer needed for tRPC mutations here
import type { 
  SSEEvent,
  SSEEventPayload,
  TaskStatusUpdateData,
  TaskArtifactUpdateData,
} from '~/types/a2a';

// Define SSEEventType based on the string literals used in SSEEventPayload types
const SSEEventType = {
  TaskStatusUpdate: 'task_status_update',
  TaskArtifactUpdate: 'task_artifact_update',
  Heartbeat: 'heartbeat',
  Error: 'error',
} as const;

// Options should expect the fully parsed SSEEventPayload discriminated union type
interface UseSSEOptions {
  onTaskStatusUpdate?: (payload: Extract<SSEEventPayload, { type: 'task_status_update' }>) => void;
  onTaskArtifactUpdate?: (payload: Extract<SSEEventPayload, { type: 'task_artifact_update' }>) => void;
  onError?: (payload: Extract<SSEEventPayload, { type: 'error' }>) => void;
  onHeartbeat?: (payload: Extract<SSEEventPayload, { type: 'heartbeat' }>) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseSSEResult {
  isConnected: boolean;
  error: Error | null;
  connect: (taskId: string) => void;
  disconnect: () => void;
}

/**
 * Hook for managing SSE connections to the A2A backend
 * 
 * @param options - Configuration options and event handlers
 * @returns Connection state and control functions
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEResult {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  
  // Removed: const { getSSEUrl } = api.useContext();
  // Removed: const subscribeToTaskMutation = api.a2a.subscribeToTask.useMutation();
  // Removed: const unsubscribeFromTaskMutation = api.a2a.unsubscribeFromTask.useMutation();

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      console.log(`SSE connection closed for task: ${currentTaskIdRef.current}`);
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    currentTaskIdRef.current = null;
    options.onClose?.();
  }, [options]);

  /**
   * Process an incoming SSE event
   */
  const processEvent = useCallback((event: MessageEvent<string>) => {
    try {
      const parsedEvent = JSON.parse(event.data) as SSEEventPayload;
      
      switch (parsedEvent.type) {
        case SSEEventType.TaskStatusUpdate:
          options.onTaskStatusUpdate?.(parsedEvent);
          break;
        case SSEEventType.TaskArtifactUpdate:
          options.onTaskArtifactUpdate?.(parsedEvent);
          break;
        case SSEEventType.Error:
          setError(new Error(`SSE Error: ${parsedEvent.data.message} (${parsedEvent.data.code})`));
          options.onError?.(parsedEvent);
          break;
        case SSEEventType.Heartbeat:
          options.onHeartbeat?.(parsedEvent);
          break;
        default:
          const unhandledEvent = parsedEvent as any;
          console.warn('Unknown SSE event type:', unhandledEvent.type);
      }
    } catch (e) {
      console.error('Failed to parse SSE message:', event.data, e);
      setError(e instanceof Error ? e : new Error('Failed to parse SSE message'));
    }
  }, [options]);

  /**
   * Connect to the SSE endpoint
   */
  const connect = useCallback((taskId: string) => {
    if (typeof window === 'undefined') return;
    if (!taskId) {
      console.error("SSE Connect: taskId is required.");
      return;
    }

    // If already connected to the same task, do nothing
    if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED && currentTaskIdRef.current === taskId) {
        console.log(`SSE Connect: Already connected to task ${taskId}`);
        return;
    }

    // If connected to a different task, or if current es is closed/null, disconnect first
    if (eventSourceRef.current) {
        disconnect();
    }
    
    currentTaskIdRef.current = taskId;
    
    try {
      const url = `/api/a2a/tasks/${taskId}/stream`; 
      const eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        options.onOpen?.();
        console.log(`SSE connection opened for task: ${taskId}`);
      };

      eventSource.onmessage = processEvent;

      eventSource.onerror = (errEvent) => {
        console.error('SSE connection error:', errEvent);
        const sseError = new Error('SSE connection error');
        setError(sseError);
        setIsConnected(false); 
        options.onError?.({type: SSEEventType.Error, data: {code: (errEvent as any).status || -1 , message: "SSE connection error"}});
        eventSource.close(); 
        if (eventSourceRef.current === eventSource) {
            eventSourceRef.current = null;
        }
      };

      eventSourceRef.current = eventSource;
      
    } catch (err) {
      const connectError = err instanceof Error ? err : new Error('Failed to create SSE connection');
      setError(connectError);
      setIsConnected(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, processEvent, disconnect]); // Added disconnect to dependency array for connect

  // Auto-connect on mount and clean up on unmount
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
}
