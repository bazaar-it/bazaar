// src/server/services/ai/titleGenerator.service.ts
import logger from '~/lib/utils/logger';
import { AIClientService, type AIMessage } from '~/server/services/ai/aiClient.service';
import { getModel } from '~/config/models.config';
import { getSystemPrompt } from '~/config/prompts.config';

// Create a logger for title generation
const titleLogger = {
  start: (contextId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[TITLE:START][CTX:${contextId}] ${message}`, { ...meta, titleGenerator: true });
  },
  prompt: (contextId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[TITLE:PROMPT][CTX:${contextId}] ${message}`, { ...meta, titleGenerator: true });
  },
  llm: (contextId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[TITLE:LLM][CTX:${contextId}] ${message}`, { ...meta, titleGenerator: true });
  },
  error: (contextId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[TITLE:ERROR][CTX:${contextId}] ${message}`, { ...meta, titleGenerator: true });
  },
  success: (contextId: string, message: string, meta: Record<string, any> = {}) => {
    logger.info(`[TITLE:SUCCESS][CTX:${contextId}] ${message}`, { ...meta, titleGenerator: true });
  }
};

// Type definition for title generation parameters
export interface TitleGenerationParams {
  prompt: string;
  contextId?: string; // Project ID or other identifier for logging
}

// Type definition for title generation response
export interface TitleGenerationResponse {
  title: string;
  reasoning?: string;
}

/**
 * Generate a concise, descriptive video project title based on the user's initial prompt
 * using LLM capabilities.
 *
 * @param params The parameters for title generation
 * @returns A promise resolving to the generated title
 */
export async function generateTitle(
  params: TitleGenerationParams
): Promise<TitleGenerationResponse> {
  const { prompt, contextId = "unknown" } = params;
  const startTime = Date.now();
  
  titleLogger.start(contextId, `Generating title for prompt: "${prompt.substring(0, 50)}..."`);

  try {
    // Use centralized model and prompt configuration
    const titleModelConfig = getModel('titleGenerator');
    const systemPromptConfig = getSystemPrompt('TITLE_GENERATOR');

    titleLogger.prompt(contextId, "Sending title generation prompt to LLM", {
      promptLength: prompt.length,
      model: `${titleModelConfig.provider}/${titleModelConfig.model}`
    });
    
    const llmStartTime = Date.now();

    const messages: AIMessage[] = [
      { role: "user", content: prompt }
    ];

    const aiResponse = await AIClientService.generateResponse(
      titleModelConfig,
      messages,
      systemPromptConfig,
      { responseFormat: { type: "json_object" } }
    );
    
    const llmDuration = Date.now() - llmStartTime;
    titleLogger.llm(contextId, `Received LLM response in ${llmDuration}ms`, {
      duration: llmDuration,
      model: titleModelConfig.model,
      usage: aiResponse.usage
    });
    
    let args: { title: string; reasoning?: string };
    try {
      if (!aiResponse.content) {
        throw new Error("LLM response content is empty.");
      }
      args = JSON.parse(aiResponse.content);
      
      if (!args.title || typeof args.title !== 'string' || args.title.trim() === "") {
        throw new Error("Parsed title is empty, not a string, or invalid.");
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      titleLogger.error(contextId, "Failed to parse LLM JSON response or invalid format", { 
        error: errMessage,
        responseContent: aiResponse.content 
      });
      return { title: "New Video Project" }; // Fallback
    }
    
    const duration = Date.now() - startTime;
    titleLogger.success(contextId, `Title generated in ${duration}ms: "${args.title}"`, {
      title: args.title,
      duration,
      hasReasoning: !!args.reasoning
    });
    
    return {
      title: args.title,
      reasoning: args.reasoning
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    titleLogger.error(contextId, `Failed to generate title: ${errorMessage}`, { error });
    
    return { title: "New Video Project" }; // Fallback
  }
} 