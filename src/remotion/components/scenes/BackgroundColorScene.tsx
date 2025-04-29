//src/remotion/components/scenes/BackgroundColorScene.tsx
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// TypeScript interface for background color scene data
// color and animationType are always defined after parsing
interface BackgroundColorSceneData {
  color: string;
  toColor?: string;
  animationType: 'fade' | 'spring' | 'pulse';
}

interface BackgroundColorSceneProps {
  data: Record<string, unknown>;
}

/**
 * A scene that animates background color transitions
 * Supports simple fade, spring animation, or pulsing effect
 */
export const BackgroundColorScene: React.FC<BackgroundColorSceneProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Parse data with safe type casting
  const bgData: BackgroundColorSceneData = {
    // Always have a defined starting color
    color: typeof data.color === 'string' ? data.color : '#000000',
    // Optional transition target color
    toColor: typeof data.toColor === 'string' ? data.toColor : undefined,
    // Always have a valid animation type
    animationType: ['fade', 'spring', 'pulse'].includes(data.animationType as string)
      ? (data.animationType as 'fade' | 'spring' | 'pulse')
      : 'fade',
  };
  
  // If we have a toColor, we'll perform a color transition
  if (bgData.toColor) {
    // Extract RGB components for interpolation
    const parseColor = (color: string) => {
      // Handle hex colors
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return { r, g, b };
      }
      // Default fallback
      return { r: 0, g: 0, b: 0 };
    };

    // parseColor requires string; bgData.color is always string, toColor is guarded by if-check
    const startColor = parseColor(bgData.color);
    const endColor = parseColor(bgData.toColor!);
    
    let progress = 0;
    
    // Different animation types
    if (bgData.animationType === 'fade') {
      // Linear fade from start to end color
      progress = interpolate(
        frame,
        [0, durationInFrames - 1],
        [0, 1],
        { extrapolateRight: 'clamp' }
      );
    } else if (bgData.animationType === 'spring') {
      // Spring-based transition
      progress = spring({
        frame,
        fps,
        config: {
          mass: 0.5,
          stiffness: 50,
          damping: 10,
        }
      });
    } else if (bgData.animationType === 'pulse') {
      // Pulsing effect between the two colors
      progress = interpolate(
        Math.sin(frame / (fps/2)), // oscillate every half-second
        [-1, 1],
        [0, 1],
        { extrapolateRight: 'clamp' }
      );
    }
    
    // Interpolate each RGB component
    const r = Math.round(interpolate(progress, [0, 1], [startColor.r, endColor.r]));
    const g = Math.round(interpolate(progress, [0, 1], [startColor.g, endColor.g]));
    const b = Math.round(interpolate(progress, [0, 1], [startColor.b, endColor.b]));
    
    return (
      <AbsoluteFill
        style={{
          backgroundColor: `rgb(${r}, ${g}, ${b})`,
        }}
      />
    );
  }
  
  // If no toColor specified, just use a static color with a fade-in
  const opacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgData.color,
        opacity,
      }}
    />
  );
}; 