// src/server/services/brain/orchestrator.simplified.ts
// Simplified Brain Orchestrator - ~100 lines of pure decision logic

import { contextBuilder } from './orchestrator_functions/contextBuilder';
import { intentAnalyzer } from './orchestrator_functions/intentAnalyzer';
import { toolSelector } from './orchestrator_functions/toolSelector';
import { contextPreparer } from './orchestrator_functions/contextPreparer';
import type { BrainInput } from './orchestrator_functions/types';
import type { 
  BrainDecision, 
  AnalyzedIntent,
  AddSceneContext,
  EditSceneContext,
  DeleteSceneContext
} from '~/lib/types/api/brain-contracts';

/**
 * Simplified Brain Orchestrator
 * 
 * Responsibilities:
 * 1. Get context (chat, scenes, preferences)
 * 2. Understand user intent
 * 3. Choose appropriate tool(s)
 * 4. Prepare tool-specific context
 * 
 * Does NOT:
 * - Execute tools
 * - Update database
 * - Manage state
 * - Handle responses
 */
export class BrainOrchestrator {
  async orchestrate(input: BrainInput): Promise<BrainDecision> {
    console.log('[Brain] Starting orchestration for:', {
      prompt: input.prompt.substring(0, 100),
      projectId: input.projectId,
      hasImages: !!input.imageUrls?.length
    });

    try {
      // 1. Get context (with smart caching)
      const context = await contextBuilder.getContext(input.projectId, {
        includeChat: true,
        includeStoryboard: true,
        includePreferences: true,
        forceRefresh: input.forceRefresh
      });

      console.log('[Brain] Context loaded:', {
        scenes: context.scenes.length,
        messages: context.chatHistory.length
      });

      // 2. Analyze user intent
      // Try quick detection first for common patterns
      let intent = intentAnalyzer.quickDetect(input.prompt, context);
      
      if (!intent) {
        // Fall back to AI analysis for complex requests
        intent = await intentAnalyzer.analyze(input.prompt, context);
      }

      // Add image URLs to intent if present
      if (input.imageUrls?.length) {
        intent.imageUrls = input.imageUrls;
      }

      // Override target scene if explicitly selected
      if (input.selectedSceneId) {
        intent.targetSceneId = input.selectedSceneId;
      }

      console.log('[Brain] Intent analyzed:', {
        type: intent.type,
        editType: intent.editType,
        confidence: intent.confidence
      });

      // 3. Select appropriate tool
      const toolSelection = toolSelector.select(intent, context);

      console.log('[Brain] Tool selected:', toolSelection.tool);

      // 4. Prepare tool-specific context
      const toolContext = await contextPreparer.prepareToolContext(
        toolSelection.tool,
        intent,
        context,
        input.imageUrls
      );

      // Generate human-readable reasoning
      const reasoning = contextPreparer.generateReasoning(
        toolSelection.tool,
        intent,
        context
      );

      // Build properly typed decision based on tool
      const decision = this.buildTypedDecision(
        toolSelection.tool,
        toolContext,
        reasoning,
        intent,
        Math.min(intent.confidence, toolSelection.confidence)
      );

      console.log('[Brain] Decision made:', {
        tool: decision.tool,
        reasoning: decision.reasoning,
        confidence: decision.confidence
      });

      return decision;

    } catch (error) {
      console.error('[Brain] Orchestration failed:', error);
      
      // Fallback decision
      return {
        tool: 'addScene',
        reasoning: 'Creating a new scene',
        context: {
          tool: 'addScene',
          projectId: input.projectId,
          prompt: input.prompt,
          imageUrls: input.imageUrls
        },
        intent: {
          type: 'create',
          confidence: 0.5
        },
        confidence: 0.5
      };
    }
  }

  // Clear cache for a project (useful after major changes)
  clearCache(projectId: string): void {
    contextBuilder.clearProjectCache(projectId);
  }

  // Build properly typed decision with discriminated union
  private buildTypedDecision(
    tool: string,
    context: any,
    reasoning: string,
    intent: AnalyzedIntent,
    confidence: number
  ): BrainDecision {
    switch (tool) {
      case 'addScene':
        return {
          tool: 'addScene',
          context: context as AddSceneContext,
          reasoning,
          confidence
        };
      
      case 'editScene':
        return {
          tool: 'editScene',
          context: context as EditSceneContext,
          reasoning,
          confidence
        };
      
      case 'deleteScene':
        return {
          tool: 'deleteScene',
          context: context as DeleteSceneContext,
          reasoning,
          confidence
        };
      
      case 'clarification':
        return {
          tool: 'clarification',
          context: {
            question: intent.clarificationNeeded || 'Could you clarify what you want to do?',
            suggestions: intent.possibleInterpretations
          },
          reasoning,
          confidence
        };
      
      default:
        // Fallback to add scene if unknown
        return {
          tool: 'addScene',
          context: {
            projectId: context.projectId || '',
            prompt: context.prompt || '',
            imageUrls: context.imageUrls
          },
          reasoning: 'Defaulting to scene creation',
          confidence: 0.5
        };
    }
  }
}

// Export singleton instance
export const brainOrchestrator = new BrainOrchestrator();