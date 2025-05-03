import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

import { OpenAI } from 'openai';

// Simple retry implementation for testing
// In your real code, you would import your actual retry utility
class RetryableError extends Error {
  constructor(message: string, public readonly retryable: boolean = true) {
    super(message);
    this.name = 'RetryableError';
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    initialDelay: number;
    backoffFactor: number;
    shouldRetry?: (error: any) => boolean;
  }
): Promise<T> {
  const { maxRetries, initialDelay, backoffFactor, shouldRetry } = options;
  
  // Default retry check
  const isRetryable = shouldRetry || 
    ((error) => error instanceof RetryableError && error.retryable);
  
  let lastError: any;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt >= maxRetries || !isRetryable(error)) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
  
  // This should never happen, but TypeScript needs it
  throw lastError;
}

// Function to simulate calling LLM with retry
async function callLLMWithRecovery(prompt: string, options = { forceError: false }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });
  
  return withRetry(
    async () => {
      if (options.forceError) {
        throw new RetryableError('OpenAI API rate limit exceeded', true);
      }
      
      return client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }]
      });
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      backoffFactor: 2,
      shouldRetry: (error) => {
        // Check if error is a rate limit error or a temporary server error
        if (error instanceof RetryableError) return error.retryable;
        const errorStr = String(error);
        return errorStr.includes('rate limit') || 
               errorStr.includes('server error') ||
               errorStr.includes('timeout');
      }
    }
  );
}

// Test fallback mechanism
async function generateComponentWithFallback(prompt: string, options = { forceError: false }) {
  try {
    // Try primary code generation model
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });
    
    if (options.forceError) {
      throw new Error('Model unavailable');
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    });
    
    return {
      success: true,
      source: 'primary',
      content: response.choices[0].message.content
    };
  } catch (error) {
    // Fallback to a simpler model
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      });
      
      return {
        success: true,
        source: 'fallback',
        content: response.choices[0].message.content
      };
    } catch (secondError) {
      // Final fallback - return a template
      return {
        success: false,
        source: 'template',
        content: `
// Default template as final fallback
import React from 'react';
import { AbsoluteFill } from 'remotion';

export default function DefaultComponent() {
  return (
    <AbsoluteFill style={{
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 40,
      color: 'white',
    }}>
      Custom Effect
    </AbsoluteFill>
  );
}`
      };
    }
  }
}

describe('LLM Error Recovery', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = new OpenAI({ apiKey: 'mock-key' }) as jest.Mocked<OpenAI>;
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  it('should retry temporary failures with exponential backoff', async () => {
    // Configure mock to fail the first 2 attempts, then succeed
    mockOpenAI.chat.completions.create
      .mockRejectedValueOnce(new RetryableError('Rate limit exceeded', true))
      .mockRejectedValueOnce(new RetryableError('Server error', true))
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Success after retries'
          }
        }]
      } as any);
    
    // Call with retry
    const resultPromise = callLLMWithRecovery('Create a fireworks effect');
    
    // Advance timers to simulate waiting for backoff
    jest.advanceTimersByTime(1000); // First retry after 1000ms
    jest.advanceTimersByTime(2000); // Second retry after 2000ms (backoff)
    
    const result = await resultPromise;
    
    // Verify results
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    expect(result.choices[0].message.content).toBe('Success after retries');
  });
  
  it('should throw after maximum retries', async () => {
    // Configure mock to always fail
    mockOpenAI.chat.completions.create
      .mockRejectedValue(new RetryableError('Rate limit exceeded', true));
    
    // Call with retry
    const resultPromise = callLLMWithRecovery('Create a fireworks effect');
    
    // Advance through all retries
    jest.advanceTimersByTime(1000); // First retry
    jest.advanceTimersByTime(2000); // Second retry (backoff)
    jest.advanceTimersByTime(4000); // Third retry (more backoff)
    
    // Expect it to fail after max retries
    await expect(resultPromise).rejects.toThrow('Rate limit exceeded');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });
  
  it('should not retry non-retryable errors', async () => {
    // Configure mock to fail with non-retryable error
    mockOpenAI.chat.completions.create
      .mockRejectedValueOnce(new RetryableError('Invalid API key', false));
    
    // Call with retry
    const resultPromise = callLLMWithRecovery('Create a fireworks effect');
    
    // Expect immediate failure without retries
    await expect(resultPromise).rejects.toThrow('Invalid API key');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1); // No retries
  });
  
  it('should handle fallback to simpler model when primary fails', async () => {
    // Primary model always fails
    mockOpenAI.chat.completions.create
      .mockImplementationOnce(() => {
        throw new Error('Model unavailable');
      })
      // Fallback model succeeds
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Generated with fallback model'
          }
        }]
      } as any);
    
    const result = await generateComponentWithFallback('Create a fireworks effect', { forceError: true });
    
    expect(result.success).toBe(true);
    expect(result.source).toBe('fallback');
    expect(result.content).toBe('Generated with fallback model');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
  });
  
  it('should fallback to template when all models fail', async () => {
    // Both primary and fallback models fail
    mockOpenAI.chat.completions.create
      .mockImplementationOnce(() => {
        throw new Error('Primary model unavailable');
      })
      .mockImplementationOnce(() => {
        throw new Error('Fallback model unavailable');
      });
    
    const result = await generateComponentWithFallback('Create a fireworks effect', { forceError: true });
    
    expect(result.success).toBe(false);
    expect(result.source).toBe('template');
    expect(result.content).toContain('DefaultComponent');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
  });
}); 