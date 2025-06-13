// Simplified & Modular Orchestrator - Decision Only (Sprint 41)

import { ContextBuilder } from "./orchestrator_functions/contextBuilder";
import { IntentAnalyzer } from "./orchestrator_functions/intentAnalyzer";
import type { 
  OrchestrationInput, 
  OrchestrationOutput 
} from "./orchestrator_functions/types";

export class Orchestrator {
  private contextBuilder = new ContextBuilder();
  private intentAnalyzer = new IntentAnalyzer();

  async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
    try {
      // 1. Build context
      input.onProgress?.('🧠 Understanding your request...', 'building');
      const contextPacket = await this.contextBuilder.buildContext(input);
      console.log('==================== ContextPacket reached:', contextPacket);

      // 2. Analyze intent and select tool
      input.onProgress?.('🎯 Choosing the right approach...', 'building');
      const toolSelection = await this.intentAnalyzer.analyzeIntent(input, contextPacket);
      console.log('==================== ToolSelection reached:', toolSelection);

      if (!toolSelection.success) {
        return { 
          success: false, 
          error: toolSelection.error ?? 'Failed to understand request',
          chatResponse: "I couldn't understand your request. Could you please rephrase it?"
        };
      }
      
      // 3. Return decision (NO EXECUTION!)
      return {
        success: true,
        toolUsed: toolSelection.toolName,
        reasoning: toolSelection.reasoning,
        chatResponse: toolSelection.userFeedback || toolSelection.reasoning, // Use AI-generated feedback
        // Pass along the tool selection details for execution in generation.ts
        result: {
          toolName: toolSelection.toolName,
          toolContext: {
            userPrompt: input.prompt,
            targetSceneId: toolSelection.targetSceneId,
            editComplexity: toolSelection.editComplexity,
            imageUrls: (input.userContext?.imageUrls as string[]) || undefined,
            requestedDurationSeconds: toolSelection.requestedDurationSeconds,
          },
          workflow: toolSelection.workflow,
        }
      };

    } catch (error) {
      console.error('[Orchestrator] Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        chatResponse: "I encountered an issue processing your request. Please try again."
      };
    }
  }

}

// Singleton export
export const orchestrator = new Orchestrator();

// Export types for external use
export type { 
  OrchestrationInput, 
  OrchestrationOutput 
} from "./orchestrator_functions/types";