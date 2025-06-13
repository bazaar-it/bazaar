// Simplified & Modular Orchestrator

import { ContextBuilder } from "./orchestrator_functions/contextBuilder";
import { IntentAnalyzer } from "./orchestrator_functions/intentAnalyzer";
import { ToolExecutor } from "./orchestrator_functions/toolExecutor";
import type { 
  OrchestrationInput, 
  OrchestrationOutput 
} from "./orchestrator_functions/types";

export class Orchestrator {
  private contextBuilder = new ContextBuilder();
  private intentAnalyzer = new IntentAnalyzer();
  private toolExecutor = new ToolExecutor();

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
          error: toolSelection.error ?? 'Failed to understand request' 
        };
      }

      // 3. Execute selected tool(s)
      const result = await this.toolExecutor.executeTools(input, toolSelection, contextPacket);

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
} from "./orchestrator_functions/types";