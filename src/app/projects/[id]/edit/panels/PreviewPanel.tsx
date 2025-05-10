// src/app/projects/[id]/edit/panels/PreviewPanel.tsx
"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';
import { useVideoState } from '~/stores/videoState';
import { useTimeline } from '~/components/client/Timeline/TimelineContext';
import type { InputProps } from '~/types/input-props';
import { api } from '~/trpc/react';

export default function PreviewPanel({ 
  projectId, 
  initial 
}: { 
  projectId: string;
  initial?: InputProps;
}) {
  const { getCurrentProps, setProject, replace } = useVideoState();
  
  // Access the timeline context for bidirectional sync
  const { 
    currentFrame, 
    setCurrentFrame, 
    setPlayerRef,
    setIsPlaying,
    seekToFrame
  } = useTimeline();
  
  // Reference to the Remotion player
  const playerRef = useRef<PlayerRef>(null);

  // Poll backend for updated project every second to reflect server-side patches
  const { data: projectData } = api.project.getById.useQuery(
    { id: projectId },
    {
      enabled: !!projectId,
      refetchInterval: 1000,
      staleTime: 0,
    },
  );

  // Initialize or update project data when projectId or initial props change
  useEffect(() => {
    if (initial) {
      setProject(projectId, initial);
    }
  }, [projectId, initial, setProject]);

  // Replace props if project data changed (e.g. LLM patch applied)
  useEffect(() => {
    if (projectData?.props) {
      replace(projectId, projectData.props as InputProps);
    }
  }, [projectData?.props, projectId, replace]);

  // Handle play/pause state changes to sync with timeline
  const handlePlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, [setIsPlaying]);

  // When player loads, set the ref in timeline context
  const handlePlayerRef = useCallback((player: PlayerRef | null) => {
    if (player) {
      setPlayerRef(player);
    }
  }, [setPlayerRef]);

  // Handle frame changes from the player
  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, [setCurrentFrame]);

  // Get the current project's props
  const inputProps = getCurrentProps();

  if (!inputProps) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-pulse text-xl text-muted-foreground">Loading video preview...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-hidden relative">
        <Player
          ref={playerRef}
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
          initialFrame={currentFrame}
          renderLoading={() => <div className="flex items-center justify-center h-full"><div className="text-sm text-muted-foreground animate-pulse">Loading...</div></div>}
        />
      </div>
    </div>
  );
} 