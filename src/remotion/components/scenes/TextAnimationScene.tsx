//src/remotion/components/scenes/TextAnimationScene.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont, fontFamily as interFontFamily } from "@remotion/google-fonts/Inter";

// Load Inter font
loadFont();

// TypeScript interface for text animation scene data
interface TextAnimationSceneData {
  text?: string;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  animation?: 'typewriter' | 'fadeLetters' | 'slideUp' | 'bounce' | 'wavy';
  delay?: number;
  textAlign?: 'left' | 'center' | 'right';
}

interface TextAnimationSceneProps {
  data: Record<string, unknown>;
}

/**
 * A scene that displays animated text effects
 * Supports various text animations including typewriter, fade letters, slide up, bounce, and wavy effects
 */
export const TextAnimationScene: React.FC<TextAnimationSceneProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Parse data with safe type casting
  const textData: TextAnimationSceneData = {
    text: typeof data.text === 'string' ? data.text : 'Animated Text',
    color: typeof data.color === 'string' ? data.color : '#FFFFFF',
    backgroundColor: typeof data.backgroundColor === 'string' ? data.backgroundColor : '#000000',
    fontSize: typeof data.fontSize === 'number' ? data.fontSize : 70,
    fontFamily: typeof data.fontFamily === 'string' ? data.fontFamily : interFontFamily,
    animation: ['typewriter', 'fadeLetters', 'slideUp', 'bounce', 'wavy'].includes(data.animation as string) 
      ? data.animation as 'typewriter' | 'fadeLetters' | 'slideUp' | 'bounce' | 'wavy' 
      : 'typewriter',
    delay: typeof data.delay === 'number' ? data.delay : 0,
    textAlign: ['left', 'center', 'right'].includes(data.textAlign as string) 
      ? data.textAlign as 'left' | 'center' | 'right' 
      : 'center',
  };
  
  // Function to render different text animations
  const renderAnimatedText = () => {
    const text = textData.text || 'Animated Text';
    const delay = textData.delay || 0;
    const adjustedFrame = Math.max(0, frame - delay);
    
    // Typewriter effect
    if (textData.animation === 'typewriter') {
      const charactersToShow = Math.floor(
        interpolate(adjustedFrame, [0, text.length * 2], [0, text.length], {
          extrapolateRight: 'clamp',
        })
      );
      
      return (
        <div style={{ position: 'relative' }}>
          <h1
            style={{
              fontFamily: textData.fontFamily,
              fontSize: textData.fontSize,
              color: textData.color,
              textAlign: textData.textAlign,
              margin: 0,
              whiteSpace: 'pre',
            }}
          >
            {text.substring(0, charactersToShow)}
            <span
              style={{
                position: 'relative',
                display: adjustedFrame % 30 < 15 ? 'inline-block' : 'none',
                width: '0.1em',
                height: '1em',
                backgroundColor: textData.color,
                verticalAlign: 'text-top',
              }}
            />
          </h1>
        </div>
      );
    }
    
    // Fade letters effect
    if (textData.animation === 'fadeLetters') {
      return (
        <h1
          style={{
            fontFamily: textData.fontFamily,
            fontSize: textData.fontSize,
            color: textData.color,
            textAlign: textData.textAlign,
            margin: 0,
            display: 'flex',
            justifyContent: textData.textAlign === 'left' ? 'flex-start' : 
                           textData.textAlign === 'right' ? 'flex-end' : 'center',
            flexWrap: 'wrap',
          }}
        >
          {text.split('').map((char, i) => {
            const letterDelay = i * 3;
            const letterOpacity = interpolate(
              adjustedFrame - letterDelay,
              [0, 20],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            
            // Add a non-breaking space for actual spaces
            if (char === ' ') {
              return (
                <span key={i} style={{ opacity: letterOpacity }}>
                  &nbsp;
                </span>
              );
            }
            
            return (
              <span key={i} style={{ opacity: letterOpacity }}>
                {char}
              </span>
            );
          })}
        </h1>
      );
    }
    
    // Slide up effect
    if (textData.animation === 'slideUp') {
      return (
        <h1
          style={{
            fontFamily: textData.fontFamily,
            fontSize: textData.fontSize,
            color: textData.color,
            textAlign: textData.textAlign,
            margin: 0,
            display: 'flex',
            justifyContent: textData.textAlign === 'left' ? 'flex-start' : 
                           textData.textAlign === 'right' ? 'flex-end' : 'center',
            flexWrap: 'wrap',
          }}
        >
          {text.split('').map((char, i) => {
            const letterDelay = i * 3;
            const translateY = interpolate(
              adjustedFrame - letterDelay,
              [0, 25],
              [50, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            const letterOpacity = interpolate(
              adjustedFrame - letterDelay,
              [0, 20],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            
            // Add a non-breaking space for actual spaces
            if (char === ' ') {
              return (
                <span key={i} style={{ opacity: letterOpacity }}>
                  &nbsp;
                </span>
              );
            }
            
            return (
              <span
                key={i}
                style={{
                  opacity: letterOpacity,
                  transform: `translateY(${translateY}px)`,
                  display: 'inline-block',
                }}
              >
                {char}
              </span>
            );
          })}
        </h1>
      );
    }
    
    // Bounce effect
    if (textData.animation === 'bounce') {
      return (
        <h1
          style={{
            fontFamily: textData.fontFamily,
            fontSize: textData.fontSize,
            color: textData.color,
            textAlign: textData.textAlign,
            margin: 0,
            display: 'flex',
            justifyContent: textData.textAlign === 'left' ? 'flex-start' : 
                           textData.textAlign === 'right' ? 'flex-end' : 'center',
            flexWrap: 'wrap',
          }}
        >
          {text.split('').map((char, i) => {
            const letterDelay = i * 5;
            const progress = spring({
              frame: adjustedFrame - letterDelay,
              fps,
              config: {
                mass: 0.5,
                stiffness: 200,
                damping: 10,
              },
            });
            
            // Add a non-breaking space for actual spaces
            if (char === ' ') {
              return <span key={i}>&nbsp;</span>;
            }
            
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  transform: `translateY(${-15 * Math.sin(progress * Math.PI)}px) scale(${progress})`,
                }}
              >
                {char}
              </span>
            );
          })}
        </h1>
      );
    }
    
    // Wavy effect
    if (textData.animation === 'wavy') {
      return (
        <h1
          style={{
            fontFamily: textData.fontFamily,
            fontSize: textData.fontSize,
            color: textData.color,
            textAlign: textData.textAlign,
            margin: 0,
            display: 'flex',
            justifyContent: textData.textAlign === 'left' ? 'flex-start' : 
                           textData.textAlign === 'right' ? 'flex-end' : 'center',
            flexWrap: 'wrap',
          }}
        >
          {text.split('').map((char, i) => {
            const wavyEffect = Math.sin((adjustedFrame / 10) + i / 2) * 10;
            
            // Add a non-breaking space for actual spaces
            if (char === ' ') {
              return <span key={i}>&nbsp;</span>;
            }
            
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  transform: `translateY(${wavyEffect}px)`,
                }}
              >
                {char}
              </span>
            );
          })}
        </h1>
      );
    }
    
    // Default - simple fade in
    return (
      <h1
        style={{
          fontFamily: textData.fontFamily,
          fontSize: textData.fontSize,
          color: textData.color,
          textAlign: textData.textAlign,
          margin: 0,
          opacity: interpolate(
            adjustedFrame,
            [0, 20],
            [0, 1],
            { extrapolateRight: 'clamp' }
          ),
        }}
      >
        {text}
      </h1>
    );
  };
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: textData.backgroundColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {renderAnimatedText()}
    </AbsoluteFill>
  );
}; 