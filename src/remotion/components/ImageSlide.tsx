import React from 'react';
import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

interface ImageSlideProps {
  src: string;
}

export const ImageSlide: React.FC<ImageSlideProps> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Scale up from 0.95 to 1 using spring animation
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

  // If the src starts with http or https, use it directly
  // Otherwise, use staticFile() to reference files in the public directory
  const imageSrc = src.startsWith('http') ? src : staticFile(src);

  return (
    <AbsoluteFill 
      className="flex items-center justify-center bg-black"
    >
      <div style={{ 
        transform: `scale(${scale})`,
        width: '100%',
        height: '100%',
        position: 'relative',
      }}>
        <Img 
          src={imageSrc}
          className="object-cover"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </AbsoluteFill>
  );
}; 