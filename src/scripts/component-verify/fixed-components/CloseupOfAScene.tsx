// src/remotion/components/scenes/CloseupOfAScene.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, Img, Audio } from 'remotion';
import React from 'react';
// import { AnimationDesignBrief } from '~/lib/schemas/animationDesignBrief.schema';

export const CloseupOfAScene: React.FC<{ brief: any }> = ({ brief }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Extract key brief properties
  const { elements, colorPalette, typography, overallStyle } = brief;

  // Define background color from brief
  const backgroundColor = colorPalette?.background || '#0f172a';

  // PROBLEM: This line redeclares 'frame' which causes the syntax error
  /* Removed duplicate frame declaration */  // Duplicate declaration!

  // Main bubble animation
  const bubbleOpacity = interpolate(
    frame, 
    [0, 20], 
    [0, 1], 
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.easeOutCubic }
  );
  
  const bubbleScale = interpolate(
    frame, 
    [0, 20], 
    [0.8, 1], 
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.easeOutCubic }
  );

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Main Bubble */}
      <div 
        style={{
          position: 'absolute',
          left: 560,
          top: 140,
          width: 800,
          height: 800,
          borderRadius: '50%',
          backgroundColor: '#d0e7f9',
          opacity: bubbleOpacity,
          transform: `scale(${bubbleScale})`,
        }}
      />
      
      {/* Light Reflection */}
      <div 
        style={{
          position: 'absolute',
          left: 600,
          top: 200,
          width: 200,
          height: 100,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          opacity: 0.2,
          transform: 'rotate(-30deg)',
        }}
      />
      
      {/* Small Bubbles */}
      {[
        {id: 'bubble1', x: 900, y: 700, size: 30, color: '#d0e7f9'},
        {id: 'bubble2', x: 820, y: 750, size: 25, color: '#d0e7f9'},
        {id: 'bubble3', x: 1000, y: 720, size: 20, color: '#d0e7f9'},
        {id: 'bubble4', x: 950, y: 780, size: 28, color: '#d0e7f9'},
      ].map(bubble => {
        const bubbleY = interpolate(
          frame,
          [0, 50],
          [bubble.y, bubble.y - 50],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.easeOutQuad }
        );
        
        const bubbleOpacity = interpolate(
          frame,
          [0, 50],
          [0, 0.5],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.easeOutQuad }
        );
        
        return (
          <div
            key={bubble.id}
            style={{
              position: 'absolute',
              left: bubble.x,
              top: bubbleY,
              width: bubble.size,
              height: bubble.size,
              borderRadius: '50%',
              backgroundColor: bubble.color,
              opacity: bubbleOpacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Missing window.__REMOTION_COMPONENT assignment
