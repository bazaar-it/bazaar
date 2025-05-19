// src/server/services/llm/LLMService.ts
import type { OpenAI } from 'openai';
import { CHAT_TOOLS } from '~/server/lib/openai/tools';

export class LLMService {
  private client: OpenAI;
  constructor(client: OpenAI) {
    this.client = client;
  }

  async streamChat(messages: OpenAI.Chat.ChatCompletionMessageParam[]) {
    return this.client.chat.completions.create({
      model: 'o4-mini',
      messages,
      stream: true,
      tools: CHAT_TOOLS,
    });
  }
}
