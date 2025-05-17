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
  throttleDelay?: number; // Optional throttling delay for event processing
}

interface UseSSEResult {
  isConnected: boolean;
  error: Error | null;
  connect: (taskId: string) => void;
  disconnect: () => void;
}

// Improved debounce function with clearer types
const debounce = <T extends (...args: any[]) => any>(fn: T, ms = 100): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, ms);
  };
};

// Global Map to track SSE connections across the app
// This prevents multiple connections to the same task ID
const activeConnections = new Map<string, {
  refCount: number;
  eventSource: EventSource;
}>();

/**
 * Hook for managing SSE connections to the A2A backend
 * 
 * @param options - Configuration options and event handlers
 * @returns Connection state and control functions
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEResult {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);
  const lastEventTimeRef = useRef<Record<string, number>>({});
  const throttleDelay = options.throttleDelay || 500; // Increased from 50ms to 500ms
  const isConnectingRef = useRef(false); // Prevent concurrent connection attempts
  
  // Store handlers in refs to avoid dependency changes triggering reconnects
  const handlersRef = useRef(options);
  handlersRef.current = options;
  
  // Debounced state setters to avoid rapid updates
  const debouncedSetIsConnected = useCallback(
    debounce((value: boolean) => {
      setIsConnected(value);
    }, 100),
    []
  );
  
  const debouncedSetError = useCallback(
    debounce((value: Error | null) => {
      setError(value);
    }, 100),
    []
  );

  const disconnect = useCallback(() => {
    const taskId = currentTaskIdRef.current;
    if (!taskId) return;
    
    console.log(`Disconnecting SSE for task: ${taskId}`);
    
    // Update global connection tracking
    const connection = activeConnections.get(taskId);
    if (connection) {
      connection.refCount--;
      
      if (connection.refCount <= 0) {
        connection.eventSource.close();
        activeConnections.delete(taskId);
        console.log(`Closed SSE connection for task: ${taskId} (last reference)`);
      } else {
        console.log(`Decreased ref count for SSE connection to task: ${taskId}, now: ${connection.refCount}`);
      }
    }
    
    debouncedSetIsConnected(false);
    currentTaskIdRef.current = null;
    handlersRef.current.onClose?.();
  }, [debouncedSetIsConnected]);

  /**
   * Process an incoming SSE event with throttling
   */
  const processEvent = useCallback((event: MessageEvent<string>) => {
    try {
      // Parse the event data
      const parsedEvent = JSON.parse(event.data) as SSEEventPayload;
      const eventType = parsedEvent.type;
      
      // Apply per-event-type throttling
      const now = Date.now();
      const lastTime = lastEventTimeRef.current[eventType] || 0;
      
      if (now - lastTime < throttleDelay) {
        return; // Skip this event if too soon after previous event of same type
      }
      
      lastEventTimeRef.current[eventType] = now;
      
      // Dispatch the event to appropriate handler
      switch (parsedEvent.type) {
        case SSEEventType.TaskStatusUpdate:
          handlersRef.current.onTaskStatusUpdate?.(parsedEvent);
          break;
        case SSEEventType.TaskArtifactUpdate:
          handlersRef.current.onTaskArtifactUpdate?.(parsedEvent);
          break;
        case SSEEventType.Error:
          debouncedSetError(new Error(`SSE Error: ${parsedEvent.data.message}`));
          handlersRef.current.onError?.(parsedEvent);
          break;
        case SSEEventType.Heartbeat:
          handlersRef.current.onHeartbeat?.(parsedEvent);
          break;
        default:
          console.warn('Unknown SSE event type:', (parsedEvent as any).type);
      }
    } catch (e) {
      console.error('Failed to parse SSE message:', event.data, e);
    }
  }, [throttleDelay, debouncedSetError]);

  /**
   * Connect to the SSE endpoint
   */
  const connect = useCallback((taskId: string) => {
    if (typeof window === 'undefined') return;
    if (!taskId) {
      console.error('Cannot connect SSE: taskId is required');
      return;
    }
    
    // Prevent concurrent connection attempts
    if (isConnectingRef.current) {
      console.log('Connection already in progress, skipping');
      return;
    }
    
    // If already connected to the same task, don't reconnect
    if (currentTaskIdRef.current === taskId && isConnected) {
      console.log(`Already connected to task: ${taskId}`);
      return;
    }
    
    // If connected to a different task, disconnect first
    if (currentTaskIdRef.current && currentTaskIdRef.current !== taskId) {
      disconnect();
    }
    
    isConnectingRef.current = true;
    currentTaskIdRef.current = taskId;
    
    try {
      // Check if there's already a connection for this task
      if (activeConnections.has(taskId)) {
        // Reuse existing connection
        const existingConnection = activeConnections.get(taskId)!;
        existingConnection.refCount++;
        
        console.log(`Reusing existing SSE connection for task: ${taskId}, ref count: ${existingConnection.refCount}`);
        debouncedSetIsConnected(true);
        handlersRef.current.onOpen?.();
        isConnectingRef.current = false;
        return;
      }
      
      // Create new connection
      console.log(`Creating new SSE connection for task: ${taskId}`);
      const url = `/api/a2a/tasks/${taskId}/stream`;
      const eventSource = new EventSource(url, { withCredentials: true });
      
      // Store in global connection tracking
      activeConnections.set(taskId, {
        refCount: 1,
        eventSource
      });
      
      eventSource.onopen = () => {
        // Check if the current task is still what we're connecting to
        if (currentTaskIdRef.current !== taskId) {
          console.log(`Task changed during connection, closing: ${taskId}`);
          if (activeConnections.has(taskId)) {
            const conn = activeConnections.get(taskId)!;
            conn.refCount--;
            if (conn.refCount <= 0) {
              conn.eventSource.close();
              activeConnections.delete(taskId);
            }
          }
          isConnectingRef.current = false;
          return;
        }
        
        console.log(`SSE connection opened for task: ${taskId}`);
        debouncedSetIsConnected(true);
        debouncedSetError(null);
        handlersRef.current.onOpen?.();
        isConnectingRef.current = false;
      };
      
      eventSource.onmessage = processEvent;
      
      eventSource.onerror = (errEvent) => {
        console.error(`SSE error for task ${taskId}:`, errEvent);
        
        // Only set error if this is still the current task
        if (currentTaskIdRef.current === taskId) {
          debouncedSetError(new Error('SSE connection error'));
          debouncedSetIsConnected(false);
          
          handlersRef.current.onError?.({
            type: SSEEventType.Error,
            data: {
              code: (errEvent as any).status || -1,
              message: 'SSE connection error'
            }
          });
        }
        
        // Clean up from global tracking
        if (activeConnections.has(taskId)) {
          const conn = activeConnections.get(taskId)!;
          conn.refCount--;
          if (conn.refCount <= 0) {
            activeConnections.delete(taskId);
          }
        }
        
        isConnectingRef.current = false;
      };
      
    } catch (err) {
      console.error(`Error creating SSE connection for task ${taskId}:`, err);
      debouncedSetError(err instanceof Error ? err : new Error('Failed to create SSE connection'));
      debouncedSetIsConnected(false);
      currentTaskIdRef.current = null;
      isConnectingRef.current = false;
    }
  }, [disconnect, isConnected, processEvent, debouncedSetIsConnected, debouncedSetError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect
  };
}
