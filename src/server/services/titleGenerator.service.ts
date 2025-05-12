import { env } from "~/env";
import OpenAI from "openai";
import logger from "~/lib/logger";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

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
    // Prepare the system prompt
    const systemPrompt = `You are a video project title generator. 
Generate a concise, descriptive title (2-6 words) for a video project based on the user's prompt.
The title should capture the essence of what the video is about.
Do not include words like "Video", "Project", or "Presentation" in the title unless they are essential.
Respond using the tool function only.`;
    
    // Log that we're about to call the LLM
    titleLogger.prompt(contextId, "Sending title generation prompt to LLM", {
      promptLength: prompt.length
    });
    
    const llmStartTime = Date.now();
    
    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: "o4-mini", // Using a smaller model for efficiency
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_video_title",
            description: "Generate a concise, descriptive title for a video project",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string", 
                  description: "The generated title, 2-6 words"
                },
                reasoning: {
                  type: "string",
                  description: "Brief explanation of why this title was chosen"
                }
              },
              required: ["title"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "generate_video_title" } }
    });
    
    const llmDuration = Date.now() - llmStartTime;
    titleLogger.llm(contextId, `Received LLM response in ${llmDuration}ms`, {
      duration: llmDuration,
      model: "o4-mini"
    });
    
    // Extract tool call from the response
    const toolCall = response.choices[0]?.message.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "generate_video_title") {
      titleLogger.error(contextId, "LLM did not return expected tool call", {
        receivedTool: toolCall?.function.name
      });
      // Fallback to default title if we don't get a proper response
      return { title: "New Video Project" };
    }
    
    // Parse the tool call arguments
    let args: { title: string; reasoning?: string };
    try {
      args = JSON.parse(toolCall.function.arguments);
      
      if (!args.title) {
        throw new Error("Title is empty");
      }
    } catch (error) {
      titleLogger.error(contextId, "Failed to parse tool call arguments", { error });
      return { title: "New Video Project" };
    }
    
    // Success - log and return the generated title
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
    
    // Return a fallback title on error
    return { title: "New Video Project" };
  }
} 