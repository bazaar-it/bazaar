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
  onPlay?: () => void;
  onPause?: () => void;
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
  outFrame,
  onPlay,
  onPause
}: RemotionPreviewProps) {
  // Log rendering for debugging
  useEffect(() => {
    console.log('RemotionPreview rendering with refreshToken:', refreshToken);
    console.log('RemotionPreview props:', { durationInFrames, fps, width, height, playbackRate });
  }, [durationInFrames, fps, width, height, refreshToken, playbackRate]);
  
  // Note: Frame update events are dispatched from PreviewPanelG to avoid duplication.

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
          {/* Maintain composition aspect ratio to avoid stretching/zooming */}
          <div style={{ width: '100%', maxHeight: '100%', aspectRatio: `${width} / ${height}` }} className="relative">
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
            // @ts-expect-error - onPlay and onPause work but aren't in type definitions
            onPlay={() => {
              try {
                const ev = new CustomEvent('preview-play-state-change', { detail: { playing: true } });
                window.dispatchEvent(ev);
              } catch {}
              onPlay?.();
            }}
            onPause={() => {
              try {
                const ev = new CustomEvent('preview-play-state-change', { detail: { playing: false } });
                window.dispatchEvent(ev);
              } catch {}
              onPause?.();
            }}
            key={refreshToken} // Force remount when refreshToken changes
            acknowledgeRemotionLicense
            className="remotion-player"
          />
          </div>
          {playerElement && createPortal(
            <>
              {/* Frame counter with FPS label - synced with Remotion controls */}
              <div
                className="pointer-events-none select-none remotion-frame-counter"
                style={{
                  position: 'absolute',
                  right: 60, // Position to the left of fullscreen button
                  bottom: 26, // Vertically center with control buttons
                  zIndex: 2147483647, // Maximum z-index for fullscreen
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1px',
                  transform: 'translateY(-50%)', // Center vertically
                  opacity: 1, // Always visible
                  transition: 'opacity 0.2s ease-in-out',
                }}
              >
                {/* Frame number */}
                <div
                  style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    lineHeight: 1,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {currentFrame}
                </div>
                {/* FPS label */}
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '8px',
                    lineHeight: 1,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    fontWeight: 500,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                  }}
                >
                  FPS
                </div>
              </div>
              

              
            </>,
            playerElement
          )}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
} 
