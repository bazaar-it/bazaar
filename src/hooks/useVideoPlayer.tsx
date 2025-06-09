// src/hooks/useVideoPlayer.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlayerRef } from '@remotion/player';
import { VIDEO_FPS } from '~/lib/types/video/remotion-constants';

/**
 * Hook to manage Remotion Player sync (play, pause, seek) at frame accuracy
 */
export const useVideoPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const playerRef = useRef<PlayerRef>(null);

  // Throttled RAF loop to update currentFrame
  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    const interval = 1000 / VIDEO_FPS;
    const loop = (timestamp: number) => {
      if (timestamp - lastTime >= interval) {
        const frame = playerRef.current?.getCurrentFrame();
        if (frame != null) setCurrentFrame(Math.round(frame));
        lastTime = timestamp;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const play = useCallback(() => {
    playerRef.current?.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seekTo = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  }, []);

  return { playerRef, isPlaying, currentFrame, play, pause, seekTo };
};
