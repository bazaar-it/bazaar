import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const CarouselText: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  
  const words = ['Carousel', 'Text', 'Animation', 'Effect'];
  const wordWidth = width / 2; // Assuming each word takes up half the screen
  const totalWidth = wordWidth * words.length;
  
  // Create a seamless loop by using modulo
  const loopFrame = frame % 120; // Loop every 4 seconds (120 frames)
  
  const movement = interpolate(
    loopFrame,
    [0, 120],
    [0, -totalWidth],
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
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          transform: `translateX(${movement}px)`,
          gap: '60px',
          position: 'absolute',
        }}
      >
        {[...words, ...words].map((word, index) => (
          <h1
            key={index}
            style={{
              fontSize: '120px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              margin: 0,
              color: '#1a1a1a',
              width: wordWidth,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {word}
          </h1>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const templateConfig = {
  id: 'carousel-text',
  name: 'Carousel Text',
  duration: 120,
  previewFrame: 60,
  getCode: () => `const { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;

export default function CarouselText() {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  
  const words = ['Carousel', 'Text', 'Animation', 'Effect'];
  const wordWidth = width / 2;
  const totalWidth = wordWidth * words.length;
  
  // Create a seamless loop by using modulo
  const loopFrame = frame % 120; // Loop every 4 seconds (120 frames)
  
  const movement = interpolate(
    loopFrame,
    [0, 120],
    [0, -totalWidth],
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
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          transform: \`translateX(\${movement}px)\`,
          gap: '60px',
          position: 'absolute',
        }}
      >
        {[...words, ...words].map((word, index) => (
          <h1
            key={index}
            style={{
              fontSize: '120px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              margin: 0,
              color: '#1a1a1a',
              width: wordWidth,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {word}
          </h1>
        ))}
      </div>
    </AbsoluteFill>
  );
}`,
};

export default CarouselText; 