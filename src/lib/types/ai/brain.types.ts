/**
 * Brain/AI Types - Consolidated
 * Single source of truth for all AI/orchestration related types
 * 
 * IMPORTANT: We use simple, flat architecture - no complexity types
 * Field names MUST match database: tsxCode (not code), name (not sceneName)
 */

// ============================================================================
// TOOL NAMES - Only the 4 actual tools we have
// ============================================================================

export type ToolName = 'addScene' | 'editScene' | 'deleteScene' | 'trimScene';

// ============================================================================
// TOOL TO OPERATION MAPPING - Single source of truth
// ============================================================================

export const TOOL_OPERATION_MAP = {
  addScene: 'scene.create',
  editScene: 'scene.update',
  trimScene: 'scene.update',
  deleteScene: 'scene.delete'
} as const;

export type ToolOperationType = typeof TOOL_OPERATION_MAP[ToolName];

// ============================================================================
// BRAIN DECISION - What the orchestrator returns
// ============================================================================

export interface BrainDecision {
  success: boolean;
  
  // Tool selection
  toolName?: ToolName;
  
  // Context for the selected tool
  toolContext?: {
    userPrompt: string;
    targetSceneId?: string;
    targetDuration?: number; // For trim operations
    imageUrls?: string[];
    visionAnalysis?: any;
    errorDetails?: string;
  };
  
  // Brain's reasoning
  reasoning?: string;
  
  // Chat response to show user
  chatResponse?: string;
  
  // Error if decision failed
  error?: string;
  
  // Clarification needed
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

// ============================================================================
// ORCHESTRATION TYPES
// ============================================================================

export interface OrchestrationInput {
  prompt: string;
  projectId: string;
  userId: string;
  userContext?: Record<string, unknown>;
  storyboardSoFar?: Array<{
    id: string;
    name: string;
    duration: number;
    order: number;
    tsxCode: string;
  }>;
  chatHistory?: Array<{role: string, content: string}>;
  onProgress?: (stage: string, status: string) => void;
}

export interface OrchestrationOutput {
  success: boolean;
  result?: {
    toolName: ToolName;
    toolContext: BrainDecision['toolContext'];
  };
  reasoning?: string;
  error?: string;
  chatResponse?: string;
}

// ============================================================================
// CONTEXT PACKET - What context builder creates
// ============================================================================

export interface ContextPacket {
  userPreferences: Record<string, string>;
  sceneHistory: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  conversationContext: string;
  sceneList?: Array<{
    id: string;
    name: string;
  }>;
  imageContext?: {
    conversationImages: Array<{
      position: number;
      userPrompt: string;
      imageCount: number;
      imageUrls: string[];
    }>;
  };
}

// ============================================================================
// TOOL SELECTION RESULT - Internal use by intent analyzer
// ============================================================================

export interface ToolSelectionResult {
  success: boolean;
  toolName?: ToolName;
  targetSceneId?: string;
  targetDuration?: number; // For trim operations - exact frame count
  reasoning?: string;
  error?: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  userFeedback?: string;
  requestedDurationSeconds?: number;
  workflow?: Array<any>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidToolName(value: string): value is ToolName {
  return ['addScene', 'editScene', 'deleteScene', 'trimScene'].includes(value);
}