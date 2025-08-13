// src/app/projects/[id]/generate/components/RemotionPreview.tsx

"use client";

import React, { useEffect, useMemo, Suspense, useState, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { ErrorBoundary } from 'react-error-boundary';
import { createPortal } from 'react-dom';

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
  playbackRate?: number;
  loop?: boolean;
  inFrame?: number;
  outFrame?: number;
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
  playbackRate = 1,
  loop = true,
  inFrame,
  outFrame
}: RemotionPreviewProps) {
  // Log rendering for debugging
  useEffect(() => {
    console.log('RemotionPreview rendering with refreshToken:', refreshToken);
    console.log('RemotionPreview props:', { durationInFrames, fps, width, height, playbackRate });
  }, [durationInFrames, fps, width, height, refreshToken, playbackRate]);
  
  // Emit current frame updates for external UI (e.g., frame counter)
  useEffect(() => {
    if (!playerRef?.current) return;
    const ref = playerRef.current;
    const onFrame = () => {
      try {
        const frame = (ref as any)?.getCurrentFrame?.() ?? undefined;
        if (typeof frame === 'number') {
          const ev = new CustomEvent('preview-frame-update', { detail: { frame } });
          window.dispatchEvent(ev);
        }
      } catch {}
    };
    const interval = window.setInterval(onFrame, Math.max(1000 / fps, 16));
    return () => window.clearInterval(interval);
  }, [playerRef, fps]);

  // Simple state for current frame display
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [playerElement, setPlayerElement] = useState<HTMLElement | null>(null);
  const hasAudio = !!(inputProps?.audio?.url);
  
  // Update frame from player
  useEffect(() => {
    if (!playerRef?.current) return;
    const updateFrame = () => {
      try {
        const frame = (playerRef.current as any)?.getCurrentFrame?.() ?? 0;
        if (typeof frame === 'number') {
          setCurrentFrame(frame);
        }
      } catch {}
    };
    const interval = setInterval(updateFrame, 100);
    return () => clearInterval(interval);
  }, [playerRef]);

  // Find the player element for portal injection
  useEffect(() => {
    if (!playerContainerRef.current) return;
    
    const findPlayer = () => {
      const player = playerContainerRef.current?.querySelector('.remotion-player') as HTMLElement | null;
      if (player) {
        setPlayerElement(player);
        // Ensure player has position relative for absolute children
        if (getComputedStyle(player).position === 'static') {
          player.style.position = 'relative';
        }
      }
    };
    
    // Try multiple times to catch dynamically rendered player
    findPlayer();
    const t1 = setTimeout(findPlayer, 100);
    const t2 = setTimeout(findPlayer, 500);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [refreshToken]);

  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={
        <div className="flex h-full w-full items-center justify-center text-gray-400">
          Loading component...
        </div>
      }>
        <div className="w-full h-full flex items-center justify-center relative" ref={playerContainerRef}>
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
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              backgroundColor: 'white',
            }}
            controls
            showVolumeControls
            doubleClickToFullscreen
            clickToPlay
            loop={loop}
            autoPlay={false}
            playbackRate={playbackRate}
            initiallyMuted={false}
            inFrame={inFrame}
            outFrame={outFrame}
            key={refreshToken} // Force remount when refreshToken changes
            acknowledgeRemotionLicense
            className="remotion-player"
          />
          {playerElement && createPortal(
            <>
              {/* Frame counter */}
              <div
                className="pointer-events-none select-none"
                style={{
                  position: 'absolute',
                  right: 48,
                  bottom: 34,
                  zIndex: 2147483647, // Maximum z-index for fullscreen
                  color: 'rgba(255,255,255,0.95)',
                  background: 'rgba(17,17,17,0.45)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  lineHeight: 1,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {currentFrame}
              </div>
              
            </>,
            playerElement
          )}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
} 