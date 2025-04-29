//src/remotion/components/scenes/index.ts
import type { FC, ReactNode } from 'react';
import { BackgroundColorScene } from './BackgroundColorScene';
import { GradientScene } from './GradientScene';
import { ImageScene } from './ImageScene';
import { ParticlesScene } from './ParticlesScene';
import { ShapeScene } from './ShapeScene';
import { SplitScreenScene } from './SplitScreenScene';
import { SVGAnimationScene } from './SVGAnimationScene';
import { TextAnimationScene } from './TextAnimationScene';
import { TextScene } from './TextScene';
import { ZoomPanScene } from './ZoomPanScene';
import type { SceneType } from '../../../types/remotion-constants';

// Common interface for all scene components
export interface SceneProps {
  data: Record<string, unknown>;
  children?: ReactNode | ReactNode[];
}

// Registry mapping scene types to their component implementations
export const sceneRegistry: Record<SceneType, FC<SceneProps>> = {
  'text': TextScene as FC<SceneProps>,
  'image': ImageScene as FC<SceneProps>,
  'background-color': BackgroundColorScene as FC<SceneProps>,
  'shape': ShapeScene as FC<SceneProps>,
  'gradient': GradientScene as FC<SceneProps>,
  'particles': ParticlesScene as FC<SceneProps>,
  'text-animation': TextAnimationScene as FC<SceneProps>,
  'split-screen': SplitScreenScene as FC<SceneProps>,
  'zoom-pan': ZoomPanScene as FC<SceneProps>,
  'svg-animation': SVGAnimationScene as FC<SceneProps>,
  // Add custom implementation for completeness
  'custom': TextScene as FC<SceneProps>, // Fallback to TextScene for custom type
};

// Export all scenes
export {
  BackgroundColorScene,
  GradientScene,
  ImageScene,
  ParticlesScene,
  ShapeScene,
  SplitScreenScene,
  SVGAnimationScene,
  TextAnimationScene,
  TextScene,
  ZoomPanScene,
}; 