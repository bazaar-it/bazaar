import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const HighlightSweep: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive font sizing
  const baseFontSize = Math.min(width, height) * 0.1;
  const fontSize = isPortrait ? baseFontSize * 0.7 : isSquare ? baseFontSize * 0.8 : baseFontSize;
  
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
            fontSize: `${fontSize}px`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1a1a1a',
            margin: 0,
            position: 'relative',
            zIndex: 1,
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
            textAlign: 'center'
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
  getCode: () => `const { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;

export default function HighlightSweep() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive font sizing
  const baseFontSize = Math.min(width, height) * 0.1;
  const fontSize = isPortrait ? baseFontSize * 0.7 : isSquare ? baseFontSize * 0.8 : baseFontSize;
  
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
            fontSize: \`\${fontSize}px\`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#1a1a1a',
            margin: 0,
            position: 'relative',
            zIndex: 1,
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
            textAlign: 'center'
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