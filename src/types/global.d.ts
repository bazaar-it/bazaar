//src/types/global.d.ts
import React from 'react';
import * as Remotion from 'remotion';

declare global {
  interface Window {
    React: typeof React;
    Remotion: typeof Remotion;
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
