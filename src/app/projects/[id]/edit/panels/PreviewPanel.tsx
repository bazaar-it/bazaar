// src/app/projects/[id]/edit/panels/PreviewPanel.tsx
"use client";

import React, { useEffect } from 'react';
import { Player } from '@remotion/player';
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';
import { useVideoState } from '~/stores/videoState';
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

  // Get the current project's props
  const inputProps = getCurrentProps();

  if (!inputProps) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-pulse text-xl">Loading video preview...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white bg-opacity-90">
      <h2 className="text-xl font-semibold mb-4"></h2>
      
      <div className="flex-1 rounded-lg overflow-hidden">
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