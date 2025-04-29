import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";

// Load Inter font
loadFont();

// TypeScript interface for expected data in a text scene
interface TextSceneData {
  text?: string;
  color?: string;
  fontSize?: number;
  backgroundColor?: string;
}

interface TextSceneProps {
  data: Record<string, unknown>;
}

export const TextScene: React.FC<TextSceneProps> = ({ data }) => {
  const frame = useCurrentFrame();
  
  // Parse data with safe type casting
  const textData: TextSceneData = {
    text: typeof data.text === 'string' ? data.text : 'Default Text',
    color: typeof data.color === 'string' ? data.color : '#FFFFFF',
    fontSize: typeof data.fontSize === 'number' ? data.fontSize : 60,
    backgroundColor: typeof data.backgroundColor === 'string' ? data.backgroundColor : 'transparent',
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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: textData.backgroundColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <h1
        style={{
          fontFamily,
          fontSize: textData.fontSize,
          color: textData.color,
          textAlign: 'center',
          maxWidth: '80%',
        }}
      >
        {textData.text}
      </h1>
    </AbsoluteFill>
  );
}; 