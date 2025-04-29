//src/remotion/components/scenes/SplitScreenScene.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// TypeScript interface for split screen scene data
interface SplitScreenSceneData {
  direction?: 'horizontal' | 'vertical';
  ratio?: number; // 0-1 split ratio, e.g., 0.5 for 50/50
  backgroundColor1?: string;
  backgroundColor2?: string;
  animationEffect?: 'slide' | 'reveal' | 'split' | 'none';
  content1?: React.ReactNode;
  content2?: React.ReactNode;
}

interface SplitScreenSceneProps {
  data: Record<string, unknown>;
  children?: React.ReactNode[];
}

/**
 * A scene that displays content in a split screen layout
 * Supports horizontal or vertical splits with animated transitions
 */
export const SplitScreenScene: React.FC<SplitScreenSceneProps> = ({ data, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Get children as an array
  const childArray = React.Children.toArray(children);
  const leftContent = childArray[0] || null;
  const rightContent = childArray[1] || null;
  
  // Parse data with safe type casting
  const splitData: SplitScreenSceneData = {
    direction: data.direction === 'vertical' ? 'vertical' : 'horizontal',
    ratio: typeof data.ratio === 'number' && data.ratio >= 0 && data.ratio <= 1 
      ? data.ratio 
      : 0.5,
    backgroundColor1: typeof data.backgroundColor1 === 'string' ? data.backgroundColor1 : '#111111',
    backgroundColor2: typeof data.backgroundColor2 === 'string' ? data.backgroundColor2 : '#333333',
    animationEffect: ['slide', 'reveal', 'split', 'none'].includes(data.animationEffect as string) 
      ? data.animationEffect as 'slide' | 'reveal' | 'split' | 'none' 
      : 'slide',
    content1: data.content1 as React.ReactNode,
    content2: data.content2 as React.ReactNode,
  };
  
  // Get a definite value for ratio
  const ratio = splitData.ratio ?? 0.5;
  
  // Calculate animation progress
  const progress = interpolate(
    frame,
    [0, 30],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Spring animation for smoother effects
  const springProgress = spring({
    frame,
    fps,
    config: {
      mass: 0.5,
      stiffness: 50,
      damping: 10,
    }
  });
  
  // Determine content to use (props or children)
  const firstContent = splitData.content1 || leftContent;
  const secondContent = splitData.content2 || rightContent;
  
  // Create animation styles based on the effect
  let firstContainerStyle = {};
  let secondContainerStyle = {};
  
  if (splitData.animationEffect === 'slide') {
    // Slide in from opposite sides
    if (splitData.direction === 'horizontal') {
      firstContainerStyle = {
        transform: `translateX(${-100 * (1 - springProgress)}%)`,
      };
      secondContainerStyle = {
        transform: `translateX(${100 * (1 - springProgress)}%)`,
      };
    } else {
      firstContainerStyle = {
        transform: `translateY(${-100 * (1 - springProgress)}%)`,
      };
      secondContainerStyle = {
        transform: `translateY(${100 * (1 - springProgress)}%)`,
      };
    }
  } 
  else if (splitData.animationEffect === 'reveal') {
    // Reveal by scaling
    firstContainerStyle = {
      opacity: springProgress,
      transform: `scale(${0.5 + (springProgress * 0.5)})`,
    };
    secondContainerStyle = {
      opacity: springProgress,
      transform: `scale(${0.5 + (springProgress * 0.5)})`,
    };
  } 
  else if (splitData.animationEffect === 'split') {
    // Split from center
    const initialRatio = 0.5;
    const finalRatio = ratio;
    
    if (splitData.direction === 'horizontal') {
      // Animate the ratio based on the progress
      const currentRatio = interpolate(springProgress, [0, 1], [initialRatio, finalRatio]);
      
      firstContainerStyle = {
        width: `${currentRatio * 100}%`,
      };
      secondContainerStyle = {
        width: `${(1 - currentRatio) * 100}%`,
      };
    } else {
      // Vertical split
      const currentRatio = interpolate(springProgress, [0, 1], [initialRatio, finalRatio]);
      
      firstContainerStyle = {
        height: `${currentRatio * 100}%`,
      };
      secondContainerStyle = {
        height: `${(1 - currentRatio) * 100}%`,
      };
    }
  }
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: splitData.direction === 'horizontal' ? 'row' : 'column',
        overflow: 'hidden',
      }}
    >
      {/* First section */}
      <div 
        style={{
          flex: ratio,
          backgroundColor: splitData.backgroundColor1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          ...firstContainerStyle,
        }}
      >
        {firstContent}
      </div>
      
      {/* Second section */}
      <div
        style={{
          flex: 1 - ratio,
          backgroundColor: splitData.backgroundColor2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          ...secondContainerStyle,
        }}
      >
        {secondContent}
      </div>
    </AbsoluteFill>
  );
}; 