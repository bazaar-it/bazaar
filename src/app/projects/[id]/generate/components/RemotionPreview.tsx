// src/app/projects/[id]/generate/components/RemotionPreview.tsx

"use client";

import React, { useEffect, useMemo, Suspense, useState, useRef, useCallback } from 'react';
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
  const audioUnlockRef = useRef<boolean>(false);
  
  // Helper: Try to resume any media elements inside the player (best-effort)
  const resumeMediaElements = useCallback(async () => {
    try {
      const scope = playerContainerRef.current;
      if (!scope) return;
      const mediaEls: HTMLMediaElement[] = Array.from(scope.querySelectorAll('audio, video')) as any;
      if (!mediaEls.length) return;
      for (const m of mediaEls) {
        try {
          // Unmute and set volume for immediate sound
          (m as any).muted = false;
          if (typeof (m as any).volume === 'number') (m as any).volume = 1;
          const p = (m as HTMLMediaElement).play?.();
          if (p && typeof p.then === 'function') {
            await p.catch((e: any) => {
              try { console.warn('[RemotionPreview] Media play() blocked or failed:', e); } catch {}
            });
          }
        } catch (err) {
          try { console.warn('[RemotionPreview] Failed to resume media element:', err); } catch {}
        }
      }
    } catch {}
  }, []);
  
  // Update frame from player and infer play/pause state for external listeners
  useEffect(() => {
    if (!playerRef?.current) return;
    let lastFrame = -1;
    let stillTicks = 0;
    const tick = () => {
      try {
        const frame = (playerRef.current as any)?.getCurrentFrame?.() ?? 0;
        if (typeof frame === 'number') {
          setCurrentFrame(frame);
          if (lastFrame === -1) lastFrame = frame;
          if (frame !== lastFrame) {
            stillTicks = 0;
            // Went from paused -> playing
            if (!(window as any).__previewPlaying) {
              (window as any).__previewPlaying = true;
              try { window.dispatchEvent(new CustomEvent('preview-play-state-change', { detail: { playing: true } })); } catch {}
              try { onPlay?.(); } catch {}
            }
          } else {
            stillTicks += 1;
            // Consider paused if no frame advance for a few ticks
            if ((window as any).__previewPlaying && stillTicks >= 3) {
              (window as any).__previewPlaying = false;
              try { window.dispatchEvent(new CustomEvent('preview-play-state-change', { detail: { playing: false } })); } catch {}
              try { onPause?.(); } catch {}
            }
          }
          lastFrame = frame;
        }
      } catch {}
    };
    const interval = setInterval(tick, 150);
    return () => clearInterval(interval);
  }, [playerRef, onPlay, onPause]);

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

  // One-time audio unlock using any pointer gesture inside the player container
  useEffect(() => {
    if (!hasAudio) return;
    const el = playerContainerRef.current;
    if (!el) return;
    const onPointerDown = async () => {
      if (audioUnlockRef.current) return;
      audioUnlockRef.current = true;
      try {
        // Ensure browser considers this a user gesture for audio
        const { enableAudioWithGesture } = await import('~/lib/utils/audioContext');
        enableAudioWithGesture();
      } catch {}
      try {
        const api: any = playerRef?.current as any;
        if (api?.setMuted) api.setMuted(false);
        if (api?.setVolume) api.setVolume(1);
        if (api?.play) api.play();
      } catch {}
      // Directly try to resume underlying <audio>/<video> tags rendered by Remotion
      try { await resumeMediaElements(); } catch {}
      // Remove listener after first gesture
      try { el.removeEventListener('pointerdown', onPointerDown, { capture: true } as any); } catch {}
    };
    el.addEventListener('pointerdown', onPointerDown, { capture: true } as any);
    return () => {
      try { el.removeEventListener('pointerdown', onPointerDown, { capture: true } as any); } catch {}
    };
  }, [hasAudio, playerRef, resumeMediaElements]);

  
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
            inFrame={inFrame}
            outFrame={outFrame}
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
