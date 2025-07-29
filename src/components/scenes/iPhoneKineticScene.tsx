import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';

// iPhone Kinetic Typography Scene - Futuristic Tech Presentation
// Implements RSVP and Phrase Composition modes with Apple-style pacing
export default function iPhoneKineticScene() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Theme and colors - premium tech aesthetic
  const backgroundColor = '#000000';
  const textColor = '#FFFFFF';
  const accentColor = '#007AFF'; // Apple blue
  const highlightColor = '#FF6B35'; // Tech orange for special features
  
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
    // Opening hook - Phrase Composition for impact (Mode 2)
    { type: 'phrase', words: ["Ready?—future's", "calling."], duration: 50, emphasis: true, color: accentColor, mode: 2 },
    { type: 'pause', duration: 30 },
    
    // Feature Q&A sequence - Mixed modes for rhythm
    { type: 'rsvp', word: "Bezel?", duration: 20, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "Gone.", duration: 30, emphasis: true, color: highlightColor, mode: 1 },
    { type: 'pause', duration: 25 },
    
    { type: 'rsvp', word: "Display?", duration: 20, emphasis: false, mode: 1 },
    { type: 'phrase', words: ["Liquid-Orbit", "OLED—"], duration: 40, emphasis: true, color: accentColor, mode: 2 },
    { type: 'phrase', words: ["wraps", "360°."], duration: 35, emphasis: true, color: highlightColor, mode: 2 },
    { type: 'pause', duration: 25 },
    
    { type: 'rsvp', word: "Buttons?", duration: 20, emphasis: false, mode: 1 },
    { type: 'phrase', words: ["Past", "tense."], duration: 30, emphasis: false, mode: 2 },
    { type: 'phrase', words: ["Air-Touch", "rules."], duration: 40, emphasis: true, color: accentColor, mode: 2 },
    { type: 'pause', duration: 25 },
    
    { type: 'rsvp', word: "Battery?", duration: 20, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "QuantumCell.", duration: 35, emphasis: true, color: highlightColor, mode: 1 },
    { type: 'phrase', words: ["One", "charge.", "One", "week."], duration: 45, emphasis: true, mode: 2 },
    { type: 'pause', duration: 25 },
    
    { type: 'rsvp', word: "Chip?", duration: 15, emphasis: false, mode: 1 },
    { type: 'phrase', words: ["A22", "QuantaCore."], duration: 40, emphasis: true, color: accentColor, mode: 2 },
    { type: 'phrase', words: ["Think.", "Render.", "Ship."], duration: 45, emphasis: true, mode: 2 },
    { type: 'pause', duration: 25 },
    
    { type: 'rsvp', word: "Camera?", duration: 20, emphasis: false, mode: 1 },
    { type: 'phrase', words: ["AirCarve", "10-gigapixel"], duration: 45, emphasis: true, color: highlightColor, mode: 2 },
    { type: 'rsvp', word: "array.", duration: 20, emphasis: false, mode: 1 },
    { type: 'phrase', words: ["Shoot", "reality—"], duration: 30, emphasis: false, mode: 2 },
    { type: 'phrase', words: ["then", "resculpt", "it."], duration: 40, emphasis: true, color: accentColor, mode: 2 },
    { type: 'pause', duration: 30 },
    
    // Special features - RSVP for impact
    { type: 'rsvp', word: "HoloCast.", duration: 35, emphasis: true, color: highlightColor, mode: 1 },
    { type: 'phrase', words: ["Friends", "float", "in", "3-D."], duration: 45, emphasis: true, mode: 2 },
    { type: 'pause', duration: 25 },
    
    { type: 'rsvp', word: "Privacy?", duration: 20, emphasis: false, mode: 1 },
    { type: 'phrase', words: ["On-device", "everything."], duration: 40, emphasis: true, color: accentColor, mode: 2 },
    { type: 'pause', duration: 20 },
    
    { type: 'rsvp', word: "Glass?", duration: 15, emphasis: false, mode: 1 },
    { type: 'phrase', words: ["Self-heals", "in", "60", "seconds."], duration: 50, emphasis: true, color: highlightColor, mode: 2 },
    { type: 'pause', duration: 30 },
    
    // Kinetic Typography feature - Meta moment
    { type: 'phrase', words: ["Kinetic", "Typography", "Live."], duration: 50, emphasis: true, color: accentColor, mode: 2 },
    { type: 'rsvp', word: "Speak", duration: 12, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "text.", duration: 15, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "Watch", duration: 12, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "words", duration: 12, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "leap.", duration: 25, emphasis: true, color: highlightColor, mode: 1 },
    { type: 'phrase', words: ["Edit", "before", "you"], duration: 35, emphasis: false, mode: 2 },
    { type: 'phrase', words: ["even", "hit", "record."], duration: 40, emphasis: true, mode: 2 },
    { type: 'pause', duration: 35 },
    
    // Final reveal - Phrase Composition for authority
    { type: 'phrase', words: ["iPhone", "72."], duration: 45, emphasis: true, color: accentColor, mode: 2 },
    { type: 'phrase', words: ["Impossible,", "shipped."], duration: 50, emphasis: true, color: highlightColor, mode: 2 },
    { type: 'pause', duration: 30 },
    
    // Call to action - RSVP for urgency
    { type: 'rsvp', word: "Upgrade", duration: 15, emphasis: false, mode: 1 },
    { type: 'rsvp', word: "tomorrow.", duration: 25, emphasis: true, color: accentColor, mode: 1 },
    { type: 'rsvp', word: "Today.", duration: 40, emphasis: true, color: highlightColor, mode: 1 },
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
              <IPhoneRSVPAnimation 
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
              <IPhonePhraseAnimation 
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
      
      {/* Premium tech visual elements within safe area */}
      <TechVisualElements 
        frame={frame}
        textColor={textColor}
        accentColor={accentColor}
        highlightColor={highlightColor}
        safeMargin={safeMargin}
        width={width}
        height={height}
      />
    </AbsoluteFill>
  );
}

// RSVP Animation Component (Mode 1: Rapid Serial Visual Presentation)
const IPhoneRSVPAnimation: React.FC<{
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
  
  // Conservative font sizing for mobile to account for scaling
  const baseFontSize = Math.min(width, height) * (emphasis ? 0.055 : 0.045);
  const fontSize = Math.max(16, Math.min(baseFontSize, emphasis ? 32 : 24));
  
  // Premium entrance animation with spring physics
  const scale = spring({
    frame,
    fps,
    config: { damping: 180, stiffness: 350 },
    from: 0.2,
    to: 1
  });
  
  // Smooth opacity transitions
  const opacity = interpolate(
    frame,
    [0, duration * 0.2, duration * 0.8, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Subtle emphasis effects - reduced scaling to prevent overflow
  const emphasisScale = emphasis ? 1 + Math.sin(frame * 0.4) * 0.03 : 1;
  const glow = emphasis ? `0 0 ${12 + Math.sin(frame * 0.3) * 8}px ${textColor}` : 'none';
  
  // Premium tech animations based on word context
  const getContextualAnimation = () => {
    if (word.includes('°') || word.includes('3-D')) {
      // Rotation effect for dimensional references
      const rotation = Math.sin(frame * 0.1) * 2;
      return { transform: `rotate(${rotation}deg)` };
    }
    if (word.includes('Quantum') || word.includes('QuantaCore')) {
      // Subtle particle effect for quantum references
      const particle = Math.sin(frame * 0.2) * 0.5 + 0.5;
      return { filter: `brightness(${1 + particle * 0.2})` };
    }
    return {};
  };
  
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
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: `${fontSize}px`,
            fontWeight: emphasis ? 700 : 500,
            color: textColor,
            letterSpacing: emphasis ? '0.05em' : '0.02em',
            textTransform: emphasis && word.length < 8 ? 'uppercase' : 'none',
            lineHeight: 1.2,
            textShadow: glow,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            wordBreak: 'break-word',
            hyphens: 'auto',
            textAlign: 'center',
            width: '100%',
            ...getContextualAnimation(),
          }}
        >
          {word}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Phrase Animation Component (Mode 2: Phrase Composition)
const IPhonePhraseAnimation: React.FC<{
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
  
  // Conservative font sizing for mobile phrases
  const baseFontSize = Math.min(width, height) * (emphasis ? 0.045 : 0.035);
  const fontSize = Math.max(12, Math.min(baseFontSize, emphasis ? 26 : 20));
  
  // Premium entrance animation
  const entranceScale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 250 },
    from: 0.3,
    to: 1
  });
  
  // Smooth opacity
  const opacity = interpolate(
    frame,
    [0, duration * 0.3, duration * 0.7, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  // Adaptive layout based on content and screen format
  const aspectRatio = width / height;
  const isVertical = aspectRatio < 1;
  
  const getLayout = () => {
    const totalLength = words.join(' ').length;
    
    if (words.length === 1) return 'single';
    if (totalLength > 20 || (isVertical && totalLength > 15)) return 'multiline';
    if (words.length <= 3) return 'horizontal';
    return 'grid';
  };
  
  const layout = getLayout();
  
  const renderLayout = () => {
    if (layout === 'single') {
      return (
        <div style={{ 
          textAlign: 'center', 
          lineHeight: 1.3,
          width: '100%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}>
          {words[0]}
        </div>
      );
    }
    
    if (layout === 'multiline') {
      // Smart line breaking for longer phrases
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
          <div style={{ marginBottom: line2.length > 0 ? '0.3em' : 0 }}>
            {line1.join(' ')}
          </div>
          {line2.length > 0 && (
            <div>{line2.join(' ')}</div>
          )}
        </div>
      );
    }
    
    if (layout === 'grid' && words.length === 4) {
      // 2x2 grid for quad-word phrases
      return (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.3em',
          textAlign: 'center',
          width: '100%'
        }}>
          {words.map((word, index) => (
            <div key={index} style={{ 
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}>
              {word}
            </div>
          ))}
        </div>
      );
    }
    
    // Default horizontal layout
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
            fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: `${fontSize}px`,
            fontWeight: emphasis ? 600 : 400,
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

// Premium Tech Visual Elements Component
const TechVisualElements: React.FC<{
  frame: number;
  textColor: string;
  accentColor: string;
  highlightColor: string;
  safeMargin: number;
  width: number;
  height: number;
}> = ({ frame, textColor, accentColor, highlightColor, safeMargin, width, height }) => {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: -1 }}>
      {/* Tech grid lines */}
      <div
        style={{
          position: 'absolute',
          top: safeMargin,
          left: safeMargin + Math.sin(frame * 0.01) * 10,
          width: width * 0.3,
          height: '1px',
          backgroundColor: accentColor,
          opacity: 0.1,
        }}
      />
      
      <div
        style={{
          position: 'absolute',
          bottom: safeMargin,
          right: safeMargin + Math.cos(frame * 0.015) * 8,
          width: width * 0.25,
          height: '1px',
          backgroundColor: highlightColor,
          opacity: 0.1,
        }}
      />
      
      {/* Quantum particle effect */}
      <div
        style={{
          position: 'absolute',
          top: safeMargin * 1.5,
          right: safeMargin * 1.5,
          width: '3px',
          height: '3px',
          backgroundColor: accentColor,
          borderRadius: '50%',
          opacity: Math.sin(frame * 0.08) * 0.6 + 0.4,
          transform: `scale(${1 + Math.sin(frame * 0.12) * 0.3})`,
        }}
      />
      
      {/* Holographic accent */}
      <div
        style={{
          position: 'absolute',
          bottom: safeMargin * 2,
          left: safeMargin * 2,
          width: '2px',
          height: '2px',
          backgroundColor: highlightColor,
          borderRadius: '50%',
          opacity: Math.cos(frame * 0.06) * 0.5 + 0.5,
          boxShadow: `0 0 8px ${highlightColor}`,
        }}
      />
    </AbsoluteFill>
  );
};

// Export duration for the scene
export const durationInFrames = 1200; // 40 seconds at 30fps 