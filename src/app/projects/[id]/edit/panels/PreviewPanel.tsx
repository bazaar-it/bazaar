// src/app/projects/[id]/edit/panels/PreviewPanel.tsx
"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';
import { useVideoState } from '~/stores/videoState';
import { useTimeline } from '~/components/client/Timeline/TimelineContext';
import type { InputProps } from '~/types/input-props';
import { api } from '~/trpc/react';
import DebugTimelineOverlay from '~/components/client/Preview/DebugTimelineOverlay';

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
  
  // Debug mode toggle - IMPORTANT: must be before any conditionals to comply with React's Rules of Hooks
  const [debugMode, setDebugMode] = useState(true);

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
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="animate-pulse text-xl text-muted-foreground">Loading video preview...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-medium">Preview</h2>
          <p className="text-sm text-muted-foreground">Video preview</p>
        </div>
        <button 
          onClick={() => setDebugMode(!debugMode)}
          className="text-xs px-2 py-1 rounded-[15px] bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm"
        >
          {debugMode ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
      </div>
      
      <div className="flex-1 rounded-[15px] shadow-sm overflow-hidden relative p-3">
        <Player
          ref={playerRef}
          component={DynamicVideo}
          durationInFrames={inputProps.meta.duration}
          fps={30}
          compositionWidth={1280}
          compositionHeight={720}
          inputProps={inputProps}
          style={{ width: '100%', height: 'auto', aspectRatio: '16/9', borderRadius: '12px' }}
          controls
          autoPlay
          loop
          initialFrame={currentFrame}
          renderLoading={() => <div className="flex items-center justify-center h-full"><div className="text-sm text-muted-foreground animate-pulse">Loading...</div></div>}
        />
        
        {/* Debug overlay */}
        {debugMode && <DebugTimelineOverlay projectId={projectId} />}
      </div>
    </div>
  );
} 