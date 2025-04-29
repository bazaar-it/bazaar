//src/remotion/components/scenes/ParticlesScene.tsx
import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, random } from 'remotion';

// TypeScript interface for particle data
interface ParticleData {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  rotation: number;
}

// TypeScript interface for particles scene data
interface ParticlesSceneData {
  count?: number;
  type?: 'circle' | 'square' | 'dot' | 'star';
  colors?: string[];
  maxSize?: number;
  minSize?: number;
  backgroundColor?: string;
}

interface ParticlesSceneProps {
  data: Record<string, unknown>;
  children?: React.ReactNode;
}

/**
 * A scene that displays animated particles
 * Supports different particle shapes, sizes, and movement patterns
 */
export const ParticlesScene: React.FC<ParticlesSceneProps> = ({ data, children }) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Parse data with safe type casting
  const particlesData: ParticlesSceneData = {
    count: typeof data.count === 'number' ? data.count : 50,
    type: ['circle', 'square', 'dot', 'star'].includes(data.type as string) 
      ? data.type as 'circle' | 'square' | 'dot' | 'star' 
      : 'circle',
    colors: Array.isArray(data.colors) && data.colors.every(c => typeof c === 'string') 
      ? data.colors 
      : ['#FFC700', '#FF0055', '#00FFFF', '#7928CA'],
    maxSize: typeof data.maxSize === 'number' ? data.maxSize : 30,
    minSize: typeof data.minSize === 'number' ? data.minSize : 5,
    backgroundColor: typeof data.backgroundColor === 'string' ? data.backgroundColor : '#000000',
  };
  
  // Default colors to ensure we always have at least one
  const defaultColors = ['#FFC700', '#FF0055', '#00FFFF', '#7928CA'];
  
  // Generate particles with consistent random values
  const particles: ParticleData[] = useMemo(() => {
    const count = particlesData.count ?? 50;
    const maxSize = particlesData.maxSize ?? 30;
    const minSize = particlesData.minSize ?? 5;
    
    // Make sure we have a valid colors array
    const colors = particlesData.colors && particlesData.colors.length > 0 
      ? particlesData.colors 
      : defaultColors;
    
    return Array.from({ length: count }).map((_, i) => {
      // Use Remotion's deterministic random function with different seeds
      const x = random(`x-${i}`) * width;
      const y = random(`y-${i}`) * height;
      const size = minSize + random(`size-${i}`) * (maxSize - minSize);
      const speed = 0.2 + random(`speed-${i}`) * 0.8;
      const colorIndex = Math.floor(random(`color-${i}`) * colors.length);
      const rotation = random(`rotation-${i}`) * 360;
      
      // Fallback ensures a string; non-null assertion removes undefined
      const color = (colors[colorIndex] ?? defaultColors[0])!;
      
      return {
        x,
        y,
        size,
        speed,
        color,
        rotation,
      };
    });
  }, [
    particlesData.count, 
    particlesData.colors, 
    particlesData.maxSize, 
    particlesData.minSize, 
    width, 
    height
  ]);
  
  // Scene fade in animation
  const opacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Render a specific particle shape based on type
  const renderParticle = (particle: ParticleData, index: number) => {
    // Calculate new position based on time and speed
    const x = (particle.x + (frame * particle.speed * 2)) % width;
    const y = (particle.y + (frame * particle.speed)) % height;
    
    // Calculate opacity based on time
    const particleOpacity = interpolate(
      Math.sin((frame / fps) * 2 + index),
      [-1, 1],
      [0.3, 1]
    );
    
    // Calculate rotation for certain shapes
    const rotation = particle.rotation + frame * (particle.speed * 2);
    
    // Create styles based on particle type
    switch (particlesData.type) {
      case 'circle':
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: particle.size,
              height: particle.size,
              borderRadius: '50%',
              backgroundColor: particle.color,
              opacity: particleOpacity,
              transform: `translate(${x}px, ${y}px)`,
            }}
          />
        );
      
      case 'square':
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: particleOpacity,
              transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
            }}
          />
        );
      
      case 'dot':
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: particle.size / 2,
              height: particle.size / 2,
              borderRadius: '50%',
              backgroundColor: particle.color,
              opacity: particleOpacity,
              boxShadow: `0 0 ${particle.size / 2}px ${particle.color}`,
              transform: `translate(${x}px, ${y}px)`,
            }}
          />
        );
      
      case 'star':
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              borderLeft: `${particle.size / 2}px solid transparent`,
              borderRight: `${particle.size / 2}px solid transparent`,
              borderBottom: `${particle.size}px solid ${particle.color}`,
              opacity: particleOpacity,
              transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
            }}
          />
        );
      
      default:
        // Default to circle
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: particle.size,
              height: particle.size,
              borderRadius: '50%',
              backgroundColor: particle.color,
              opacity: particleOpacity,
              transform: `translate(${x}px, ${y}px)`,
            }}
          />
        );
    }
  };
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: particlesData.backgroundColor,
        opacity,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {particles.map((particle, index) => renderParticle(particle, index))}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}; 