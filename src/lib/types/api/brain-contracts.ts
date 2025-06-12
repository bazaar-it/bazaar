// src/lib/types/api/brain-contracts.ts
// Properly typed contracts for the brain orchestrator

import type { Scene } from '@/server/db/schema';

// ============= DISCRIMINATED UNION FOR BRAIN DECISIONS =============

export type BrainDecision = 
  | AddSceneDecision
  | EditSceneDecision
  | DeleteSceneDecision
  | ClarificationNeededDecision;

export interface AddSceneDecision {
  tool: 'addScene';
  context: AddSceneContext;
  reasoning: string;
  confidence: number;
}

export interface EditSceneDecision {
  tool: 'editScene';
  context: EditSceneContext;
  reasoning: string;
  confidence: number;
}

export interface DeleteSceneDecision {
  tool: 'deleteScene';
  context: DeleteSceneContext;
  reasoning: string;
  confidence: number;
}

export interface ClarificationNeededDecision {
  tool: 'clarification';
  context: {
    question: string;
    suggestions?: string[];
  };
  reasoning: string;
  confidence: number;
}

// ============= STRONGLY TYPED CONTEXT FOR EACH TOOL =============

export interface AddSceneContext {
  projectId: string;
  prompt: string;
  imageUrls?: string[];  // Models will see these directly
  
  // For style consistency
  previousSceneStyle?: {
    layout: string;      // Previous scene's layout JSON
    animations: string[]; // Animation patterns used
    colors: string[];    // Color palette
    style: string;       // Overall style (modern, playful, etc)
  };
  
  // For proper timeline management
  insertAfterSceneId?: string;
  order?: number;
}

export interface EditSceneContext {
  sceneId: string;
  sceneData: {
    tsxCode: string;
    name: string;
    duration: number;
    start: number;
    end: number;
  };
  
  // Edit specifics
  editType: 'surgical' | 'creative' | 'fix' | 'duration';
  prompt?: string;
  imageUrls?: string[];  // For "make it look like this image"
  
  // For duration changes
  newDuration?: number; // In frames
  
  // For style consistency
  projectStyle?: {
    colors: string[];
    animations: string[];
  };
}

export interface DeleteSceneContext {
  sceneId: string;
  sceneName: string;
  
  // For timeline adjustment
  affectedScenes: Array<{
    id: string;
    currentStart: number;
    newStart: number;
  }>;
}

// ============= TYPE GUARDS =============

export function isAddSceneDecision(decision: BrainDecision): decision is AddSceneDecision {
  return decision.tool === 'addScene';
}

export function isEditSceneDecision(decision: BrainDecision): decision is EditSceneDecision {
  return decision.tool === 'editScene';
}

export function isDeleteSceneDecision(decision: BrainDecision): decision is DeleteSceneDecision {
  return decision.tool === 'deleteScene';
}

export function isClarificationNeeded(decision: BrainDecision): decision is ClarificationNeededDecision {
  return decision.tool === 'clarification';
}

// ============= INTENT ANALYSIS TYPES =============

export interface AnalyzedIntent {
  type: 'create' | 'edit' | 'delete' | 'ambiguous';
  confidence: number;
  
  // For edits
  editType?: 'surgical' | 'creative' | 'fix' | 'duration';
  targetSceneId?: string;
  specificChange?: string;
  
  // For duration
  durationSeconds?: number;
  durationFrames?: number;
  
  // For ambiguous
  possibleInterpretations?: string[];
  clarificationNeeded?: string;
  
  // Images (attached to any operation)
  imageUrls?: string[];
}

// ============= TIMELINE MANAGEMENT =============

export interface TimelineUpdate {
  sceneId: string;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  duration: number;
}

export interface TimelineState {
  scenes: Array<{
    id: string;
    start: number;
    end: number;
    duration: number;
  }>;
  totalDuration: number;
}

// ============= VERSION HISTORY =============

export interface SceneVersion {
  id: string;
  sceneId: string;
  version: number;
  tsxCode: string;
  duration: number;
  timestamp: Date;
  changeType: 'create' | 'edit' | 'duration';
  changeDescription: string;
}