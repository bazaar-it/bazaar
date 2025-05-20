// src/remotion/compositions/TestCustomScene.tsx
import React from 'react';
import { Composition } from 'remotion';
import { AbsoluteFill } from 'remotion';
import { CustomScene } from '../components/scenes/CustomScene';

export const TestCustomSceneComp: React.FC = () => {
  // Mock data for testing the CustomScene component
  const mockData = {
    componentId: 'test-component-id',
    refreshToken: 'test-refresh-token',
    // Add any other required props here
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#1E1E1E' }}>
      <CustomScene 
        id="test-custom-scene"
        data={mockData}
        defaultProps={{}}
      />
    </AbsoluteFill>
  );
};

// This composition will be used in the Remotion Studio
export const TestCustomSceneComposition = () => {
  return (
    <>
      <Composition
        id="test-custom-scene"
        component={TestCustomSceneComp}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
