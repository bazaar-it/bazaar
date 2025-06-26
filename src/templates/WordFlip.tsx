import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import React from 'react';

const Typewriter: React.FC = () => {
  const frame = useCurrentFrame();
  const staticText = "We were born to";
  const words = ["build", "ship", "create"];
  const currentIndex = Math.floor(frame / 90) % words.length;
  const currentWord = words[currentIndex] ?? '';
  const cycleFrame = frame % 90;

  let displayText = "";
  if (cycleFrame < 30) {
    const progress = interpolate(cycleFrame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
    displayText = currentWord.slice(0, Math.floor(currentWord.length * progress));
  } else if (cycleFrame < 60) {
    displayText = currentWord;
  } else {
    const progress = interpolate(cycleFrame, [60, 85], [1, 0], { extrapolateRight: "clamp" });
    displayText = currentWord.slice(0, Math.floor(currentWord.length * progress));
  }

  const cursorVisible = Math.floor((frame % 45) / 30);

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '96px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        color: '#1A1A1A',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {staticText}
      <span style={{ minWidth: '400px', display: 'inline-block' }}>
        {displayText}
        <span style={{ opacity: cursorVisible, color: '#1A1A1A', marginLeft: '2px' }}>|</span>
      </span>
    </div>
  );
};

const WordFlip: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: 'white' }}>
      <Typewriter />
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'word-flip',
  name: 'Word Flip',
  duration: 270, // 3 words * 90 frames
  previewFrame: 135, // Middle of the second word
  getCode: () => `const { AbsoluteFill, interpolate, useCurrentFrame } = window.Remotion;

export default function WordFlip() {
  const Typewriter = () => {
    const frame = useCurrentFrame();
    const staticText = "We were born to";
    const words = ["build", "ship", "create"];
    const currentIndex = Math.floor(frame / 90) % words.length;
    const currentWord = words[currentIndex] || '';
    const cycleFrame = frame % 90;

    let displayText = "";
    if (cycleFrame < 30) {
      const progress = interpolate(cycleFrame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
      displayText = currentWord.slice(0, Math.floor(currentWord.length * progress));
    } else if (cycleFrame < 60) {
      displayText = currentWord;
    } else {
      const progress = interpolate(cycleFrame, [60, 85], [1, 0], { extrapolateRight: "clamp" });
      displayText = currentWord.slice(0, Math.floor(currentWord.length * progress));
    }

    const cursorVisible = Math.floor((frame % 45) / 30);

    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '96px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          color: '#1A1A1A',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          whiteSpace: 'nowrap',
        }}
      >
        {staticText}
        <span style={{ minWidth: '400px', display: 'inline-block' }}>
          {displayText}
          <span style={{ opacity: cursorVisible, color: '#1A1A1A', marginLeft: '2px' }}>|</span>
        </span>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: 'white' }}>
      <Typewriter />
    </AbsoluteFill>
  );
};
`,
};

export default WordFlip;
