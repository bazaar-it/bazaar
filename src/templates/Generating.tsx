import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import React from 'react';

const Generating: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Animate from 150% to -50% to move the shimmer from left to right
  const shimmerPosition = interpolate(
    frame % durationInFrames,
    [0, durationInFrames],
    [150, -50]
  );

  const textStyle: React.CSSProperties = {
    fontSize: '120px',
    fontWeight: 'bold',
    fontFamily: 'Helvetica, Arial, sans-serif',
    textAlign: 'center',
    color: 'transparent',
    background: `linear-gradient(to right, #888 20%, #fff 50%, #888 80%) ${shimmerPosition}% 0 / 200% auto`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={textStyle}>Generating...</div>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'generating',
  name: 'Generating',
  duration: 90,
  previewFrame: 45,
  getCode: () => `const { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } = window.Remotion;

export default function Generating() {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    const shimmerPosition = interpolate(
      frame % durationInFrames,
      [0, durationInFrames],
      [150, -50]
    );

    const textStyle = {
        fontSize: '120px',
        fontWeight: 'bold',
        fontFamily: 'Helvetica, Arial, sans-serif',
        textAlign: 'center',
        color: 'transparent',
        background: \`linear-gradient(to right, #888 20%, #fff 50%, #888 80%) \${shimmerPosition}% 0 / 200% auto\`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
    };

    return (
        <AbsoluteFill
            style={{
                backgroundColor: 'black',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <div style={textStyle}>Generating...</div>
        </AbsoluteFill>
    );
};
`,
};

export default Generating;
