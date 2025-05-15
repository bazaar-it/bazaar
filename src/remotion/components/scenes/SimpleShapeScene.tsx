//src/remotion/components/scenes/SimpleShapeScene.tsx
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

// TypeScript interface for expected data in a shape scene
interface SimpleShapeData {
  color?: string;
  size?: number;
  shape?: 'circle' | 'square' | 'triangle';
  backgroundColor?: string;
}

interface SimpleShapeProps {
  data: Record<string, unknown>;
}

export const SimpleShapeScene: React.FC<SimpleShapeProps> = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Parse data with safe type casting
  const shapeData: SimpleShapeData = {
    color: typeof data.color === 'string' ? data.color : '#ff5757',
    size: typeof data.size === 'number' ? data.size : 200,
    shape: ['circle', 'square', 'triangle'].includes(data.shape as string) 
      ? (data.shape as 'circle' | 'square' | 'triangle') 
      : 'circle',
    backgroundColor: typeof data.backgroundColor === 'string' ? data.backgroundColor : '#1a1a1a',
  };
  
  // Animation: shape grows and rotates slightly
  const scale = interpolate(
    frame,
    [0, 30, 60],
    [0.3, 1, 0.9],
    {
      extrapolateRight: 'clamp',
    }
  );
  
  const rotation = interpolate(
    frame,
    [0, 60],
    [0, 10],
    {
      extrapolateRight: 'clamp',
    }
  );
  
  // Shape renderer based on selected shape
  const renderShape = () => {
    const { shape, color, size } = shapeData;
    // Make sure size is defined (we already set default to 200 above)
    const actualSize = size || 200;
    const scaledSize = actualSize * scale;
    
    switch(shape) {
      case 'square':
        return (
          <div
            style={{
              width: scaledSize,
              height: scaledSize,
              backgroundColor: color,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
        
      case 'triangle':
        return (
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${scaledSize / 2}px solid transparent`,
              borderRight: `${scaledSize / 2}px solid transparent`,
              borderBottom: `${scaledSize}px solid ${color}`,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
        
      case 'circle':
      default:
        return (
          <div
            style={{
              width: scaledSize,
              height: scaledSize,
              backgroundColor: color,
              borderRadius: '50%',
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: shapeData.backgroundColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {renderShape()}
    </AbsoluteFill>
  );
};
