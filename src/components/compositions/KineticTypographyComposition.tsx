"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

interface KineticTypographyProps {
  script?: string[];
  theme?: 'light' | 'dark';
}

export const KineticTypographyComposition: React.FC<KineticTypographyProps> = ({ 
  script = ["CREATE", "AMAZING", "VIDEOS", "WITH", "REMOTION"], 
  theme = 'dark' 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const backgroundColor = theme === 'dark' ? '#000000' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  
  // Debug: Log to console to see if composition is running
  console.log(`Kinetic Typography - Frame: ${frame}, FPS: ${fps}`);
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* RSVP (Rapid Serial Visual Presentation) - 5 words per second */}
      {script.map((word, index) => {
        const startFrame = index * (fps / 5); // 5 words per second
        const durationFrames = fps / 5; // Each word shows for 1/5 second
        
        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <WordAnimation 
              word={word} 
              textColor={textColor}
              index={index}
              totalWords={script.length}
            />
          </Sequence>
        );
      })}
      
      {/* Final emphasis - show all words together */}
      <Sequence
        from={script.length * (fps / 5)}
        durationInFrames={fps * 2}
      >
        <FinalSequence 
          script={script} 
          textColor={textColor}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const WordAnimation: React.FC<{ 
  word: string; 
  textColor: string; 
  index: number;
  totalWords: number;
}> = ({ word, textColor, index, totalWords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Spring animation for entrance
  const scale = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 400 }
  });
  
  // Opacity animation
  const durationFrames = fps / 5; // 6 frames for each word at 30fps
  const opacity = interpolate(
    frame,
    [0, 2, durationFrames - 2, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Dynamic font size based on word importance
  const baseFontSize = 80;
  const fontSize = index % 2 === 0 ? baseFontSize * 1.2 : baseFontSize;
  
  return (
    <AbsoluteFill>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: `${fontSize}px`,
          fontWeight: index % 3 === 0 ? 900 : 700, // Vary weights
          color: textColor,
          textAlign: 'center',
          transform: `scale(${scale})`,
          opacity,
          letterSpacing: '0.02em',
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

const FinalSequence: React.FC<{ 
  script: string[]; 
  textColor: string;
}> = ({ script, textColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Entrance animation
  const entranceScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 200 }
  });
  
  // Breathing animation
  const breathe = Math.sin(frame * 0.1) * 0.05 + 1;
  
  return (
    <AbsoluteFill>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '20px',
          transform: `scale(${entranceScale * breathe})`,
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '48px',
            fontWeight: 900,
            color: textColor,
            textAlign: 'center',
            letterSpacing: '0.1em',
          }}
        >
          {script.join(' ')}
        </div>
        <div
          style={{
            width: '200px',
            height: '4px',
            backgroundColor: textColor,
            borderRadius: '2px',
            opacity: interpolate(
              frame,
              [fps * 0.5, fps * 1],
              [0, 1],
              { extrapolateRight: 'clamp' }
            ),
          }}
        />
      </div>
    </AbsoluteFill>
  );
}; 