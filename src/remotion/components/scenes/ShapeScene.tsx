//src/remotion/components/scenes/ShapeScene.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// TypeScript interface for shape scene data
interface ShapeSceneData {
  shapeType?: 'circle' | 'square' | 'triangle';
  color?: string;
  backgroundColor?: string;
  size?: number;
  animation?: 'pulse' | 'rotate' | 'bounce' | 'scale';
}

interface ShapeSceneProps {
  data: Record<string, unknown>;
}

/**
 * A scene that renders geometric shapes with various animations
 * Supports circle, square, and triangle shapes with different animations
 */
export const ShapeScene: React.FC<ShapeSceneProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Parse data with safe type casting
  const shapeData: ShapeSceneData = {
    shapeType: ['circle', 'square', 'triangle'].includes(data.shapeType as string) 
      ? data.shapeType as 'circle' | 'square' | 'triangle' 
      : 'circle',
    color: typeof data.color === 'string' ? data.color : '#FF5733',
    backgroundColor: typeof data.backgroundColor === 'string' ? data.backgroundColor : '#000000',
    size: typeof data.size === 'number' ? data.size : 200,
    animation: ['pulse', 'rotate', 'bounce', 'scale'].includes(data.animation as string) 
      ? data.animation as 'pulse' | 'rotate' | 'bounce' | 'scale' 
      : 'pulse',
  };
  
  // Get size value with a definite default
  const size = shapeData.size ?? 200;
  
  // Fade in animation over 20 frames
  const opacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Generate animation styles based on animation type
  let animationStyle = {};
  
  if (shapeData.animation === 'pulse') {
    // Pulse animation - scale up and down
    const scale = interpolate(
      Math.sin(frame / 15),
      [-1, 1],
      [0.8, 1.2]
    );
    animationStyle = { transform: `scale(${scale})` };
  } 
  else if (shapeData.animation === 'rotate') {
    // Rotation animation
    const rotation = interpolate(
      frame,
      [0, fps * 3], // 3 second full rotation
      [0, 360]
    );
    animationStyle = { transform: `rotate(${rotation}deg)` };
  } 
  else if (shapeData.animation === 'bounce') {
    // Bouncing animation
    const translateY = spring({
      frame: frame % (fps * 2), // reset every 2 seconds
      fps,
      config: {
        stiffness: 50,
        mass: 0.7,
      }
    });
    animationStyle = { transform: `translateY(${-100 * translateY}px)` };
  } 
  else if (shapeData.animation === 'scale') {
    // Scale up animation
    const scale = spring({
      frame,
      fps,
      config: {
        stiffness: 50,
        damping: 10,
      }
    });
    animationStyle = { transform: `scale(${scale})` };
  }
  
  // Render shape based on shapeType
  const renderShape = () => {
    if (shapeData.shapeType === 'circle') {
      return (
        <div 
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: shapeData.color,
            ...animationStyle,
          }}
        />
      );
    } 
    else if (shapeData.shapeType === 'square') {
      return (
        <div 
          style={{
            width: size,
            height: size,
            backgroundColor: shapeData.color,
            ...animationStyle,
          }}
        />
      );
    } 
    else if (shapeData.shapeType === 'triangle') {
      // Create a CSS triangle using border properties
      return (
        <div 
          style={{
            width: 0,
            height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${shapeData.color}`,
            ...animationStyle,
          }}
        />
      );
    }
    
    // Default fallback to circle
    return (
      <div 
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: shapeData.color,
          ...animationStyle,
        }}
      />
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: shapeData.backgroundColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      {renderShape()}
    </AbsoluteFill>
  );
}; 