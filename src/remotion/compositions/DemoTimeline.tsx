// src/remotion/compositions/DemoTimeline.tsx
import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { TitleCard } from '../components/TitleCard';
import { ImageSlide } from '../components/ImageSlide';
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";
import { type DemoTimelineProps } from '../../types/remotion-constants';
import { type z } from 'zod';

// Load Inter font
loadFont();

export const DemoTimeline: React.FC<z.infer<typeof DemoTimelineProps>> = ({ 
  title, 
  author, 
  imageUrl 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cross-fade opacity for ImageSlide
  const imageOpacity = interpolate(
    frame,
    [45, 60], // Start fading in at frame 45, fully visible by frame 60
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Opacity for outro text
  const outroOpacity = interpolate(
    frame,
    [105, 120], // Start fading in at frame 105, fully visible by frame 120
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill>
      {/* Title Card (frames 0-60) */}
      <Sequence durationInFrames={60}>
        <TitleCard title={title} author={author} />
      </Sequence>

      {/* Image Slide (frames 45-105) with cross-fade */}
      <Sequence from={45} durationInFrames={60}>
        <div style={{ opacity: imageOpacity }}>
          <ImageSlide src={imageUrl} />
        </div>
      </Sequence>

      {/* Outro (frames 105-150) */}
      <Sequence from={105} durationInFrames={45}>
        <AbsoluteFill 
          className="flex flex-col items-center justify-center bg-black text-white"
          style={{ opacity: outroOpacity }}
        >
          <h2 
            className="text-4xl font-bold"
            style={{ fontFamily }}
          >
            Thank you for watching
          </h2>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}; 