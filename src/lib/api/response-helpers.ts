import { UniversalResponse, Operation, Entity, ErrorCode } from '~/lib/types/api/universal';

// Generate request IDs using built-in crypto
const generateRequestId = (): string => {
  // Use crypto.randomUUID() for a standard UUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Take first 12 chars of UUID for shorter IDs
    return crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
  }
  // Fallback for older environments
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
};

/**
 * Helper class for building consistent API responses
 * Ensures every response follows the UniversalResponse format
 */
export class ResponseBuilder {
  private startTime: number;
  private requestId: string;
  
  constructor(requestId?: string) {
    this.startTime = Date.now();
    this.requestId = requestId || generateRequestId();
  }
  
  /**
   * Create a success response
   */
  success<T>(
    data: T,
    operation: Operation,
    entity: Entity,
    affectedIds: string[] = []
  ): UniversalResponse<T> {
    return {
      data,
      meta: {
        requestId: this.requestId,
        timestamp: Date.now(),
        operation,
        entity,
        success: true,
        affectedIds,
        executionTimeMs: Date.now() - this.startTime
      }
    };
  }
  
  /**
   * Create an error response
   */
  error(
    code: ErrorCode,
    message: string,
    operation: Operation,
    entity: Entity,
    details?: unknown
  ): UniversalResponse<null> {
    return {
      data: null,
      meta: {
        requestId: this.requestId,
        timestamp: Date.now(),
        operation,
        entity,
        success: false,
        affectedIds: [],
        executionTimeMs: Date.now() - this.startTime
      },
      error: {
        code,
        message,
        details,
        retryable: this.isRetryable(code)
      }
    };
  }
  
  /**
   * Add context to an existing response
   */
  withContext<T>(
    response: UniversalResponse<T>,
    context: {
      reasoning?: string;
      chatResponse?: string;
      suggestions?: string[];
    }
  ): UniversalResponse<T> {
    return {
      ...response,
      context
    };
  }
  
  /**
   * Get the request ID for logging
   */
  getRequestId(): string {
    return this.requestId;
  }
  
  /**
   * Get execution time so far
   */
  getExecutionTime(): number {
    return Date.now() - this.startTime;
  }
  
  /**
   * Determine if an error is retryable
   */
  private isRetryable(code: ErrorCode): boolean {
    return [
      ErrorCode.AI_ERROR,
      ErrorCode.STORAGE_ERROR,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.RATE_LIMITED,
      ErrorCode.SERVICE_UNAVAILABLE
    ].includes(code);
  }
}

/**
 * Helper function to extract error code from various error types
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (error instanceof Error) {
    // Check for specific error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('not found')) return ErrorCode.NOT_FOUND;
    if (message.includes('unauthorized')) return ErrorCode.UNAUTHORIZED;
    if (message.includes('forbidden')) return ErrorCode.FORBIDDEN;
    if (message.includes('validation')) return ErrorCode.VALIDATION_FAILED;
    if (message.includes('already exists')) return ErrorCode.ALREADY_EXISTS;
    if (message.includes('rate limit')) return ErrorCode.RATE_LIMITED;
    if (message.includes('ai') || message.includes('openai') || message.includes('gpt')) return ErrorCode.AI_ERROR;
    if (message.includes('database') || message.includes('db')) return ErrorCode.DATABASE_ERROR;
    if (message.includes('storage') || message.includes('upload')) return ErrorCode.STORAGE_ERROR;
  }
  
  return ErrorCode.INTERNAL_ERROR;
}

/**
 * Helper to log responses consistently
 */
export function logResponse<T>(response: UniversalResponse<T>, logger: any): void {
  const logData = {
    requestId: response.meta.requestId,
    operation: response.meta.operation,
    entity: response.meta.entity,
    success: response.meta.success,
    executionTimeMs: response.meta.executionTimeMs,
    affectedIds: response.meta.affectedIds,
  };
  
  if (response.meta.success) {
    logger.info(`[${response.meta.requestId}] ${response.meta.operation} completed`, logData);
  } else {
    logger.error(`[${response.meta.requestId}] ${response.meta.operation} failed`, {
      ...logData,
      error: response.error
    });
  }
}