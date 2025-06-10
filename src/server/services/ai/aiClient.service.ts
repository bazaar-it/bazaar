// src/server/services/ai/aiClient.service.ts

import 'openai/shims/node';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { ModelConfig, ModelProvider } from '~/config/models.config';
import type { SystemPromptConfig } from '~/config/prompts.config';

// =============================================================================
// AI CLIENT FACTORY
// =============================================================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIClientOptions {
  responseFormat?: { type: "json_object" };
}

export class AIClientService {
  private static openaiClient: OpenAI | null = null;
  private static anthropicClient: Anthropic | null = null;

  // Initialize clients lazily
  private static getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openaiClient;
  }

  private static getAnthropicClient(): Anthropic {
    if (!this.anthropicClient) {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.anthropicClient;
  }

  // =============================================================================
  // MAIN API METHOD
  // =============================================================================

  public static async generateResponse(
    config: ModelConfig,
    messages: AIMessage[],
    systemPrompt?: SystemPromptConfig,
    options?: AIClientOptions
  ): Promise<AIResponse> {
    // Add system prompt if provided
    const fullMessages = systemPrompt 
      ? [systemPrompt, ...messages.filter(m => m.role !== 'system')]
      : messages;

    switch (config.provider) {
      case 'openai':
        return this.callOpenAI(config, fullMessages, options);
      
      case 'anthropic':
        return this.callAnthropic(config, fullMessages);
      
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  // =============================================================================
  // OPENAI IMPLEMENTATION
  // =============================================================================

  private static async callOpenAI(config: ModelConfig, messages: AIMessage[], options?: AIClientOptions): Promise<AIResponse> {
    const client = this.getOpenAIClient();
    
    try {
      // Handle O1 models (different API structure)
      const isO1Model = config.model.includes('o1');
      
      if (isO1Model) {
        // O1 models don't support temperature and have different message structure
        const response = await client.chat.completions.create({
          model: config.model,
          messages: messages.map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role,
            content: msg.content
          })) as any,
          max_completion_tokens: config.maxTokens,
        });

        return {
          content: response.choices[0]?.message?.content || '',
          usage: {
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            totalTokens: response.usage?.total_tokens,
          }
        };
      } else {
        // Standard GPT models
        const response = await client.chat.completions.create({
          model: config.model,
          messages: messages as any,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens,
          ...(options?.responseFormat && { response_format: options.responseFormat }),
        });

        return {
          content: response.choices[0]?.message?.content || '',
          usage: {
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            totalTokens: response.usage?.total_tokens,
          }
        };
      }
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // ANTHROPIC IMPLEMENTATION
  // =============================================================================

  private static async callAnthropic(config: ModelConfig, messages: AIMessage[]): Promise<AIResponse> {
    const client = this.getAnthropicClient();
    
    try {
      // Anthropic has different message structure - system message is separate
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // 🚨 CRITICAL: Anthropic doesn't support vision - ensure text-only content
      const textOnlyMessages = conversationMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: typeof msg.content === 'string' 
          ? msg.content 
          : Array.isArray(msg.content) 
            ? msg.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
            : String(msg.content)
      }));

      const response = await client.messages.create({
        model: config.model,
        system: typeof systemMessage?.content === 'string' ? systemMessage.content : undefined,
        messages: textOnlyMessages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 4096,
      });

      const content = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('');

      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        }
      };
    } catch (error) {
      console.error('Anthropic API Error:', error);
      throw new Error(`Anthropic API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =============================================================================
  // VISION API SUPPORT
  // =============================================================================

  /**
   * Generate response with vision support (images + text)
   * Now supports both OpenAI and Claude vision models
   */
  public static async generateVisionResponse(
    config: ModelConfig,
    content: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    }>,
    systemPrompt?: string,
    options?: AIClientOptions
  ): Promise<AIResponse> {
    switch (config.provider) {
      case 'openai':
        return this.callOpenAIVision(config, content, systemPrompt, options);
      case 'anthropic':
        return this.callAnthropicVision(config, content, systemPrompt);
      default:
        throw new Error(`Vision API not supported for provider: ${config.provider}`);
    }
  }

  /**
   * OpenAI Vision API implementation
   */
  private static async callOpenAIVision(
    config: ModelConfig,
    content: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    }>,
    systemPrompt?: string,
    options?: AIClientOptions
  ): Promise<AIResponse> {
    const client = this.getOpenAIClient();
    
    try {
      const messages: any[] = [];
      
      // Add system message if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // Add user message with vision content
      messages.push({
        role: 'user',
        content: content
      });

      const response = await client.chat.completions.create({
        model: config.model,
        messages: messages,
        temperature: config.temperature ?? 0.4,
        max_tokens: config.maxTokens ?? 4000,
        ...(options?.responseFormat && { response_format: options.responseFormat }),
      });

      return {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        }
      };
    } catch (error) {
      console.error('OpenAI Vision API Error:', error);
      throw new Error(`OpenAI Vision API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claude Vision API implementation (NEW)
   * Claude 3.5 Haiku and Sonnet support vision
   */
  private static async callAnthropicVision(
    config: ModelConfig,
    content: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    }>,
    systemPrompt?: string
  ): Promise<AIResponse> {
    const client = this.getAnthropicClient();
    
    try {
      // Convert OpenAI vision format to Claude format
      const claudeContent = content.map(item => {
        if (item.type === 'text') {
          return {
            type: 'text' as const,
            text: item.text || ''
          };
        } else if (item.type === 'image_url' && item.image_url?.url) {
          return {
            type: 'image' as const,
            source: {
              type: 'url' as const,
              url: item.image_url.url
            }
          };
        }
        return null;
      }).filter(Boolean);

      const response = await client.messages.create({
        model: config.model,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: claudeContent as any
        }],
        temperature: config.temperature ?? 0.4,
        max_tokens: config.maxTokens ?? 4000,
      });

      const responseContent = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('');

      return {
        content: responseContent,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        }
      };
    } catch (error) {
      console.error('Claude Vision API Error:', error);
      throw new Error(`Claude Vision API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method for image-to-code generation
   */
  public static async generateCodeFromImages(
    config: ModelConfig,
    imageUrls: string[],
    prompt: string,
    systemPrompt?: string
  ): Promise<AIResponse> {
    const content = [
      { type: 'text' as const, text: prompt },
      ...imageUrls.map(url => ({
        type: 'image_url' as const,
        image_url: {
          url,
          detail: 'high' as const
        }
      }))
    ];

    return this.generateVisionResponse(config, content, systemPrompt);
  }

  // =============================================================================
  // CONVENIENCE METHODS
  // =============================================================================

  public static async generateCompletion(
    config: ModelConfig,
    userPrompt: string,
    systemPrompt?: SystemPromptConfig
  ): Promise<string> {
    const messages: AIMessage[] = [
      { role: 'user', content: userPrompt }
    ];

    const response = await this.generateResponse(config, messages, systemPrompt);
    return response.content;
  }

  public static async generateWithContext(
    config: ModelConfig,
    userPrompt: string,
    context: string,
    systemPrompt?: SystemPromptConfig
  ): Promise<string> {
    const messages: AIMessage[] = [
      { role: 'user', content: context },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.generateResponse(config, messages, systemPrompt);
    return response.content;
  }

  // =============================================================================
  // DEVELOPMENT HELPERS
  // =============================================================================

  public static logModelUsage(config: ModelConfig, usage?: AIResponse['usage']) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🤖 AI Call: ${config.provider}/${config.model}`);
      if (usage) {
        console.log(`📊 Tokens: ${usage.totalTokens} (${usage.promptTokens} + ${usage.completionTokens})`);
      }
    }
  }
}

// =============================================================================
// LEGACY COMPATIBILITY HELPERS
// =============================================================================

// Helper to create OpenAI-compatible client for existing code
export function createLegacyOpenAIClient(config: ModelConfig): {
  chat: {
    completions: {
      create: (params: any) => Promise<any>;
    };
  };
} {
  return {
    chat: {
      completions: {
        create: async (params: any) => {
          const messages: AIMessage[] = params.messages;
          const systemMessage = messages.find(m => m.role === 'system');
          const userMessages = messages.filter(m => m.role !== 'system');

          const response = await AIClientService.generateResponse(
            config,
            userMessages,
            systemMessage as SystemPromptConfig
          );

          // Return OpenAI-compatible format
          return {
            choices: [{
              message: {
                content: response.content
              }
            }],
            usage: {
              prompt_tokens: response.usage?.promptTokens,
              completion_tokens: response.usage?.completionTokens,
              total_tokens: response.usage?.totalTokens,
            }
          };
        }
      }
    }
  };
}
