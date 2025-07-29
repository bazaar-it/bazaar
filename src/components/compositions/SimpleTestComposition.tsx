"use client";
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export const SimpleTestComposition: React.FC = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#ff6b6b' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '60px', marginBottom: '20px' }}>
          Test Video
        </h1>
        <p style={{ fontSize: '24px' }}>
          Frame: {frame}
        </p>
        <div
          style={{
            width: '100px',
            height: '100px',
            backgroundColor: 'white',
            borderRadius: '50%',
            transform: `rotate(${frame * 6}deg)`,
            marginTop: '30px',
          }}
        />
      </div>
    </AbsoluteFill>
  );
}; 