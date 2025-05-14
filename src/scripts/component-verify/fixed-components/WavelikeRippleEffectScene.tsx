// src/remotion/components/scenes/WavelikeRippleEffectScene.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, Img, Audio } from 'remotion';
import React from 'react';
// import { AnimationDesignBrief } from '~/lib/schemas/animationDesignBrief.schema';

export const WavelikeRippleEffectScene: React.FC<{ brief: any }> = ({ brief }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Extract key brief properties
  const { elements, colorPalette, typography, overallStyle } = brief;

  // Define background color from brief
  const backgroundColor = colorPalette?.background || '#0A1F2D';

  // Bubble pulse animation
  const bubbleScale = interpolate(
    frame,
    [0, 90],
    [1, 1.02],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.easeInOutCubic }
  );

  // PROBLEM: This SVG has unclosed tags which causes the "Unexpected token '<'" error
  const svgContent = <svg viewBox='0 0 100 100 />>
    <circle cx='50' cy='50' r='45' stroke='#AEDFF7' stroke-width='4' fill='none'
    <circle cx='50' cy='50' r='30' stroke='#4FC3F7' stroke-width='2' fill='none'
  </svg>;

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Main Bubble Container */}
      <div 
        style={{
          position: 'absolute',
          left: 560,
          top: 140,
          width: 800,
          height: 800,
          borderRadius: '50%',
          backgroundColor: '#4FC3F7',
          transform: `scale(${bubbleScale})`,
        }}
      />
      
      {/* Ripple Effects */}
      {[0, 1, 2].map((index) => {
        const rippleStart = index * 10;
        const rippleScale = interpolate(
          frame,
          [rippleStart, rippleStart + 60],
          [0, 1.5],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.easeOutQuad }
        );
        
        const rippleOpacity = interpolate(
          frame,
          [rippleStart, rippleStart + 60],
          [1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.easeOutQuad }
        );
        
        return (
          <div
            key={`ripple-${index}`}
            style={{
              position: 'absolute',
              left: 910,
              top: 490,
              width: 100,
              height: 100,
              opacity: rippleOpacity,
              transform: `scale(${rippleScale})`,
            }}
          >
            {svgContent}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};


// Added by pre-processor - required for Remotion
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = WavelikeRippleEffectScene;
}
