"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

interface BazaarV3KineticProps {
  theme?: 'light' | 'dark';
}

export const BazaarV3KineticComposition: React.FC<BazaarV3KineticProps> = ({ 
  theme = 'dark' 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const backgroundColor = theme === 'dark' ? '#000000' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const accentColor = '#3B82F6'; // Blue accent for "Bazaar"
  
  // Script broken down with emphasis markers
  const scriptWords = [
    { word: "This", emphasis: false },
    { word: "is", emphasis: false },
    { word: "BAZAAR", emphasis: true, color: accentColor },
    { word: "V3", emphasis: true },
    { word: "Bazaar", emphasis: true, color: accentColor },
    { word: "makes", emphasis: false },
    { word: "it", emphasis: false },
    { word: "EASY", emphasis: true },
    { word: "to", emphasis: false },
    { word: "create", emphasis: false },
    { word: "MOTION", emphasis: true },
    { word: "GRAPHIC", emphasis: true },
    { word: "videos", emphasis: false },
    { word: "like", emphasis: false },
    { word: "THIS", emphasis: true },
    // Pause section
    { word: "This", emphasis: false },
    { word: "is", emphasis: false },
    { word: "the", emphasis: false },
    { word: "NEW", emphasis: true },
    { word: "Typography", emphasis: true, color: accentColor },
    { word: "TOOL", emphasis: true },
    // Pause section
    { word: "Just", emphasis: false },
    { word: "PASTE", emphasis: true },
    { word: "in", emphasis: false },
    { word: "a", emphasis: false },
    { word: "script", emphasis: false },
    { word: "and", emphasis: false },
    { word: "Bazaar", emphasis: true, color: accentColor },
    { word: "will", emphasis: false },
    { word: "MAKE", emphasis: true },
    { word: "the", emphasis: false },
    { word: "VIDEO", emphasis: true },
    // Pause section
    { word: "Want", emphasis: false },
    { word: "to", emphasis: false },
    { word: "ADD", emphasis: true },
    { word: "a", emphasis: false },
    { word: "video?", emphasis: false },
    { word: "EASY", emphasis: true, color: accentColor },
    // Pause section
    { word: "Want", emphasis: false },
    { word: "to", emphasis: false },
    { word: "EDIT", emphasis: true },
    { word: "it?", emphasis: false },
    { word: "Just", emphasis: false },
    { word: "PROMPT", emphasis: true },
    { word: "it", emphasis: false },
    // Final section
    { word: "TRY", emphasis: true },
    { word: "BAZAAR", emphasis: true, color: accentColor },
    { word: "yourself", emphasis: false },
  ];
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* RSVP (Rapid Serial Visual Presentation) - 4 words per second for better readability */}
      {scriptWords.map((wordObj, index) => {
        const startFrame = index * (fps / 4); // 4 words per second
        const durationFrames = fps / 4; // Each word shows for 1/4 second
        
        // Add pauses at key moments
        const pauseIndices = [14, 20, 31, 37, 45]; // After major sentences
        let adjustedStartFrame = startFrame;
        
        for (const pauseIndex of pauseIndices) {
          if (index > pauseIndex) {
            adjustedStartFrame += fps * 0.5; // Add 0.5 second pause
          }
        }
        
        return (
          <Sequence
            key={index}
            from={adjustedStartFrame}
            durationInFrames={durationFrames}
          >
            <BazaarWordAnimation 
              word={wordObj.word}
              textColor={wordObj.color || textColor}
              emphasis={wordObj.emphasis}
              index={index}
              totalWords={scriptWords.length}
            />
          </Sequence>
        );
      })}
      
      {/* Final emphasis - show "BAZAAR V3" */}
      <Sequence
        from={scriptWords.length * (fps / 4) + (fps * 2.5)} // After all words + pauses
        durationInFrames={fps * 3}
      >
        <BazaarFinalSequence 
          textColor={textColor}
          accentColor={accentColor}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const BazaarWordAnimation: React.FC<{ 
  word: string; 
  textColor: string; 
  emphasis: boolean;
  index: number;
  totalWords: number;
}> = ({ word, textColor, emphasis, index, totalWords }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Dynamic entrance animations
  const entranceType = index % 4;
  
  let scale = 1;
  let translateX = 0;
  
  switch (entranceType) {
    case 0:
      // Scale up
      scale = spring({ frame, fps, config: { damping: 100, stiffness: 400 } });
      break;
    case 1:
      // Slide from left
      translateX = interpolate(frame, [0, 15], [-200, 0], { extrapolateRight: 'clamp' });
      break;
    case 2:
      // Slide from right
      translateX = interpolate(frame, [0, 15], [200, 0], { extrapolateRight: 'clamp' });
      break;
    case 3:
      // Scale with rotation
      scale = spring({ frame, fps, config: { damping: 80, stiffness: 300 } });
      break;
  }
  
  // Opacity animation
  const durationFrames = fps / 4;
  const opacity = interpolate(
    frame,
    [0, 3, durationFrames - 3, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Dynamic font size based on emphasis
  const baseFontSize = emphasis ? 100 : 70;
  const fontSize = word === "BAZAAR" ? 120 : baseFontSize;
  const fontWeight = emphasis ? 900 : 600;
  
  // Subtle rotation for emphasis
  const rotation = emphasis ? Math.sin(frame * 0.3) * 2 : 0;
  
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
          fontWeight,
          color: textColor,
          textAlign: 'center',
          transform: `translateX(${translateX}px) scale(${scale}) rotate(${rotation}deg)`,
          opacity,
          letterSpacing: emphasis ? '0.05em' : '0.02em',
          textShadow: emphasis ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

const BazaarFinalSequence: React.FC<{ 
  textColor: string;
  accentColor: string;
}> = ({ textColor, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Entrance animation
  const entranceScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 200 }
  });
  
  // Pulsing animation for "BAZAAR"
  const pulse = 1 + Math.sin(frame * 0.2) * 0.1;
  
  // Gradient line animation
  const lineWidth = interpolate(
    frame,
    [fps * 0.5, fps * 1.5],
    [0, 300],
    { extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '30px',
          transform: `scale(${entranceScale})`,
        }}
      >
        {/* Main logo */}
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '80px',
            fontWeight: 900,
            color: accentColor,
            textAlign: 'center',
            letterSpacing: '0.1em',
            transform: `scale(${pulse})`,
            textShadow: '0 0 30px rgba(59, 130, 246, 0.6)',
          }}
        >
          BAZAAR
        </div>
        
        {/* Version */}
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '48px',
            fontWeight: 300,
            color: textColor,
            textAlign: 'center',
            letterSpacing: '0.2em',
          }}
        >
          V3
        </div>
        
        {/* Animated line */}
        <div
          style={{
            width: `${lineWidth}px`,
            height: '4px',
            background: `linear-gradient(90deg, ${accentColor}, transparent)`,
            borderRadius: '2px',
          }}
        />
        
        {/* Tagline */}
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '24px',
            fontWeight: 400,
            color: textColor,
            textAlign: 'center',
            opacity: interpolate(
              frame,
              [fps * 1, fps * 2],
              [0, 1],
              { extrapolateRight: 'clamp' }
            ),
          }}
        >
          Motion Graphics Made Easy
        </div>
      </div>
    </AbsoluteFill>
  );
}; 