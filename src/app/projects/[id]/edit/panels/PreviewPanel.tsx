// src/app/projects/[id]/edit/panels/PreviewPanel.tsx
"use client";

import React, { useEffect } from 'react';
import { Player } from '@remotion/player';
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';
import { useVideoState } from '~/stores/videoState';
import type { InputProps } from '~/types/input-props';

export default function PreviewPanel({ 
  projectId, 
  initial 
}: { 
  projectId: string;
  initial?: InputProps;
}) {
  const { inputProps, replace } = useVideoState();
  
  // Set initial project data when provided
  useEffect(() => {
    if (initial && !inputProps) {
      replace(initial);
    }
  }, [initial, inputProps, replace]);

  if (!inputProps) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading video preview...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4">Video Preview</h2>
      
      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
        <Player
          component={DynamicVideo}
          durationInFrames={inputProps.meta.duration}
          fps={30}
          compositionWidth={1280}
          compositionHeight={720}
          inputProps={inputProps}
          style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}
          controls
          autoPlay
          loop
        />
      </div>
    </div>
  );
} 