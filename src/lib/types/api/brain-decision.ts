/**
 * Brain Decision Type
 * Represents the decision made by the brain orchestrator
 * The brain only decides what to do, not how to do it
 */

export interface BrainDecision {
  success: boolean;
  
  // Tool selection
  toolName?: 'addScene' | 'editScene' | 'deleteScene' | 'createSceneFromImage' | 'editSceneWithImage' | 'fixBrokenScene';
  
  // Context for the selected tool
  toolContext?: {
    userPrompt: string;
    targetSceneId?: string;
    editComplexity?: 'surgical' | 'creative' | 'error-fix';
    imageUrls?: string[];
    visionAnalysis?: any;
    layoutJson?: any;
    requestedDurationSeconds?: number;
  };
  
  // Multi-step workflow if needed
  workflow?: Array<{
    toolName: string;
    context: string;
    dependencies?: string[];
    targetSceneId?: string;
  }>;
  
  // Brain's reasoning
  reasoning?: string;
  
  // Chat response to show user immediately
  chatResponse?: string;
  
  // Error if decision failed
  error?: string;
  
  // Clarification needed
  needsClarification?: boolean;
  clarificationQuestion?: string;
  
  // Debug info
  debug?: {
    prompt?: { system: string; user: string };
    response?: string;
    parsed?: any;
  };
}