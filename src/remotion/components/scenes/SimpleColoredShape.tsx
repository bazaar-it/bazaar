//src/remotion/components/scenes/SimpleColoredShape.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';

// Simple shape component that can be added directly to videos
interface SimpleColoredShapeProps {
  data: Record<string, unknown>;
}

export const SimpleColoredShape: React.FC<SimpleColoredShapeProps> = ({ data }) => {
  // Parse data with safe type casting
  const color = typeof data.color === 'string' ? data.color : '#ff5757';
  const size = typeof data.size === 'number' ? data.size : 200;
  const shape = typeof data.shape === 'string' ? data.shape : 'circle';
  const backgroundColor = typeof data.backgroundColor === 'string' ? data.backgroundColor : '#1a1a1a';
  
  // Shape renderer based on selected shape
  const renderShape = () => {
    switch(shape) {
      case 'square':
        return (
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: color,
            }}
          />
        );
        
      case 'triangle':
        return (
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${size / 2}px solid transparent`,
              borderRight: `${size / 2}px solid transparent`,
              borderBottom: `${size}px solid ${color}`,
            }}
          />
        );
        
      case 'circle':
      default:
        return (
          <div
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: '50%',
            }}
          />
        );
    }
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {renderShape()}
    </AbsoluteFill>
  );
};