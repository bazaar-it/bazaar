import type { UniversalResponse } from '~/lib/types/api/universal';
import { isSuccessResponse, isErrorResponse } from '~/lib/types/api/universal';

/**
 * Options for handling universal responses
 */
export interface HandleResponseOptions<T> {
  onSuccess?: (data: T, response: UniversalResponse<T>) => void;
  onError?: (error: UniversalResponse<T>['error'], response: UniversalResponse<T>) => void;
  throwOnError?: boolean;
}

/**
 * Handle a UniversalResponse from the API
 * Provides consistent error handling and data extraction
 */
export function handleUniversalResponse<T>(
  response: UniversalResponse<T>,
  options?: HandleResponseOptions<T>
): T {
  // Log the request ID for debugging
  console.debug(`[API Response ${response.meta.requestId}]`, {
    operation: response.meta.operation,
    entity: response.meta.entity,
    success: response.meta.success,
    executionTimeMs: response.meta.executionTimeMs
  });

  // Handle success case
  if (isSuccessResponse(response)) {
    options?.onSuccess?.(response.data, response);
    return response.data;
  }

  // Handle error case
  if (isErrorResponse(response)) {
    console.error(`[API Error ${response.meta.requestId}]`, response.error);
    options?.onError?.(response.error, response);
    
    if (response.error.retryable) {
      console.info(`[API ${response.meta.requestId}] This error is retryable`);
    }
    
    if (options?.throwOnError !== false) {
      const error = new Error(response.error.message);
      (error as any).code = response.error.code;
      (error as any).details = response.error.details;
      (error as any).retryable = response.error.retryable;
      (error as any).requestId = response.meta.requestId;
      throw error;
    }
  }

  // This shouldn't happen with proper typing, but handle it just in case
  throw new Error('Invalid response format');
}

/**
 * Extract suggestions from a response
 */
export function getSuggestions<T>(response: UniversalResponse<T>): string[] {
  return response.context?.suggestions || [];
}

/**
 * Extract chat response from a response
 */
export function getChatResponse<T>(response: UniversalResponse<T>): string | undefined {
  return response.context?.chatResponse;
}

/**
 * Extract reasoning from a response
 */
export function getReasoning<T>(response: UniversalResponse<T>): string | undefined {
  return response.context?.reasoning;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  return error?.retryable === true;
}

/**
 * Get request ID from error for support/debugging
 */
export function getRequestIdFromError(error: any): string | undefined {
  return error?.requestId;
}

/**
 * Format execution time for display
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Example usage in a React component:
 * 
 * const handleGenerateScene = async (prompt: string) => {
 *   try {
 *     const response = await api.generation.generateScene.mutate({
 *       projectId,
 *       userMessage: prompt
 *     });
 *     
 *     const scene = handleUniversalResponse(response, {
 *       onSuccess: (data, res) => {
 *         console.log(`Scene created in ${formatExecutionTime(res.meta.executionTimeMs)}`);
 *         const chatMsg = getChatResponse(res);
 *         if (chatMsg) addMessage('assistant', chatMsg);
 *         
 *         const suggestions = getSuggestions(res);
 *         if (suggestions.length > 0) {
 *           showSuggestions(suggestions);
 *         }
 *       },
 *       onError: (error, res) => {
 *         toast.error(error.message);
 *         if (error.retryable) {
 *           showRetryButton();
 *         }
 *       }
 *     });
 *     
 *     // Use the scene data
 *     updateVideoState(scene);
 *     
 *   } catch (error) {
 *     // Error already handled by onError callback
 *     // But you can do additional handling here if needed
 *     const requestId = getRequestIdFromError(error);
 *     if (requestId) {
 *       console.error(`Request ${requestId} failed`);
 *     }
 *   }
 * };
 */