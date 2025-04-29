import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

// TypeScript interface for expected data in an image scene
interface ImageSceneData {
  src?: string;
  fit?: 'cover' | 'contain';
  backgroundColor?: string;
}

interface ImageSceneProps {
  data: Record<string, unknown>;
}

export const ImageScene: React.FC<ImageSceneProps> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Parse data with safe type casting
  const imageData: ImageSceneData = {
    src: typeof data.src === 'string' ? data.src : '/placeholder.jpg',
    fit: data.fit === 'cover' || data.fit === 'contain' ? data.fit : 'cover',
    backgroundColor: typeof data.backgroundColor === 'string' ? data.backgroundColor : '#000000',
  };
  
  // Fade in animation over 20 frames
  const opacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    {
      extrapolateRight: 'clamp',
    }
  );
  
  // Spring animation for subtle zoom
  const scale = spring({
    frame,
    fps,
    from: 0.95,
    to: 1,
    config: {
      damping: 15,
      mass: 0.8,
      stiffness: 100,
    },
  });
  
  // Resolve image source: if it starts with http/https, use it directly; otherwise use staticFile
  const imageSrc = imageData.src?.startsWith('http') 
    ? imageData.src 
    : staticFile(imageData.src || '/placeholder.jpg');

  return (
    <AbsoluteFill
      style={{
        backgroundColor: imageData.backgroundColor,
        opacity,
      }}
    >
      <div style={{ 
        transform: `scale(${scale})`,
        width: '100%',
        height: '100%',
        position: 'relative',
      }}>
        <Img 
          src={imageSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: imageData.fit,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}; 