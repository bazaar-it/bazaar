//src/lib/types/brain.types.ts

// =============================================================================
// BRAIN ORCHESTRATOR TYPE DEFINITIONS
// =============================================================================

/**
 * Enum for all available MCP tools
 * Provides compile-time type safety and autocompletion
 */
export enum ToolName {
  AddScene = 'addScene',
  EditScene = 'editScene', 
  DeleteScene = 'deleteScene',
  FixBrokenScene = 'fixBrokenScene',
  ChangeDuration = 'changeDuration',
  AnalyzeImage = 'analyzeImage',
  CreateSceneFromImage = 'createSceneFromImage',
  EditSceneWithImage = 'editSceneWithImage',
}

/**
 * Edit complexity levels for scene editing operations
 * Used by DirectCodeEditor and Brain Orchestrator
 */
export type EditComplexity = 'surgical' | 'creative' | 'structural';

/**
 * Database operation types for scene iterations
 */
export type OperationType = 'create' | 'edit' | 'delete';

/**
 * Tool selection result from intent analysis
 */
export interface ToolSelectionResult {
  success: boolean;
  toolName?: ToolName;
  reasoning?: string;
  toolInput?: Record<string, unknown>;
  targetSceneId?: string;
  workflow?: WorkflowStep[];
  error?: string;
  clarificationNeeded?: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  editComplexity?: EditComplexity;
  userFeedback?: string;
}

/**
 * Workflow step definition for multi-step operations
 */
export interface WorkflowStep {
  toolName: ToolName;
  context: string;
  dependencies?: string[];
}

/**
 * Standardized scene data structure for database operations
 */
export interface SceneData {
  sceneId?: string;
  sceneName: string;
  sceneCode: string;
  duration: number;
  layoutJson?: string;
  reasoning?: string;
  changes?: string[];
  preserved?: string[];
  chatResponse?: string;
}

/**
 * Database operation context for scene iterations
 */
export interface DatabaseOperationContext {
  operationType: OperationType;
  toolName: ToolName;
  editComplexity?: EditComplexity;
  projectId: string;
  userId: string;
  userPrompt: string;
  reasoning?: string;
}

/**
 * Model performance tracking data
 */
export interface ModelUsageData {
  model: string;
  temperature: number;
  generationTimeMs: number;
  tokensUsed?: number;
  sessionId?: string;
}

/**
 * Type guard to check if a string is a valid ToolName
 */
export function isValidToolName(toolName: string): toolName is ToolName {
  return Object.values(ToolName).includes(toolName as ToolName);
}

/**
 * Type guard to check if a string is a valid EditComplexity
 */
export function isValidEditComplexity(complexity: string): complexity is EditComplexity {
  return ['surgical', 'creative', 'structural'].includes(complexity);
}

/**
 * Type guard to check if a string is a valid OperationType
 */
export function isValidOperationType(operation: string): operation is OperationType {
  return ['create', 'edit', 'delete'].includes(operation);
} 