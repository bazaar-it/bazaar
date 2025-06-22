import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

const Dot: React.FC<{
  cx: number;
  delay: number;
}> = ({ cx, delay }) => {
  const frame = useCurrentFrame();
  const loopDuration = 30; // 1-second loop

  // Ensure the frame is always positive for the modulo operation
  const frameInLoop = (frame - delay + loopDuration) % loopDuration;

  // Use a cosine wave for a perfect, smooth loop
  // It starts at its peak (1), goes to its trough (-1), and returns to its peak (1)
  const angle = (frameInLoop / loopDuration) * Math.PI * 2;
  const scale = Math.cos(angle);

  // Map the cosine wave (-1 to 1) to our desired pixel range (6 to 12)
  const D_AMP = (12 - 6) / 2; // 3
  const D_CENTER = (12 + 6) / 2; // 9
  const cy = D_CENTER - D_AMP * scale;

  return <circle cx={cx} cy={cy} r="2" fill="black" />;
};

const DotDotDot: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        style={{
          transform: 'scale(2)',
        }}
      >
        <Dot cx={4} delay={0} />
        <Dot cx={12} delay={5} />
        <Dot cx={20} delay={10} />
      </svg>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'dot-dot-dot',
  name: 'Dot Dot Dot',
  duration: 60,
  previewFrame: 30,
  getCode: () => `const { AbsoluteFill, useCurrentFrame } = window.Remotion;

export default function DotDotDot() {
  const Dot = ({ cx, delay }) => {
    const frame = useCurrentFrame();
    const loopDuration = 30; // 1-second loop

    // Ensure the frame is always positive for the modulo operation
    const frameInLoop = (frame - delay + loopDuration) % loopDuration;

    // Use a cosine wave for a perfect, smooth loop
    const angle = (frameInLoop / loopDuration) * Math.PI * 2;
    const scale = Math.cos(angle);

    // Map the cosine wave (-1 to 1) to our desired pixel range (6 to 12)
    const D_AMP = (12 - 6) / 2; // 3
    const D_CENTER = (12 + 6) / 2; // 9
    const cy = D_CENTER - D_AMP * scale;

    return <circle cx={cx} cy={cy} r="2" fill="black" />;
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        style={{
          transform: 'scale(2)',
        }}
      >
        <Dot cx={4} delay={0} />
        <Dot cx={12} delay={5} />
        <Dot cx={20} delay={10} />
      </svg>
    </AbsoluteFill>
  );
};
`,
};

export default DotDotDot;
