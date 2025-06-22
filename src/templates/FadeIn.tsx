import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import React from 'react';

const FadeIn: React.FC = () => {
  const frame = useCurrentFrame();
  
  const opacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '300px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          opacity,
          margin: 0,
          color: '#000',
          fontWeight: 'bold',
        }}
      >
        Fade in
      </h1>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'fade-in',
  name: 'Fade In',
  duration: 60,
  previewFrame: 30,
  getCode: () => `const {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} = window.Remotion;

export default function FadeIn() {
  const frame = useCurrentFrame();
  
  const opacity = interpolate(
    frame,
    [0, 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '300px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          opacity,
          margin: 0,
          color: '#000',
          fontWeight: 'bold',
        }}
      >
        Fade in
      </h1>
    </AbsoluteFill>
  );
}`,
};

export default FadeIn; 