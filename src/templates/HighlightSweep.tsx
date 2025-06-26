import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import React from 'react';

const HighlightSweep: React.FC = () => {
  const frame = useCurrentFrame();
  
  const text = "Highlight Sweep Effect";
  const sweepProgress = interpolate(
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
      <div style={{ position: 'relative' }}>
        <h1
          style={{
            fontSize: '120px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1a1a1a',
            margin: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {text}
        </h1>
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: 0,
            width: `${sweepProgress}%`,
            height: '20px',
            background: 'linear-gradient(90deg, #4285f4 0%, #34a853 100%)',
            transition: 'width 0.3s ease',
            zIndex: 0,
            borderRadius: '4px',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'highlight-sweep',
  name: 'Highlight Sweep',
  duration: 180,
  previewFrame: 90,
  getCode: () => `const { AbsoluteFill, interpolate, useCurrentFrame } = window.Remotion;

export default function HighlightSweep() {
  const frame = useCurrentFrame();
  
  const text = "Highlight Sweep Effect";
  const sweepProgress = interpolate(
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
      <div style={{ position: 'relative' }}>
        <h1
          style={{
            fontSize: '120px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1a1a1a',
            margin: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {text}
        </h1>
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: 0,
            width: \`\${sweepProgress}%\`,
            height: '20px',
            background: 'linear-gradient(90deg, #4285f4 0%, #34a853 100%)',
            transition: 'width 0.3s ease',
            zIndex: 0,
            borderRadius: '4px',
          }}
        />
      </div>
    </AbsoluteFill>
  );
}`,
};

export default HighlightSweep; 