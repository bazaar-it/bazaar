"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

interface IsaiahKineticV2Props {
  theme?: 'light' | 'dark';
}

export const IsaiahKineticV2Composition: React.FC<IsaiahKineticV2Props> = ({ 
  theme = 'dark' 
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  const backgroundColor = theme === 'dark' ? '#000000' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const accentColor = '#FF6B35'; // Bright orange accent color
  const verseColor = '#9CA3AF'; // Gray for verse references
  
  // Enhanced script with 3 stylistic modes and updated timing
  const scriptElements = [
    // Isaiah 41:10 - Verse Reference (Mode 2: Phrase Composition)
    { type: 'phrase2d', words: ["Isaiah", "41:10"], duration: 30, color: verseColor, animation: 'layout1', mode: 2 },
    { type: 'pause', duration: 20 },
    
    // Mode 1: RSVP sequence with updated timing
    { type: 'rsvp', word: "Fear", duration: 8, emphasis: false, animation: 'slideDown', mode: 1 },
    { type: 'rsvp', word: "NOT,", duration: 30, emphasis: true, animation: 'scale', mode: 1 }, // Emphasis: 20-40 frames
    { type: 'rsvp', word: "for", duration: 8, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'rsvp', word: "I", duration: 8, emphasis: false, animation: 'slideLeft', mode: 1 },
    { type: 'rsvp', word: "am", duration: 8, emphasis: false, animation: 'blur', mode: 1 },
    { type: 'rsvp', word: "with", duration: 10, emphasis: false, animation: 'slideRight', mode: 1 },
    { type: 'rsvp', word: "YOU;", duration: 35, emphasis: true, animation: 'scale', mode: 1 },
    
    // Mode 2: Phrase Composition (2D plane with interesting layout)
    { type: 'phrase2d', words: ["be", "not", "dismayed"], duration: 60, animation: 'layout2', mode: 2 },
    
    // Mode 1: RSVP continues
    { type: 'rsvp', word: "for", duration: 8, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'rsvp', word: "I", duration: 8, emphasis: false, animation: 'characterReveal', mode: 1 },
    { type: 'rsvp', word: "am", duration: 8, emphasis: false, animation: 'blur', mode: 1 },
    { type: 'rsvp', word: "your", duration: 10, emphasis: false, animation: 'slideLeft', mode: 1 },
    { type: 'rsvp', word: "GOD;", duration: 40, emphasis: true, color: accentColor, animation: 'scale', mode: 1 },
    
    // Mode 3: 3D Spatial Typography
    { type: 'spatial3d', words: ["I", "will", "strengthen", "you"], duration: 80, animation: 'flyThrough', mode: 3 },
    { type: 'spatial3d', words: ["I", "will", "help", "you"], duration: 80, animation: 'rotate', mode: 3 },
    { type: 'spatial3d', words: ["I", "will", "uphold", "you"], duration: 80, animation: 'tunnel', mode: 3 },
    
    // Mode 2: Final powerful phrase with dramatic layout
    { type: 'phrase2d', words: ["with", "my", "righteous", "right", "hand"], duration: 100, emphasis: true, color: accentColor, animation: 'layout3', mode: 2 },
    
    { type: 'pause', duration: 40 },
    
    // 2 Corinthians 4:16-18
    { type: 'phrase2d', words: ["2", "Corinthians", "4:16-18"], duration: 40, color: verseColor, animation: 'layout1', mode: 2 },
    
    // Mode 2: Key phrase with dramatic emphasis
    { type: 'phrase2d', words: ["So", "we", "do", "not", "lose", "heart"], duration: 90, emphasis: true, animation: 'layout4', mode: 2 },
    
    // Mode 1: RSVP with updated timing
    { type: 'rsvp', word: "Though", duration: 10, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'rsvp', word: "our", duration: 8, emphasis: false, animation: 'slideLeft', mode: 1 },
    { type: 'rsvp', word: "outer", duration: 10, emphasis: false, animation: 'blur', mode: 1 },
    { type: 'rsvp', word: "self", duration: 10, emphasis: false, animation: 'slideRight', mode: 1 },
    { type: 'rsvp', word: "is", duration: 8, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'rsvp', word: "wasting", duration: 12, emphasis: false, animation: 'slideDown', mode: 1 },
    { type: 'rsvp', word: "away,", duration: 10, emphasis: false, animation: 'blur', mode: 1 },
    
    // Mode 3: 3D transformation sequence
    { type: 'spatial3d', words: ["our", "inner", "self"], duration: 70, animation: 'flyThrough', mode: 3 },
    { type: 'rsvp', word: "is", duration: 8, emphasis: false, animation: 'scale', mode: 1 },
    { type: 'rsvp', word: "being", duration: 10, emphasis: false, animation: 'slideLeft', mode: 1 },
    { type: 'rsvp', word: "RENEWED", duration: 35, emphasis: true, animation: 'slideUp', mode: 1 },
    { type: 'phrase2d', words: ["day", "by", "day"], duration: 60, emphasis: true, animation: 'layout5', mode: 2 },
    
    // Mode 3: Complex 3D sequence
    { type: 'spatial3d', words: ["this", "light", "momentary", "affliction"], duration: 90, animation: 'tunnel', mode: 3 },
    { type: 'spatial3d', words: ["is", "preparing", "for", "us"], duration: 70, animation: 'rotate', mode: 3 },
    { type: 'spatial3d', words: ["an", "eternal", "weight", "of", "GLORY"], duration: 100, emphasis: true, color: accentColor, animation: 'flyThrough', mode: 3 },
    
    // Mode 2: Contrast section
    { type: 'phrase2d', words: ["the", "things", "that", "are", "seen"], duration: 80, animation: 'layout6', mode: 2 },
    { type: 'rsvp', word: "are", duration: 8, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'rsvp', word: "TRANSIENT,", duration: 25, emphasis: true, animation: 'blur', mode: 1 },
    
    { type: 'phrase2d', words: ["but", "the", "things", "unseen"], duration: 70, animation: 'layout7', mode: 2 },
    { type: 'rsvp', word: "are", duration: 8, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'rsvp', word: "ETERNAL.", duration: 50, emphasis: true, color: accentColor, animation: 'scale', mode: 1 },
  ];
  
  let currentFrame = 0;
  let animationCounter = 0;
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {scriptElements.map((element, index) => {
        const startFrame = currentFrame;
        const duration = element.duration;
        const pauseDuration = element.pause || 0;
        
        currentFrame += duration + pauseDuration;
        animationCounter++;
        
        if (element.type === 'pause') {
          return null;
        }
        
        if (element.type === 'rsvp') {
          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={duration}
            >
              <RSVPAnimation 
                word={element.word || ''}
                textColor={element.color || textColor}
                emphasis={element.emphasis || false}
                duration={duration}
                animation={element.animation || 'fade'}
                animationIndex={animationCounter}
              />
            </Sequence>
          );
        }
        
        if (element.type === 'phrase2d') {
          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={duration}
            >
              <Phrase2DAnimation 
                words={element.words || []}
                textColor={element.color || textColor}
                emphasis={element.emphasis || false}
                duration={duration}
                animation={element.animation || 'layout1'}
                animationIndex={animationCounter}
              />
            </Sequence>
          );
        }
        
        if (element.type === 'spatial3d') {
          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={duration}
            >
              <Spatial3DAnimation 
                words={element.words || []}
                textColor={element.color || textColor}
                emphasis={element.emphasis || false}
                duration={duration}
                animation={element.animation || 'flyThrough'}
                animationIndex={animationCounter}
              />
            </Sequence>
          );
        }
        
        return null;
      })}
      
      {/* Abstract visual elements */}
      <AbstractVisualElements 
        frame={frame}
        textColor={textColor}
        accentColor={accentColor}
      />
    </AbsoluteFill>
  );
};

// Mode 1: RSVP Animation
const RSVPAnimation: React.FC<{ 
  word: string; 
  textColor: string; 
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ word, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  
  let fontSize = emphasis ? 100 : 75;
  let fontWeight = emphasis ? 900 : 600;
  let letterSpacing = emphasis ? '0.05em' : '0.02em';
  
  // Animation effects with motion blur
  let transform = '';
  let opacity = 1;
  let filter = '';
  
  const animationDuration = Math.min(duration * 0.3, 10);
  const holdStart = Math.ceil(animationDuration) + 1;
  const holdEnd = Math.max(holdStart + 1, duration - Math.ceil(animationDuration) - 1);
  
  // Ensure input range is strictly increasing
  const inputRange = [0, animationDuration, holdStart, holdEnd, duration];
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
      const scale = interpolate(frame, [0, animationDuration], [0.7, 1], { extrapolateRight: 'clamp' });
      const exitScale = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [1, 0.7], { extrapolateRight: 'clamp' }) : 1;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `scale(${scale * exitScale})`;
      // Motion blur during scaling
      filter = frame < animationDuration || frame > holdEnd ? 'blur(1px)' : '';
      break;
      
    case 'slideUp':
      const slideY = interpolate(frame, [0, animationDuration], [120, 0], { extrapolateRight: 'clamp' });
      const exitY = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, -120], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateY(${slideY + exitY}px)`;
      // Motion blur during movement
      filter = Math.abs(slideY + exitY) > 10 ? `blur(${Math.abs(slideY + exitY) * 0.02}px)` : '';
      break;
      
    case 'slideDown':
      const slideDownY = interpolate(frame, [0, animationDuration], [-120, 0], { extrapolateRight: 'clamp' });
      const exitDownY = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 120], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateY(${slideDownY + exitDownY}px)`;
      filter = Math.abs(slideDownY + exitDownY) > 10 ? `blur(${Math.abs(slideDownY + exitDownY) * 0.02}px)` : '';
      break;
      
    case 'slideLeft':
      const slideX = interpolate(frame, [0, animationDuration], [250, 0], { extrapolateRight: 'clamp' });
      const exitX = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, -250], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateX(${slideX + exitX}px)`;
      filter = Math.abs(slideX + exitX) > 10 ? `blur(${Math.abs(slideX + exitX) * 0.02}px)` : '';
      break;
      
    case 'slideRight':
      const slideRightX = interpolate(frame, [0, animationDuration], [-250, 0], { extrapolateRight: 'clamp' });
      const exitRightX = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 250], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateX(${slideRightX + exitRightX}px)`;
      filter = Math.abs(slideRightX + exitRightX) > 10 ? `blur(${Math.abs(slideRightX + exitRightX) * 0.02}px)` : '';
      break;
      
    case 'blur':
      const blurAmount = frame < animationDuration ? interpolate(frame, [0, animationDuration], [15, 0], { extrapolateRight: 'clamp' }) : 
                        frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 15], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      filter = `blur(${blurAmount}px)`;
      break;
      
    case 'characterReveal':
      opacity = interpolate(frame, inputRange, [0, 1, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      const revealScale = interpolate(frame, [0, animationDuration], [1.2, 1], { extrapolateRight: 'clamp' });
      transform = `scale(${revealScale})`;
      filter = frame < animationDuration ? 'blur(0.5px)' : '';
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
          filter,
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

// Mode 2: Phrase Composition (2D plane with interesting layouts)
const Phrase2DAnimation: React.FC<{ 
  words: string[]; 
  textColor: string; 
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ words, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  
  let fontSize = emphasis ? 90 : 70;
  let fontWeight = emphasis ? 900 : 600;
  
  const animationDuration = Math.min(duration * 0.25, 20);
  const holdStart = Math.ceil(animationDuration) + 1;
  const holdEnd = Math.max(holdStart + 1, duration - Math.ceil(animationDuration) - 1);
  
  const inputRange = [0, animationDuration, holdStart, holdEnd, duration];
  for (let i = 1; i < inputRange.length; i++) {
    const current = inputRange[i];
    const previous = inputRange[i-1];
    if (current !== undefined && previous !== undefined && current <= previous) {
      inputRange[i] = previous + 1;
    }
  }
  
  const opacity = interpolate(frame, inputRange, [0, 1, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  const renderLayout = () => {
    switch (animation) {
      case 'layout1': // Simple centered layout
        return (
          <div style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                opacity: interpolate(frame, [animationDuration + i * 3, animationDuration + i * 3 + 10], [0, 1], { extrapolateRight: 'clamp' })
              }}>
                {word}
              </div>
            ))}
          </div>
        );
        
      case 'layout2': // Diagonal cascade
        return (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                position: 'absolute',
                fontSize: `${fontSize - i * 10}px`,
                fontWeight,
                color: textColor,
                transform: `translate(${i * 50 - 100}px, ${i * 30 - 45}px) rotate(${i * 5}deg)`,
                opacity: interpolate(frame, [animationDuration + i * 5, animationDuration + i * 5 + 15], [0, 1], { extrapolateRight: 'clamp' })
              }}>
                {word}
              </div>
            ))}
          </div>
        );
        
      case 'layout3': // Circular arrangement
        return (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {words.map((word, i) => {
              const angle = (i / words.length) * 2 * Math.PI;
              const radius = 150;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  color: textColor,
                  transform: `translate(${x}px, ${y}px)`,
                  opacity: interpolate(frame, [animationDuration + i * 4, animationDuration + i * 4 + 12], [0, 1], { extrapolateRight: 'clamp' })
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      case 'layout4': // Vertical stack with scale variation
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '15px'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                fontSize: `${fontSize + (i % 2 === 0 ? 20 : -10)}px`,
                fontWeight,
                color: textColor,
                transform: `scale(${1 + Math.sin(frame * 0.1 + i) * 0.1})`,
                opacity: interpolate(frame, [animationDuration + i * 6, animationDuration + i * 6 + 18], [0, 1], { extrapolateRight: 'clamp' })
              }}>
                {word}
              </div>
            ))}
          </div>
        );
        
      case 'layout5': // Wave formation
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '30px'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                transform: `translateY(${Math.sin(frame * 0.2 + i * 1.5) * 20}px)`,
                opacity: interpolate(frame, [animationDuration + i * 4, animationDuration + i * 4 + 12], [0, 1], { extrapolateRight: 'clamp' })
              }}>
                {word}
              </div>
            ))}
          </div>
        );
        
      case 'layout6': // Overlapping layers
        return (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                position: 'absolute',
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                transform: `translateX(${i * 20}px)`,
                opacity: interpolate(frame, [animationDuration + i * 3, animationDuration + i * 3 + 15], [0, 0.8 - i * 0.1], { extrapolateRight: 'clamp' })
              }}>
                {word}
              </div>
            ))}
          </div>
        );
        
      case 'layout7': // Cross formation
        return (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {words.map((word, i) => {
              const positions = [
                { x: 0, y: -60 },    // top
                { x: -80, y: 0 },    // left
                { x: 80, y: 0 },     // right
                { x: 0, y: 60 }      // bottom
              ];
              const pos = positions[i % positions.length];
              return (
                <div key={i} style={{
                  position: 'absolute',
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  color: textColor,
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  opacity: interpolate(frame, [animationDuration + i * 5, animationDuration + i * 5 + 15], [0, 1], { extrapolateRight: 'clamp' })
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      default:
        return <div>{words.join(' ')}</div>;
    }
  };
  
  return (
    <AbsoluteFill>
      <div style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        opacity,
        filter: frame < animationDuration ? 'blur(0.5px)' : ''
      }}>
        {renderLayout()}
      </div>
    </AbsoluteFill>
  );
};

// Mode 3: 3D Spatial Typography
const Spatial3DAnimation: React.FC<{ 
  words: string[]; 
  textColor: string; 
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ words, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  let fontSize = emphasis ? 85 : 65;
  let fontWeight = emphasis ? 900 : 600;
  
  const progress = frame / duration;
  
  const render3DScene = () => {
    switch (animation) {
      case 'flyThrough':
        // Camera flies through text arranged in 3D space
        return (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            perspective: '1000px',
            overflow: 'hidden'
          }}>
            {words.map((word, i) => {
              const z = interpolate(progress, [0, 1], [300 + i * 200, -500 - i * 200]);
              const scale = Math.max(0.1, (1000 / (1000 - z)));
              const opacity = z > -100 && z < 500 ? 1 : 0;
              
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: '50%',
                  top: `${40 + i * 15}%`,
                  fontSize: `${fontSize * scale}px`,
                  fontWeight,
                  color: textColor,
                  transform: `translateX(-50%) translateZ(${z}px) scale(${scale})`,
                  opacity,
                  filter: Math.abs(z) > 100 ? `blur(${Math.abs(z) * 0.01}px)` : ''
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      case 'rotate':
        // Text rotates in 3D space around Y-axis
        return (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            perspective: '1200px'
          }}>
            {words.map((word, i) => {
              const rotationY = interpolate(progress, [0, 1], [0, 360]) + i * 90;
              const radius = 200;
              const x = Math.sin((rotationY * Math.PI) / 180) * radius;
              const z = Math.cos((rotationY * Math.PI) / 180) * radius;
              const scale = Math.max(0.3, (1200 / (1200 - z)));
              
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: '50%',
                  top: `${45 + i * 5}%`,
                  fontSize: `${fontSize * scale}px`,
                  fontWeight,
                  color: textColor,
                  transform: `translateX(-50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotationY}deg)`,
                  opacity: scale > 0.5 ? 1 : 0.5,
                  filter: scale < 0.7 ? `blur(${(1 - scale) * 3}px)` : ''
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      case 'tunnel':
        // Text forms tunnel walls that camera moves through
        return (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            perspective: '800px'
          }}>
            {words.map((word, i) => {
              const tunnelProgress = interpolate(progress, [0, 1], [0, words.length]);
              const wordProgress = Math.max(0, Math.min(1, tunnelProgress - i));
              const z = interpolate(wordProgress, [0, 1], [500, -200]);
              const rotationX = interpolate(wordProgress, [0, 1], [0, 90]);
              const scale = Math.max(0.2, (800 / (800 - z)));
              
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: '50%',
                  top: `${30 + (i % 2) * 40}%`,
                  fontSize: `${fontSize * scale}px`,
                  fontWeight,
                  color: textColor,
                  transform: `translateX(-50%) translateZ(${z}px) rotateX(${rotationX}deg) scale(${scale})`,
                  opacity: wordProgress > 0 ? Math.min(1, scale) : 0,
                  filter: scale < 0.5 ? `blur(${(1 - scale) * 4}px)` : ''
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      default:
        return <div>{words.join(' ')}</div>;
    }
  };
  
  return (
    <AbsoluteFill>
      <div style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        width: '100%',
        height: '100%'
      }}>
        {render3DScene()}
      </div>
    </AbsoluteFill>
  );
};

// Abstract visual elements to complement typography
const AbstractVisualElements: React.FC<{
  frame: number;
  textColor: string;
  accentColor: string;
}> = ({ frame, textColor, accentColor }) => {
  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
      {/* Animated lines */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: `${10 + Math.sin(frame * 0.02) * 20}%`,
        width: '60px',
        height: '2px',
        background: accentColor,
        opacity: 0.6,
        transform: `rotate(${frame * 0.5}deg)`
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: `${15 + Math.cos(frame * 0.03) * 15}%`,
        width: '40px',
        height: '2px',
        background: textColor,
        opacity: 0.3,
        transform: `rotate(${-frame * 0.3}deg)`
      }} />
      
      {/* Floating circles */}
      <div style={{
        position: 'absolute',
        top: `${30 + Math.sin(frame * 0.05) * 10}%`,
        right: '10%',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: accentColor,
        opacity: Math.sin(frame * 0.1) * 0.5 + 0.5
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: `${20 + Math.cos(frame * 0.04) * 8}%`,
        left: '8%',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: textColor,
        opacity: 0.4
      }} />
    </div>
  );
}; 