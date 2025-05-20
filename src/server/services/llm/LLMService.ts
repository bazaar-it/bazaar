// src/server/services/llm/LLMService.ts
import type { OpenAI } from 'openai';
import { CHAT_TOOLS } from '~/server/lib/openai/tools';
import { chatLogger, logChatTool } from '~/lib/logger';

export interface StreamOptions {
  model?: string;
  tools?: boolean;
  temperature?: number;
}

/**
 * Service for interacting with OpenAI's API
 */
export class LLMService {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  /**
   * Streams a chat completion from OpenAI
   * 
   * @param messages - Array of messages to send to the API
   * @param options - Optional configuration for the stream
   * @returns A stream of chat completion chunks
   */
  async streamChat(
    messages: OpenAI.Chat.ChatCompletionMessageParam[], 
    options: StreamOptions = {}
  ) {
    const model = options.model || 'o4-mini';
    const useTools = options.tools !== false;
    const temperature = options.temperature ?? 1; // Default to 1 as o4-mini only supports temperature=1

    chatLogger.debug('LLMService', `Creating stream with ${messages.length} messages, model: ${model}`);
    
    return this.client.chat.completions.create({
      model,
      messages,
      stream: true,
      tools: useTools ? CHAT_TOOLS : undefined,
      temperature,
    });
  }

  /**
   * Processes a tool call from an LLM response
   * 
   * @param toolCall - The tool call to process
   * @param messageId - ID of the current message for logging
   * @returns Parsed arguments as an object
   */
  parseToolCallArguments(toolCall: { function: { arguments: string } }, messageId: string): any {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      logChatTool(
        chatLogger,
        messageId, 
        'parseToolCallArguments', 
        `Parsed args`, 
        { args: JSON.stringify(args).substring(0, 100) + (JSON.stringify(args).length > 100 ? '...' : '') }
      );
      return args;
    } catch (e) {
      const errorMessage = `Failed to parse tool call arguments: ${toolCall.function.arguments.substring(0, 100)}...`;
      chatLogger.error(messageId, errorMessage);
      throw new Error(`Invalid JSON in tool call arguments: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
