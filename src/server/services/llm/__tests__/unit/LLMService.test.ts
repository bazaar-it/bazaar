// src/server/services/llm/__tests__/unit/LLMService.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { LLMService } from '../../LLMService';
import { CHAT_TOOLS } from '~/server/lib/openai/tools';
import { chatLogger } from '~/lib/logger';
import type { OpenAI } from 'openai';

// Mock dependencies
jest.mock('~/lib/logger', () => ({
  chatLogger: {
    debug: jest.fn(),
    tool: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('~/server/lib/openai/tools', () => ({
  CHAT_TOOLS: [
    {
      type: 'function',
      function: {
        name: 'testTool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
              description: 'Test parameter',
            },
          },
        },
      },
    },
  ],
}));

describe('LLMService', () => {
  let mockOpenAI: any;
  let llmService: LLMService;

  beforeEach(() => {
    // Create a mock OpenAI client
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            id: 'test-completion-id',
            choices: [
              {
                message: {
                  content: 'Test response',
                  role: 'assistant',
                },
              },
            ],
          }),
        },
      },
    };

    llmService = new LLMService(mockOpenAI);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with the provided OpenAI client', () => {
      expect(llmService).toBeInstanceOf(LLMService);
    });
  });

  describe('streamChat', () => {
    const testMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
    ] as OpenAI.Chat.ChatCompletionMessageParam[];

    it('calls OpenAI API with the correct default parameters', async () => {
      await llmService.streamChat(testMessages);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'o4-mini',
        messages: testMessages,
        stream: true,
        tools: CHAT_TOOLS,
        temperature: 0.7,
      });
      expect(chatLogger.debug).toHaveBeenCalled();
    });

    it('uses custom model when provided', async () => {
      await llmService.streamChat(testMessages, { model: 'gpt-4' });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
        })
      );
    });

    it('uses custom temperature when provided', async () => {
      await llmService.streamChat(testMessages, { temperature: 0.5 });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
        })
      );
    });

    it('disables tools when specified', async () => {
      await llmService.streamChat(testMessages, { tools: false });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: undefined,
        })
      );
    });

    it('logs debug information', async () => {
      await llmService.streamChat(testMessages);

      expect(chatLogger.debug).toHaveBeenCalledWith(
        'LLMService', 
        expect.stringContaining('Creating stream with')
      );
    });

    it('propagates errors from the OpenAI API', async () => {
      const testError = new Error('API error');
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(testError);

      await expect(llmService.streamChat(testMessages)).rejects.toThrow('API error');
    });
  });

  describe('parseToolCallArguments', () => {
    const messageId = 'test-message-id';

    it('parses valid JSON arguments', () => {
      const toolCall = {
        function: {
          arguments: '{"foo":"bar"}',
        },
      };

      const result = llmService.parseToolCallArguments(toolCall, messageId);

      expect(result).toEqual({ foo: 'bar' });
      expect(chatLogger.tool).toHaveBeenCalled();
    });

    it('throws an error for invalid JSON', () => {
      const toolCall = {
        function: {
          arguments: '{invalid:json}',
        },
      };

      expect(() => {
        llmService.parseToolCallArguments(toolCall, messageId);
      }).toThrow('Invalid JSON in tool call arguments');
      
      expect(chatLogger.error).toHaveBeenCalled();
    });

    it('handles empty objects', () => {
      const toolCall = {
        function: {
          arguments: '{}',
        },
      };

      const result = llmService.parseToolCallArguments(toolCall, messageId);

      expect(result).toEqual({});
    });

    it('logs truncated arguments for long JSON strings', () => {
      // Create a long JSON string
      const longObject = { data: 'a'.repeat(200) };
      const toolCall = {
        function: {
          arguments: JSON.stringify(longObject),
        },
      };

      llmService.parseToolCallArguments(toolCall, messageId);

      expect(chatLogger.tool).toHaveBeenCalledWith(
        messageId,
        'parseToolCallArguments',
        'Parsed args',
        expect.objectContaining({
          args: expect.stringContaining('...')
        })
      );
    });
  });
});
