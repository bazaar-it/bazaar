// src/server/services/brain/orchestrator_functions/toolSelector.ts
// Selects the appropriate tool based on intent

import type { ProjectContext } from './types';
import type { AnalyzedIntent } from '~/lib/types/api/brain-contracts';

export type ToolName = 'addScene' | 'editScene' | 'deleteScene' | 'clarification';

interface ToolSelection {
  tool: ToolName;
  confidence: number;
  reasoning: string;
}

class ToolSelector {
  select(intent: AnalyzedIntent, context: ProjectContext): ToolSelection {
    // Simple mapping from intent to tool
    switch (intent.type) {
      case 'create':
        return {
          tool: 'addScene',
          confidence: intent.confidence,
          reasoning: 'User wants to create a new scene'
        };
        
      case 'edit':
        return {
          tool: 'editScene',
          confidence: intent.confidence,
          reasoning: this.getEditReasoning(intent)
        };
        
      case 'delete':
        return {
          tool: 'deleteScene',
          confidence: intent.confidence,
          reasoning: 'User wants to remove a scene'
        };
        
      case 'ambiguous':
        return {
          tool: 'clarification',
          confidence: intent.confidence,
          reasoning: 'Request needs clarification'
        };
        
      default:
        // Fallback based on context
        if (context.scenes.length === 0) {
          return {
            tool: 'addScene',
            confidence: 0.7,
            reasoning: 'No scenes exist, defaulting to creation'
          };
        }
        
        return {
          tool: 'editScene',
          confidence: 0.5,
          reasoning: 'Unclear intent, defaulting to edit'
        };
    }
  }
  
  private getEditReasoning(intent: AnalyzedIntent): string {
    switch (intent.editType) {
      case 'surgical':
        return `Surgical edit: ${intent.specificChange || 'Make minimal targeted change'}`;
      case 'creative':
        return 'Creative enhancement: Improve visual design and aesthetics';
      case 'fix':
        return 'Fix errors: Correct broken functionality or syntax';
      case 'duration':
        return `Change duration to ${intent.durationSeconds} seconds`;
      default:
        return 'Modify existing scene';
    }
  }
  
  // Check if multiple tools are needed (future enhancement)
  needsMultipleTools(prompt: string, context: ProjectContext): boolean {
    const indicators = [
      'and then',
      'after that',
      'followed by',
      'next',
      'also'
    ];
    
    return indicators.some(indicator => 
      prompt.toLowerCase().includes(indicator)
    );
  }
}

// Export singleton instance
export const toolSelector = new ToolSelector();