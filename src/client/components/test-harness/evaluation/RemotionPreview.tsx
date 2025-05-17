//src/client/components/test-harness/evaluation/RemotionPreview.tsx
'use client';

import { useEffect, useState } from 'react';
import { Player } from '@remotion/player';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from '~/trpc/react';
import type { AnimationDesignBrief, SceneElement } from '~/lib/schemas/animationDesignBrief.schema';

interface RemotionPreviewProps {
  taskId: string;
}

export function RemotionPreview({ taskId }: RemotionPreviewProps) {
  const [selectedBriefIndex, setSelectedBriefIndex] = useState(0);
  
  // Fetch design briefs for the given task
  const { data: briefs, isLoading, error } = api.a2a.getTaskDesignBriefs.useQuery(
    { taskId },
    { 
      enabled: !!taskId,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Handle case when there are multiple briefs
  const handleNextBrief = () => {
    if (briefs && briefs.length > 0) {
      setSelectedBriefIndex((prev) => (prev + 1) % briefs.length);
    }
  };

  // Handle case when there are multiple briefs
  const handlePreviousBrief = () => {
    if (briefs && briefs.length > 0) {
      setSelectedBriefIndex((prev) => (prev - 1 + briefs.length) % briefs.length);
    }
  };

  // Get the selected brief
  const selectedBrief = briefs && briefs.length > 0 ? briefs[selectedBriefIndex] : null;
  const briefData = selectedBrief?.briefData;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Animation Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-gray-500">Loading animation preview...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Animation Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-red-500">Error loading animation: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!briefs || briefs.length === 0 || !briefData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Animation Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-gray-500">No animation design available for this task</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare the props for the DynamicVideo composition
  // Map animation design brief elements to the format expected by DynamicVideo
  const inputProps = {
    scenes: briefData.elements.map((element: SceneElement) => {
      // Map element type from design brief to DynamicVideo scene type
      const mapElementTypeToSceneType = (type: string): string => {
        switch (type) {
          case 'text': return 'text';
          case 'image': return 'image';
          case 'shape': return 'shape';
          case 'customComponent': return 'custom';
          default: return 'text'; // Fallback type
        }
      };

      // Extract timing information from animations
      const firstAnimation = element.animations && element.animations.length > 0 
        ? element.animations[0] 
        : null;
        
      return {
        id: element.elementId || `scene-${Math.random().toString(36).substring(2, 9)}`,
        type: mapElementTypeToSceneType(element.elementType),
        start: firstAnimation?.startAtFrame || 0,
        duration: element.animations?.reduce((max, anim) => 
          Math.max(max, anim.startAtFrame + anim.durationInFrames), 30) || 30,
        data: {
          // Map properties based on element type
          ...(element.elementType === 'text' && { 
            text: element.content || 'Text content', 
            fontSize: element.initialLayout?.scale ? element.initialLayout.scale * 40 : 40,
            color: element.initialLayout?.backgroundColor || '#FFFFFF'
          }),
          ...(element.elementType === 'image' && { 
            src: '/placeholder.jpg', // Use a placeholder as fallback
            fit: 'cover'
          }),
          ...(element.elementType === 'customComponent' && { 
            componentId: element.componentName || 'default'
          }),
          // Include layout information
          ...element.initialLayout
        },
      };
    }),
    meta: {
      duration: briefData.durationInFrames || 150,
      title: `Design Brief Preview: ${briefData.sceneId}`,
      backgroundColor: briefData.colorPalette?.background || "#000000",
    },
  };

  // Dimensions based on the brief or defaults
  const width = briefData.dimensions?.width || 1280;
  const height = briefData.dimensions?.height || 720;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Animation Preview
          {briefs.length > 1 && (
            <div className="text-sm">
              <span className="font-normal text-gray-500">
                Brief {selectedBriefIndex + 1} of {briefs.length}
              </span>
              <button 
                onClick={handlePreviousBrief}
                className="ml-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                ←
              </button>
              <button 
                onClick={handleNextBrief}
                className="ml-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                →
              </button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full overflow-hidden rounded-md border">
          <Player
          component={'DynamicVideo' as unknown as React.ComponentType<any>}
          inputProps={inputProps}
          durationInFrames={briefData.durationInFrames || 150}
          fps={30}
          compositionWidth={width}
          compositionHeight={height}
          style={{
            width: '100%',
            height: 'auto',
          }}
          controls
          autoPlay
          loop
        />  
        </div>
      </CardContent>
    </Card>
  );
}
