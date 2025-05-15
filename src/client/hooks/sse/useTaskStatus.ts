// src/client/hooks/sse/useTaskStatus.ts

import { useCallback, useEffect, useState, useRef } from 'react';
import { api } from '~/trpc/react';
import { useSSE } from './useSSE';
import type { TaskStatus, SSEEventPayload } from '~/types/a2a';

interface TaskStatusState {
  status: TaskStatus | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

interface UseTaskStatusOptions {
  autoSubscribe?: boolean;
  onStatusChange?: (status: TaskStatus) => void;
}

/**
 * Hook for monitoring task status updates
 * 
 * @param taskId - ID of the task to monitor
 * @param options - Configuration options
 * @returns Task status state and control functions
 */
export function useTaskStatus(taskId: string, options: UseTaskStatusOptions = {}) {
  const { autoSubscribe = true, onStatusChange } = options;
  
  // Task status state
  const [state, setState] = useState<TaskStatusState>({
    status: null,
    isLoading: true,
    error: null,
    lastUpdated: null,
  });
  
  // Track if SSE is connected for this specific task
  const sseConnectedRef = useRef(false);

  // Get initial task status
  const { 
    data: initialStatus, 
    error: fetchError, 
    isLoading: isInitialLoading 
  } = api.a2a.getTaskStatus.useQuery(
    { taskId },
    { 
      enabled: !!taskId && autoSubscribe,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    }
  );

  // Setup SSE connection for real-time updates
  const { isConnected, connect, disconnect } = useSSE({
    onTaskStatusUpdate: (payload) => {
      // Only process updates for our task
      const taskData = payload.data;
      if (taskData.task_id === taskId) {
        const updatedStatus: TaskStatus = {
          id: taskData.task_id,
          state: taskData.state,
          updatedAt: new Date().toISOString(), // Using current time since payload might not have timestamp
          message: taskData.message || undefined, // Converting to undefined if not present
        };

        setState(prev => ({
          ...prev,
          status: updatedStatus,
          lastUpdated: new Date(),
          error: null,
          isLoading: false,
        }));

        if (onStatusChange) {
          onStatusChange(updatedStatus);
        }
      }
    },
    onOpen: () => {
      sseConnectedRef.current = true;
    },
    onClose: () => {
      sseConnectedRef.current = false;
    }
  });

  // Update state when initial status is loaded
  useEffect(() => {
    if (initialStatus) {
      setState(prev => ({
        ...prev,
        status: initialStatus,
        isLoading: false,
        lastUpdated: new Date(),
      }));
      
      if (onStatusChange) {
        onStatusChange(initialStatus);
      }
    }
  }, [initialStatus, onStatusChange]);

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      setState(prev => ({
        ...prev,
        error: fetchError instanceof Error ? fetchError : new Error('Failed to fetch task status'),
        isLoading: false,
      }));
    }
  }, [fetchError]);

  // Connect to SSE when taskId is available
  useEffect(() => {
    if (taskId && autoSubscribe) {
      connect(taskId);
      
      // Clean up connection when component unmounts
      return () => {
        disconnect();
      };
    }
  }, [taskId, autoSubscribe, connect, disconnect]);

  // Manually refresh task status
  const refresh = useCallback(async () => {
    if (!taskId) return null;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Create a new direct query rather than using refetch
      const result = await api.a2a.getTaskStatus.useQuery({ taskId }, { 
        enabled: true 
      }).data;

      if (result) {
        setState(prev => ({
          ...prev,
          status: result,
          isLoading: false,
          lastUpdated: new Date(),
          error: null,
        }));
        
        if (onStatusChange) {
          onStatusChange(result);
        }
        
        return result;
      }
      
      // Fallback to any existing data
      return initialStatus || null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch task status');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
      }));
      throw error;
    }
  }, [taskId, initialStatus, onStatusChange]);

  // For now, just offer a way to get the current status data (if any)
  const refreshSync = useCallback(() => {
    return state.status;
  }, [state.status]);

  return {
    ...state,
    refresh,
  };
}
