import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import React from 'react';

const SearchInput: React.FC<{
  placeholders: string[];
  opacity: number;
  width: number;
  height: number;
}> = ({ placeholders, opacity, width, height }) => {
  const frame = useCurrentFrame();
  
  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive sizing
  const searchWidth = Math.min(width * 0.9, isPortrait ? width * 0.95 : 1200);
  const searchHeight = isPortrait ? Math.min(height * 0.1, 96) : 96;
  const fontSize = isPortrait ? Math.min(width * 0.05, 27) : 27;
  const iconSize = isPortrait ? Math.min(width * 0.06, 36) : 36;
  const currentIndex = Math.floor(frame / 60) % placeholders.length;
  const currentText = placeholders[currentIndex];

  return (
    <div
      style={{
        width: `${searchWidth}px`,
        height: `${searchHeight}px`,
        background: 'white',
        borderRadius: `${searchHeight / 2}px`,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${searchHeight * 0.5}px`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        opacity,
      }}
    >
      <div style={{ fontSize: `${iconSize}px`, marginRight: '24px' }}>🔍</div>
      <div
        style={{
          fontSize: `${fontSize}px`,
          fontFamily: 'Inter, sans-serif',
          color: '#999999',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1
        }}
      >
        {currentText}
      </div>
    </div>
  );
};

const Title: React.FC<{
  opacity: number;
  width: number;
  height: number;
}> = ({ opacity, width, height }) => {
  // Format detection for responsive sizing
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  const isSquare = Math.abs(aspectRatio - 1) < 0.2;
  
  // Responsive font sizing
  const baseFontSize = Math.min(width, height) * 0.08;
  const fontSize = isPortrait ? baseFontSize * 0.8 : isSquare ? baseFontSize * 0.9 : baseFontSize;
  const marginBottom = isPortrait ? height * 0.05 : 72;

  return (
    <div
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        color: 'black',
        marginBottom: `${marginBottom}px`,
        opacity,
        textAlign: 'center',
        lineHeight: 1.1,
        padding: isPortrait ? '0 20px' : '0'
      }}
    >
      Ask Bazaar AI Anything
    </div>
  );
};

const Placeholders: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const mainProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const placeholders = [
    'What is the second rule of fight club',
    "Why do Chinese people always say 'Have you eaten yet'",
    'WTF is Bazaar',
    'This is ice-tea',
    'How to restore Neon database',
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Title opacity={mainProgress} width={width} height={height} />
      <SearchInput placeholders={placeholders} opacity={mainProgress} width={width} height={height} />
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'placeholders',
  name: 'Placeholders',
  duration: 300, // 5 placeholders * 60 frames
  previewFrame: 150, // Middle of the 3rd placeholder
  getCode: () => `const { AbsoluteFill, useCurrentFrame, spring } = window.Remotion;

export default function Placeholders() {
  const SearchInput = ({ placeholders, opacity }) => {
    const frame = useCurrentFrame();
    const currentIndex = Math.floor(frame / 60) % placeholders.length;
    const currentText = placeholders[currentIndex];

    return (
      <div
        style={{
          width: '1200px',
          height: '96px',
          background: 'white',
          borderRadius: '48px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 48px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          opacity,
        }}
      >
        <div style={{ fontSize: '36px', marginRight: '24px' }}>🔍</div>
        <div
          style={{
            fontSize: '27px',
            fontFamily: 'Inter, sans-serif',
            color: '#999999',
          }}
        >
          {currentText}
        </div>
      </div>
    );
  };

  const Title = ({ opacity }) => {
    return (
      <div
        style={{
          fontSize: '72px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          color: 'black',
          marginBottom: '72px',
          opacity,
          textAlign: 'center',
        }}
      >
        Ask Bazaar AI Anything
      </div>
    );
  };

  const frame = useCurrentFrame();

  const mainProgress = spring({
    frame,
    fps: 30,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const placeholders = [
    'What is the second rule of fight club',
    "Why do Chinese people always say 'Have you eaten yet'",
    'WTF is Bazaar',
    'This is ice-tea',
    'How to restore Neon database',
  ];

  return (
    <AbsoluteFill
      style={{
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Title opacity={mainProgress} />
      <SearchInput placeholders={placeholders} opacity={mainProgress} />
    </AbsoluteFill>
  );
};
`,
};

export default Placeholders;
