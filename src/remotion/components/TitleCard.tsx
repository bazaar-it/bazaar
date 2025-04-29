import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";

// Load Inter font
loadFont();

interface TitleCardProps {
  title: string;
  author: string;
}

export const TitleCard: React.FC<TitleCardProps> = ({ title, author }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Fade in over 12 frames
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill 
      className="flex flex-col items-center justify-center bg-black text-white"
      style={{ opacity }}
    >
      <h1 
        className="text-6xl font-bold mb-4"
        style={{ fontFamily }}
      >
        {title}
      </h1>
      <p 
        className="text-2xl"
        style={{ fontFamily }}
      >
        by {author}
      </p>
    </AbsoluteFill>
  );
}; 