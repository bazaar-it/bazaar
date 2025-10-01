/**
 * Universal response format for ALL API operations
 * Every single endpoint MUST return this format
 */

// Import entities from generated types (TICKET-001)
import type { SceneEntity } from "~/generated/entities";

/**
 * The universal response wrapper that ensures consistency
 * @template TData - The actual data type being returned
 */
export interface UniversalResponse<TData = unknown> {
  // The actual data (null on error)
  data: TData;
  
  // Metadata about the operation
  meta: {
    requestId: string;      // Unique ID for tracing
    timestamp: number;      // When response was created
    operation: Operation;   // What operation was performed
    entity: Entity;         // What entity was affected
    success: boolean;       // Did it succeed?
    affectedIds: string[];  // What IDs were created/updated/deleted
    executionTimeMs: number; // How long it took
    revision?: number;      // Optional project revision after mutation
  };
  
  // Optional context (reasoning, suggestions, etc)
  context?: {
    reasoning?: string;      // Why the AI made this decision
    chatResponse?: string;   // Message for the user
    suggestions?: string[];  // What user could do next
  };
  
  // Error information (only present on failure)
  error?: {
    code: ErrorCode;        // Standardized error code
    message: string;        // Human-readable message
    details?: unknown;      // Technical details for debugging
    retryable: boolean;     // Can this be retried?
  };

  // Optional shorthand for project revision
  newRevision?: number;
}

// All possible operations in the system
export type Operation = 
  | 'scene.create'
  | 'scene.update' 
  | 'scene.delete'
  | 'scene.analyze'
  | 'brain.decide'
  | 'project.read'
  | 'project.update'
  | 'user.authenticate'
  | 'clarification';

// All entities in the system
export type Entity = 'scene' | 'project' | 'user' | 'decision' | 'message';

// Standardized error codes
export enum ErrorCode {
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Permission errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // External service errors
  AI_ERROR = 'AI_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// Type guards for better TypeScript support
export function isSuccessResponse<T>(response: UniversalResponse<T>): response is UniversalResponse<T> & { data: T } {
  return response.meta.success === true && response.data !== null;
}

export function isErrorResponse<T>(response: UniversalResponse<T>): response is UniversalResponse<T> & { error: NonNullable<UniversalResponse<T>['error']> } {
  return response.meta.success === false && response.error !== undefined;
}

// Common response types for scenes
export type SceneCreateResponse = UniversalResponse<SceneEntity>;
export type SceneUpdateResponse = UniversalResponse<SceneEntity>;
export type SceneDeleteResponse = UniversalResponse<{ deletedId: string }>;
export type SceneListResponse = UniversalResponse<SceneEntity[]>;
