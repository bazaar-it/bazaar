"use client";

import React, { useEffect } from 'react';
import { Player } from '@remotion/player';
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
}

// The main preview component that wraps Remotion Player
export default function RemotionPreview({
  lazyComponent,
  durationInFrames,
  fps,
  width,
  height,
  refreshToken = '',
  inputProps = {}
}: RemotionPreviewProps) {
  // Log rendering for debugging
  useEffect(() => {
    console.log('RemotionPreview rendering with props:', { durationInFrames, fps, width, height });
    console.log('Input props for component:', inputProps);
  }, [durationInFrames, fps, width, height, inputProps]);
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Player
        lazyComponent={lazyComponent}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={fps}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls
        showVolumeControls
        doubleClickToFullscreen
        clickToPlay
        key={refreshToken} // Force remount when refreshToken changes
        acknowledgeRemotionLicense
      />
    </ErrorBoundary>
  );
} 