import { z } from "zod";
import { BaseMCPTool } from "./base";
import { conversationalResponseService } from "~/server/services/conversationalResponse.service";

const askSpecifyInputSchema = z.object({
  userPrompt: z.string().describe("User's ambiguous request"),
  ambiguityType: z.enum(['scene-selection', 'action-unclear', 'parameter-missing', 'duration_intent']).describe("Type of clarification needed"),
  availableScenes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    number: z.number().optional()
  })).optional().describe("Available scenes for context"),
  projectId: z.string().describe("Project ID for context"),
  context: z.record(z.any()).optional().describe("Additional context for clarification"),
});

type AskSpecifyInput = z.infer<typeof askSpecifyInputSchema>;

interface AskSpecifyOutput {
  clarificationQuestion: string;
  ambiguityType: string;
  availableOptions?: string[];
  reasoning: string;
  chatResponse?: string; // NEW: Conversational response for user
}

export class AskSpecifyTool extends BaseMCPTool<AskSpecifyInput, AskSpecifyOutput> {
  name = "askSpecify";
  description = "Ask for clarification when user request is ambiguous. Use when you need more information to proceed.";
  inputSchema = askSpecifyInputSchema;
  
  protected async execute(input: AskSpecifyInput): Promise<AskSpecifyOutput> {
    const { userPrompt, ambiguityType, availableScenes, projectId, context } = input;

    try {
      // Generate specific clarification question
      const clarificationQuestion = await conversationalResponseService.generateClarificationQuestion({
        userPrompt,
        availableScenes,
        ambiguityType,
        context
      });

      // Generate conversational response for user (same as clarification in this case)
      const chatResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'askSpecify',
        userPrompt,
        result: {
          ambiguityType,
          clarificationQuestion
        },
        context: {
          sceneCount: availableScenes?.length || 0,
          availableScenes: availableScenes || [],
          projectId
        }
      });

      // Extract available options based on ambiguity type
      let availableOptions: string[] | undefined;
      if (ambiguityType === 'scene-selection' && availableScenes) {
        availableOptions = availableScenes.map(scene => 
          `Scene ${scene.number || scene.id}: ${scene.name}`
        );
      } else if (ambiguityType === 'duration_intent') {
        availableOptions = [
          "Option 1: Change total scene duration (trim/extend the scene)",
          "Option 2: Speed up/slow down animations (keep same duration)", 
          "Option 3: Both duration and animation speed changes"
        ];
      }

      return {
        clarificationQuestion,
        ambiguityType,
        availableOptions,
        reasoning: `Need clarification: ${ambiguityType}`,
        chatResponse // NEW: Include conversational response
      };
    } catch (error) {
      console.error("[AskSpecify] Error:", error);
      
      // Fallback clarification question
      const fallbackQuestion = this.getFallbackQuestion(ambiguityType, availableScenes);
      
      return {
        clarificationQuestion: fallbackQuestion,
        ambiguityType,
        reasoning: "Generated fallback clarification question",
        chatResponse: fallbackQuestion // Use same as clarification for fallback
      };
    }
  }

  /**
   * Get fallback clarification questions when service fails
   */
  private getFallbackQuestion(ambiguityType: string, availableScenes?: Array<{ id: string; name: string; number?: number }>): string {
    switch (ambiguityType) {
      case 'scene-selection':
        if (availableScenes && availableScenes.length > 0) {
          return `Which scene are you referring to? I see ${availableScenes.map(s => `Scene ${s.number || s.id}`).join(' and ')}.`;
        }
        return "Which scene would you like me to work with?";
      
      case 'action-unclear':
        return "What would you like me to do exactly?";
      
      case 'parameter-missing':
        return "Could you provide more details about what you'd like me to change?";
      
      case 'duration_intent':
        return "When you mention changing the duration, do you want to:\n1. Change the total scene length (trim/extend)\n2. Speed up/slow down the animations (same duration)\n3. Both duration and animation timing?\n\nPlease specify which option you prefer.";
      
      default:
        return "Could you please clarify what you'd like me to do?";
    }
  }
}

export const askSpecifyTool = new AskSpecifyTool(); 