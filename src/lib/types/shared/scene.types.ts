// src/lib/types/shared/scene.types.ts

/**
 * Core scene data structure matching database schema EXACTLY
 * This is the single source of truth for scene data
 */
export interface SceneData {
  id: string;
  projectId: string;
  order: number;
  name: string;          // e.g., "Scene1_abc123" 
  tsxCode: string;       // React component code (exact DB column name)
  props?: Record<string, any> | null; // Scene-specific props
  duration: number;      // In frames
  layoutJson?: string | null;   // Stringified JSON layout specification
  
  // Publishing fields
  publishedUrl?: string | null;
  publishedHash?: string | null;
  publishedAt?: Date | string | null;
  
  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Scene is just SceneData - no need for separate metadata
 * SceneData already contains all fields from database
 */
export type Scene = SceneData;

/**
 * Scene creation data (before ID assignment and timestamps)
 */
export interface SceneCreateData extends Omit<SceneData, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string; // Optional, will be generated if not provided
}

/**
 * Scene update data (partial updates allowed)
 */
export interface SceneUpdateData extends Partial<Omit<SceneData, 'id' | 'projectId' | 'createdAt'>> {
  id: string; // ID is required for updates
}