/**
 * Storyboard schema - based on the enhanced schema from Sprint 26
 * This represents the single source of truth for the video generation
 */

export interface Storyboard {
  id?: string;
  title?: string;
  fps?: number;
  width?: number;
  height?: number;
  duration?: number; // Total duration in frames
  scenes?: Scene[];
  assets?: Asset[];
  style?: Style;
  metadata?: Record<string, any>;
}

export interface Scene {
  id?: string;
  name: string;
  template?: string;
  duration: number; // Duration in frames
  props?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'icon' | 'other';
  url?: string;
  metadata?: AssetMetadata;
}

export interface AssetMetadata {
  alt?: string;
  format?: string;
  duration?: number;
  width?: number;
  height?: number;
  [key: string]: any;
}

export interface Style {
  colorPalette?: string[];
  fontPrimary?: string;
  fontSecondary?: string;
  mood?: string;
  visualStyle?: string;
  pacing?: string;
  [key: string]: any;
}

export interface GenerationState {
  stage: 'idle' | 'analyzing' | 'planning' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
  storyboard?: Storyboard;
  error?: string;
}

// Utility types for agent communication
export interface StoryboardUpdate {
  type: 'scene' | 'style' | 'asset' | 'metadata';
  operation: 'add' | 'update' | 'remove';
  data: Partial<Scene> | Partial<Style> | Partial<Asset> | Record<string, any>;
  targetId?: string; // Required for updates and removals
} 