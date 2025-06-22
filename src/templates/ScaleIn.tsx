import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const ScaleIn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scaleProgress = spring({
    frame,
    fps,
    config: {
      mass: 1,
      damping: 12,
      stiffness: 200,
    }
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '300px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          color: '#000',
          fontWeight: 'bold',
          transform: `scale(${scaleProgress})`,
          opacity: scaleProgress,
        }}
      >
        Scale in
      </h1>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'scale-in',
  name: 'Scale In',
  duration: 30,
  previewFrame: 15,
  getCode: () => `const {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} = window.Remotion;

export default function ScaleIn() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scaleProgress = spring({
    frame,
    fps,
    config: {
      mass: 1,
      damping: 12,
      stiffness: 200,
    }
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '300px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          color: '#000',
          fontWeight: 'bold',
          transform: \`scale(\${scaleProgress})\`,
          opacity: scaleProgress,
        }}
      >
        Scale in
      </h1>
    </AbsoluteFill>
  );
}`,
};

export default ScaleIn; 