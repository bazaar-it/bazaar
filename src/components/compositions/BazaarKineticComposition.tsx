"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

interface BazaarKineticProps {
  theme?: 'light' | 'dark';
}

export const BazaarKineticComposition: React.FC<BazaarKineticProps> = ({ 
  theme = 'dark' 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const backgroundColor = theme === 'dark' ? '#000000' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const accentColor = '#FF4500'; // Bright orange-red accent for key words
  
  // Script optimized for mobile 390×844px with intelligent mode switching
  const scriptElements = [
    // Opening Hook - Phrase Composition for impact
    { type: 'phrase', words: ["Introducing:"], duration: 30, emphasis: false, animation: 'centerFade', mode: 2 },
    { type: 'phrase', words: ["Kinetic", "Typography"], duration: 50, emphasis: true, color: accentColor, animation: 'dramaticScale', mode: 2 },
    { type: 'pause', duration: 20 },
    
    // Action sequence - RSVP for urgency
    { type: 'rsvp', word: "Type", duration: 8, emphasis: false, animation: 'slideUp', mode: 1 },
    { type: 'rsvp', word: "it.", duration: 10, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Watch", duration: 10, emphasis: false, animation: 'slideLeft', mode: 1 },
    { type: 'rsvp', word: "it", duration: 8, emphasis: false, animation: 'blur', mode: 1 },
    { type: 'rsvp', word: "DANCE.", duration: 25, emphasis: true, animation: 'bounce', mode: 1 },
    { type: 'pause', duration: 25 },
    
    // Technical benefits - Phrase Composition for clarity
    { type: 'phrase', words: ["No", "keyframes."], duration: 40, emphasis: false, animation: 'slideStack', mode: 2 },
    { type: 'phrase', words: ["No", "headaches."], duration: 40, emphasis: false, animation: 'slideStack', mode: 2 },
    { type: 'pause', duration: 20 },
    
    // Feature highlights - Mixed modes for variety
    { type: 'rsvp', word: "Call-outs", duration: 12, emphasis: false, animation: 'slideUp', mode: 1 },
    { type: 'rsvp', word: "FLY.", duration: 20, emphasis: true, color: accentColor, animation: 'flyUp', mode: 1 },
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Stats", duration: 10, emphasis: false, animation: 'slideLeft', mode: 1 },
    { type: 'rsvp', word: "PUNCH.", duration: 25, emphasis: true, color: accentColor, animation: 'punch', mode: 1 },
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Headlines", duration: 12, emphasis: false, animation: 'slideRight', mode: 1 },
    { type: 'rsvp', word: "SPRINT.", duration: 25, emphasis: true, color: accentColor, animation: 'sprint', mode: 1 },
    { type: 'pause', duration: 30 },
    
    // Workflow - Phrase Composition for process
    { type: 'phrase', words: ["Mock-up", "→", "Movie."], duration: 60, emphasis: true, animation: 'workflow', mode: 2 },
    { type: 'phrase', words: ["Minutes,", "not", "days."], duration: 50, emphasis: true, animation: 'timeComparison', mode: 2 },
    { type: 'pause', duration: 25 },
    
    // Features list - Mixed modes
    { type: 'phrase', words: ["Auto-brand", "colors."], duration: 40, emphasis: false, animation: 'colorFlow', mode: 2 },
    { type: 'phrase', words: ["Smart", "pacing."], duration: 35, emphasis: false, animation: 'rhythmPulse', mode: 2 },
    { type: 'phrase', words: ["1080,", "4K,", "done."], duration: 45, emphasis: false, animation: 'techSpecs', mode: 2 },
    { type: 'pause', duration: 25 },
    
    // Call to action - RSVP for urgency
    { type: 'rsvp', word: "Ship", duration: 10, emphasis: false, animation: 'slideUp', mode: 1 },
    { type: 'rsvp', word: "the", duration: 8, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'rsvp', word: "DEMO.", duration: 25, emphasis: true, color: accentColor, animation: 'scale', mode: 1 },
    { type: 'pause', duration: 20 },
    { type: 'rsvp', word: "Start", duration: 10, emphasis: false, animation: 'slideLeft', mode: 1 },
    { type: 'rsvp', word: "the", duration: 8, emphasis: false, animation: 'fade', mode: 1 },
    { type: 'rsvp', word: "BUZZ.", duration: 30, emphasis: true, color: accentColor, animation: 'electric', mode: 1 },
    { type: 'pause', duration: 40 },
    
    // Brand closing - Phrase Composition for authority
    { type: 'phrase', words: ["Bazaar.it"], duration: 40, emphasis: true, color: accentColor, animation: 'brandReveal', mode: 2 },
    { type: 'phrase', words: ["AI", "motion", "graphics—"], duration: 50, emphasis: false, animation: 'taglineFlow', mode: 2 },
    { type: 'phrase', words: ["now", "with", "Kinetic", "Typography"], duration: 70, emphasis: true, animation: 'finalReveal', mode: 2 },
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
              <BazaarRSVPAnimation 
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
        
        if (element.type === 'phrase') {
          return (
            <Sequence
              key={index}
              from={startFrame}
              durationInFrames={duration}
            >
              <BazaarPhraseAnimation 
                words={element.words || []}
                textColor={element.color || textColor}
                emphasis={element.emphasis || false}
                duration={duration}
                animation={element.animation || 'centerFade'}
                animationIndex={animationCounter}
              />
            </Sequence>
          );
        }
        
        return null;
      })}
      
      {/* Mobile-optimized abstract visual elements */}
      <MobileVisualElements 
        frame={frame}
        textColor={textColor}
        accentColor={accentColor}
      />
    </AbsoluteFill>
  );
};

// Mode 1: RSVP Animation (optimized for 390×844px mobile)
const BazaarRSVPAnimation: React.FC<{ 
  word: string; 
  textColor: string; 
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ word, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  
  // Mobile-optimized font sizes
  let fontSize = emphasis ? 72 : 52;
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
      
    case 'slideUp':
      const slideY = interpolate(frame, [0, animationDuration], [100, 0], { extrapolateRight: 'clamp' });
      const exitY = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, -100], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateY(${slideY + exitY}px)`;
      filter = Math.abs(slideY + exitY) > 20 ? `blur(${Math.abs(slideY + exitY) * 0.02}px)` : '';
      break;
      
    case 'slideLeft':
      const slideX = interpolate(frame, [0, animationDuration], [150, 0], { extrapolateRight: 'clamp' });
      const exitX = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, -150], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateX(${slideX + exitX}px)`;
      filter = Math.abs(slideX + exitX) > 20 ? `blur(${Math.abs(slideX + exitX) * 0.02}px)` : '';
      break;
      
    case 'slideRight':
      const slideRightX = interpolate(frame, [0, animationDuration], [-150, 0], { extrapolateRight: 'clamp' });
      const exitRightX = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 150], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateX(${slideRightX + exitRightX}px)`;
      filter = Math.abs(slideRightX + exitRightX) > 20 ? `blur(${Math.abs(slideRightX + exitRightX) * 0.02}px)` : '';
      break;
      
    case 'blur':
      const blurAmount = frame < animationDuration ? interpolate(frame, [0, animationDuration], [12, 0], { extrapolateRight: 'clamp' }) : 
                        frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 12], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      filter = `blur(${blurAmount}px)`;
      break;
      
    case 'bounce':
      const bounceScale = 1 + Math.sin(frame * 0.5) * 0.1;
      const scale = interpolate(frame, [0, animationDuration], [0.8, 1], { extrapolateRight: 'clamp' });
      opacity = interpolate(frame, inputRange, [0, 1, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `scale(${scale * bounceScale})`;
      break;
      
    case 'flyUp':
      const flyY = interpolate(frame, [0, animationDuration], [200, 0], { extrapolateRight: 'clamp' });
      const flyExitY = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, -300], { extrapolateRight: 'clamp' }) : 0;
      const flyOpacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateY(${flyY + flyExitY}px)`;
      opacity = flyOpacity;
      filter = Math.abs(flyY + flyExitY) > 50 ? `blur(${Math.abs(flyY + flyExitY) * 0.015}px)` : '';
      break;
      
    case 'punch':
      const punchScale = interpolate(frame, [0, 5, 10, duration], [0.5, 1.3, 1, 1], { extrapolateRight: 'clamp' });
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `scale(${punchScale})`;
      break;
      
    case 'sprint':
      const sprintX = interpolate(frame, [0, animationDuration], [-300, 0], { extrapolateRight: 'clamp' });
      const sprintExitX = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [0, 300], { extrapolateRight: 'clamp' }) : 0;
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `translateX(${sprintX + sprintExitX}px)`;
      filter = Math.abs(sprintX + sprintExitX) > 100 ? `blur(${Math.abs(sprintX + sprintExitX) * 0.01}px)` : '';
      break;
      
    case 'scale':
      const scaleValue = interpolate(frame, [0, animationDuration], [0.7, 1], { extrapolateRight: 'clamp' });
      const exitScale = frame > holdEnd ? interpolate(frame, [holdEnd, duration], [1, 0.7], { extrapolateRight: 'clamp' }) : 1;
      opacity = interpolate(frame, [0, 3, duration - 3, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `scale(${scaleValue * exitScale})`;
      break;
      
    case 'electric':
      const electricScale = 1 + Math.sin(frame * 2) * 0.05;
      const electricRotate = Math.sin(frame * 1.5) * 2;
      opacity = interpolate(frame, [0, 2, duration - 2, duration], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      transform = `scale(${electricScale}) rotate(${electricRotate}deg)`;
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
          lineHeight: 1.1,
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};

// Mode 2: Phrase Composition (mobile-optimized layouts)
const BazaarPhraseAnimation: React.FC<{ 
  words: string[]; 
  textColor: string; 
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ words, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  
  // Mobile-optimized font sizes
  let fontSize = emphasis ? 65 : 48;
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
      case 'centerFade':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '8px'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                opacity: interpolate(frame, [animationDuration + i * 4, animationDuration + i * 4 + 12], [0, 1], { extrapolateRight: 'clamp' }),
                lineHeight: 1.1
              }}>
                {word}
              </div>
            ))}
          </div>
        );
        
      case 'dramaticScale':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '12px'
          }}>
            {words.map((word, i) => {
              const wordScale = interpolate(frame, [animationDuration + i * 6, animationDuration + i * 6 + 15], [0.3, 1], { extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{
                  fontSize: `${fontSize + (i === 1 ? 20 : 0)}px`,
                  fontWeight,
                  color: textColor,
                  transform: `scale(${wordScale})`,
                  opacity: interpolate(frame, [animationDuration + i * 6, animationDuration + i * 6 + 15], [0, 1], { extrapolateRight: 'clamp' }),
                  lineHeight: 1.1
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      case 'slideStack':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '6px'
          }}>
            {words.map((word, i) => {
              const slideY = interpolate(frame, [animationDuration + i * 5, animationDuration + i * 5 + 10], [30, 0], { extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  color: textColor,
                  transform: `translateY(${slideY}px)`,
                  opacity: interpolate(frame, [animationDuration + i * 5, animationDuration + i * 5 + 10], [0, 1], { extrapolateRight: 'clamp' }),
                  lineHeight: 1.1
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      case 'workflow':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '15px',
            flexWrap: 'wrap',
            padding: '0 20px'
          }}>
            {words.map((word, i) => {
              const delay = i * 8;
              const slideX = interpolate(frame, [delay, delay + 15], [i === 0 ? -100 : i === 2 ? 100 : 0, 0], { extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{
                  fontSize: `${fontSize + (i === 1 ? 10 : 0)}px`,
                  fontWeight,
                  color: i === 1 ? '#FF4500' : textColor,
                  transform: `translateX(${slideX}px)`,
                  opacity: interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: 'clamp' }),
                  lineHeight: 1.1
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      case 'timeComparison':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '10px'
          }}>
            {words.map((word, i) => {
              const emphasis = word === 'Minutes,' || word === 'days.';
              return (
                <div key={i} style={{
                  fontSize: `${fontSize + (emphasis ? 8 : 0)}px`,
                  fontWeight: emphasis ? 900 : fontWeight,
                  color: emphasis ? '#FF4500' : textColor,
                  opacity: interpolate(frame, [i * 6, i * 6 + 12], [0, 1], { extrapolateRight: 'clamp' }),
                  lineHeight: 1.1
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      case 'colorFlow':
      case 'rhythmPulse':
      case 'techSpecs':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '8px'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                opacity: interpolate(frame, [i * 5, i * 5 + 10], [0, 1], { extrapolateRight: 'clamp' }),
                transform: animation === 'rhythmPulse' ? `scale(${1 + Math.sin(frame * 0.3 + i) * 0.05})` : 'none',
                lineHeight: 1.1
              }}>
                {word}
              </div>
            ))}
          </div>
        );
        
      case 'brandReveal':
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <div style={{
              fontSize: `${fontSize + 15}px`,
              fontWeight: 900,
              color: textColor,
              transform: `scale(${interpolate(frame, [0, 20], [0.5, 1], { extrapolateRight: 'clamp' })})`,
              opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' }),
              lineHeight: 1.1
            }}>
              {words[0]}
            </div>
          </div>
        );
        
      case 'taglineFlow':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '6px'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                fontSize: `${fontSize - 5}px`,
                fontWeight: 400,
                color: textColor,
                opacity: interpolate(frame, [i * 4, i * 4 + 8], [0, 0.8], { extrapolateRight: 'clamp' }),
                lineHeight: 1.1
              }}>
                {word}
              </div>
            ))}
          </div>
        );
        
      case 'finalReveal':
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '8px'
          }}>
            {words.map((word, i) => {
              const isKinetic = word === 'Kinetic' || word === 'Typography';
              return (
                <div key={i} style={{
                  fontSize: `${fontSize + (isKinetic ? 8 : 0)}px`,
                  fontWeight: isKinetic ? 900 : fontWeight,
                  color: isKinetic ? '#FF4500' : textColor,
                  opacity: interpolate(frame, [i * 6, i * 6 + 15], [0, 1], { extrapolateRight: 'clamp' }),
                  transform: isKinetic ? `scale(${1 + Math.sin(frame * 0.2) * 0.05})` : 'none',
                  lineHeight: 1.1
                }}>
                  {word}
                </div>
              );
            })}
          </div>
        );
        
      default:
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '8px'
          }}>
            {words.map((word, i) => (
              <div key={i} style={{
                fontSize: `${fontSize}px`,
                fontWeight,
                color: textColor,
                lineHeight: 1.1
              }}>
                {word}
              </div>
            ))}
          </div>
        );
    }
  };
  
  return (
    <AbsoluteFill>
      <div style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        opacity,
        filter: frame < animationDuration ? 'blur(0.5px)' : '',
        padding: '0 15px'
      }}>
        {renderLayout()}
      </div>
    </AbsoluteFill>
  );
};

// Mobile-optimized abstract visual elements
const MobileVisualElements: React.FC<{
  frame: number;
  textColor: string;
  accentColor: string;
}> = ({ frame, textColor, accentColor }) => {
  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
      {/* Subtle animated lines for mobile */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: `${5 + Math.sin(frame * 0.02) * 10}%`,
        width: '30px',
        height: '1px',
        background: accentColor,
        opacity: 0.4,
        transform: `rotate(${frame * 0.3}deg)`
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: `${8 + Math.cos(frame * 0.025) * 8}%`,
        width: '20px',
        height: '1px',
        background: textColor,
        opacity: 0.3,
        transform: `rotate(${-frame * 0.2}deg)`
      }} />
      
      {/* Small floating dots */}
      <div style={{
        position: 'absolute',
        top: `${25 + Math.sin(frame * 0.04) * 5}%`,
        right: '12%',
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: accentColor,
        opacity: Math.sin(frame * 0.08) * 0.4 + 0.4
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: `${30 + Math.cos(frame * 0.035) * 6}%`,
        left: '10%',
        width: '3px',
        height: '3px',
        borderRadius: '50%',
        background: textColor,
        opacity: 0.5
      }} />
    </div>
  );
}; 