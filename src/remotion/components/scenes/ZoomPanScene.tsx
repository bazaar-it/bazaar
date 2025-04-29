//src/remotion/components/scenes/ZoomPanScene.tsx
import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

// TypeScript interface for zoom-pan scene data
interface ZoomPanSceneData {
  src?: string;
  startScale?: number;
  endScale?: number;
  startX?: number;
  endX?: number;
  startY?: number;
  endY?: number;
  backgroundColor?: string;
}

interface ZoomPanSceneProps {
  data: Record<string, unknown>;
  children?: React.ReactNode;
}

/**
 * A scene that applies Ken Burns style zoom and pan effects to images
 * Supports configurable start/end positions and scales
 */
export const ZoomPanScene: React.FC<ZoomPanSceneProps> = ({ data, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  // Parse data with safe type casting
  const zoomPanData: ZoomPanSceneData = {
    src: typeof data.src === 'string' ? data.src : '/placeholder.jpg',
    startScale: typeof data.startScale === 'number' ? data.startScale : 1,
    endScale: typeof data.endScale === 'number' ? data.endScale : 1.2,
    startX: typeof data.startX === 'number' ? data.startX : 50,
    endX: typeof data.endX === 'number' ? data.endX : 50,
    startY: typeof data.startY === 'number' ? data.startY : 50,
    endY: typeof data.endY === 'number' ? data.endY : 50,
    backgroundColor: typeof data.backgroundColor === 'string' ? data.backgroundColor : '#000000',
  };
  
  // Get safe default values for animation
  const startScale = zoomPanData.startScale ?? 1;
  const endScale = zoomPanData.endScale ?? 1.2;
  const startX = zoomPanData.startX ?? 50;
  const endX = zoomPanData.endX ?? 50;
  const startY = zoomPanData.startY ?? 50;
  const endY = zoomPanData.endY ?? 50;
  
  // Set default image source
  const src = zoomPanData.src ?? '/placeholder.jpg';
  
  // Calculate animation progress (0 to 1) over the full duration
  const progress = interpolate(
    frame,
    [0, durationInFrames],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Fade in animation
  const opacity = interpolate(
    frame,
    [0, 15],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Calculate current scale and position based on progress
  const currentScale = interpolate(progress, [0, 1], [startScale, endScale]);
  const currentX = interpolate(progress, [0, 1], [startX, endX]);
  const currentY = interpolate(progress, [0, 1], [startY, endY]);
  
  // Resolve image source
  const imageSrc = src.startsWith('http') 
    ? src 
    : staticFile(src);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: zoomPanData.backgroundColor,
        overflow: 'hidden',
      }}
    >
      {/* Container for the image with zoom/pan effect */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          opacity,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            transform: `scale(${currentScale})`,
            transformOrigin: `${currentX}% ${currentY}%`,
          }}
        >
          <Img
            src={imageSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </div>
      
      {/* Overlay content if provided */}
      {children && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {children}
        </div>
      )}
    </AbsoluteFill>
  );
}; 