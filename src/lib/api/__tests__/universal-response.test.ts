/**
 * Tests for Universal Response Format
 * TICKET-002 Implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResponseBuilder, getErrorCode } from '~/lib/api/response-helpers';
import { handleUniversalResponse, getSuggestions, getChatResponse, getReasoning, isRetryableError, getRequestIdFromError, formatExecutionTime } from '~/lib/api/client';
import { ErrorCode, isSuccessResponse, isErrorResponse } from '~/lib/types/api/universal';
import type { UniversalResponse, SceneEntity } from '~/lib/types/api/universal';

// Mock crypto.randomUUID for consistent testing
vi.stubGlobal('crypto', {
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000'
});

describe('ResponseBuilder', () => {
  let builder: ResponseBuilder;
  
  beforeEach(() => {
    builder = new ResponseBuilder();
  });
  
  describe('success responses', () => {
    it('should create a success response with all required fields', () => {
      const data = { id: '123', name: 'Test Scene' };
      const response = builder.success(data, 'scene.create', 'scene', ['123']);
      
      expect(response.data).toEqual(data);
      expect(response.meta.success).toBe(true);
      expect(response.meta.operation).toBe('scene.create');
      expect(response.meta.entity).toBe('scene');
      expect(response.meta.affectedIds).toEqual(['123']);
      expect(response.meta.requestId).toBeDefined();
      expect(response.meta.timestamp).toBeGreaterThan(0);
      expect(response.meta.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(response.error).toBeUndefined();
    });
    
    it('should add context to a response', () => {
      const data = { id: '123' };
      const response = builder.success(data, 'scene.create', 'scene');
      
      const withContext = builder.withContext(response, {
        reasoning: 'Created based on user prompt',
        chatResponse: 'I created a new scene for you',
        suggestions: ['Edit the scene', 'Add another scene']
      });
      
      expect(withContext.context).toEqual({
        reasoning: 'Created based on user prompt',
        chatResponse: 'I created a new scene for you',
        suggestions: ['Edit the scene', 'Add another scene']
      });
    });
    
    it('should generate consistent request IDs', () => {
      const requestId = builder.getRequestId();
      expect(requestId).toBe('550E8400E29B');
      expect(requestId).toHaveLength(12);
    });
  });
  
  describe('error responses', () => {
    it('should create an error response with all required fields', () => {
      const response = builder.error(
        ErrorCode.NOT_FOUND,
        'Scene not found',
        'scene.update',
        'scene',
        { sceneId: '123' }
      );
      
      expect(response.data).toBeNull();
      expect(response.meta.success).toBe(false);
      expect(response.meta.operation).toBe('scene.update');
      expect(response.meta.entity).toBe('scene');
      expect(response.error).toEqual({
        code: ErrorCode.NOT_FOUND,
        message: 'Scene not found',
        details: { sceneId: '123' },
        retryable: false
      });
    });
    
    it('should mark AI errors as retryable', () => {
      const response = builder.error(
        ErrorCode.AI_ERROR,
        'OpenAI service unavailable',
        'scene.create',
        'scene'
      );
      
      expect(response.error?.retryable).toBe(true);
    });
    
    it('should mark storage errors as retryable', () => {
      const response = builder.error(
        ErrorCode.STORAGE_ERROR,
        'Upload failed',
        'scene.create',
        'scene'
      );
      
      expect(response.error?.retryable).toBe(true);
    });
  });
  
  describe('execution time tracking', () => {
    it('should track execution time', async () => {
      const builder = new ResponseBuilder();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const response = builder.success({}, 'scene.create', 'scene');
      expect(response.meta.executionTimeMs).toBeGreaterThanOrEqual(10);
    });
  });
});

describe('getErrorCode', () => {
  it('should detect NOT_FOUND errors', () => {
    expect(getErrorCode(new Error('Scene not found'))).toBe(ErrorCode.NOT_FOUND);
    expect(getErrorCode(new Error('User not found in database'))).toBe(ErrorCode.NOT_FOUND);
  });
  
  it('should detect UNAUTHORIZED errors', () => {
    expect(getErrorCode(new Error('Unauthorized access'))).toBe(ErrorCode.UNAUTHORIZED);
    expect(getErrorCode(new Error('User is unauthorized'))).toBe(ErrorCode.UNAUTHORIZED);
  });
  
  it('should detect AI_ERROR errors', () => {
    expect(getErrorCode(new Error('OpenAI API failed'))).toBe(ErrorCode.AI_ERROR);
    expect(getErrorCode(new Error('GPT-4 rate limited'))).toBe(ErrorCode.AI_ERROR);
  });
  
  it('should return INTERNAL_ERROR for unknown errors', () => {
    expect(getErrorCode(new Error('Something went wrong'))).toBe(ErrorCode.INTERNAL_ERROR);
    expect(getErrorCode('not an error object')).toBe(ErrorCode.INTERNAL_ERROR);
  });
});

describe('Client Response Handling', () => {
  describe('handleUniversalResponse', () => {
    it('should extract data from success response', () => {
      const response: UniversalResponse<{ id: string }> = {
        data: { id: '123' },
        meta: {
          requestId: 'REQ123',
          timestamp: Date.now(),
          operation: 'scene.create',
          entity: 'scene',
          success: true,
          affectedIds: ['123'],
          executionTimeMs: 100
        }
      };
      
      const data = handleUniversalResponse(response);
      expect(data).toEqual({ id: '123' });
    });
    
    it('should call success callback', () => {
      const onSuccess = vi.fn();
      const response: UniversalResponse<{ id: string }> = {
        data: { id: '123' },
        meta: {
          requestId: 'REQ123',
          timestamp: Date.now(),
          operation: 'scene.create',
          entity: 'scene',
          success: true,
          affectedIds: ['123'],
          executionTimeMs: 100
        }
      };
      
      handleUniversalResponse(response, { onSuccess });
      expect(onSuccess).toHaveBeenCalledWith({ id: '123' }, response);
    });
    
    it('should throw on error by default', () => {
      const response: UniversalResponse<null> = {
        data: null,
        meta: {
          requestId: 'REQ123',
          timestamp: Date.now(),
          operation: 'scene.create',
          entity: 'scene',
          success: false,
          affectedIds: [],
          executionTimeMs: 100
        },
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Scene not found',
          retryable: false
        }
      };
      
      expect(() => handleUniversalResponse(response)).toThrow('Scene not found');
    });
    
    it('should not throw when throwOnError is false', () => {
      const response: UniversalResponse<null> = {
        data: null,
        meta: {
          requestId: 'REQ123',
          timestamp: Date.now(),
          operation: 'scene.create',
          entity: 'scene',
          success: false,
          affectedIds: [],
          executionTimeMs: 100
        },
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Scene not found',
          retryable: false
        }
      };
      
      const result = handleUniversalResponse(response, { throwOnError: false });
      expect(result).toBeNull();
    });
    
    it('should call error callback', () => {
      const onError = vi.fn();
      const response: UniversalResponse<null> = {
        data: null,
        meta: {
          requestId: 'REQ123',
          timestamp: Date.now(),
          operation: 'scene.create',
          entity: 'scene',
          success: false,
          affectedIds: [],
          executionTimeMs: 100
        },
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Scene not found',
          retryable: false
        }
      };
      
      try {
        handleUniversalResponse(response, { onError });
      } catch (e) {
        // Expected to throw
      }
      
      expect(onError).toHaveBeenCalledWith(response.error, response);
    });
  });
  
  describe('helper functions', () => {
    const mockResponse: UniversalResponse<any> = {
      data: {},
      meta: {
        requestId: 'REQ123',
        timestamp: Date.now(),
        operation: 'scene.create',
        entity: 'scene',
        success: true,
        affectedIds: [],
        executionTimeMs: 100
      },
      context: {
        reasoning: 'User requested a title scene',
        chatResponse: 'I created a title scene for you',
        suggestions: ['Edit the text', 'Change the colors']
      }
    };
    
    it('should extract suggestions', () => {
      expect(getSuggestions(mockResponse)).toEqual(['Edit the text', 'Change the colors']);
      expect(getSuggestions({ ...mockResponse, context: undefined })).toEqual([]);
    });
    
    it('should extract chat response', () => {
      expect(getChatResponse(mockResponse)).toBe('I created a title scene for you');
      expect(getChatResponse({ ...mockResponse, context: undefined })).toBeUndefined();
    });
    
    it('should extract reasoning', () => {
      expect(getReasoning(mockResponse)).toBe('User requested a title scene');
      expect(getReasoning({ ...mockResponse, context: undefined })).toBeUndefined();
    });
    
    it('should check if error is retryable', () => {
      expect(isRetryableError({ retryable: true })).toBe(true);
      expect(isRetryableError({ retryable: false })).toBe(false);
      expect(isRetryableError({})).toBe(false);
    });
    
    it('should get request ID from error', () => {
      expect(getRequestIdFromError({ requestId: 'REQ123' })).toBe('REQ123');
      expect(getRequestIdFromError({})).toBeUndefined();
    });
    
    it('should format execution time', () => {
      expect(formatExecutionTime(50)).toBe('50ms');
      expect(formatExecutionTime(500)).toBe('500ms');
      expect(formatExecutionTime(1000)).toBe('1.00s');
      expect(formatExecutionTime(2500)).toBe('2.50s');
    });
  });
});

describe('Type Guards', () => {
  it('should identify success responses', () => {
    const successResponse: UniversalResponse<{ id: string }> = {
      data: { id: '123' },
      meta: {
        requestId: 'REQ123',
        timestamp: Date.now(),
        operation: 'scene.create',
        entity: 'scene',
        success: true,
        affectedIds: ['123'],
        executionTimeMs: 100
      }
    };
    
    const errorResponse: UniversalResponse<null> = {
      data: null,
      meta: {
        requestId: 'REQ123',
        timestamp: Date.now(),
        operation: 'scene.create',
        entity: 'scene',
        success: false,
        affectedIds: [],
        executionTimeMs: 100
      },
      error: {
        code: ErrorCode.NOT_FOUND,
        message: 'Not found',
        retryable: false
      }
    };
    
    expect(isSuccessResponse(successResponse)).toBe(true);
    expect(isSuccessResponse(errorResponse)).toBe(false);
  });
  
  it('should identify error responses', () => {
    const successResponse: UniversalResponse<{ id: string }> = {
      data: { id: '123' },
      meta: {
        requestId: 'REQ123',
        timestamp: Date.now(),
        operation: 'scene.create',
        entity: 'scene',
        success: true,
        affectedIds: ['123'],
        executionTimeMs: 100
      }
    };
    
    const errorResponse: UniversalResponse<null> = {
      data: null,
      meta: {
        requestId: 'REQ123',
        timestamp: Date.now(),
        operation: 'scene.create',
        entity: 'scene',
        success: false,
        affectedIds: [],
        executionTimeMs: 100
      },
      error: {
        code: ErrorCode.NOT_FOUND,
        message: 'Not found',
        retryable: false
      }
    };
    
    expect(isErrorResponse(errorResponse)).toBe(true);
    expect(isErrorResponse(successResponse)).toBe(false);
  });
});