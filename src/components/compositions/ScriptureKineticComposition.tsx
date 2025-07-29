"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

interface ScriptureKineticProps {
  theme?: 'light' | 'dark';
}

export const ScriptureKineticComposition: React.FC<ScriptureKineticProps> = ({ 
  theme = 'dark' 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const backgroundColor = theme === 'dark' ? '#000000' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const accentColor = '#FFD700'; // Gold accent for divine references
  const verseColor = '#9CA3AF'; // Gray for verse references
  
  // Script with precise timing based on word length and emphasis
  const scriptWords = [
    // Jeremiah 29:11
    { word: "Jeremiah", duration: 8, emphasis: false, color: verseColor },
    { word: "29:11", duration: 6, emphasis: false, color: verseColor },
    { word: "~", duration: 8, emphasis: false, pause: 15 }, // Pause after reference
    
    { word: "For", duration: 5, emphasis: false },
    { word: "I", duration: 5, emphasis: false },
    { word: "know", duration: 6, emphasis: false },
    { word: "the", duration: 5, emphasis: false },
    { word: "PLANS", duration: 20, emphasis: true }, // Power word
    { word: "I", duration: 5, emphasis: false },
    { word: "have", duration: 6, emphasis: false },
    { word: "for", duration: 5, emphasis: false },
    { word: "you,", duration: 7, emphasis: false, pause: 10 }, // Comma pause
    
    { word: "declares", duration: 8, emphasis: false },
    { word: "the", duration: 5, emphasis: false },
    { word: "LORD,", duration: 25, emphasis: true, color: accentColor }, // Divine name
    
    { word: "plans", duration: 7, emphasis: false },
    { word: "for", duration: 5, emphasis: false },
    { word: "WELFARE", duration: 22, emphasis: true }, // Power word
    { word: "and", duration: 5, emphasis: false },
    { word: "not", duration: 5, emphasis: false },
    { word: "for", duration: 5, emphasis: false },
    { word: "EVIL,", duration: 18, emphasis: true, pause: 10 }, // Emphasis + comma
    
    { word: "to", duration: 5, emphasis: false },
    { word: "give", duration: 6, emphasis: false },
    { word: "you", duration: 5, emphasis: false },
    { word: "a", duration: 5, emphasis: false },
    { word: "FUTURE", duration: 24, emphasis: true }, // Power word
    { word: "and", duration: 5, emphasis: false },
    { word: "a", duration: 5, emphasis: false },
    { word: "HOPE.", duration: 28, emphasis: true, pause: 30 }, // Final emphasis + period pause
    
    // Deuteronomy 31:6
    { word: "Deuteronomy", duration: 8, emphasis: false, color: verseColor },
    { word: "31:6", duration: 6, emphasis: false, color: verseColor },
    { word: "~", duration: 8, emphasis: false, pause: 15 },
    
    { word: "Be", duration: 5, emphasis: false },
    { word: "STRONG", duration: 22, emphasis: true }, // Power word
    { word: "and", duration: 5, emphasis: false },
    { word: "COURAGEOUS.", duration: 26, emphasis: true, pause: 15 }, // Power word + period
    
    { word: "Do", duration: 5, emphasis: false },
    { word: "not", duration: 5, emphasis: false },
    { word: "FEAR", duration: 20, emphasis: true }, // Power word
    { word: "or", duration: 5, emphasis: false },
    { word: "be", duration: 5, emphasis: false },
    { word: "in", duration: 5, emphasis: false },
    { word: "dread", duration: 7, emphasis: false },
    { word: "of", duration: 5, emphasis: false },
    { word: "them,", duration: 7, emphasis: false, pause: 10 },
    
    { word: "for", duration: 5, emphasis: false },
    { word: "it", duration: 5, emphasis: false },
    { word: "is", duration: 5, emphasis: false },
    { word: "the", duration: 5, emphasis: false },
    { word: "LORD", duration: 25, emphasis: true, color: accentColor },
    { word: "your", duration: 6, emphasis: false },
    { word: "GOD", duration: 25, emphasis: true, color: accentColor },
    { word: "who", duration: 5, emphasis: false },
    { word: "goes", duration: 6, emphasis: false },
    { word: "with", duration: 6, emphasis: false },
    { word: "you.", duration: 7, emphasis: false, pause: 12 },
    
    { word: "He", duration: 5, emphasis: false },
    { word: "will", duration: 6, emphasis: false },
    { word: "NOT", duration: 18, emphasis: true },
    { word: "leave", duration: 7, emphasis: false },
    { word: "you", duration: 5, emphasis: false },
    { word: "or", duration: 5, emphasis: false },
    { word: "forsake", duration: 8, emphasis: false },
    { word: "you.", duration: 7, emphasis: false, pause: 30 },
    
    // Proverbs 3:5-6
    { word: "Proverbs", duration: 8, emphasis: false, color: verseColor },
    { word: "3:5-6", duration: 7, emphasis: false, color: verseColor },
    { word: "~", duration: 8, emphasis: false, pause: 15 },
    
    { word: "TRUST", duration: 24, emphasis: true }, // Power word
    { word: "in", duration: 5, emphasis: false },
    { word: "the", duration: 5, emphasis: false },
    { word: "LORD", duration: 25, emphasis: true, color: accentColor },
    { word: "with", duration: 6, emphasis: false },
    { word: "all", duration: 5, emphasis: false },
    { word: "your", duration: 6, emphasis: false },
    { word: "HEART,", duration: 22, emphasis: true, pause: 12 }, // Key concept + comma
    
    { word: "and", duration: 5, emphasis: false },
    { word: "do", duration: 5, emphasis: false },
    { word: "NOT", duration: 18, emphasis: true },
    { word: "lean", duration: 6, emphasis: false },
    { word: "on", duration: 5, emphasis: false },
    { word: "your", duration: 6, emphasis: false },
    { word: "own", duration: 5, emphasis: false },
    { word: "understanding.", duration: 8, emphasis: false, pause: 15 },
    
    { word: "In", duration: 5, emphasis: false },
    { word: "ALL", duration: 18, emphasis: true },
    { word: "your", duration: 6, emphasis: false },
    { word: "ways", duration: 6, emphasis: false },
    { word: "ACKNOWLEDGE", duration: 26, emphasis: true }, // Power word
    { word: "him,", duration: 6, emphasis: false, pause: 10 },
    
    { word: "and", duration: 5, emphasis: false },
    { word: "he", duration: 5, emphasis: false },
    { word: "will", duration: 6, emphasis: false },
    { word: "make", duration: 6, emphasis: false },
    { word: "STRAIGHT", duration: 24, emphasis: true }, // Power word
    { word: "your", duration: 6, emphasis: false },
    { word: "PATHS.", duration: 28, emphasis: true, pause: 45 }, // Final emphasis
  ];
  
  let currentFrame = 0;
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {scriptWords.map((wordObj, index) => {
        const startFrame = currentFrame;
        const duration = wordObj.duration;
        const pauseDuration = wordObj.pause || 0;
        
        // Update current frame for next word
        currentFrame += duration + pauseDuration;
        
        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={duration}
          >
            <ScriptureWordAnimation 
              word={wordObj.word}
              textColor={wordObj.color || textColor}
              emphasis={wordObj.emphasis}
              duration={duration}
              index={index}
            />
          </Sequence>
        );
      })}
      
      {/* Final sequence - show all three verse references */}
      <Sequence
        from={currentFrame + 30}
        durationInFrames={fps * 4}
      >
        <ScriptureFinalSequence 
          textColor={textColor}
          accentColor={accentColor}
          verseColor={verseColor}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const ScriptureWordAnimation: React.FC<{ 
  word: string; 
  textColor: string; 
  emphasis: boolean;
  duration: number;
  index: number;
}> = ({ word, textColor, emphasis, duration, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Animation within duration: first/last 1-2 frames with hold in middle
  const fadeInDuration = 2;
  const fadeOutDuration = 2;
  const holdStart = fadeInDuration + 1; // Ensure strictly increasing
  const holdEnd = Math.max(holdStart + 1, duration - fadeOutDuration); // Ensure minimum gap
  
  const opacity = interpolate(
    frame,
    [0, fadeInDuration, holdStart, holdEnd, duration],
    [0, 1, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Scale animation for entrance
  const scale = interpolate(
    frame,
    [0, fadeInDuration],
    [0.8, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Emphasis effects
  let fontSize = 70;
  let fontWeight = 600;
  let letterSpacing = '0.02em';
  let textShadow = 'none';
  let pulseScale = 1;
  
  if (emphasis) {
    fontSize = word.includes('LORD') || word.includes('GOD') ? 110 : 95;
    fontWeight = 900;
    letterSpacing = '0.05em';
    textShadow = textColor === '#FFD700' ? '0 0 30px rgba(255, 215, 0, 0.6)' : '0 0 20px rgba(255, 255, 255, 0.4)';
    
    // Subtle pulse during hold period
    if (frame >= holdStart && frame <= holdEnd) {
      pulseScale = 1 + Math.sin((frame - holdStart) * 0.3) * 0.05;
    }
  }
  
  // Verse references get smaller, italic styling
  if (textColor === '#9CA3AF') {
    fontSize = 45;
    fontWeight = 400;
    letterSpacing = '0.1em';
  }
  
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
          transform: `scale(${scale * pulseScale})`,
          opacity,
          letterSpacing,
          textShadow,
          fontStyle: textColor === '#9CA3AF' ? 'italic' : 'normal',
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

const ScriptureFinalSequence: React.FC<{ 
  textColor: string;
  accentColor: string;
  verseColor: string;
}> = ({ textColor, accentColor, verseColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const entranceScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 200 }
  });
  
  return (
    <AbsoluteFill>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '40px',
          transform: `scale(${entranceScale})`,
        }}
      >
        {/* Main title */}
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '48px',
            fontWeight: 300,
            color: textColor,
            textAlign: 'center',
            letterSpacing: '0.15em',
          }}
        >
          GOD'S PROMISES
        </div>
        
        {/* Verse references */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          textAlign: 'center'
        }}>
          {['Jeremiah 29:11', 'Deuteronomy 31:6', 'Proverbs 3:5-6'].map((verse, index) => (
            <div
              key={verse}
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '24px',
                fontWeight: 400,
                color: verseColor,
                letterSpacing: '0.1em',
                opacity: interpolate(
                  frame,
                  [fps * (0.5 + index * 0.3), fps * (1 + index * 0.3)],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              {verse}
            </div>
          ))}
        </div>
        
        {/* Decorative line */}
        <div
          style={{
            width: '300px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            opacity: interpolate(
              frame,
              [fps * 2, fps * 3],
              [0, 1],
              { extrapolateRight: 'clamp' }
            ),
          }}
        />
      </div>
    </AbsoluteFill>
  );
}; 