// src/server/services/__tests__/llm.service.refactored.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { LLMService, type StreamOptions } from '../llm/LLMService';
import type { OpenAI } from 'openai';
import { type Stream } from 'openai/streaming';
import { CHAT_TOOLS } from '~/server/lib/openai/tools';

// Mock the OpenAI SDK
const mockCreate: jest.Mock<
  (params: OpenAI.Chat.ChatCompletionCreateParams) => 
    Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk> | OpenAI.Chat.Completions.ChatCompletion>
> = jest.fn();

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    }),
  };
});

// Helper to create an async iterable of chat completion chunks
async function* createMockChatCompletionChunks(
  deltas: Array<Partial<OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta>>,
  model: string
): AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> {
  let i = 0;
  for (const delta of deltas) {
    // Explicitly construct currentActualDelta to ensure it's of the correct type
    const currentActualDelta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta = {};
    if (delta.role !== undefined) currentActualDelta.role = delta.role;
    if (delta.content !== undefined) currentActualDelta.content = delta.content;
    if (delta.tool_calls !== undefined) currentActualDelta.tool_calls = delta.tool_calls;
    // if (delta.function_call !== undefined) currentActualDelta.function_call = delta.function_call; // Deprecated

    const chunk: OpenAI.Chat.Completions.ChatCompletionChunk = {
      id: `chatcmpl-mock-${Date.now()}-${i}`,
      object: 'chat.completion.chunk' as const,
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: currentActualDelta, // Use the explicitly constructed delta
          finish_reason: i === deltas.length - 1 ? ('stop' as const) : null,
          logprobs: undefined,
        },
      ],
    };
    yield chunk;
    i++;
  }
}

describe('LLMService', () => {
  let llmService: LLMService;
  let mockOpenAIClient: OpenAI;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOpenAIClient = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    } as unknown as OpenAI;
    llmService = new LLMService(mockOpenAIClient);

    // Setup mockImplementation for chat.completions.create
    mockCreate.mockImplementation(
      async (
        params: OpenAI.Chat.ChatCompletionCreateParams
      ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk> | OpenAI.Chat.Completions.ChatCompletion> => {
        if (params.stream) {
          const iterable = createMockChatCompletionChunks([
            { role: 'assistant', content: 'Mocked ' },
            { content: 'stream ' },
            { content: 'response.' },
          ], params.model);
          return iterable as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>;
        }
        // Fallback for non-streaming calls
        return Promise.resolve({
          id: 'chatcmpl-mock-nonstream',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'gpt-mock-model',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Mocked non-stream response' },
              finish_reason: 'stop' as const,
              logprobs: null,
            },
          ],
          usage: { completion_tokens: 10, prompt_tokens: 5, total_tokens: 15 }
        } as OpenAI.Chat.Completions.ChatCompletion);
      }
    );
  });

  describe('streamChat', () => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
    ];

    it('calls OpenAI client with default options', async () => {
      await llmService.streamChat(messages);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'o4-mini',
        messages,
        stream: true,
        tools: CHAT_TOOLS,
        temperature: 0.7,
      });
    });

    it('calls OpenAI client with custom model', async () => {
      const options: StreamOptions = { model: 'gpt-4' };
      await llmService.streamChat(messages, options);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages,
        stream: true,
        tools: CHAT_TOOLS,
        temperature: 0.7,
      });
    });

    it('calls OpenAI client with tools disabled', async () => {
      const options: StreamOptions = { tools: false };
      await llmService.streamChat(messages, options);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'o4-mini',
        messages,
        stream: true,
        tools: undefined,
        temperature: 0.7,
      });
    });

    it('calls OpenAI client with custom temperature', async () => {
      const options: StreamOptions = { temperature: 0.2 };
      await llmService.streamChat(messages, options);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'o4-mini',
        messages,
        stream: true,
        tools: CHAT_TOOLS,
        temperature: 0.2,
      });
    });

    it('calls OpenAI client with all custom options', async () => {
      const options: StreamOptions = { model: 'gpt-3.5-turbo', tools: false, temperature: 0.9 };
      await llmService.streamChat(messages, options);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages,
        stream: true,
        tools: undefined,
        temperature: 0.9,
      });
    });
  });
  
  describe('parseToolCallArguments', () => {
    it('parses valid JSON tool call arguments', () => {
      const result = llmService.parseToolCallArguments(
        { function: { arguments: '{"foo": "bar"}' } },
        'test-message-id-valid-json'
      );
      expect(result).toEqual({ foo: 'bar' });
    });

    it('throws an error for invalid JSON in tool call arguments', () => {
      expect(() => {
        llmService.parseToolCallArguments(
          { function: { arguments: 'invalid json' } },
          'test-message-id-invalid-json'
        );
      }).toThrow(/^Invalid JSON in tool call arguments: Unexpected token i in JSON at position 0$/);
    });
    
    it('throws an error with specific error message from JSON.parse', () => {
        expect(() => {
          llmService.parseToolCallArguments(
            { function: { arguments: '{"foo": "bar",,}' } }, // Extra comma
            'test-message-id-specific-error'
          );
        }).toThrow(/^Invalid JSON in tool call arguments: Unexpected token , in JSON at position \d+$/);
    });
  });
});
