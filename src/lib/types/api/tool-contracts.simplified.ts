// src/lib/types/api/tool-contracts.simplified.ts
// Simplified tool contracts for 3-tool architecture

import type { StandardApiResponse, SceneOperationResponse, DeleteOperationResponse } from './golden-rule-contracts';

/**
 * Base tool context passed to all tools
 */
export interface ToolContext {
  projectId: string;
  userId?: string;
  debug?: boolean;
  visionAnalysis?: any;
}

// ============= SIMPLIFIED TOOL INPUTS =============

/**
 * AddScene tool - handles both text and image creation
 */
export interface AddSceneInput {
  projectId: string;
  prompt: string;
  imageUrls?: string[];        // If provided, uses vision model
  order?: number;
  previousSceneJson?: string;
}

/**
 * EditScene tool - handles all edit types
 */
export interface EditSceneInput {
  sceneId: string;
  prompt?: string;             // Required unless only changing duration
  editType?: 'surgical' | 'creative' | 'fix';
  imageUrls?: string[];        // For visual reference
  duration?: number;           // For duration-only changes
}

/**
 * DeleteScene tool
 */
export interface DeleteSceneInput {
  sceneId: string;
}

/**
 * AnalyzeImage tool (still needed)
 */
export interface AnalyzeImageInput {
  imageUrls: string[];
  analysisType?: 'general' | 'scene' | 'style';
}

// ============= SIMPLIFIED TOOL OUTPUTS =============

/**
 * All scene creation/edit tools return StandardApiResponse
 */
export type AddSceneOutput = StandardApiResponse<SceneOperationResponse>;
export type EditSceneOutput = StandardApiResponse<SceneOperationResponse>;
export type DeleteSceneOutput = StandardApiResponse<DeleteOperationResponse>;

/**
 * Image analysis returns structured analysis
 */
export interface AnalyzeImageOutput {
  success: boolean;
  analysis: {
    description: string;
    elements: string[];
    colors: string[];
    style: string;
    suggestedSceneType?: string;
  };
  metadata: {
    timestamp: number;
    imageCount: number;
  };
}

// ============= TOOL DEFINITIONS =============

export interface SimplifiedTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: any;  // Zod schema
  execute: (input: TInput, context: ToolContext) => Promise<TOutput>;
}

export type SimplifiedToolName = 'addScene' | 'editScene' | 'deleteScene' | 'analyzeImage';

// ============= ORCHESTRATOR INTEGRATION =============

/**
 * Tool selection result from brain
 */
export interface SimplifiedToolSelection {
  toolName: SimplifiedToolName;
  targetSceneId?: string;      // For edit/delete
  editType?: 'surgical' | 'creative' | 'fix';
  reasoning: string;
}

/**
 * Workflow for multi-step operations
 */
export interface SimplifiedWorkflow {
  workflow: SimplifiedToolSelection[];
  reasoning: string;
}