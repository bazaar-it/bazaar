//src/remotion/components/scenes/GradientScene.tsx
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// TypeScript interface for gradient scene data
interface GradientSceneData {
  colors?: string[];
  direction?: 'linear' | 'radial' | 'conic';
  angle?: number;
  animationSpeed?: number;
  children?: React.ReactNode;
}

interface GradientSceneProps {
  data: Record<string, unknown>;
  children?: React.ReactNode;
}

/**
 * A scene that displays animated gradients
 * Supports linear, radial and conic gradients with animation
 */
export const GradientScene: React.FC<GradientSceneProps> = ({ data, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Parse data with safe type casting
  const gradientData: GradientSceneData = {
    colors: Array.isArray(data.colors) && data.colors.every(c => typeof c === 'string') 
      ? data.colors 
      : ['#4158D0', '#C850C0', '#FFCC70'],
    direction: ['linear', 'radial', 'conic'].includes(data.direction as string) 
      ? data.direction as 'linear' | 'radial' | 'conic' 
      : 'linear',
    angle: typeof data.angle === 'number' ? data.angle : 45,
    animationSpeed: typeof data.animationSpeed === 'number' ? data.animationSpeed : 1,
  };
  
  // Ensure we have at least 2 colors
  const colors = gradientData.colors && gradientData.colors.length >= 2 
    ? gradientData.colors 
    : ['#4158D0', '#C850C0', '#FFCC70'];
  
  // Get animation speed with a definite default
  const animationSpeed = gradientData.animationSpeed ?? 1;
  
  // Calculate animation offset based on frame and speed
  const offset = (frame * animationSpeed) / fps;
  
  // Fade in animation
  const opacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Generate gradient based on direction
  let backgroundImage = '';
  
  if (gradientData.direction === 'linear') {
    // Animate the angle for linear gradients
    const animatedAngle = ((gradientData.angle ?? 45) + offset * 20) % 360;
    
    // Create color stops with animation
    const colorStops = colors.map((color, index) => {
      const position = (index / (colors.length - 1) * 100);
      // Apply sine wave animation to each color stop
      const animatedPosition = (position + Math.sin(offset + index) * 10) % 100;
      return `${color} ${animatedPosition}%`;
    }).join(', ');
    
    backgroundImage = `linear-gradient(${animatedAngle}deg, ${colorStops})`;
  } 
  else if (gradientData.direction === 'radial') {
    // Animate circle size for radial gradients
    const circleSize = 50 + Math.sin(offset) * 20;
    
    // Create color stops with animation
    const colorStops = colors.map((color, index) => {
      const position = (index / (colors.length - 1) * 100);
      // Apply sine wave animation to each color stop
      const animatedPosition = (position + Math.sin(offset + index) * 10) % 100;
      return `${color} ${animatedPosition}%`;
    }).join(', ');
    
    backgroundImage = `radial-gradient(circle at ${circleSize}% ${circleSize}%, ${colorStops})`;
  } 
  else if (gradientData.direction === 'conic') {
    // Animate starting angle for conic gradients
    const startAngle = offset * 30;
    
    // Create color stops with animation
    const colorStops = colors.map((color, index) => {
      const position = (index / colors.length * 100);
      // Apply subtle animation to each color stop
      const animatedPosition = (position + offset * 5) % 100;
      return `${color} ${animatedPosition}%`;
    }).join(', ');
    
    backgroundImage = `conic-gradient(from ${startAngle}deg at 50% 50%, ${colorStops})`;
  }
  
  return (
    <AbsoluteFill
      style={{
        backgroundImage,
        opacity,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </AbsoluteFill>
  );
}; 