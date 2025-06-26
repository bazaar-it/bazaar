import { AbsoluteFill, useCurrentFrame, spring } from 'remotion';
import React from 'react';

const SearchInput: React.FC<{
  placeholders: string[];
  opacity: number;
}> = ({ placeholders, opacity }) => {
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

const Title: React.FC<{
  opacity: number;
}> = ({ opacity }) => {
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

const Placeholders: React.FC = () => {
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
