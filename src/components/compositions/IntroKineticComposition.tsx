"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

interface IntroKineticProps {
  theme?: 'light' | 'dark';
}

export const IntroKineticComposition: React.FC<IntroKineticProps> = ({ 
  theme = 'dark' 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const backgroundColor = theme === 'dark' ? '#000000' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const accentColor = '#00D4FF'; // Bright cyan accent for key words
  
  // Script optimized for mobile 390×844px with intelligent mode switching
  // Following context guidelines: 8-12 frames per word, 20-40 frames for emphasis
  const scriptElements: Array<{
    type: 'phrase' | 'rsvp' | 'pause';
    words?: string[];
    word?: string;
    duration: number;
    emphasis?: boolean;
    color?: string;
    animation?: string;
    mode?: number;
    pause?: number;
  }> = [
    // Opening Hook - Phrase Composition for impact (Mode 2)
    { type: 'phrase', words: ["Introducing:"], duration: 25, emphasis: false, animation: 'centerFade', mode: 2 },
    { type: 'phrase', words: ["Kinetic", "Typography"], duration: 45, emphasis: true, color: accentColor, animation: 'dramaticScale', mode: 2 },
    { type: 'pause', duration: 20 },
    
    // Action sequence - RSVP for urgency (Mode 1)
    { type: 'rsvp', word: "Type", duration: 10, emphasis: false, animation: 'slideUp', mode: 1 }, // 4 chars = 10 frames
    { type: 'rsvp', word: "it.", duration: 8, emphasis: false, animation: 'fade', mode: 1 }, // 3 chars = 8 frames
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Watch", duration: 10, emphasis: false, animation: 'slideLeft', mode: 1 }, // 5 chars = 10 frames
    { type: 'rsvp', word: "it", duration: 8, emphasis: false, animation: 'blur', mode: 1 }, // 2 chars = 8 frames
    { type: 'rsvp', word: "dance.", duration: 30, emphasis: true, animation: 'bounce', mode: 1 }, // Key word = 30 frames emphasis
    { type: 'pause', duration: 25 },
    
    // Technical benefits - Phrase Composition for clarity (Mode 2)
    { type: 'phrase', words: ["No", "keyframes."], duration: 35, emphasis: false, animation: 'slideStack', mode: 2 },
    { type: 'phrase', words: ["No", "headaches."], duration: 35, emphasis: false, animation: 'slideStack', mode: 2 },
    { type: 'pause', duration: 20 },
    
    // Feature highlights - Mixed modes for variety
    { type: 'rsvp', word: "Call-outs", duration: 12, emphasis: false, animation: 'slideUp', mode: 1 }, // 9 chars = 12 frames
    { type: 'rsvp', word: "fly.", duration: 25, emphasis: true, color: accentColor, animation: 'flyUp', mode: 1 }, // Key word
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Stats", duration: 10, emphasis: false, animation: 'slideLeft', mode: 1 }, // 5 chars = 10 frames
    { type: 'rsvp', word: "punch.", duration: 25, emphasis: true, color: accentColor, animation: 'punch', mode: 1 }, // Key word
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Headlines", duration: 12, emphasis: false, animation: 'slideRight', mode: 1 }, // 9 chars = 12 frames
    { type: 'rsvp', word: "sprint.", duration: 25, emphasis: true, color: accentColor, animation: 'sprint', mode: 1 }, // Key word
    { type: 'pause', duration: 30 },
    
    // Workflow - Phrase Composition for process (Mode 2)
    { type: 'phrase', words: ["Mock-up", "→", "Movie."], duration: 50, emphasis: true, animation: 'workflow', mode: 2 },
    { type: 'phrase', words: ["Minutes,", "not", "days."], duration: 45, emphasis: true, animation: 'timeComparison', mode: 2 },
    { type: 'pause', duration: 25 },
    
    // Features list - Phrase Composition for grouped features (Mode 2)
    { type: 'phrase', words: ["Auto-brand", "colors."], duration: 35, emphasis: false, animation: 'colorFlow', mode: 2 },
    { type: 'phrase', words: ["Smart", "pacing."], duration: 30, emphasis: false, animation: 'rhythmPulse', mode: 2 },
    { type: 'phrase', words: ["1080,", "4K,", "done."], duration: 40, emphasis: false, animation: 'techSpecs', mode: 2 },
    { type: 'pause', duration: 25 },
    
    // Call to action - RSVP for urgency (Mode 1)
    { type: 'rsvp', word: "Ship", duration: 10, emphasis: false, animation: 'slideUp', mode: 1 }, // 4 chars = 10 frames
    { type: 'rsvp', word: "the", duration: 8, emphasis: false, animation: 'fade', mode: 1 }, // 3 chars = 8 frames
    { type: 'rsvp', word: "demo.", duration: 25, emphasis: true, color: accentColor, animation: 'scale', mode: 1 }, // Key word
    { type: 'pause', duration: 20 },
    { type: 'rsvp', word: "Start", duration: 10, emphasis: false, animation: 'slideLeft', mode: 1 }, // 5 chars = 10 frames
    { type: 'rsvp', word: "the", duration: 8, emphasis: false, animation: 'fade', mode: 1 }, // 3 chars = 8 frames
    { type: 'rsvp', word: "buzz.", duration: 30, emphasis: true, color: accentColor, animation: 'electric', mode: 1 }, // Key word
    { type: 'pause', duration: 40 },
    
    // Brand closing - Phrase Composition for authority (Mode 2)
    { type: 'phrase', words: ["Bazaar.it"], duration: 35, emphasis: true, color: accentColor, animation: 'brandReveal', mode: 2 },
    { type: 'phrase', words: ["AI", "motion", "graphics—"], duration: 45, emphasis: false, animation: 'taglineFlow', mode: 2 },
    { type: 'phrase', words: ["now", "with"], duration: 30, emphasis: false, animation: 'buildUp', mode: 2 },
    { type: 'phrase', words: ["Kinetic", "Typography"], duration: 60, emphasis: true, color: accentColor, animation: 'finalReveal', mode: 2 },
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
              <IntroRSVPAnimation 
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
              <IntroPhraseAnimation 
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

// RSVP Animation Component (Mode 1: Rapid Serial Visual Presentation)
const IntroRSVPAnimation: React.FC<{
  word: string;
  textColor: string;
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ word, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Calculate font size based on emphasis - fixed size for mobile format
  const fontSize = emphasis ? 72 : 56;
  
  // Animation variants
  const getAnimationStyle = () => {
    const progress = frame / duration;
    const springConfig = { damping: 200, stiffness: 300 };
    
    // Fixed mobile dimensions
    const mobileWidth = 390;
    const mobileHeight = 844;
    
    switch (animation) {
      case 'slideUp':
        const slideUpY = interpolate(frame, [0, duration * 0.3], [mobileHeight * 0.2, 0], { extrapolateRight: 'clamp' });
        const slideUpOpacity = interpolate(frame, [0, duration * 0.3], [0, 1], { extrapolateRight: 'clamp' });
        return { transform: `translateY(${slideUpY}px)`, opacity: slideUpOpacity };
        
      case 'slideLeft':
        const slideLeftX = interpolate(frame, [0, duration * 0.3], [mobileWidth * 0.3, 0], { extrapolateRight: 'clamp' });
        const slideLeftOpacity = interpolate(frame, [0, duration * 0.3], [0, 1], { extrapolateRight: 'clamp' });
        return { transform: `translateX(${slideLeftX}px)`, opacity: slideLeftOpacity };
        
      case 'slideRight':
        const slideRightX = interpolate(frame, [0, duration * 0.3], [-mobileWidth * 0.3, 0], { extrapolateRight: 'clamp' });
        const slideRightOpacity = interpolate(frame, [0, duration * 0.3], [0, 1], { extrapolateRight: 'clamp' });
        return { transform: `translateX(${slideRightX}px)`, opacity: slideRightOpacity };
        
      case 'scale':
        const scaleValue = spring({ frame, fps, config: springConfig, from: 0.3, to: 1 });
        const scaleOpacity = interpolate(frame, [0, duration * 0.2], [0, 1], { extrapolateRight: 'clamp' });
        return { transform: `scale(${scaleValue})`, opacity: scaleOpacity };
        
      case 'bounce':
        const bounceScale = 1 + Math.sin(frame * 0.8) * (emphasis ? 0.1 : 0.05);
        const bounceOpacity = interpolate(frame, [0, duration * 0.2], [0, 1], { extrapolateRight: 'clamp' });
        return { transform: `scale(${bounceScale})`, opacity: bounceOpacity };
        
      case 'blur':
        const blurAmount = interpolate(frame, [0, duration * 0.3], [10, 0], { extrapolateRight: 'clamp' });
        const blurOpacity = interpolate(frame, [0, duration * 0.3], [0, 1], { extrapolateRight: 'clamp' });
        return { filter: `blur(${blurAmount}px)`, opacity: blurOpacity };
        
      case 'flyUp':
        const flyUpY = interpolate(frame, [0, duration * 0.4], [mobileHeight * 0.5, 0], { extrapolateRight: 'clamp' });
        const flyUpScale = spring({ frame, fps, config: { damping: 150, stiffness: 400 }, from: 0.5, to: 1.2 });
        return { transform: `translateY(${flyUpY}px) scale(${flyUpScale})` };
        
      case 'punch':
        const punchScale = frame < duration * 0.3 ? 
          interpolate(frame, [0, duration * 0.3], [1, 1.3], { extrapolateRight: 'clamp' }) :
          interpolate(frame, [duration * 0.3, duration * 0.6], [1.3, 1], { extrapolateRight: 'clamp' });
        return { transform: `scale(${punchScale})` };
        
      case 'sprint':
        const sprintX = interpolate(frame, [0, duration * 0.2], [-mobileWidth, 0], { extrapolateRight: 'clamp' });
        const motionBlur = Math.abs(sprintX) > 50 ? `blur(${Math.abs(sprintX) * 0.02}px)` : 'none';
        return { transform: `translateX(${sprintX}px)`, filter: motionBlur };
        
      case 'electric':
        const electricShake = Math.sin(frame * 2) * (emphasis ? 3 : 1);
        const electricGlow = Math.sin(frame * 0.5) * 0.5 + 0.5;
        return { 
          transform: `translateX(${electricShake}px)`,
          textShadow: `0 0 ${20 + electricGlow * 30}px ${textColor}`
        };
        
      default: // fade
        const opacity = interpolate(frame, [0, duration * 0.3], [0, 1], { extrapolateRight: 'clamp' });
        return { opacity };
    }
  };
  
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          ...getAnimationStyle(),
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: `${fontSize}px`,
            fontWeight: emphasis ? 900 : 600,
            color: textColor,
            letterSpacing: emphasis ? '0.1em' : '0.05em',
            textTransform: emphasis ? 'uppercase' : 'none',
            lineHeight: 1.2,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
          }}
        >
          {word}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Phrase Animation Component (Mode 2: Phrase Composition)
const IntroPhraseAnimation: React.FC<{
  words: string[];
  textColor: string;
  emphasis: boolean;
  duration: number;
  animation: string;
  animationIndex: number;
}> = ({ words, textColor, emphasis, duration, animation, animationIndex }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Fixed font size for mobile format
  const fontSize = emphasis ? 60 : 44;
  
  const getLayoutAnimation = () => {
    const progress = frame / duration;
    
    switch (animation) {
      case 'dramaticScale':
        const dramaticScale = spring({ 
          frame, 
          fps, 
          config: { damping: 200, stiffness: 200 }, 
          from: 0.2, 
          to: 1 
        });
        return {
          containerStyle: { transform: `scale(${dramaticScale})` },
          layout: 'stacked'
        };
        
      case 'slideStack':
        return {
          containerStyle: {},
          layout: 'horizontal',
          wordDelay: 5 // frames between word appearances
        };
        
      case 'workflow':
        return {
          containerStyle: { 
            gap: '20px',
            alignItems: 'center'
          },
          layout: 'horizontal'
        };
        
      case 'timeComparison':
        return {
          containerStyle: {},
          layout: 'emphasis', // Emphasize "not"
          emphasisWord: 1 // Index of word to emphasize
        };
        
      case 'colorFlow':
        const colorShift = Math.sin(frame * 0.1) * 0.3;
        return {
          containerStyle: { filter: `hue-rotate(${colorShift * 360}deg)` },
          layout: 'stacked'
        };
        
      case 'rhythmPulse':
        const pulse = 1 + Math.sin(frame * 0.2) * 0.05;
        return {
          containerStyle: { transform: `scale(${pulse})` },
          layout: 'horizontal'
        };
        
      case 'techSpecs':
        return {
          containerStyle: { 
            gap: '15px',
            fontFamily: 'SF Mono, Monaco, monospace'
          },
          layout: 'horizontal'
        };
        
      case 'brandReveal':
        const brandScale = spring({ 
          frame, 
          fps, 
          config: { damping: 150, stiffness: 300 }, 
          from: 0.8, 
          to: 1.1 
        });
        return {
          containerStyle: { 
            transform: `scale(${brandScale})`,
            fontWeight: 900
          },
          layout: 'centered'
        };
        
      case 'taglineFlow':
        return {
          containerStyle: { 
            opacity: interpolate(frame, [0, duration * 0.3], [0, 0.8], { extrapolateRight: 'clamp' })
          },
          layout: 'horizontal'
        };
        
      case 'buildUp':
        const buildUpScale = interpolate(frame, [0, duration], [0.9, 1.05], { extrapolateRight: 'clamp' });
        return {
          containerStyle: { transform: `scale(${buildUpScale})` },
          layout: 'horizontal'
        };
        
      case 'finalReveal':
        const finalScale = spring({ 
          frame, 
          fps, 
          config: { damping: 100, stiffness: 200 }, 
          from: 0.5, 
          to: 1 
        });
        const finalGlow = Math.sin(frame * 0.1) * 10 + 20;
        return {
          containerStyle: { 
            transform: `scale(${finalScale})`,
            textShadow: `0 0 ${finalGlow}px ${textColor}`
          },
          layout: 'stacked'
        };
        
      default: // centerFade
        const opacity = interpolate(frame, [0, duration * 0.3], [0, 1], { extrapolateRight: 'clamp' });
        return {
          containerStyle: { opacity },
          layout: 'stacked'
        };
    }
  };
  
  const { containerStyle, layout, wordDelay = 0, emphasisWord } = getLayoutAnimation();
  
  const renderLayout = () => {
    if (layout === 'stacked') {
      return (
        <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
          {words.map((word, index) => (
            <div key={index}>{word}</div>
          ))}
        </div>
      );
    }
    
    if (layout === 'horizontal') {
      return (
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {words.map((word, index) => (
            <span 
              key={index}
              style={{
                opacity: wordDelay > 0 ? 
                  interpolate(frame, [index * wordDelay, index * wordDelay + 10], [0, 1], { extrapolateRight: 'clamp' }) : 
                  1
              }}
            >
              {word}
            </span>
          ))}
        </div>
      );
    }
    
    if (layout === 'emphasis' && emphasisWord !== undefined) {
      return (
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {words.map((word, index) => (
            <span 
              key={index}
              style={{
                fontSize: index === emphasisWord ? `${fontSize * 1.3}px` : `${fontSize}px`,
                fontWeight: index === emphasisWord ? 900 : 600,
                color: index === emphasisWord ? textColor : `${textColor}aa`
              }}
            >
              {word}
            </span>
          ))}
        </div>
      );
    }
    
    return (
      <div style={{ textAlign: 'center' }}>
        {words.join(' ')}
      </div>
    );
  };
  
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '350px', // Mobile optimized
          ...containerStyle,
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: `${fontSize}px`,
            fontWeight: emphasis ? 800 : 600,
            color: textColor,
            letterSpacing: emphasis ? '0.1em' : '0.05em',
            textAlign: 'center',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            ...containerStyle,
          }}
        >
          {renderLayout()}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Mobile Visual Elements Component
const MobileVisualElements: React.FC<{
  frame: number;
  textColor: string;
  accentColor: string;
}> = ({ frame, textColor, accentColor }) => {
  // Fixed mobile dimensions
  const mobileWidth = 390;
  const mobileHeight = 844;
  
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: -1 }}>
      {/* Subtle background lines */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '80%',
          height: '2px',
          backgroundColor: textColor,
          opacity: 0.1,
          transform: `translateX(${Math.sin(frame * 0.02) * 20}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '60%',
          height: '2px',
          backgroundColor: textColor,
          opacity: 0.1,
          transform: `translateX(${Math.cos(frame * 0.02) * 15}px)`,
        }}
      />
      
      {/* Accent pulse */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '5%',
          width: '4px',
          height: '4px',
          backgroundColor: accentColor,
          borderRadius: '50%',
          opacity: Math.sin(frame * 0.1) * 0.5 + 0.5,
          transform: `scale(${1 + Math.sin(frame * 0.1) * 0.5})`,
        }}
      />
    </AbsoluteFill>
  );
}; 