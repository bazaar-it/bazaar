//src/remotion/components/scenes/index.ts
import type { FC, ReactNode } from 'react';
import { BackgroundColorScene } from './BackgroundColorScene';
import { CustomScene } from './CustomScene';
import { GradientScene } from './GradientScene';
import { ImageScene } from './ImageScene';
import { ParticlesScene } from './ParticlesScene';
import { ShapeScene } from './ShapeScene';
import { SimpleShapeScene } from './SimpleShapeScene';
import { SplitScreenScene } from './SplitScreenScene';
import { SVGAnimationScene } from './SVGAnimationScene';
import { TextAnimationScene } from './TextAnimationScene';
import { TextScene } from './TextScene';
import { ZoomPanScene } from './ZoomPanScene';
import type { SceneType } from '../../../types/remotion-constants';
import { SimpleColoredShape } from './SimpleColoredShape';

// Common interface for all scene components
export interface SceneProps {
  id: string; // Standard Remotion prop
  data: Record<string, unknown>;
  defaultProps: unknown; // Standard Remotion prop, often specific to the composition
  children?: ReactNode | ReactNode[];
}

// Registry mapping scene types to their component implementations
export const sceneRegistry: Record<SceneType, FC<SceneProps>> = {
  'text': TextScene as FC<SceneProps>,
  'image': ImageScene as FC<SceneProps>,
  'background-color': BackgroundColorScene as FC<SceneProps>,
  'shape': ShapeScene as FC<SceneProps>,
  'simple-shape': SimpleShapeScene as FC<SceneProps>,
  'gradient': GradientScene as FC<SceneProps>,
  'particles': ParticlesScene as FC<SceneProps>,
  'text-animation': TextAnimationScene as FC<SceneProps>,
  'split-screen': SplitScreenScene as FC<SceneProps>,
  'zoom-pan': ZoomPanScene as FC<SceneProps>,
  'svg-animation': SVGAnimationScene as FC<SceneProps>,
  // Custom components loaded dynamically via useRemoteComponent
  'custom': CustomScene as FC<SceneProps>,  'simple-colored-shape': SimpleColoredShape as FC<SceneProps>,

};

// Export all scenes
export {
  BackgroundColorScene,
  CustomScene,
  GradientScene,
  ImageScene,
  ParticlesScene,
  ShapeScene,
  SimpleShapeScene,
  SplitScreenScene,
  SVGAnimationScene,
  TextAnimationScene,
  TextScene,
  ZoomPanScene,  SimpleColoredShape,

}; 