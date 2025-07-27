import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

// Kinetic Typography Scene based on updated context
// Implements RSVP and Phrase Composition modes with intelligent switching
export default function KineticTypographyScene() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Theme and colors - black/white minimalist with cyan accent
  const backgroundColor = '#000000';
  const textColor = '#FFFFFF';
  const accentColor = '#00D4FF';
  
  // Safe area calculation (10% margins for mobile to prevent overflow)
  const safeMargin = Math.min(width, height) * 0.10;
  const safeWidth = width - (safeMargin * 2);
  const safeHeight = height - (safeMargin * 2);
  
  // Script elements with intelligent mode switching and precise timing
  const scriptElements: Array<{
    type: 'rsvp' | 'phrase' | 'pause';
    word?: string;
    words?: string[];
    duration: number;
    emphasis?: boolean;
    color?: string;
    mode?: number;
    pause?: number;
  }> = [
    // Action sequence - RSVP for urgency (Mode 1)
    { type: 'rsvp', word: "Type", duration: 10, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "it.", duration: 8, emphasis: false, mode: 1 },
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Watch", duration: 10, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "it", duration: 8, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "dance.", duration: 30, emphasis: true, color: accentColor, mode: 1 },
    { type: 'pause', duration: 25 },
    
    // Technical benefits - Phrase Composition for clarity (Mode 2)
    { type: 'phrase', words: ["No", "keyframes."], duration: 35, emphasis: false, mode: 2 },
    { type: 'phrase', words: ["No", "headaches."], duration: 35, emphasis: false, mode: 2 },
    { type: 'pause', duration: 20 },
    
    // Feature highlights - RSVP for energy (Mode 1)
    { type: 'rsvp', word: "Call-outs", duration: 12, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "fly.", duration: 25, emphasis: true, color: accentColor, mode: 1 },
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Stats", duration: 10, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "punch.", duration: 25, emphasis: true, color: accentColor, mode: 1 },
    { type: 'pause', duration: 15 },
    { type: 'rsvp', word: "Headlines", duration: 12, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "sprint.", duration: 25, emphasis: true, color: accentColor, mode: 1 },
    { type: 'pause', duration: 30 },
    
    // Workflow - Phrase Composition for process (Mode 2)
    { type: 'phrase', words: ["Mock-up", "→", "Movie."], duration: 50, emphasis: true, mode: 2 },
    { type: 'phrase', words: ["Minutes,", "not", "days."], duration: 45, emphasis: true, mode: 2 },
    { type: 'pause', duration: 25 },
    
    // Features list - Phrase Composition for grouped features (Mode 2)
    { type: 'phrase', words: ["Auto-brand", "colors."], duration: 35, emphasis: false, mode: 2 },
    { type: 'phrase', words: ["Smart", "pacing."], duration: 30, emphasis: false, mode: 2 },
    { type: 'phrase', words: ["1080,", "4K,", "done."], duration: 40, emphasis: false, mode: 2 },
    { type: 'pause', duration: 25 },
    
    // Call to action - RSVP for urgency (Mode 1)
    { type: 'rsvp', word: "Ship", duration: 10, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "the", duration: 8, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "demo.", duration: 25, emphasis: true, color: accentColor, mode: 1 },
    { type: 'pause', duration: 20 },
    { type: 'rsvp', word: "Start", duration: 10, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "the", duration: 8, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "buzz.", duration: 30, emphasis: true, color: accentColor, mode: 1 },
    { type: 'pause', duration: 40 },
    
    // Brand closing - Phrase Composition for authority (Mode 2)
    { type: 'phrase', words: ["Bazaar.it"], duration: 35, emphasis: true, color: accentColor, mode: 2 },
    { type: 'phrase', words: ["AI", "motion", "graphics—"], duration: 45, emphasis: false, mode: 2 },
    { type: 'phrase', words: ["now", "with"], duration: 30, emphasis: false, mode: 2 },
    { type: 'phrase', words: ["Kinetic", "Typography"], duration: 60, emphasis: true, color: accentColor, mode: 2 },
  ];
  
  let currentFrame = 0;
  
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {scriptElements.map((element, index) => {
        const startFrame = currentFrame;
        const duration = element.duration;
        const pauseDuration = element.pause || 0;
        
        currentFrame += duration + pauseDuration;
        
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
                safeWidth={safeWidth}
                safeHeight={safeHeight}
                safeMargin={safeMargin}
                width={width}
                height={height}
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
              <PhraseAnimation 
                words={element.words || []}
                textColor={element.color || textColor}
                emphasis={element.emphasis || false}
                duration={duration}
                safeWidth={safeWidth}
                safeHeight={safeHeight}
                safeMargin={safeMargin}
                width={width}
                height={height}
              />
            </Sequence>
          );
        }
        
        return null;
      })}
      
      {/* Subtle visual elements within safe area */}
      <VisualElements 
        frame={frame}
        textColor={textColor}
        accentColor={accentColor}
        safeMargin={safeMargin}
        width={width}
        height={height}
      />
    </AbsoluteFill>
  );
}

// RSVP Animation Component (Mode 1: Rapid Serial Visual Presentation)
const RSVPAnimation: React.FC<{
  word: string;
  textColor: string;
  emphasis: boolean;
  duration: number;
  safeWidth: number;
  safeHeight: number;
  safeMargin: number;
  width: number;
  height: number;
}> = ({ word, textColor, emphasis, duration, safeWidth, safeHeight, safeMargin, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Much more conservative font sizing for mobile 390×844px to account for scaling
  const baseFontSize = Math.min(width, height) * (emphasis ? 0.055 : 0.045);
  const fontSize = Math.max(16, Math.min(baseFontSize, emphasis ? 32 : 24)); // Smaller caps to account for animations
  
  // Entrance animation with spring physics
  const scale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 300 },
    from: 0.3,
    to: 1
  });
  
  // Opacity animation for smooth transitions
  const opacity = interpolate(
    frame,
    [0, duration * 0.2, duration * 0.8, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Emphasis effects - reduced scaling to prevent overflow
  const emphasisScale = emphasis ? 1 + Math.sin(frame * 0.3) * 0.02 : 1;
  const glow = emphasis ? `0 0 ${15 + Math.sin(frame * 0.2) * 5}px ${textColor}` : 'none';
  
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${scale * emphasisScale})`,
          textAlign: 'center',
          opacity,
          width: safeWidth,
          maxWidth: safeWidth,
          maxHeight: safeHeight,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: `${fontSize}px`,
            fontWeight: emphasis ? 900 : 600,
            color: textColor,
            letterSpacing: emphasis ? '0.05em' : '0.02em',
            textTransform: emphasis ? 'uppercase' : 'none',
            lineHeight: 1.2,
            textShadow: glow,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            wordBreak: 'break-word',
            hyphens: 'auto',
            textAlign: 'center',
            width: '100%',
          }}
        >
          {word}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Phrase Animation Component (Mode 2: Phrase Composition)
const PhraseAnimation: React.FC<{
  words: string[];
  textColor: string;
  emphasis: boolean;
  duration: number;
  safeWidth: number;
  safeHeight: number;
  safeMargin: number;
  width: number;
  height: number;
}> = ({ words, textColor, emphasis, duration, safeWidth, safeHeight, safeMargin, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Very conservative font sizing for mobile phrases to account for scaling
  const baseFontSize = Math.min(width, height) * (emphasis ? 0.045 : 0.035);
  const fontSize = Math.max(12, Math.min(baseFontSize, emphasis ? 26 : 20)); // Much smaller for phrases
  
  // Entrance animation
  const entranceScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 200 },
    from: 0.2,
    to: 1
  });
  
  // Opacity animation
  const opacity = interpolate(
    frame,
    [0, duration * 0.3, duration * 0.7, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Determine layout based on aspect ratio
  const aspectRatio = width / height;
  const isVertical = aspectRatio < 1; // Portrait
  const isSquare = Math.abs(aspectRatio - 1) < 0.1; // Square-ish
  
  // Adaptive layout based on screen format
  const getLayout = () => {
    if (words.length === 1) {
      return 'single';
    }
    
    if (isVertical) {
      // Vertical: prioritize stacking, be more conservative
      return words.join(' ').length > 15 ? 'multiline' : 'horizontal';
    } else if (isSquare) {
      // Square: balanced composition, but check length
      return words.join(' ').length > 25 ? 'multiline' : 'centered';
    } else {
      // Horizontal: emphasize width, but still wrap if needed
      return words.join(' ').length > 30 ? 'multiline' : 'horizontal';
    }
  };
  
  const layout = getLayout();
  
  const renderLayout = () => {
    if (layout === 'single' || layout === 'centered') {
      return (
        <div style={{ 
          textAlign: 'center', 
          lineHeight: 1.3,
          width: '100%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}>
          {words.map((word, index) => (
            <span key={index} style={{ 
              marginRight: index < words.length - 1 ? '0.4em' : 0,
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}>
              {word}
            </span>
          ))}
        </div>
      );
    }
    
    if (layout === 'multiline') {
      // Break into multiple lines for vertical format
      const midpoint = Math.ceil(words.length / 2);
      const line1 = words.slice(0, midpoint);
      const line2 = words.slice(midpoint);
      
      return (
        <div style={{ 
          textAlign: 'center', 
          lineHeight: 1.3,
          width: '100%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}>
          <div style={{ marginBottom: line2.length > 0 ? '0.2em' : 0 }}>
            {line1.join(' ')}
          </div>
          {line2.length > 0 && (
            <div>{line2.join(' ')}</div>
          )}
        </div>
      );
    }
    
    // Horizontal layout
    return (
      <div style={{ 
        display: 'flex', 
        gap: '0.4em', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        lineHeight: 1.3,
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}>
        {words.map((word, index) => (
          <span key={index} style={{ 
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}>
            {word}
          </span>
        ))}
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
          transform: `translate(-50%, -50%) scale(${entranceScale})`,
          width: safeWidth,
          maxWidth: safeWidth,
          maxHeight: safeHeight,
          opacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
          padding: '0 8px',
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: `${fontSize}px`,
            fontWeight: emphasis ? 800 : 600,
            color: textColor,
            letterSpacing: emphasis ? '0.05em' : '0.02em',
            textAlign: 'center',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            width: '100%',
            maxWidth: '100%',
            wordBreak: 'break-word',
            hyphens: 'auto',
            overflowWrap: 'break-word',
          }}
        >
          {renderLayout()}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Visual Elements Component - Simple abstract shapes within safe area
const VisualElements: React.FC<{
  frame: number;
  textColor: string;
  accentColor: string;
  safeMargin: number;
  width: number;
  height: number;
}> = ({ frame, textColor, accentColor, safeMargin, width, height }) => {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: -1 }}>
      {/* Subtle animated line - top */}
      <div
        style={{
          position: 'absolute',
          top: safeMargin,
          left: safeMargin + Math.sin(frame * 0.02) * 20,
          width: width * 0.4,
          height: '2px',
          backgroundColor: textColor,
          opacity: 0.1,
        }}
      />
      
      {/* Subtle animated line - bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: safeMargin,
          right: safeMargin + Math.cos(frame * 0.02) * 15,
          width: width * 0.3,
          height: '2px',
          backgroundColor: textColor,
          opacity: 0.1,
        }}
      />
      
      {/* Accent pulse */}
      <div
        style={{
          position: 'absolute',
          top: safeMargin * 2,
          right: safeMargin * 2,
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

// Export duration for the scene (total calculated frames)
export const durationInFrames = 900; // 30 seconds at 30fps 