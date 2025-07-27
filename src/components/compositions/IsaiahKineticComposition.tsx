"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

interface IsaiahKineticProps {
  theme?: 'light' | 'dark';
}

export const IsaiahKineticComposition: React.FC<IsaiahKineticProps> = ({ 
  theme = 'dark' 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const backgroundColor = theme === 'dark' ? '#000000' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const accentColor = '#FFD700'; // Gold for divine references
  const verseColor = '#9CA3AF'; // Gray for verse references
  
  // Script with intelligent RSVP/Phrase Display switching and varied animations
  const scriptElements = [
    // Isaiah 41:10 - Verse Reference
    { type: 'phrase', words: ["Isaiah", "41:10"], duration: 20, color: verseColor, animation: 'fade' },
    { type: 'single', word: "~", duration: 10, pause: 15, animation: 'fade' },
    
    // RSVP sequence with varied animations
    { type: 'single', word: "Fear", duration: 6, emphasis: false, animation: 'slideDown' }, // Contextual: fear comes down
    { type: 'single', word: "NOT,", duration: 20, emphasis: true, animation: 'scale' }, // Emphasis
    { type: 'single', word: "for", duration: 5, emphasis: false, animation: 'fade' },
    { type: 'single', word: "I", duration: 5, emphasis: false, animation: 'slideLeft' },
    { type: 'single', word: "am", duration: 5, emphasis: false, animation: 'blur' },
    { type: 'single', word: "with", duration: 6, emphasis: false, animation: 'slideRight' },
    { type: 'single', word: "YOU;", duration: 18, emphasis: true, animation: 'scale', pause: 12 },
    
    // Phrase Display for complete thought
    { type: 'phrase', words: ["be", "not", "dismayed"], duration: 30, animation: 'slideUp', pause: 8 },
    
    // RSVP continues
    { type: 'single', word: "for", duration: 5, emphasis: false, animation: 'fade' },
    { type: 'single', word: "I", duration: 5, emphasis: false, animation: 'characterReveal' },
    { type: 'single', word: "am", duration: 5, emphasis: false, animation: 'blur' },
    { type: 'single', word: "your", duration: 6, emphasis: false, animation: 'slideLeft' },
    { type: 'single', word: "GOD;", duration: 25, emphasis: true, color: accentColor, animation: 'scale', pause: 15 },
    
    // Phrase Display for promise
    { type: 'phrase', words: ["I", "will", "strengthen", "you"], duration: 40, emphasis: true, animation: 'slideUp', pause: 10 },
    { type: 'phrase', words: ["I", "will", "help", "you"], duration: 40, emphasis: true, animation: 'slideDown', pause: 10 },
    
    // Final powerful phrase
    { type: 'phrase', words: ["I", "will", "uphold", "you"], duration: 40, emphasis: true, animation: 'scale' },
    { type: 'phrase', words: ["with", "my", "righteous", "right", "hand"], duration: 50, emphasis: true, color: accentColor, animation: 'slideUp', pause: 30 },
    
    // 2 Corinthians 4:16-18
    { type: 'phrase', words: ["2", "Corinthians", "4:16-18"], duration: 30, color: verseColor, animation: 'fade', pause: 15 },
    
    // Key phrase to break rhythm
    { type: 'phrase', words: ["So", "we", "do", "not", "lose", "heart"], duration: 60, emphasis: true, animation: 'scale', pause: 12 },
    
    // RSVP with contextual animations
    { type: 'single', word: "Though", duration: 7, emphasis: false, animation: 'fade' },
    { type: 'single', word: "our", duration: 5, emphasis: false, animation: 'slideLeft' },
    { type: 'single', word: "outer", duration: 7, emphasis: false, animation: 'blur' },
    { type: 'single', word: "self", duration: 6, emphasis: false, animation: 'slideRight' },
    { type: 'single', word: "is", duration: 5, emphasis: false, animation: 'fade' },
    { type: 'single', word: "wasting", duration: 8, emphasis: false, animation: 'slideDown' }, // Contextual: wasting goes down
    { type: 'single', word: "away,", duration: 7, emphasis: false, animation: 'blur', pause: 8 },
    
    { type: 'single', word: "our", duration: 5, emphasis: false, animation: 'slideUp' },
    { type: 'single', word: "inner", duration: 7, emphasis: false, animation: 'characterReveal' },
    { type: 'single', word: "self", duration: 6, emphasis: false, animation: 'fade' },
    { type: 'single', word: "is", duration: 5, emphasis: false, animation: 'scale' },
    { type: 'single', word: "being", duration: 7, emphasis: false, animation: 'slideLeft' },
    { type: 'single', word: "RENEWED", duration: 22, emphasis: true, animation: 'slideUp' }, // Contextual: renewed goes up
    { type: 'phrase', words: ["day", "by", "day"], duration: 30, emphasis: true, animation: 'scale', pause: 15 },
    
    // Key theological phrase
    { type: 'phrase', words: ["this", "light", "momentary", "affliction"], duration: 40, animation: 'slideDown' },
    { type: 'phrase', words: ["is", "preparing", "for", "us"], duration: 40, animation: 'fade', pause: 8 },
    { type: 'phrase', words: ["an", "eternal", "weight", "of", "GLORY"], duration: 50, emphasis: true, color: accentColor, animation: 'slideUp', pause: 15 },
    
    // Contrast section with varied timing
    { type: 'phrase', words: ["the", "things", "that", "are", "seen"], duration: 50, animation: 'slideLeft' },
    { type: 'single', word: "are", duration: 5, emphasis: false, animation: 'fade' },
    { type: 'single', word: "TRANSIENT,", duration: 20, emphasis: true, animation: 'blur', pause: 12 }, // Contextual: transient blurs away
    
    { type: 'phrase', words: ["but", "the", "things", "unseen"], duration: 40, animation: 'slideRight', pause: 8 },
    { type: 'single', word: "are", duration: 5, emphasis: false, animation: 'fade' },
    { type: 'single', word: "ETERNAL.", duration: 28, emphasis: true, color: accentColor, animation: 'scale', pause: 45 },
  ];
  
  let currentFrame = 0;
  let animationCounter = 0; // Track animation variety
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {scriptElements.map((element, index) => {
        const startFrame = currentFrame;
        const duration = element.duration;
        const pauseDuration = element.pause || 0;
        
        currentFrame += duration + pauseDuration;
        animationCounter++;
        
        if (element.type === 'single') {
          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={duration}
            >
              <IsaiahWordAnimation 
                word={element.word || ''}
                textColor={element.color || textColor}
                emphasis={element.emphasis || false}
                duration={duration}
                animation={element.animation || 'fade'}
                animationIndex={animationCounter}
              />
            </Sequence>
          );
        } else {
          // Phrase Display
          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={duration}
            >
              <IsaiahPhraseAnimation 
                words={element.words || []}
                textColor={element.color || textColor}
                emphasis={element.emphasis || false}
                duration={duration}
                animation={element.animation || 'fade'}
                animationIndex={animationCounter}
              />
            </Sequence>
          );
        }
      })}
      
      {/* Final sequence */}
      <Sequence
        from={currentFrame + 30}
        durationInFrames={fps * 4}
      >
        <IsaiahFinalSequence 
          textColor={textColor}
          accentColor={accentColor}
          verseColor={verseColor}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const IsaiahWordAnimation: React.FC<{ 
  word: string; 
  textColor: string; 
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ word, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  
  // Base styling
  let fontSize = emphasis ? 95 : 70;
  let fontWeight = emphasis ? 900 : 600;
  let letterSpacing = emphasis ? '0.05em' : '0.02em';
  let textShadow = emphasis && textColor === '#FFD700' ? '0 0 30px rgba(255, 215, 0, 0.6)' : 'none';
  
  // Verse references styling
  if (textColor === '#9CA3AF') {
    fontSize = 45;
    fontWeight = 400;
  }
  
  // Animation effects
  let transform = '';
  let opacity = 1;
  let filter = '';
  
  // Ensure we have enough frames for all keyframes
  const minRequiredFrames = 5; // Need at least 5 frames: 0, enter, hold1, hold2, exit
  let animationDuration: number;
  let holdStart: number; 
  let holdEnd: number;
  
  if (duration < minRequiredFrames) {
    // For very short durations, use simplified fade
    const midPoint = Math.floor(duration / 2);
    animationDuration = 1;
    holdStart = midPoint;
    holdEnd = Math.max(holdStart + 1, duration - 1);
  } else {
    animationDuration = Math.min(duration * 0.3, 8);
    holdStart = Math.ceil(animationDuration) + 1;
    holdEnd = Math.max(holdStart + 1, duration - Math.ceil(animationDuration) - 1);
  }
  
  // Ensure input range is strictly increasing for interpolation
  const inputRange = [0, animationDuration, holdStart, holdEnd, duration];
  
  // Validate and fix input range
  for (let i = 1; i < inputRange.length; i++) {
    const current = inputRange[i];
    const previous = inputRange[i-1];
    if (current !== undefined && previous !== undefined && current <= previous) {
      inputRange[i] = previous + 1;
    }
  }
  
  switch (animation) {
    case 'fade':
      opacity = interpolate(frame, inputRange, [0, 1, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
      
    case 'scale':
      const scale = interpolate(frame, [0, animationDuration], [0.8, 1], { extrapolateRight: 'clamp' });
      const exitScale = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [1, 0.8], { extrapolateRight: 'clamp' }) : 1;
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `scale(${scale * exitScale})`;
      break;
      
    case 'slideUp':
      const slideY = interpolate(frame, [0, animationDuration], [100, 0], { extrapolateRight: 'clamp' });
      const exitY = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, -100], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateY(${slideY + exitY}px)`;
      break;
      
    case 'slideDown':
      const slideDownY = interpolate(frame, [0, animationDuration], [-100, 0], { extrapolateRight: 'clamp' });
      const exitDownY = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 100], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateY(${slideDownY + exitDownY}px)`;
      break;
      
    case 'slideLeft':
      const slideX = interpolate(frame, [0, animationDuration], [200, 0], { extrapolateRight: 'clamp' });
      const exitX = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, -200], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateX(${slideX + exitX}px)`;
      break;
      
    case 'slideRight':
      const slideRightX = interpolate(frame, [0, animationDuration], [-200, 0], { extrapolateRight: 'clamp' });
      const exitRightX = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 200], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateX(${slideRightX + exitRightX}px)`;
      break;
      
    case 'blur':
      const blurAmount = frame < animationDuration ? interpolate(frame, [0, animationDuration], [10, 0], { extrapolateRight: 'clamp' }) : 
                        frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 10], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      filter = `blur(${blurAmount}px)`;
      break;
      
    case 'characterReveal':
      // Simplified character reveal with opacity
      opacity = interpolate(frame, [0, animationDuration, holdStart, holdEnd, duration], [0, 1, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      const revealScale = interpolate(frame, [0, animationDuration], [1.1, 1], { extrapolateRight: 'clamp' });
      transform = `scale(${revealScale})`;
      break;
      
    default:
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
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
          transform,
          opacity,
          letterSpacing,
          textShadow,
          filter,
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

const IsaiahPhraseAnimation: React.FC<{ 
  words: string[]; 
  textColor: string; 
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ words, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  
  const phrase = words.join(' ');
  let fontSize = emphasis ? 85 : 65;
  let fontWeight = emphasis ? 900 : 600;
  let letterSpacing = emphasis ? '0.04em' : '0.02em';
  let textShadow = emphasis && textColor === '#FFD700' ? '0 0 25px rgba(255, 215, 0, 0.5)' : 'none';
  
  // Verse references styling
  if (textColor === '#9CA3AF') {
    fontSize = 40;
    fontWeight = 400;
    letterSpacing = '0.1em';
  }
  
  // Animation effects (similar to single word but for phrases)
  let transform = '';
  let opacity = 1;
  let filter = '';
  
  // Ensure we have enough frames for all keyframes in phrases
  const minRequiredFrames = 5;
  let animationDuration: number;
  let holdStart: number; 
  let holdEnd: number;
  
  if (duration < minRequiredFrames) {
    // For very short durations, use simplified fade
    const midPoint = Math.floor(duration / 2);
    animationDuration = 1;
    holdStart = midPoint;
    holdEnd = Math.max(holdStart + 1, duration - 1);
  } else {
    animationDuration = Math.min(duration * 0.2, 15);
    holdStart = Math.ceil(animationDuration) + 1;
    holdEnd = Math.max(holdStart + 1, duration - Math.ceil(animationDuration) - 1);
  }
  
  switch (animation) {
    case 'fade':
      opacity = interpolate(frame, [0, animationDuration, holdStart, holdEnd, duration], [0, 1, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      break;
      
    case 'scale':
      const scale = interpolate(frame, [0, animationDuration], [0.9, 1], { extrapolateRight: 'clamp' });
      const exitScale = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [1, 0.9], { extrapolateRight: 'clamp' }) : 1;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `scale(${scale * exitScale})`;
      break;
      
    case 'slideUp':
      const slideY = interpolate(frame, [0, animationDuration], [80, 0], { extrapolateRight: 'clamp' });
      const exitY = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, -80], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateY(${slideY + exitY}px)`;
      break;
      
    case 'slideDown':
      const slideDownY = interpolate(frame, [0, animationDuration], [-80, 0], { extrapolateRight: 'clamp' });
      const exitDownY = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 80], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateY(${slideDownY + exitDownY}px)`;
      break;
      
    default:
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
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
          transform,
          opacity,
          letterSpacing,
          textShadow,
          filter,
          maxWidth: '80%',
          margin: '0 auto',
        }}
      >
        {phrase}
      </div>
    </AbsoluteFill>
  );
};

const IsaiahFinalSequence: React.FC<{ 
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
          gap: '30px',
          transform: `scale(${entranceScale})`,
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '52px',
            fontWeight: 300,
            color: textColor,
            textAlign: 'center',
            letterSpacing: '0.15em',
          }}
        >
          GOD'S STRENGTH
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          textAlign: 'center'
        }}>
          {['Isaiah 41:10', '2 Corinthians 4:16-18'].map((verse, index) => (
            <div
              key={verse}
              style={{
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '22px',
                fontWeight: 400,
                color: verseColor,
                letterSpacing: '0.1em',
                opacity: interpolate(
                  frame,
                  [fps * (0.5 + index * 0.4), fps * (1 + index * 0.4)],
                  [0, 1],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              {verse}
            </div>
          ))}
        </div>
        
        <div
          style={{
            width: '250px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            opacity: interpolate(
              frame,
              [fps * 1.5, fps * 2.5],
              [0, 1],
              { extrapolateRight: 'clamp' }
            ),
          }}
        />
      </div>
    </AbsoluteFill>
  );
}; 