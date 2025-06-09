//src/remotion/components/scenes/index.ts
import type { FC, ReactNode } from 'react';
import { CustomScene } from './CustomScene';

// Common interface for all scene components
export interface SceneProps {
  id: string; // Standard Remotion prop
  data: Record<string, unknown>;
  defaultProps: unknown; // Standard Remotion prop, often specific to the composition
  children?: ReactNode | ReactNode[];
}

// SIMPLIFIED: Only CustomScene registry - all scenes are generated custom code
export const sceneRegistry: Record<'custom', FC<SceneProps>> = {
  'custom': CustomScene as FC<SceneProps>,
};

// Export only CustomScene (all other scenes deleted as unused)
export {
  CustomScene,
};