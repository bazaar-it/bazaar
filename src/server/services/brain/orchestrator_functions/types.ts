// src/server/services/brain/orchestrator_functions/types.ts
// Shared types for the simplified brain architecture

import type { Scene } from '@/server/db/schema';

// ============= CORE TYPES =============

export interface BrainInput {
  prompt: string;
  projectId: string;
  userId: string;
  imageUrls?: string[];
  selectedSceneId?: string;
  forceRefresh?: boolean;
}

export interface BrainDecision {
  tool: 'addScene' | 'editScene' | 'deleteScene' | 'analyzeImage';
  reasoning: string;           // Human-readable reasoning for the tool
  context: ToolContext;        // Tool-specific context
  intent: UserIntent;          // Analyzed user intent
  confidence: number;          // 0-1 confidence in decision
}

// ============= CONTEXT TYPES =============

export interface ProjectContext {
  projectId: string;
  chatHistory: ChatMessage[];
  scenes: SceneContext[];
  preferences: UserPreferences;
  timestamp: number;
}

export interface SceneContext {
  id: string;
  name: string;
  duration: number;
  order: number;
  description?: string;      // Brief description for context
  tsxCode?: string;         // Only included when needed
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface UserPreferences {
  style?: string;
  primaryColor?: string;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  complexity?: 'simple' | 'moderate' | 'complex';
}

// ============= INTENT TYPES =============

export interface UserIntent {
  type: 'create' | 'edit' | 'delete' | 'analyze';
  editType?: 'surgical' | 'creative' | 'fix' | 'duration';
  targetSceneId?: string;
  specificChange?: string;     // "change button to red"
  durationSeconds?: number;
  imageUrls?: string[];
  confidence: number;
}

// ============= TOOL CONTEXT TYPES =============

export type ToolContext = 
  | AddSceneContext
  | EditSceneContext
  | DeleteSceneContext
  | AnalyzeImageContext;

export interface AddSceneContext {
  tool: 'addScene';
  projectId: string;
  prompt: string;
  imageUrls?: string[];
  previousSceneJson?: string;
  storyboardContext?: SceneContext[];
  userPreferences?: UserPreferences;
}

export interface EditSceneContext {
  tool: 'editScene';
  sceneId: string;
  prompt?: string;
  editType: 'surgical' | 'creative' | 'fix';
  existingCode?: string;
  existingName?: string;
  existingDuration?: number;
  imageUrls?: string[];
  duration?: number;  // For duration-only edits
}

export interface DeleteSceneContext {
  tool: 'deleteScene';
  sceneId: string;
  sceneName?: string;
}

export interface AnalyzeImageContext {
  tool: 'analyzeImage';
  imageUrls: string[];
  analysisType?: 'general' | 'scene' | 'style';
}

// ============= CACHE TYPES =============

export interface CachedContext extends ProjectContext {
  cacheKey: string;
  expiresAt: number;
}

export interface ContextOptions {
  includeChat: boolean;
  includeStoryboard: boolean;
  includePreferences: boolean;
  includeFullCode?: boolean;    // Whether to include full TSX code
  forceRefresh?: boolean;
}