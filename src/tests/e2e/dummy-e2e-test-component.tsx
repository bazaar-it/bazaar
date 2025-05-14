// src/tests/e2e/dummy-e2e-test-component.tsx
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

export const MyE2EDummyComponent: React.FC<{ text?: string }> = ({ text = "E2E Test" }) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(1, frame / 30);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'lightgreen',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: 70,
          fontWeight: 'bold',
          color: 'darkgreen',
          opacity,
          fontFamily: 'Arial, Helvetica, sans-serif',
          padding: '20px',
          border: '5px solid darkgreen',
          borderRadius: '15px',
        }}
      >
        {text} (Frame: {frame})
      </div>
    </AbsoluteFill>
  );
};

// Required for the dynamic loading mechanism
// Ensure this pattern matches how your actual components expose themselves for dynamic loading
if (typeof window !== 'undefined') {
  (window as any).MyE2EDummyComponent = MyE2EDummyComponent; // Expose by actual name
  (window as any).__REMOTION_COMPONENT_NAME = 'MyE2EDummyComponent'; // For generic loading
  (window as any).__REMOTION_COMPONENT = MyE2EDummyComponent; // Generic access
  
  // Make React and Remotion available on window if PreviewPanel expects them for custom components
  if (!(window as any).React) {
    (window as any).React = React;
  }
  if (!(window as any).Remotion) {
    (window as any).Remotion = { AbsoluteFill, useCurrentFrame }; // Add other Remotion exports if needed by components
  }
}
