//src/remotion/components/scenes/CustomScene.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { RemoteComponent } from '~/hooks/useRemoteComponent';
import type { SceneProps } from './index';

/**
 * Custom component scene for Remotion
 * 
 * Renders a dynamically loaded custom component from R2 storage.
 * Uses the `componentId` from the scene data to fetch and render
 * the component.
 * 
 * @param props Scene props with data.componentId required
 * @returns Rendered custom component
 */
export const CustomScene: React.FC<SceneProps> = ({ data }) => {
  const componentId = data.componentId as string;

  if (!componentId) {
    // Fallback for missing componentId
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#222',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2>Custom Component Error</h2>
          <p>No component ID specified</p>
        </div>
      </AbsoluteFill>
    );
  }

  // Render the remote component with the scene data as props
  return (
    <AbsoluteFill>
      <RemoteComponent 
        componentId={componentId} 
        {...data} 
      />
    </AbsoluteFill>
  );
};
