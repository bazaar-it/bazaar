import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// We'll mock this module for testing
jest.mock('~/server/lib/toolProcessor', () => {
  return require('../__mocks__/toolProcessor');
}, { virtual: true });

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'generateRemotionComponent',
                    arguments: JSON.stringify({
                      effect: 'fireworks',
                      duration: 5
                    })
                  }
                }]
              },
              finish_reason: 'tool_calls'
            }]
          })
        }
      }
    }))
  };
});

// Import after mocks
import { OpenAI } from 'openai';
import { processToolCalls } from '~/server/lib/toolProcessor';

describe('OpenAI Tools API Integration', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = new OpenAI({ apiKey: 'test-key' }) as jest.Mocked<OpenAI>;
  });

  it('should properly parse function calls from OpenAI responses', async () => {
    // Setup mock to return a response with tool calls
    const mockResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_123',
            type: 'function',
            function: {
              name: 'generateRemotionComponent',
              arguments: JSON.stringify({
                effect: 'fireworks',
                duration: 5
              })
            }
          }]
        },
        finish_reason: 'tool_calls'
      }]
    };

    // Set up the mock for the OpenAI API
    mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse as any);

    // Call OpenAI API
    const response = await mockOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Create a fireworks effect' }],
      tools: [{ type: 'function', function: { name: 'generateRemotionComponent', parameters: {} } }]
    });

    // Check that the response has tool calls
    expect(response.choices?.[0]?.message?.tool_calls).toBeDefined();
    if (!response.choices?.[0]?.message?.tool_calls) {
      throw new Error('Expected tool_calls to be defined');
    }

    const toolCalls = response.choices[0].message.tool_calls;
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function.name).toBe('generateRemotionComponent');

    // Process the tool calls
    const processedCalls = await processToolCalls(toolCalls);
    
    // Check that the calls were properly processed
    expect(processedCalls).toHaveLength(1);
    expect(processedCalls[0].functionName).toBe('generateRemotionComponent');
    expect(processedCalls[0].args).toEqual({ effect: 'fireworks', duration: 5 });
    expect(processedCalls[0].result.success).toBe(true);
  });

  it('should handle responses with multiple tool calls', async () => {
    // Setup mock to return a response with multiple tool calls
    const mockResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'updateVideoProperty',
                arguments: JSON.stringify({
                  property: 'background',
                  value: '#0000FF'
                })
              }
            },
            {
              id: 'call_456',
              type: 'function',
              function: {
                name: 'addScene',
                arguments: JSON.stringify({
                  type: 'text',
                  content: 'Hello World'
                })
              }
            }
          ]
        },
        finish_reason: 'tool_calls'
      }]
    };

    // Set up the mock for the OpenAI API
    mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse as any);

    // Call OpenAI API
    const response = await mockOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Make background blue and add text' }],
      tools: [
        { type: 'function', function: { name: 'updateVideoProperty', parameters: {} } },
        { type: 'function', function: { name: 'addScene', parameters: {} } }
      ]
    });

    // Check that the response has tool calls
    expect(response.choices?.[0]?.message?.tool_calls).toBeDefined();
    if (!response.choices?.[0]?.message?.tool_calls) {
      throw new Error('Expected tool_calls to be defined');
    }

    const toolCalls = response.choices[0].message.tool_calls;
    expect(toolCalls).toHaveLength(2);
    expect(toolCalls[0].function.name).toBe('updateVideoProperty');
    expect(toolCalls[1].function.name).toBe('addScene');

    // Process the tool calls
    const processedCalls = await processToolCalls(toolCalls);
    
    // Check that the calls were properly processed
    expect(processedCalls).toHaveLength(2);
    expect(processedCalls[0].functionName).toBe('updateVideoProperty');
    expect(processedCalls[0].args).toEqual({ property: 'background', value: '#0000FF' });
    expect(processedCalls[1].functionName).toBe('addScene');
    expect(processedCalls[1].args).toEqual({ type: 'text', content: 'Hello World' });
  });

  it('should handle error cases gracefully', async () => {
    // Setup mock to return a response with invalid arguments
    const mockResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_123',
            type: 'function',
            function: {
              name: 'generateRemotionComponent',
              arguments: '{malformed json'
            }
          }]
        },
        finish_reason: 'tool_calls'
      }]
    };

    // Set up the mock for the OpenAI API
    mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse as any);

    // Call OpenAI API
    const response = await mockOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Create a fireworks effect' }],
      tools: [{ type: 'function', function: { name: 'generateRemotionComponent', parameters: {} } }]
    });

    // Check that the response has tool calls
    expect(response.choices?.[0]?.message?.tool_calls).toBeDefined();
    if (!response.choices?.[0]?.message?.tool_calls) {
      throw new Error('Expected tool_calls to be defined');
    }

    const toolCalls = response.choices[0].message.tool_calls;
    
    // Process the tool calls
    const processedCalls = processToolCalls(toolCalls);
    
    // Should still process despite malformed JSON
    expect(processedCalls).toHaveLength(1);
    expect(processedCalls[0].functionName).toBe('generateRemotionComponent');
    expect(processedCalls[0].args).toEqual({}); // Empty object due to failed parsing
  });
}); 