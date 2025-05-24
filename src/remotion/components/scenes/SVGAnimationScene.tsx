//src/remotion/components/scenes/SVGAnimationScene.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Built-in SVG icons/shapes
const svgIcons = {
  circle: (color: string) => (
    <circle cx="50" cy="50" r="45" fill={color} />
  ),
  square: (color: string) => (
    <rect x="5" y="5" width="90" height="90" fill={color} />
  ),
  triangle: (color: string) => (
    <polygon points="50,5 95,95 5,95" fill={color} />
  ),
  star: (color: string) => (
    <polygon 
      points="50,5 61,40 98,40 68,62 79,95 50,75 21,95 32,62 2,40 39,40" 
      fill={color} 
    />
  ),
  heart: (color: string) => (
    <path 
      d="M50,30 C35,10 10,20 10,40 C10,60 25,70 50,90 C75,70 90,60 90,40 C90,20 65,10 50,30 Z" 
      fill={color} 
    />
  ),
  checkmark: (color: string) => (
    <path 
      d="M10,50 L40,80 L90,20" 
      stroke={color} 
      strokeWidth="10" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  ),
  cross: (color: string) => (
    <path 
      d="M20,20 L80,80 M80,20 L20,80" 
      stroke={color} 
      strokeWidth="10" 
      fill="none" 
      strokeLinecap="round" 
    />
  ),
  arrow: (color: string) => (
    <path 
      d="M10,50 L80,50 M65,30 L80,50 L65,70" 
      stroke={color} 
      strokeWidth="10" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  ),
};

// TypeScript interface for SVG animation scene data
interface SVGAnimationSceneData {
  icon?: keyof typeof svgIcons | string;
  color?: string;
  backgroundColor?: string;
  size?: number;
  animation?: 'draw' | 'scale' | 'rotate' | 'fade' | 'moveIn';
  direction?: 'left' | 'right' | 'top' | 'bottom';
  repeat?: boolean;
}

interface SVGAnimationSceneProps {
  data: Record<string, unknown>;
  children?: React.ReactNode;
}

/**
 * A scene that renders animated SVG icons or shapes
 * Supports various built-in icons and animation effects
 */
export const SVGAnimationScene: React.FC<SVGAnimationSceneProps> = ({ data, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Parse data with safe type casting
  const svgData: SVGAnimationSceneData = {
    icon: typeof data.icon === 'string' && Object.keys(svgIcons).includes(data.icon) 
      ? data.icon as keyof typeof svgIcons 
      : 'circle',
    color: typeof data.color === 'string' ? data.color : '#FFFFFF',
    backgroundColor: typeof data.backgroundColor === 'string' ? data.backgroundColor : '#000000',
    size: typeof data.size === 'number' ? data.size : 200,
    animation: ['draw', 'scale', 'rotate', 'fade', 'moveIn'].includes(data.animation as string) 
      ? data.animation as 'draw' | 'scale' | 'rotate' | 'fade' | 'moveIn' 
      : 'draw',
    direction: ['left', 'right', 'top', 'bottom'].includes(data.direction as string) 
      ? data.direction as 'left' | 'right' | 'top' | 'bottom' 
      : 'right',
    repeat: data.repeat === true,
  };
  
  // Get safe values
  const icon = (svgData.icon && svgIcons[svgData.icon as keyof typeof svgIcons]) 
    ? svgData.icon as keyof typeof svgIcons 
    : 'circle';
  const color = svgData.color ?? '#FFFFFF';
  const size = svgData.size ?? 200;
  const animation = svgData.animation ?? 'draw';
  const repeat = svgData.repeat ?? false;
  
  // Calculate animation modifiers
  let frameToUse = frame;
  
  // If repeating, cycle through animation
  if (repeat) {
    const cycleDuration = 60; // frames per cycle
    frameToUse = frame % cycleDuration;
  }
  
  // Calculate animation style based on the selected animation type
  let animationStyle = {};
  let pathStyle = {};
  
  // Draw animation (stroke-dasharray trick)
  if (animation === 'draw') {
    const progress = interpolate(
      frameToUse,
      [0, 50],
      [0, 1],
      { extrapolateRight: 'clamp' }
    );
    
    pathStyle = {
      strokeDasharray: 1000,
      strokeDashoffset: 1000 - (progress * 1000),
    };
  }
  
  // Scale animation
  else if (animation === 'scale') {
    const scale = spring({
      frame: frameToUse,
      fps,
      config: {
        mass: 0.5,
        stiffness: 50,
        damping: 10,
      }
    });
    
    animationStyle = {
      transform: `scale(${scale})`,
    };
  }
  
  // Rotation animation
  else if (animation === 'rotate') {
    const rotation = interpolate(
      frameToUse,
      [0, 60],
      [0, 360],
      { extrapolateRight: 'clamp' }
    );
    
    animationStyle = {
      transform: `rotate(${rotation}deg)`,
    };
  }
  
  // Fade animation
  else if (animation === 'fade') {
    // For fade animation, we'll handle repeating manually
    let opacity;
    
    if (repeat) {
      // Create a ping-pong effect by using sine wave
      opacity = interpolate(
        Math.sin((frameToUse / 30) * Math.PI),
        [-1, 1],
        [0, 1],
        { extrapolateRight: 'clamp' }
      );
    } else {
      opacity = interpolate(
        frameToUse,
        [0, 20],
        [0, 1],
        { extrapolateRight: 'clamp' }
      );
    }
    
    animationStyle = {
      opacity,
    };
  }
  
  // Move in animation
  else if (animation === 'moveIn') {
    let translateX = 0;
    let translateY = 0;
    
    const progress = spring({
      frame: frameToUse,
      fps,
      config: {
        mass: 0.5,
        stiffness: 50,
        damping: 10,
      }
    });
    
    const distance = 200 * (1 - progress);
    
    // Set direction
    switch (svgData.direction) {
      case 'left':
        translateX = -distance;
        break;
      case 'right':
        translateX = distance;
        break;
      case 'top':
        translateY = -distance;
        break;
      case 'bottom':
        translateY = distance;
        break;
    }
    
    animationStyle = {
      transform: `translate(${translateX}px, ${translateY}px)`,
    };
  }
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: svgData.backgroundColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          ...animationStyle,
        }}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="xMidYMid meet"
        >
          {React.cloneElement(svgIcons[icon](color), {
            style: pathStyle,
          })}
        </svg>
      </div>
      
      {/* Additional content if provided */}
      {children}
    </AbsoluteFill>
  );
}; 