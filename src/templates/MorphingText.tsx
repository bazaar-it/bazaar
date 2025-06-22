import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import React from 'react';

const MorphingText: React.FC = () => {
  const frame = useCurrentFrame();
  const text = "MORPHING TEXT";
  
  const getDistortionValue = (charIndex: number) => {
    const baseDelay = charIndex * 3;
    const wave = Math.sin((frame - baseDelay) * 0.2) * 20;
    const progress = interpolate(
      frame,
      [0, 30],
      [30, 0],
      {
        extrapolateRight: 'clamp',
      }
    );
    
    return Math.max(0, wave * (progress / 30));
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex' }}>
        {text.split('').map((char, index) => {
          const distortion = getDistortionValue(index);
          
          return (
            <span
              key={index}
              style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: '#1a1a1a',
                transform: `translateY(${distortion}px)`,
                display: 'inline-block',
                opacity: interpolate(
                  frame,
                  [0, 15],
                  [0, 1],
                  {
                    extrapolateRight: 'clamp',
                  }
                ),
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'morphing-text',
  name: 'Morphing Text',
  duration: 180,
  previewFrame: 90,
  getCode: () => `const { AbsoluteFill, interpolate, useCurrentFrame } = window.Remotion;

export default function MorphingText() {
  const frame = useCurrentFrame();
  const text = "MORPHING TEXT";
  
  const getDistortionValue = (charIndex) => {
    const baseDelay = charIndex * 3;
    const wave = Math.sin((frame - baseDelay) * 0.2) * 20;
    const progress = interpolate(
      frame,
      [0, 30],
      [30, 0],
      {
        extrapolateRight: 'clamp',
      }
    );
    
    return Math.max(0, wave * (progress / 30));
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex' }}>
        {text.split('').map((char, index) => {
          const distortion = getDistortionValue(index);
          
          return (
            <span
              key={index}
              style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: '#1a1a1a',
                transform: \`translateY(\${distortion}px)\`,
                display: 'inline-block',
                opacity: interpolate(
                  frame,
                  [0, 15],
                  [0, 1],
                  {
                    extrapolateRight: 'clamp',
                  }
                ),
              }}
            >
              {char === ' ' ? '\\u00A0' : char}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}`,
};

export default MorphingText; 