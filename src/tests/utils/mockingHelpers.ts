// /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/tests/utils/mockingHelpers.ts
/**
 * Utility functions for mocking in Jest tests when working with ESM modules
 * This file contains helpers to handle common mocking scenarios in our testing environment
 */

import { jest } from '@jest/globals';
import type { OpenAI } from 'openai';
import type { ChatCompletion } from 'openai/resources';
import type { ZodSchema } from 'zod';

/**
 * Creates a properly typed mock for OpenAI chat completions
 * This avoids TypeScript errors with the nested structure
 */
export function createOpenAIMock() {
  const mockCreateFn = jest.fn();
  
  const mockOpenAI = {
    chat: {
      completions: {
        create: mockCreateFn
      }
    }
  };
  
  // Mock the OpenAI constructor
  jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => mockOpenAI)
  }));
  
  return {
    mockOpenAI,
    mockCreateFn
  };
}

/**
 * Create a mock for the Drizzle ORM database
 * Makes it easier to mock database operations
 */
export function createDrizzleMock(jest: any) {
  const mockDbInsert = jest.fn();
  const mockDbUpdate = jest.fn();
  const mockDbQuery = jest.fn();
  const mockDbSelect = jest.fn();
  const mockDb = {
    insert: mockDbInsert,
    update: mockDbUpdate,
    query: mockDbQuery,
    select: mockDbSelect,
  };

  // For convenience, setup common chaining behavior
  mockDbInsert.mockReturnValue = function(returnValue: any) {
    this.mockImplementation(() => returnValue);
    return this;
  };
  
  mockDbUpdate.mockReturnValue = function(returnValue: any) {
    this.mockImplementation(() => returnValue);
    return this;
  };
  
  return {
    mockDb,
    mockDbInsert,
    mockDbUpdate,
    mockDbQuery,
    mockDbSelect,
  };
}

/**
 * Creates a typed mock for Zod validation
 * Handles both successful validation and validation errors
 */
export function createZodMock<T>() {
  const mockParse = jest.fn();
  const mockSafeParse = jest.fn();
  
  // Default to successful validation
  mockSafeParse.mockReturnValue({
    success: true,
    data: {} as T
  });
  
  const mockSchema = {
    parse: mockParse,
    safeParse: mockSafeParse
  };
  
  return {
    mockSchema,
    mockParse,
    mockSafeParse,
    // Helper to configure schema to fail validation
    mockValidationError: (error: string) => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: new Error(error)
      });
      mockParse.mockImplementation(() => {
        throw new Error(error);
      });
    },
    // Helper to configure schema to pass validation
    mockValidationSuccess: (data: T) => {
      mockSafeParse.mockReturnValue({
        success: true,
        data
      });
      mockParse.mockReturnValue(data);
    }
  };
}

/**
 * Helper for type-safe assertions on mock calls
 * Avoids "Parameter 'X' implicitly has an 'any' type" errors
 */
export function getTypedMockCall<T>(
  mockFn: jest.Mock, 
  callIndex = 0
): T[] {
  return mockFn.mock.calls[callIndex] as T[];
}

/**
 * Creates a properly typed mock for an OpenAI chat completion response
 * with a function call, matching the format of OpenAI's API
 */
export function createOpenAIToolCallResponse<T extends Record<string, any>>(toolName: string, toolContent: T): ChatCompletion {
  // Create a response that mimics OpenAI's response with tool_calls format
  return {
    id: 'chatcmpl-mockId',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: null,
        refusal: null,
        tool_calls: [{
          id: 'call_mockToolCallId',
          type: 'function',
          function: {
            name: toolName,
            arguments: JSON.stringify(toolContent)
          }
        }]
      },
      logprobs: null,
      finish_reason: 'tool_calls'
    }],
    created: Date.now(),
    model: 'gpt-4',
    system_fingerprint: 'fp_mock',
    object: 'chat.completion'
  };
}

/**
 * Creates a mock OpenAI chat completion response with text content
 */
export function createOpenAITextResponse(content: string): ChatCompletion {
  return {
    id: 'chatcmpl-mockId',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: content,
        refusal: null
      },
      logprobs: null,
      finish_reason: 'stop'
    }],
    created: Date.now(),
    model: 'gpt-4',
    system_fingerprint: 'fp_mock',
    object: 'chat.completion'
  };
}
