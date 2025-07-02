// src/app/projects/[id]/generate/components/RemotionPreview.tsx

"use client";

import React, { useEffect, useMemo, Suspense } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { ErrorBoundary } from 'react-error-boundary';

// Error fallback component to display when component loading fails
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200 overflow-auto">
      <h3 className="font-bold mb-2">Error Loading Component</h3>
      <p className="mb-2">{error.message}</p>
      <pre className="text-xs bg-red-100 p-2 rounded overflow-auto">
        {error.stack}
      </pre>
    </div>
  );
}

// Props interface for the RemotionPreview component
export interface RemotionPreviewProps {
  lazyComponent: () => Promise<any>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  refreshToken?: string;
  inputProps?: Record<string, any>;
  playerRef?: React.RefObject<PlayerRef | null>;
}

// The main preview component that wraps Remotion Player
export default function RemotionPreview({
  lazyComponent,
  durationInFrames,
  fps,
  width,
  height,
  refreshToken = '',
  inputProps = {},
  playerRef,
  playbackRate = 1
}: RemotionPreviewProps) {
  // Log rendering for debugging
  useEffect(() => {
    console.log('RemotionPreview rendering with refreshToken:', refreshToken);
    console.log('RemotionPreview props:', { durationInFrames, fps, width, height });
  }, [durationInFrames, fps, width, height, refreshToken]);
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={
        <div className="flex h-full w-full items-center justify-center text-gray-400">
          Loading component...
        </div>
      }>
        <Player
          ref={playerRef}
          lazyComponent={lazyComponent}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={width}
          compositionHeight={height}
          fps={fps}
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
          }}
          controls
          showVolumeControls
          doubleClickToFullscreen
          clickToPlay
          loop={true}
          autoPlay={true}
          playbackRate={playbackRate}
          key={refreshToken} // Force remount when refreshToken changes
          acknowledgeRemotionLicense
        />
      </Suspense>
    </ErrorBoundary>
  );
} 