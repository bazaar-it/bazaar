"use client";
import React, { useEffect, useRef, useState } from 'react';

const AspectRatioTransitionPlayer: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % 360); // 12 seconds at 30fps for better pacing
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const AspectRatioContent: React.FC = () => {
    const frame = currentFrame;
    
    const interpolate = (frame: number, inputRange: [number, number], outputRange: [number, number], options?: { extrapolateLeft?: string; extrapolateRight?: string }) => {
      const [inputMin, inputMax] = inputRange;
      const [outputMin, outputMax] = outputRange;
      
      if (options?.extrapolateLeft === "clamp" && frame < inputMin) return outputMin;
      if (options?.extrapolateRight === "clamp" && frame > inputMax) return outputMax;
      
      const progress = (frame - inputMin) / (inputMax - inputMin);
      return outputMin + progress * (outputMax - outputMin);
    };

    // Animation phases with pauses:
    // 0-60: Vertical (pause)
    // 60-90: Transition to Square
    // 90-150: Square (pause)
    // 150-180: Transition to Horizontal
    // 180-240: Horizontal (pause)
    // 240-270: Transition back to Square
    // 270-315: Square (pause)
    // 315-360: Smoother transition back to Vertical

    let aspectRatio = 9/16; // Start vertical
    
    if (frame >= 0 && frame < 60) {
      // Vertical pause
      aspectRatio = 9/16;
    } else if (frame >= 60 && frame < 90) {
      // Quick transition to Square
      aspectRatio = interpolate(frame, [60, 90], [9/16, 1/1]);
    } else if (frame >= 90 && frame < 150) {
      // Square pause
      aspectRatio = 1/1;
    } else if (frame >= 150 && frame < 180) {
      // Quick transition to Horizontal
      aspectRatio = interpolate(frame, [150, 180], [1/1, 16/9]);
    } else if (frame >= 180 && frame < 240) {
      // Horizontal pause
      aspectRatio = 16/9;
    } else if (frame >= 240 && frame < 270) {
      // Quick transition back to Square
      aspectRatio = interpolate(frame, [240, 270], [16/9, 1/1]);
    } else if (frame >= 270 && frame < 315) {
      // Square pause (shorter)
      aspectRatio = 1/1;
    } else if (frame >= 315 && frame < 360) {
      // Smoother, longer transition back to Vertical
      aspectRatio = interpolate(frame, [315, 360], [1/1, 9/16]);
    }

    // Calculate dimensions based on aspect ratio
    const maxWidth = 280;
    const maxHeight = 280;
    
    let width, height;
    if (aspectRatio > 1) {
      // Landscape
      width = maxWidth;
      height = maxWidth / aspectRatio;
    } else {
      // Portrait or square
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }



                    return (
      <div style={{ 
        width: '100%', 
        height: '400px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'transparent',
        padding: '20px'
      }}>
        {/* Video container with dynamic aspect ratio */}
        <div
          style={{
            width: `${width}px`,
            height: `${height}px`,
            background: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
            borderRadius: '16px',
            transition: 'all 0.3s ease-out',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >

          
          {/* Central Play button */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: 10
          }}>
            <div style={{
              width: '0',
              height: '0',
              borderLeft: '14px solid #ec4899',
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              marginLeft: '4px'
            }} />
          </div>
        </div>
        

        

      </div>
    );
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        background: 'transparent',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <AspectRatioContent />
    </div>
  );
};

export default AspectRatioTransitionPlayer; 