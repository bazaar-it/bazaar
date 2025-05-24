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
  start?: number; // Start time in frames
  props?: SceneProps;
  metadata?: SceneMetadata;
}

// Enhanced scene props supporting both legacy and animation-focused props
export interface SceneProps {
  // Legacy props (for backward compatibility)
  title?: string;
  text?: string;
  items?: string[];
  imageUrl?: string;
  
  // Animation-focused props
  animationType?: 'expand' | 'rotate' | 'fade' | 'slide' | 'bounce' | 'explode' | 'reveal' | 'none';
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  scale?: number;
  timing?: 'fast' | 'medium' | 'slow';
  direction?: 'left' | 'right' | 'top' | 'bottom' | 'clockwise' | 'counterclockwise';
  
  // Template-specific props
  logoText?: string;
  duration?: number;
  distance?: number;
  rotationDegrees?: number;
  bounceHeight?: number;
  explosionFrame?: number;
  
  // Generic animation props
  [key: string]: any;
}

export interface SceneMetadata {
  description?: string;
  prompt?: string;
  visualConcept?: string;
  version?: number; // For migration tracking
  [key: string]: any;
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

// Alias for backward compatibility
export type VideoStyle = Style;

export interface GenerationState {
  stage: 'idle' | 'analyzing' | 'planning' | 'styling' | 'assets' | 'components' | 'generating' | 'complete' | 'error';
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