import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const DrawOn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const progress = interpolate(
    frame,
    [0, 45],
    [0, 100],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );

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
          WebkitTextStroke: '2px black',
          color: 'transparent',
          backgroundImage: `linear-gradient(90deg, black ${progress}%, transparent ${progress}%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        Draw on
      </h1>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'draw-on',
  name: 'Draw On',
  duration: 60,
  previewFrame: 30,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} = window.Remotion;

export default function DrawOn() {
  const frame = useCurrentFrame();
  
  const progress = interpolate(
    frame,
    [0, 45],
    [0, 100],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );

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
          WebkitTextStroke: '2px black',
          color: 'transparent',
          backgroundImage: \`linear-gradient(90deg, black \${progress}%, transparent \${progress}%)\`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        Draw on
      </h1>
    </AbsoluteFill>
  );
}`,
};

export default DrawOn; 