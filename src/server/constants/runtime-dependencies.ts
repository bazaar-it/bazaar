// src/server/constants/runtime-dependencies.ts
import pkg from '../../../package.json';

export interface RuntimeDependencies {
  react: string;
  reactDom: string;
  remotion: string;
}

export const RUNTIME_DEPENDENCIES: RuntimeDependencies = {
  react: pkg.dependencies['react'],
  reactDom: pkg.dependencies['react-dom'],
  remotion: pkg.dependencies['remotion']
};

