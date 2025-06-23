import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const SlideIn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const slideProgress = spring({
    frame,
    fps,
    config: {
      mass: 1,
      damping: 15,
      stiffness: 80,
    }
  });

  const translateX = -1000 + (slideProgress * 1000);

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
          transform: `translateX(${translateX}px)`,
        }}
      >
        Slide in
      </h1>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'slide-in',
  name: 'Slide In',
  duration: 30,
  previewFrame: 15,
  getCode: () => `const {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} = window.Remotion;

export default function SlideIn() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const slideProgress = spring({
    frame,
    fps,
    config: {
      mass: 1,
      damping: 15,
      stiffness: 80,
    }
  });

  const translateX = -1000 + (slideProgress * 1000);

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
          transform: \`translateX(\${translateX}px)\`,
        }}
      >
        Slide in
      </h1>
    </AbsoluteFill>
  );
}`,
};

export default SlideIn; 