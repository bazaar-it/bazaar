"use client";
import React from 'react';
import { Player } from '@remotion/player';
import type { ComponentType } from 'react';

interface PortraitVideoPlayerProps {
  // The Remotion composition component to render
  composition: ComponentType<any>;
  // Video configuration
  durationInFrames: number;
  fps?: number;
  width?: number;
  height?: number;
  // Player configuration
  autoPlay?: boolean;
  loop?: boolean;
  controls?: boolean;
  // Additional props to pass to the composition
  inputProps?: Record<string, any>;
  // Styling
  className?: string;
  style?: React.CSSProperties;
}

export default function PortraitVideoPlayer({
  composition,
  durationInFrames,
  fps = 30,
  width = 390,
  height = 693, // Perfect 9:16 aspect ratio
  autoPlay = false,
  loop = false,
  controls = true,
  inputProps = {},
  className = "",
  style = {},
}: PortraitVideoPlayerProps) {
  return (
    <div 
      className={`portrait-video-player ${className}`} 
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <Player
        component={composition}
        durationInFrames={durationInFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        loop={loop}
        autoPlay={autoPlay}
        controls={controls}
        inputProps={inputProps}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '40px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          backgroundColor: '#f0f0f0', // Add background to make it visible
        }}
        clickToPlay={true}
        doubleClickToFullscreen={true}
        showVolumeControls={false}
        allowFullscreen={true}
        spaceKeyToPlayOrPause={true}
        numberOfSharedAudioTags={0}
      />
    </div>
  );
} 