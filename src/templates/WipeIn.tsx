import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import React from 'react';

const WipeIn: React.FC = () => {
  const frame = useCurrentFrame();
  
  const progress = interpolate(
    frame,
    [0, 30],
    [0, 100],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );

  const clipPath = `inset(0 ${100 - progress}% 0 0)`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <h1
        style={{
          fontSize: '300px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          color: '#000',
          fontWeight: 'bold',
          clipPath,
        }}
      >
        Wipe in
      </h1>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'wipe-in',
  name: 'Wipe In',
  duration: 60,
  previewFrame: 30,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} = window.Remotion;

export default function WipeIn() {
  const frame = useCurrentFrame();
  
  const progress = interpolate(
    frame,
    [0, 30],
    [0, 100],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );

  const clipPath = \`inset(0 \${100 - progress}% 0 0)\`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <h1
        style={{
          fontSize: '300px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          color: '#000',
          fontWeight: 'bold',
          clipPath,
        }}
      >
        Wipe in
      </h1>
    </AbsoluteFill>
  );
}`,
};

export default WipeIn; 