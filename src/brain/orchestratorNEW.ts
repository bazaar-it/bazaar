// Simplified & Modular Orchestrator - Decision Only (Sprint 41)

import { ContextBuilder } from "./orchestrator_functions/contextBuilder";
import { IntentAnalyzer } from "./orchestrator_functions/intentAnalyzer";
import type { 
  OrchestrationInput, 
  OrchestrationOutput 
} from "~/lib/types/ai/brain.types";

export class Orchestrator {
  private contextBuilder = new ContextBuilder();
  private intentAnalyzer = new IntentAnalyzer();

  async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
    console.log('\n🧠 [NEW ORCHESTRATOR] === PROCESSING USER INPUT ===');
    console.log('🧠 [NEW ORCHESTRATOR] Input:', {
      prompt: input.prompt,
      projectId: input.projectId,
      hasImages: !!(input.userContext?.imageUrls as string[])?.length,
      sceneCount: input.storyboardSoFar?.length || 0
    });
    
    try {
      // 1. Build context
      console.log('🧠 [NEW ORCHESTRATOR] Step 1: Building context...');
      input.onProgress?.('🧠 Understanding your request...', 'building');
      const contextPacket = await this.contextBuilder.buildContext(input);
      console.log('🧠 [NEW ORCHESTRATOR] Context built successfully');

      // 2. Analyze intent and select tool
      console.log('🧠 [NEW ORCHESTRATOR] Step 2: Analyzing intent...');
      input.onProgress?.('🎯 Choosing the right approach...', 'building');
      const toolSelection = await this.intentAnalyzer.analyzeIntent(input, contextPacket);
      console.log('🧠 [NEW ORCHESTRATOR] Tool selected:', {
        tool: toolSelection.toolName,
        reasoning: toolSelection.reasoning?.substring(0, 100) + '...'
      });

      if (!toolSelection.success) {
        return { 
          success: false, 
          error: toolSelection.error ?? 'Failed to understand request',
          chatResponse: "I couldn't understand your request. Could you please rephrase it?"
        };
      }
      
      // 3. Return decision (NO EXECUTION!)
      console.log('🧠 [NEW ORCHESTRATOR] Decision complete! Returning to router...');
      
      if (!toolSelection.toolName) {
        return {
          success: false,
          error: "No tool selected",
          chatResponse: toolSelection.clarificationQuestion || "I need more information to help you."
        };
      }

      const result = {
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
            targetDuration: toolSelection.targetDuration,
            referencedSceneIds: toolSelection.referencedSceneIds,
            imageUrls: (input.userContext?.imageUrls as string[]) || undefined,
            webContext: contextPacket.webContext,
          },
          workflow: toolSelection.workflow,
        }
      };
      console.log('🧠 [NEW ORCHESTRATOR] === ORCHESTRATION COMPLETE ===\n');
      return result;

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
} from "~/lib/types/ai/brain.types";