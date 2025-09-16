// src/app/projects/[id]/generate/components/RemotionPreview.tsx

"use client";

import React, { useEffect, useMemo, Suspense, useState, useRef, useCallback } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { ErrorBoundary } from 'react-error-boundary';
import { createPortal } from 'react-dom';
import { enableAudioWithGesture } from '~/lib/utils/audioContext';

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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  
  const computeRenderSize = useCallback(() => {
    const el = playerContainerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch || !width || !height) {
      setRenderSize({ w: 0, h: 0 });
      return;
    }
    const scale = Math.min(cw / width, ch / height);
    const w = Math.max(0, Math.floor(width * scale));
    const h = Math.max(0, Math.floor(height * scale));
    setRenderSize({ w, h });
  }, [width, height]);
  
  // Helper: Try to resume any media elements inside the player (best-effort)
  const resumeMediaElements = useCallback(() => {
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
          const playPromise = (m as HTMLMediaElement).play?.();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((e: any) => {
              try { console.warn('[RemotionPreview] Media play() blocked or failed:', e); } catch {}
            });
          }
        } catch (err) {
          try { console.warn('[RemotionPreview] Failed to resume media element:', err); } catch {}
        }
      }
    } catch {}
  }, []);

  const unlockAudioContext = useCallback(() => {
    try {
      enableAudioWithGesture();
    } catch {}
  }, []);
  
  // Keep a lightweight detector to infer play/pause and call callbacks fast,
  // but do not use it to update the visible frame counter.
  useEffect(() => {
    if (!playerRef?.current) return;
    let lastFrame = -1;
    let stillTicks = 0;
    const interval = setInterval(() => {
      try {
        const frame = (playerRef.current as any)?.getCurrentFrame?.();
        if (typeof frame !== 'number') return;
        if (lastFrame === -1) {
          lastFrame = frame;
          return;
        }
        if (frame !== lastFrame) {
          stillTicks = 0;
          if (!(window as any).__previewPlaying) {
            (window as any).__previewPlaying = true;
            try { onPlay?.(); } catch {}
          }
        } else {
          stillTicks += 1;
          if ((window as any).__previewPlaying && stillTicks >= 3) {
            (window as any).__previewPlaying = false;
            try { onPause?.(); } catch {}
          }
        }
        lastFrame = frame;
      } catch {}
    }, 100);
    return () => clearInterval(interval);
  }, [playerRef, onPlay, onPause]);

  // Subscribe to PreviewPanelG 30fps frame events for a perfect in-player counter
  useEffect(() => {
    const onFrame = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const frame = e?.detail?.frame;
      if (typeof frame === 'number') setCurrentFrame(frame);
    };
    window.addEventListener('preview-frame-update' as any, onFrame);
    return () => window.removeEventListener('preview-frame-update' as any, onFrame);
  }, []);

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

  // Recompute render size on container resize and when composition size changes
  useEffect(() => {
    computeRenderSize();
    const el = playerContainerRef.current;
    if (!el) return;
    try {
      const ro = new ResizeObserver(() => computeRenderSize());
      ro.observe(el);
      resizeObserverRef.current = ro;
    } catch {}
    const onWindowResize = () => computeRenderSize();
    window.addEventListener('resize', onWindowResize);
    return () => {
      try { resizeObserverRef.current?.disconnect(); } catch {}
      window.removeEventListener('resize', onWindowResize);
    };
  }, [computeRenderSize]);

  // One-time audio unlock using any pointer gesture inside the player container
  useEffect(() => {
    if (!hasAudio || typeof document === 'undefined') return;
    const handleFirstInteraction = () => {
      if (audioUnlockRef.current) return;
      audioUnlockRef.current = true;
      unlockAudioContext();
      try {
        document.removeEventListener('pointerdown', handleFirstInteraction, true);
        document.removeEventListener('keydown', handleFirstInteraction, true);
        document.removeEventListener('touchstart', handleFirstInteraction, true);
      } catch {}
    };
    document.addEventListener('pointerdown', handleFirstInteraction, true);
    document.addEventListener('keydown', handleFirstInteraction, true);
    document.addEventListener('touchstart', handleFirstInteraction, true);
    return () => {
      try {
        document.removeEventListener('pointerdown', handleFirstInteraction, true);
        document.removeEventListener('keydown', handleFirstInteraction, true);
        document.removeEventListener('touchstart', handleFirstInteraction, true);
      } catch {}
    };
  }, [hasAudio, unlockAudioContext]);

  useEffect(() => {
    if (!hasAudio) return;
    const el = playerContainerRef.current;
    if (!el) return;
    const onPointerDown = () => {
      unlockAudioContext();
      audioUnlockRef.current = true;
      try {
        const api: any = playerRef?.current as any;
        if (api?.setMuted) api.setMuted(false);
        if (api?.setVolume) api.setVolume(1);
        const playPromise = api?.play?.();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err: any) => {
            try { console.warn('[RemotionPreview] Player play() blocked or failed:', err); } catch {}
          });
        }
      } catch {}
      try { resumeMediaElements(); } catch {}
    };
    el.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      try { el.removeEventListener('pointerdown', onPointerDown, true); } catch {}
    };
  }, [hasAudio, playerRef, unlockAudioContext, resumeMediaElements]);

  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={
        <div className="flex h-full w-full items-center justify-center text-gray-400">
          Loading component...
        </div>
      }>
        <div className="w-full h-full min-w-0 min-h-0 flex items-center justify-center relative overflow-hidden" ref={playerContainerRef}>
          {/* Fit composition into container keeping aspect ratio, for both landscape and portrait */}
          <div style={{ width: `${renderSize.w}px`, height: `${renderSize.h}px` }} className="relative">
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
                objectFit: 'contain',
                backgroundColor: 'white',
              }}
              controls
              showVolumeControls
              doubleClickToFullscreen
              clickToPlay
              loop={loop}
              autoPlay={true}
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
