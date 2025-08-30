"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useVideoState } from '~/stores/videoState';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ZoomIn, 
  ZoomOut,
  Trash2,
  Copy,
  Edit2,
  GripVertical,
  Music,
  Volume2,
  Upload,
  X,
  Clock,
  Hash,
  Scissors
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { toast } from 'sonner';
import { api } from '~/trpc/react';
import { extractSceneColors } from '~/lib/utils/extract-scene-colors';
import { PlaybackSpeedSlider } from "~/components/ui/PlaybackSpeedSlider";
import { computeSceneRanges, findSceneAtFrame } from '~/lib/utils/scene-ranges';

// Constants from React Video Editor Pro
const ROW_HEIGHT = 60;
const TIMELINE_ITEM_HEIGHT = 40;
const FPS = 30;
// Extra visual space to allow trimming/extending the rightmost scene comfortably.
// Spacer is positioned outside the percent-based content to avoid width drift.
const END_SPACER_PX = 240;

// Define Scene type based on Bazaar-Vid structure
interface Scene {
  id: string;
  name?: string;
  duration: number;  // duration in frames
  start: number;     // start position in frames
  type?: string;
  data?: any;
}

// Audio track interface
interface AudioTrack {
  id: string;
  url: string;
  name: string;
  duration: number;  // in frames
  startTime: number; // in frames
  endTime: number;   // in frames
  volume: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  playbackRate?: number;
}

interface TimelinePanelProps {
  projectId: string;
  userId?: string;
  onClose?: () => void;
}

interface DragInfo {
  action: 'move' | 'resize-start' | 'resize-end' | 'playhead' | 'reorder';
  sceneId?: string;
  startX: number;
  startPosition: number;  // In frames
  startDuration: number;  // In frames
  sceneIndex?: number;
}

// Helper: Clean technical suffixes from scene names (e.g., _X21YX)
const cleanSceneName = (name?: string) => {
  if (!name) return name;
  return name.replace(/_[A-Z0-9]{4,}$/, '');
};

export default function TimelinePanel({ projectId, userId, onClose }: TimelinePanelProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timeRulerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const gestureBaseZoomRef = useRef<number>(1);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineId = useRef(`timeline-${Date.now()}-${Math.random()}`);
  
  // Debug: Log when timeline mounts/unmounts
  useEffect(() => {
    console.log('[TimelinePanel] Mounted for project:', projectId, 'ID:', timelineId.current);
    return () => {
      console.log('[TimelinePanel] Unmounted for project:', projectId, 'ID:', timelineId.current);
    };
  }, [projectId]);
  const [zoomScale, setZoomScale] = useState(1);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sceneId: string } | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [displayMode, setDisplayMode] = useState<'frames' | 'time'>('frames');
  // Loop controls state (mirrors PreviewPanelG's loopState)
  const [loopState, setLoopState] = useState<'video' | 'off' | 'scene'>('video');
  // Split operation busy flag to prevent repeated clicks and provide feedback
  const [isSplitBusy, setIsSplitBusy] = useState(false);
  // Deletion busy flag to prevent duplicate deletions
  const [isDeletionBusy, setIsDeletionBusy] = useState(false);
  const deletionInProgressRef = useRef<Set<string>>(new Set());
  
  // Get video state from Zustand store
  const project = useVideoState(state => state.projects[projectId]);
  // Sort scenes by order field to ensure consistency with Preview
  const unsortedScenes = project?.props?.scenes || [];
  const scenes = useMemo(() => 
    [...unsortedScenes].sort((a: any, b: any) => ((a as any).order ?? 0) - ((b as any).order ?? 0)),
    [unsortedScenes]
  );
  
  // Audio state - get from project
  const audioTrack = project?.audio || null;
  
  // Debug log when audio changes
  useEffect(() => {
    console.log('[Timeline] Audio state from store:', {
      projectId,
      hasProject: !!project,
      hasAudio: !!audioTrack,
      audioTrack
    });
  }, [projectId, project, audioTrack]);
  
  // Debug scene name changes
  useEffect(() => {
    console.log('[Timeline] Scenes updated:', scenes.map((s: any) => ({
      id: s.id,
      rootName: s.name,
      dataName: s.data?.name,
      displayName: cleanSceneName(s.name || s.data?.name) || 'Unnamed'
    })));
  }, [scenes]);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioWaveform, setAudioWaveform] = useState<number[]>();
  
  const updateScene = useVideoState(state => state.updateScene);
  const deleteScene = useVideoState(state => state.deleteScene);
  const pushAction = useVideoState((state: any) => state.pushAction as (projectId: string, action: any) => void);
  const popUndo = useVideoState((state: any) => state.popUndo as (projectId: string) => any);
  const pushRedo = useVideoState((state: any) => state.pushRedo as (projectId: string, action: any) => void);
  const popRedo = useVideoState((state: any) => state.popRedo as (projectId: string) => any);
  const updateProjectAudio = useVideoState(state => state.updateProjectAudio);
  const reorderScenes = useVideoState(state => state.reorderScenes);
  const storeSetPlaybackSpeed = useVideoState(state => state.setPlaybackSpeed);
  const storePlaybackSpeed = useVideoState(state => state.projects[projectId]?.playbackSpeed ?? 1);
  
  // tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // API mutation for persisting duration changes
  const updateSceneDurationMutation = api.scenes.updateSceneDuration.useMutation({
    onSuccess: async () => {
      console.log('[Timeline] Scene duration persisted to database');
      // Invalidate iterations query to ensure restore button updates
      await utils.generation.getBatchMessageIterations.invalidate();
      // Invalidate project scenes so PreviewPanelG syncs latest durations
      await utils.generation.getProjectScenes.invalidate({ projectId });
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene duration:', error);
      toast.error('Failed to save duration changes');
    }
  });
  
  // API mutation for updating scene name
  const updateSceneNameMutation = api.generation.updateSceneName.useMutation({
    onSuccess: async () => {
      console.log('[Timeline] Scene name persisted to database');
      await utils.generation.getProjectScenes.invalidate({ projectId });
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene name:', error);
      toast.error('Failed to save scene name');
    }
  });
  
  // API mutation for deleting scenes
  const restoreSceneMutation = api.generation.restoreScene.useMutation({
    onSuccess: async () => {
      await utils.generation.getProjectScenes.invalidate({ projectId });
      toast.success('Undo complete');
    },
    onError: () => toast.error('Failed to undo delete')
  });
  const removeSceneMutation = api.generation.removeScene.useMutation({
    onSuccess: async (res: any) => {
      console.log('[Timeline] Scene deleted from database');
      const deleted = res?.data?.deletedScene || res?.deletedScene;
      toast.success('Scene deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            if (deleted) {
              restoreSceneMutation.mutate({ projectId, scene: deleted });
            }
          }
        }
      } as any);
      await utils.generation.getProjectScenes.invalidate({ projectId });
    },
    onError: (error) => {
      console.error('[Timeline] Failed to delete scene:', error);
      toast.error('Failed to delete scene');
    }
  });
  
  // API mutation for reordering scenes
  const reorderScenesMutation = api.scenes.reorderScenes.useMutation({
    onSuccess: async () => {
      console.log('[Timeline] Scene order persisted to database');
      // Ensure all panels see new order
      await utils.generation.getProjectScenes.invalidate({ projectId });
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene order:', error);
      toast.error('Failed to save scene order');
    }
  });
  // API mutation for splitting scenes
  const splitSceneMutation = api.scenes.splitScene.useMutation({
    onSuccess: async () => {
      await utils.generation.getProjectScenes.invalidate({ projectId });
      toast.success('Scene split');
    },
    onError: (error) => {
      console.error('[Timeline] Failed to split scene:', error);
      toast.error('Failed to split scene');
    }
  });
  
  // Get current frame from PreviewPanelG via event system
  const [currentFrame, setCurrentFrame] = useState(0);
  const lastFrameRef = useRef<number>(0);
  const lastExplicitPlayStateRef = useRef<{ playing: boolean; ts: number }>({ playing: false, ts: 0 });
  const timelineRanges = useMemo(() => computeSceneRanges(scenes as any), [scenes]);
  const currentFrameRef = useRef(0);
  useEffect(() => { currentFrameRef.current = currentFrame; }, [currentFrame]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Generate waveform when audio loads or canvas becomes available
  useEffect(() => {
    console.log('[Timeline] Audio track:', audioTrack);
    if (audioTrack?.url) {
      console.log('[Timeline] Generating waveform for:', audioTrack.url);
      // Small delay to ensure canvas is mounted
      setTimeout(() => {
        if (audioCanvasRef.current) {
          console.log('[Timeline] Canvas found, starting waveform generation');
          generateWaveform(audioTrack.url);
        } else {
          console.log('[Timeline] Canvas not found, retrying in 500ms');
          setTimeout(() => {
            if (audioCanvasRef.current) {
              generateWaveform(audioTrack.url);
            }
          }, 500);
        }
      }, 100);
    }
  }, [audioTrack?.url]);
  
  // Redraw waveform when audioWaveform state updates
  useEffect(() => {
    if (audioWaveform && audioCanvasRef.current) {
      console.log('[Timeline] Redrawing waveform with data:', audioWaveform.length, 'samples');
      drawWaveform(audioWaveform);
    }
  }, [audioWaveform]);

  // Generate waveform visualization
  const generateWaveform = async (audioUrl: string) => {
    try {
      console.log('[Timeline] Starting waveform generation...');
      
      // Import audio context manager dynamically to avoid SSR issues
      const { getAudioContext, enableAudioWithGesture } = await import('~/lib/utils/audioContext');
      
      // Try to get existing context, or create one with user gesture
      let audioContext = getAudioContext();
      if (!audioContext) {
        console.log('[Timeline] No audio context available, attempting to create with user gesture...');
        audioContext = enableAudioWithGesture();
      }
      
      if (!audioContext) {
        console.warn('[Timeline] Cannot create waveform without user interaction - skipping visualization');
        return []; // Return empty waveform data
      }
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      console.log('[Timeline] Audio decoded, duration:', audioBuffer.duration, 'seconds');
      
      // Generate waveform data with more samples for finer detail
      const channelData = audioBuffer.getChannelData(0);
      const samples = 200; // More samples for finer waveform
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          const dataIndex = i * blockSize + j;
          if (dataIndex < channelData.length) {
            sum += Math.abs(channelData[dataIndex] || 0);
          }
        }
        waveform.push(sum / blockSize);
      }
      
      console.log('[Timeline] Waveform data generated, samples:', waveform.length);
      setAudioWaveform(waveform);
      
      if (audioCanvasRef.current) {
        console.log('[Timeline] Drawing waveform on canvas...');
        drawWaveform(waveform);
      } else {
        console.log('[Timeline] Canvas not ready yet');
      }
    } catch (error) {
      console.error('[Timeline] Failed to generate waveform:', error);
      // Return empty array if waveform generation fails
      return [];
    }
  };
  
  // Draw waveform on canvas - professional horizontal waveform like in DAWs
  const drawWaveform = (waveform: number[]) => {
    if (!audioCanvasRef.current) return;
    
    const canvas = audioCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set style for filled gray waveform
    ctx.fillStyle = 'rgba(156, 163, 175, 0.8)'; // gray-400
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.8)';
    ctx.lineWidth = 0.5;
    
    const samples = waveform.length;
    const sampleWidth = canvas.width / samples;
    const centerY = canvas.height / 2;
    
    // Draw filled waveform path
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    // Draw upper half of waveform with higher amplitude
    for (let i = 0; i < samples; i++) {
      const x = i * sampleWidth;
      const amplitude = (waveform[i] || 0) * (canvas.height * 0.9); // Use 90% of height for bigger waveform
      ctx.lineTo(x, centerY - amplitude);
    }
    
    // Draw lower half of waveform (mirror)
    for (let i = samples - 1; i >= 0; i--) {
      const x = i * sampleWidth;
      const amplitude = (waveform[i] || 0) * (canvas.height * 0.9); // Match upper amplitude
      ctx.lineTo(x, centerY + amplitude);
    }
    
    ctx.closePath();
    ctx.fill();
  };
  
  // Listen for frame updates and play state changes from PreviewPanelG
  useEffect(() => {
    const handleFrameUpdate = (event: CustomEvent) => {
      // Don't update frame while dragging the playhead
      if (isDragging && dragInfo?.action === 'playhead') {
        return;
      }
      
      if (event.detail && typeof event.detail.frame === 'number') {
        const frame = event.detail.frame as number;
        setCurrentFrame(frame);
        // Prefer explicit onPlay/onPause events; only infer from frame ticks
        // if no explicit state change has occurred recently
        const now = Date.now();
        const sinceExplicit = now - lastExplicitPlayStateRef.current.ts;
        const preferExplicit = sinceExplicit <= 500;
        if (!preferExplicit) {
          if (frame !== lastFrameRef.current) {
            lastFrameRef.current = frame;
            if (!isPlaying) setIsPlaying(true);
            if ((window as any).__timelinePlayStateTimer) {
              window.clearTimeout((window as any).__timelinePlayStateTimer);
            }
            (window as any).__timelinePlayStateTimer = window.setTimeout(() => {
              // Only auto-pause if we still have not received an explicit event
              const since = Date.now() - lastExplicitPlayStateRef.current.ts;
              if (since > 400) setIsPlaying(false);
            }, 150);
          }
        }
        if (process.env.NODE_ENV === 'development') {
          const ar = findSceneAtFrame(timelineRanges, frame);
          // eslint-disable-next-line no-console
          console.debug('[Timeline] frame', frame, 'active', ar ? `${ar.index}:${ar.id}` : 'none', 'ranges', timelineRanges.map(r => `[${r.index}:${r.start}-${r.end}]`).join(' '));
        }
      }
    };
    
    const handlePlaybackSpeed = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.speed === 'number') {
        // Update playback speed if needed
      }
    };
    
    const handlePlayStateChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.playing === 'boolean') {
        const playing = event.detail.playing as boolean;
        lastExplicitPlayStateRef.current = { playing, ts: Date.now() };
        setIsPlaying(playing);
      }
    };
    
    window.addEventListener('preview-frame-update' as any, handleFrameUpdate);
    window.addEventListener('playback-speed-change' as any, handlePlaybackSpeed);
    window.addEventListener('preview-play-state-change' as any, handlePlayStateChange);
    
    return () => {
      window.removeEventListener('preview-frame-update' as any, handleFrameUpdate);
      window.removeEventListener('playback-speed-change' as any, handlePlaybackSpeed);
      window.removeEventListener('preview-play-state-change' as any, handlePlayStateChange);
      if ((window as any).__timelinePlayStateTimer) {
        window.clearTimeout((window as any).__timelinePlayStateTimer);
        (window as any).__timelinePlayStateTimer = null;
      }
    };
  }, [isDragging, dragInfo, isPlaying, timelineRanges]);

  // Request initial play state on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const ev = new Event('request-play-state');
        window.dispatchEvent(ev);
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Sync loop state from PreviewPanelG when loaded
  useEffect(() => {
    const handleLoopLoaded = (event: CustomEvent) => {
      const state = event.detail?.state as 'video' | 'off' | 'scene' | undefined;
      if (state) setLoopState(state);
    };
    window.addEventListener('loop-state-loaded' as any, handleLoopLoaded);
    return () => window.removeEventListener('loop-state-loaded' as any, handleLoopLoaded);
  }, []);
  
  // Calculate total duration - memoized to prevent infinite re-renders
  const totalDuration = useMemo(() => {
    console.log('[Timeline] Calculating totalDuration for scenes:', scenes.length);
    return Math.max(150, scenes.reduce((acc: number, scene: Scene) => {
      return acc + (scene.duration || 150);
    }, 0));
  }, [scenes.length, scenes.map(s => `${s.id}-${s.duration}`).join(',')]);
  
  // Audio track calculations
  useEffect(() => {
    // Audio track state updated
  }, [audioTrack, totalDuration]);
  
  // Format time display - show frames prominently
  const formatTime = useCallback((frames: number, showFrames: boolean = true): string => {
    // Ensure frames is an integer
    frames = Math.round(frames);
    const totalSeconds = Math.floor(frames / FPS);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frameRemainder = frames % FPS;
    
    if (showFrames && zoomScale >= 2) {
      // When zoomed in, show frame count prominently
      return `${frames}f (${minutes}:${seconds.toString().padStart(2, '0')})`;
    }
    
    // Standard timecode format
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frameRemainder.toString().padStart(2, '0')}`;
  }, [zoomScale]);
  
  // Handle timeline click for scrubbing
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const clickX = e.clientX - rect.left;
    
    // Account for scroll position and use the true content width (exclude spacer)
    const actualClickX = clickX + scrollLeft;
    const contentScrollWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
    const actualWidth = Math.max(1, contentScrollWidth);
    
    // Clamp to actual timeline bounds
    const clampedX = Math.max(0, Math.min(actualWidth, actualClickX));
    
    // Calculate percentage (0 to 1) based on actual width
    const percentage = clampedX / actualWidth;
    
    // Convert to frame
    const newFrame = Math.round(percentage * totalDuration);
    const clampedFrame = Math.max(0, Math.min(totalDuration - 1, newFrame));
    
    console.log('[Timeline Click] Seek to frame:', {
      clickX,
      scrollLeft,
      actualClickX,
      actualWidth,
      percentage: (percentage * 100).toFixed(1) + '%',
      frame: clampedFrame,
      zoomScale
    });
    
    // Update state and dispatch event
    setCurrentFrame(clampedFrame);
    const event = new CustomEvent('timeline-seek', { 
      detail: { frame: clampedFrame }
    });
    window.dispatchEvent(event);
  }, [isDragging, totalDuration, zoomScale]);
  
  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    console.log('[Timeline] Dispatching play/pause event, current isPlaying:', isPlaying);
    const event = new CustomEvent('timeline-play-pause');
    window.dispatchEvent(event);
    // Don't update isPlaying here - let PreviewPanelG tell us the state
  }, [isPlaying]);
  
  // Handle zoom with mouse wheel (React Video Editor Pro pattern)
  const handleWheelZoom = useCallback((e: React.WheelEvent) => {
    // Allow pinch-zoom (ctrl/meta) to zoom timeline only (prevent browser zoom)
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault(); // stop page/browser zoom
    // Use smaller increments for smoother zooming
    const zoomSpeed = 0.05;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    
    setZoomScale(prev => {
      const newScale = prev + delta;
      // Clamp between 0.25 and 4, and round to avoid floating point issues
      return Math.round(Math.max(0.25, Math.min(4, newScale)) * 100) / 100;
    });
  }, []);

  // Prevent browser zoom shortcuts when pointer is inside timeline; apply to timeline instead
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPointerInside) return;
      const isZoomShortcut = (e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0');
      if (!isZoomShortcut) return;
      e.preventDefault();
      e.stopPropagation();
      setZoomScale(prev => {
        if (e.key === '0') return 1;
        const step = 0.1;
        const next = e.key === '-' ? prev - step : prev + step;
        return Math.round(Math.max(0.25, Math.min(4, next)) * 100) / 100;
      });
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
  }, [isPointerInside]);

  // Safari/macOS: prevent page zoom on trackpad pinch by handling gesture events
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const onGestureStart = (e: any) => {
      if (!isPointerInside) return;
      try { e.preventDefault(); } catch {}
      gestureBaseZoomRef.current = zoomScale;
    };
    const onGestureChange = (e: any) => {
      if (!isPointerInside) return;
      try { e.preventDefault(); } catch {}
      const scale = typeof e.scale === 'number' ? e.scale : 1;
      setZoomScale(() => {
        const next = gestureBaseZoomRef.current * scale;
        return Math.round(Math.max(0.25, Math.min(4, next)) * 100) / 100;
      });
    };
    const onGestureEnd = (e: any) => {
      if (!isPointerInside) return;
      try { e.preventDefault(); } catch {}
    };
    el.addEventListener('gesturestart', onGestureStart as any, { passive: false } as any);
    el.addEventListener('gesturechange', onGestureChange as any, { passive: false } as any);
    el.addEventListener('gestureend', onGestureEnd as any, { passive: false } as any);
    return () => {
      el.removeEventListener('gesturestart', onGestureStart as any);
      el.removeEventListener('gesturechange', onGestureChange as any);
      el.removeEventListener('gestureend', onGestureEnd as any);
    };
  }, [zoomScale, isPointerInside]);
  
  // Handle resize/trim drag start
  const handleResizeDragStart = useCallback((
    e: React.MouseEvent,
    sceneId: string,
    action: DragInfo['action']
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sceneIndex = scenes.findIndex((s: Scene) => s.id === sceneId);
    const scene = scenes[sceneIndex];
    if (!scene) return;
    
    // Calculate scene start position based on previous scenes (sequential)
    const sceneStart = scenes.slice(0, sceneIndex).reduce((acc, s) => acc + (s.duration || 150), 0);
    
    setDragInfo({
      action,
      sceneId,
      startX: e.clientX,
      startPosition: sceneStart,
      startDuration: scene.duration,
      sceneIndex
    });
    setIsDragging(true);
    setSelectedSceneId(sceneId);
    try {
      const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId } });
      window.dispatchEvent(ev);
    } catch {}
  }, [scenes]);
  
  // Snapping helper function
  const snapToGrid = useCallback((frame: number, snapInterval: number = 30): number => {
    // Snap to nearest interval (default 1 second = 30 frames)
    const snapped = Math.round(frame / snapInterval) * snapInterval;
    return Math.max(0, Math.min(totalDuration, snapped));
  }, [totalDuration]);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragInfo || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    
    // Deadzone for resize operations to avoid ultra-sensitive trims on tiny moves
    if (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end') {
      const deltaPx = Math.abs(e.clientX - dragInfo.startX);
      const RESIZE_DEADZONE_PX = 8; // require at least 8px before changing duration
      if (deltaPx < RESIZE_DEADZONE_PX) {
        return; // ignore tiny movements
      }

      // Map pixel movement to frames using the current scene's own width, not total duration
      const currentProject = useVideoState.getState().projects[projectId];
      const currentScenes = currentProject?.props?.scenes || [];
      const scene = currentScenes.find((s: Scene) => s.id === dragInfo.sceneId);
      if (!scene) return;

      // Compute content width and the pixel width of this scene block
      const contentWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
      const sceneStartFrames = dragInfo.startPosition; // start position in frames captured at drag start
      const sceneLeftPx = (sceneStartFrames / totalDuration) * contentWidth;
      const sceneWidthPx = Math.max(1, (scene.duration / totalDuration) * contentWidth);
      const framesPerPixel = scene.duration / sceneWidthPx; // local mapping at current zoom

      const pixelDelta = e.clientX - dragInfo.startX; // positive when moving right
      const frameDelta = Math.round(pixelDelta * framesPerPixel);
      const minDuration = 1;

      if (dragInfo.action === 'resize-start') {
        const newDuration = Math.max(minDuration, dragInfo.startDuration - frameDelta);
        if (newDuration !== scene.duration) {
          updateScene(projectId, dragInfo.sceneId || '', { duration: newDuration });
        }
      } else if (dragInfo.action === 'resize-end') {
        const newDuration = Math.max(minDuration, dragInfo.startDuration + frameDelta);
        if (newDuration !== scene.duration) {
          updateScene(projectId, dragInfo.sceneId || '', { duration: newDuration });
        }
      }
      return; // handled resize path
    }

    if (dragInfo.action === 'reorder') {
      // Handle scene reordering
      const mouseX = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const relativeX = mouseX / (rect.width * zoomScale);
      const mouseFrame = Math.round(relativeX * totalDuration);
      
      // Find which scene we're hovering over
      let cumulativeFrames = 0;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene) continue;
        const sceneEnd = cumulativeFrames + (scene.duration || 150);
        
        if (mouseFrame >= cumulativeFrames && mouseFrame < sceneEnd) {
          // We're hovering over scene at index i
          if (dragInfo.sceneIndex !== undefined && i !== dragInfo.sceneIndex) {
            console.log('[Timeline] Would swap scenes:', dragInfo.sceneIndex, 'with', i);
            // Visual feedback only during drag - actual reorder happens on mouse up
          }
          break;
        }
        cumulativeFrames = sceneEnd;
      }
      return;
    }
    
    if (dragInfo.action === 'playhead') {
      // Get mouse position relative to timeline container
      const mouseX = e.clientX - rect.left;
      const scrollLeft = timelineRef.current.scrollLeft;
      
      // Account for scroll position and zoom scale
      const actualMouseX = mouseX + scrollLeft;
      const actualWidth = rect.width * zoomScale;
      
      // Clamp to actual timeline bounds
      const clampedX = Math.max(0, Math.min(actualWidth, actualMouseX));
      
      // Calculate percentage (0 to 1) based on actual width
      const percentage = clampedX / actualWidth;
      
      // Convert percentage to frame number
      let newFrame = Math.round(percentage * totalDuration);
      
      // Apply snapping if Shift is NOT held (Shift disables snapping for fine control)
      if (!e.shiftKey) {
        // Determine snap interval based on zoom level - frame precision
        let snapInterval = 1; // Default to frame precision
        
        if (zoomScale >= 2) {
          snapInterval = 1; // Frame-by-frame when zoomed in
        } else if (zoomScale >= 1.5) {
          snapInterval = 1; // Frame-by-frame at medium-high zoom too
        } else if (zoomScale >= 1) {
          snapInterval = 2; // 2 frames at normal zoom
        } else if (zoomScale >= 0.75) {
          snapInterval = 3; // 3 frames when slightly zoomed out
        } else if (zoomScale >= 0.5) {
          snapInterval = 5; // 5 frames when zoomed out more
        } else {
          snapInterval = 10; // 10 frames when very zoomed out
        }
        
        newFrame = snapToGrid(newFrame, snapInterval);
      }
      
      const clampedFrame = Math.max(0, Math.min(totalDuration - 1, newFrame));
      
      console.log('[Playhead Drag] Position:', {
        mouseX: mouseX.toFixed(1),
        scrollLeft: scrollLeft.toFixed(1),
        actualMouseX: actualMouseX.toFixed(1),
        actualWidth: actualWidth.toFixed(1),
        percentage: (percentage * 100).toFixed(1) + '%',
        frame: clampedFrame,
        snapped: !e.shiftKey,
        totalDuration,
        zoomScale
      });
      
      // Update local state immediately for visual feedback
      setCurrentFrame(clampedFrame);
      
      // Dispatch seek event to preview
      const event = new CustomEvent('timeline-seek', { 
        detail: { frame: clampedFrame }
      });
      window.dispatchEvent(event);
      
      return;
    }
    
    // Compute mouse frame with zoom + scroll like playhead logic
    const mouseX = e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0);
    const contentScrollWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
    const actualWidth = Math.max(1, contentScrollWidth);
    // Allow dragging beyond the current timeline width to extend last scene
    const percentage = actualWidth > 0 ? mouseX / actualWidth : 0; // intentionally NOT clamped
    const mouseFrame = Math.round(percentage * totalDuration);
    // Delta from original drag start X approximated via frame delta
    let deltaFrames = mouseFrame - dragInfo.startPosition;
    
    // Apply snapping for resize operations
    if (!e.shiftKey && (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end')) {
      // Dynamic snap interval tuned for less sensitivity when zoomed out
      let snapInterval = 1; // Default to frame precision
      if (zoomScale >= 3) {
        snapInterval = 1;
      } else if (zoomScale >= 2) {
        snapInterval = 1;
      } else if (zoomScale >= 1.5) {
        snapInterval = 2;
      } else if (zoomScale >= 1.0) {
        snapInterval = 5;
      } else if (zoomScale >= 0.75) {
        snapInterval = 10;
      } else if (zoomScale >= 0.5) {
        snapInterval = 15;
      } else {
        snapInterval = 30; // much coarser when very zoomed out
      }
      
      if (dragInfo.action === 'resize-start') {
        const newDuration = dragInfo.startDuration - deltaFrames;
        const snappedDuration = Math.round(newDuration / snapInterval) * snapInterval;
        deltaFrames = dragInfo.startDuration - snappedDuration;
      } else if (dragInfo.action === 'resize-end') {
        const newDuration = dragInfo.startDuration + deltaFrames;
        const snappedDuration = Math.round(newDuration / snapInterval) * snapInterval;
        deltaFrames = snappedDuration - dragInfo.startDuration;
      }
    }
    
    // Get current scenes from store to avoid dependency issues
    const currentProject = useVideoState.getState().projects[projectId];
    const currentScenes = currentProject?.props?.scenes || [];
    const scene = currentScenes.find((s: Scene) => s.id === dragInfo.sceneId);
    if (!scene) return;
    
    if (dragInfo.action === 'resize-start') {
      // New start is mouseFrame clamped so end stays >= min
      const minDuration = 1;
      const maxNewStart = dragInfo.startPosition + dragInfo.startDuration - minDuration;
      const newStart = Math.max(0, Math.min(maxNewStart, mouseFrame));
      const newDuration = Math.max(minDuration, dragInfo.startDuration - (newStart - dragInfo.startPosition));

      if (newDuration !== scene.duration) {
        updateScene(projectId, dragInfo.sceneId || '', { duration: newDuration });
      }
    } else if (dragInfo.action === 'resize-end') {
      // New end is mouseFrame; duration is end - original start, clamped to min and totalDuration
      const minDuration = 1;
      const newEnd = Math.max(dragInfo.startPosition + minDuration, mouseFrame);
      const newDuration = Math.max(minDuration, newEnd - dragInfo.startPosition);

      if (newDuration !== scene.duration) {
        updateScene(projectId, dragInfo.sceneId || '', { duration: newDuration });
      }
    }
  }, [dragInfo, totalDuration, zoomScale, updateScene, projectId, snapToGrid]);
  
  // Handle resize drag end
  const handleResizeDragEnd = useCallback((e?: MouseEvent) => {
    // If we were doing a reorder operation
      if (dragInfo && dragInfo.action === 'reorder' && e && timelineRef.current) {
      // Prevent click-to-swap: only reorder if mouse moved enough
      const deltaPx = Math.abs(e.clientX - dragInfo.startX);
      const REORDER_THRESHOLD_PX = 6;
      if (deltaPx < REORDER_THRESHOLD_PX) {
        // Treat as a simple click/select; do not reorder
        setDragInfo(null);
        setIsDragging(false);
        return;
      }
      const rect = timelineRef.current.getBoundingClientRect();
      // Require dropping inside the timeline bounds to commit a reorder
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) {
        // Cancel reorder if user drags out (e.g., into chat) and releases
        setDragInfo(null);
        setIsDragging(false);
        return;
      }
      const mouseX = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const contentScrollWidth2 = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
      const relativeX = contentScrollWidth2 > 0 ? mouseX / contentScrollWidth2 : 0;
      const mouseFrame = Math.round(relativeX * totalDuration);
      
      // Find which scene we're dropping on
      let cumulativeFrames = 0;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene) continue;
        const sceneEnd = cumulativeFrames + (scene.duration || 150);
        
        if (mouseFrame >= cumulativeFrames && mouseFrame < sceneEnd) {
          // We're dropping on scene at index i
          if (dragInfo.sceneIndex !== undefined && i !== dragInfo.sceneIndex) {
            // Require 30% overlap (drop near the center of the target scene) to commit reorder
            const targetDur = scene.duration || 150;
            const localPos = mouseFrame - cumulativeFrames;
            const minCenter = Math.floor(targetDur * 0.3);
            const maxCenter = Math.ceil(targetDur * 0.7);
            if (localPos < minCenter || localPos > maxCenter) {
              setDragInfo(null);
              setIsDragging(false);
              break;
            }
            console.log('[Timeline] Reordering scenes:', dragInfo.sceneIndex, 'to', i);
            
            // Perform the reorder
            // Push undo with previous order before committing
            const beforeOrder = scenes.map((s: Scene) => s.id);
            reorderScenes(projectId, dragInfo.sceneIndex, i);
            
            // Create new order array for API
            const newOrder = [...scenes];
            const [movedScene] = newOrder.splice(dragInfo.sceneIndex, 1);
            if (movedScene) {
              newOrder.splice(i, 0, movedScene);
            }
            
            // Persist to database
            reorderScenesMutation.mutate({
              projectId,
              sceneIds: newOrder.map((s: Scene) => s.id)
            });
            try { pushAction(projectId, { type: 'reorder', beforeOrder, afterOrder: newOrder.map((s: Scene) => s.id) }); } catch {}
            
            toast.success('Scenes reordered');
          }
          break;
        }
        cumulativeFrames = sceneEnd;
      }
    }
    // If we were doing a resize operation, persist the duration change
    else if (dragInfo && (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end')) {
      if (e && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!inside) {
          // Cancel resize if mouse released outside timeline (e.g., dragging into chat)
          setDragInfo(null);
          setIsDragging(false);
          return;
        }
      }
      // Get current scenes from store to avoid dependency issues
      const currentProject = useVideoState.getState().projects[projectId];
      const currentScenes = currentProject?.props?.scenes || [];
      const scene = currentScenes.find((s: Scene) => s.id === dragInfo.sceneId);
      
      if (scene && scene.duration !== dragInfo.startDuration && dragInfo.sceneId) {
        if (dragInfo.action === 'resize-start') {
          // Perfect trim-from-start: split at trimmed amount and keep right part
          const trimmed = Math.max(1, dragInfo.startDuration - scene.duration);
          (async () => {
            try {
              const res = await splitSceneMutation.mutateAsync({ projectId, sceneId: dragInfo.sceneId!, frame: trimmed });
              if (res?.rightSceneId) {
                removeSceneMutation.mutate({ projectId, sceneId: dragInfo.sceneId! });
                setSelectedSceneId(res.rightSceneId);
                // Force-fetch latest scenes and replace VideoState to keep timeline and preview in sync
                try {
                  await utils.generation.getProjectScenes.invalidate({ projectId });
                  const latest = await (utils.generation.getProjectScenes as any).fetch({ projectId });
                  if (latest && Array.isArray(latest)) {
                    const currentProps = useVideoState.getState().getCurrentProps();
                    if (currentProps) {
                      let start = 0;
                      const converted = latest.map((db: any) => {
                        const duration = db.duration || 150;
                        const out = {
                          id: db.id,
                          type: 'custom' as const,
                          start,
                          duration,
                          name: db.name,
                          data: { code: db.tsxCode, name: db.name, componentId: db.id, props: db.props || {} }
                        };
                        start += duration;
                        return out;
                      });
                      useVideoState.getState().replace(projectId, { ...currentProps, scenes: converted, meta: { ...currentProps.meta, duration: start } } as any);
                    }
                  }
                } catch {}
                toast.success('Trimmed from start');
              }
            } catch (err) {
              console.error('Trim-from-start (drag) error', err);
              toast.error('Failed to trim from start');
            }
          })();
        } else {
          // Right-edge: simple duration update
          updateSceneDurationMutation.mutate({
            projectId,
            sceneId: dragInfo.sceneId,
            duration: scene.duration
          });
        }
      }
    }
    
    setDragInfo(null);
    setIsDragging(false);
  }, [dragInfo, updateSceneDurationMutation, projectId, scenes, zoomScale, totalDuration, reorderScenes, reorderScenesMutation]);
  
  // Set up drag event listeners
  useEffect(() => {
    if (isDragging) {
      const handleMouseUp = (e: MouseEvent) => handleResizeDragEnd(e);
      
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleDragMove, handleResizeDragEnd]);
  
  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, sceneId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sceneId });
  }, []);
  
  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);
  
  // Handle scene operations
  const handleDeleteScene = useCallback((sceneId: string, skipConfirmation: boolean = false) => {
    // Prevent duplicate deletions
    if (isDeletionBusy || deletionInProgressRef.current.has(sceneId)) {
      console.warn('[Timeline] Deletion already in progress for scene:', sceneId);
      return;
    }
    
    // For keyboard shortcuts, add confirmation
    if (!skipConfirmation) {
      const sceneIndex = scenes.findIndex((s: any) => s.id === sceneId);
      const sceneName = scenes[sceneIndex]?.name || scenes[sceneIndex]?.data?.name || `Scene ${sceneIndex + 1}`;
      if (!window.confirm(`Delete "${sceneName}"?\n\nPress OK to delete, or Cancel to keep it.`)) {
        return;
      }
    }
    
    // Mark deletion as in progress
    setIsDeletionBusy(true);
    deletionInProgressRef.current.add(sceneId);
    
    // Update local state immediately for responsive UI
    // Push undo: capture full scene payload with a reliable order
    const sceneIndex = scenes.findIndex((s: any) => s.id === sceneId);
    const scenePayload = sceneIndex >= 0 ? scenes[sceneIndex] : undefined;
    if (scenePayload) {
      const orderValue = (scenePayload as any).order ?? sceneIndex; // fallback to index if order missing
      const sceneForUndo = { ...scenePayload, order: orderValue } as any;
      pushAction(projectId, { type: 'deleteScene', scene: sceneForUndo });
    }
    deleteScene(projectId, sceneId);
    
    // Persist to database
    removeSceneMutation.mutate(
      {
        projectId,
        sceneId
      },
      {
        onSettled: () => {
          // Clear deletion flag after operation completes
          setIsDeletionBusy(false);
          deletionInProgressRef.current.delete(sceneId);
        }
      }
    );
    
    setContextMenu(null);
  }, [deleteScene, projectId, removeSceneMutation, isDeletionBusy, scenes, pushAction]);

  // Keyboard: Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const active = document.activeElement as HTMLElement | null;
      const isTyping = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true');
      if (isTyping) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        const action = popUndo(projectId);
        if (!action) return;
        if (action.type === 'deleteScene') {
          // Restore via API using scene payload captured before delete
          restoreSceneMutation.mutate({ projectId, scene: {
            id: action.scene.id,
            name: action.scene.name || action.scene.data?.name,
            tsxCode: action.scene.data?.code || (action.scene as any).tsxCode,
            duration: action.scene.duration || 150,
            order: (action.scene as any).order ?? 0,
            props: action.scene.data?.props,
            layoutJson: (action.scene as any).layoutJson,
          }});
          pushRedo(projectId, { type: 'deleteScene', scene: action.scene });
        } else if (action.type === 'reorder') {
          reorderScenesMutation.mutate({ projectId, sceneIds: action.beforeOrder });
          pushRedo(projectId, { type: 'reorder', beforeOrder: action.afterOrder, afterOrder: action.beforeOrder });
        } else if (action.type === 'updateDuration') {
          updateScene(projectId, action.sceneId, { duration: action.prevDuration });
          updateSceneDurationMutation.mutate({ projectId, sceneId: action.sceneId, duration: action.prevDuration });
          pushRedo(projectId, { type: 'updateDuration', sceneId: action.sceneId, prevDuration: action.newDuration, newDuration: action.prevDuration });
        }
      } else if (e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        const action = popRedo(projectId);
        if (!action) return;
        if (action.type === 'deleteScene') {
          // Re-delete the scene
          removeSceneMutation.mutate({ projectId, sceneId: action.scene.id });
          pushAction(projectId, { type: 'deleteScene', scene: action.scene });
        } else if (action.type === 'reorder') {
          reorderScenesMutation.mutate({ projectId, sceneIds: action.afterOrder });
          pushAction(projectId, { type: 'reorder', beforeOrder: action.beforeOrder, afterOrder: action.afterOrder });
        } else if (action.type === 'updateDuration') {
          updateScene(projectId, action.sceneId, { duration: action.newDuration });
          updateSceneDurationMutation.mutate({ projectId, sceneId: action.sceneId, duration: action.newDuration });
          pushAction(projectId, { type: 'updateDuration', sceneId: action.sceneId, prevDuration: action.prevDuration, newDuration: action.newDuration });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [projectId, popUndo, pushRedo, popRedo, restoreSceneMutation, reorderScenesMutation, updateScene, updateSceneDurationMutation, removeSceneMutation]);

  // Helper: compute scene start frame by id
  const getSceneStartById = useCallback((sceneId: string): { start: number; duration: number } | null => {
    let start = 0;
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i] as Scene | undefined;
      if (!s) continue;
      if (s.id === sceneId) {
        return { start, duration: s.duration || 150 };
      }
      start += s.duration || 150;
    }
    return null;
  }, [scenes]);

  // Split at current playhead for a specific scene id
  const handleSplitAtPlayhead = useCallback((sceneId: string) => {
    if (isSplitBusy || splitSceneMutation.isPending) {
      return;
    }
    const info = getSceneStartById(sceneId);
    if (!info) return;
    // Ask preview for the exact current frame, then use the freshest value
    try { window.dispatchEvent(new Event('request-current-frame')); } catch {}
    setTimeout(() => {
      const frameNow = Math.round(currentFrameRef.current);
      const offset = Math.max(0, frameNow - info.start);
      if (offset <= 0 || offset >= info.duration) {
        toast.info('Move playhead inside this scene to split');
        return;
      }
      (async () => {
        try {
          setIsSplitBusy(true);
          const res = await splitSceneMutation.mutateAsync({ projectId, sceneId, frame: offset });
          if (res?.rightSceneId) {
            setSelectedSceneId(res.rightSceneId);
          }
          // Force-fetch latest scenes and replace state to keep UI in sync immediately
          await utils.generation.getProjectScenes.invalidate({ projectId });
          try {
            const latest = await (utils.generation.getProjectScenes as any).fetch({ projectId });
            if (latest && Array.isArray(latest)) {
              const currentProps = useVideoState.getState().getCurrentProps();
              if (currentProps) {
                let start = 0;
                const ordered = [...latest].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
                const converted = ordered.map((db: any) => {
                  const duration = db.duration || 150;
                  const out = {
                    id: db.id,
                    type: 'custom' as const,
                    start,
                    duration,
                    order: db.order ?? 0,
                    name: db.name,
                    data: { code: db.tsxCode, name: db.name, componentId: db.id, props: db.props || {} }
                  };
                  start += duration;
                  return out;
                });
                useVideoState.getState().replace(projectId, { ...currentProps, scenes: converted, meta: { ...currentProps.meta, duration: start } } as any);
              }
            }
          } catch {}
          toast.success('Scene split at playhead');
        } catch (err) {
          console.error('Context split error', err);
          toast.error('Failed to split scene');
        } finally {
          setIsSplitBusy(false);
        }
      })();
    }, 30);
  }, [getSceneStartById, projectId, splitSceneMutation, utils, isSplitBusy]);

  // Trim-left button: split at playhead and delete left part (keep right with offset)
  const handleTrimLeftClick = useCallback(() => {
    if (!selectedSceneId) return;
    const info = getSceneStartById(selectedSceneId);
    if (!info) return;
    // Ask for freshest frame
    try { window.dispatchEvent(new Event('request-current-frame')); } catch {}
    setTimeout(async () => {
      const frameNow = Math.round(currentFrame);
      const offset = Math.max(1, Math.min(info.duration - 1, frameNow - info.start));
      if (offset <= 0 || offset >= info.duration) {
        toast.info('Move playhead inside the scene to trim');
        return;
      }
      try {
        const res = await splitSceneMutation.mutateAsync({ projectId, sceneId: selectedSceneId, frame: offset });
        if (res?.rightSceneId) {
          removeSceneMutation.mutate({ projectId, sceneId: selectedSceneId });
          setSelectedSceneId(res.rightSceneId);
          try {
            await utils.generation.getProjectScenes.invalidate({ projectId });
          } catch {}
          toast.success('Trimmed from start');
          const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId: res.rightSceneId } });
          window.dispatchEvent(ev);
        }
      } catch (err) {
        console.error('Trim-left error', err);
        toast.error('Failed to trim from start');
      }
    }, 30);
  }, [selectedSceneId, getSceneStartById, currentFrame, projectId, splitSceneMutation, removeSceneMutation, utils]);

  // Trim-right button: set duration to playhead offset (end at playhead)
  const handleTrimRightClick = useCallback(() => {
    if (!selectedSceneId) return;
    const info = getSceneStartById(selectedSceneId);
    if (!info) return;
    const frameNow = Math.round(currentFrame);
    const offset = Math.max(1, Math.min(info.duration, frameNow - info.start));
    if (offset <= 0 || offset > info.duration) {
      toast.info('Move playhead inside the scene to trim');
      return;
    }
    // Update locally and persist
    updateScene(projectId, selectedSceneId, { duration: offset });
    updateSceneDurationMutation.mutate({ projectId, sceneId: selectedSceneId, duration: offset });
  }, [selectedSceneId, getSceneStartById, currentFrame, projectId, updateScene, updateSceneDurationMutation]);
  
  // Handle scene name editing
  const handleEditName = useCallback((sceneId: string | null, name?: string) => {
    setEditingSceneId(sceneId);
    if (sceneId && name !== undefined) {
      setEditingName(name);
    }
  }, []);
  
  const handleSaveName = useCallback((sceneId: string, name: string) => {
    if (name.trim()) {
      const newName = name.trim();
      
      // Update Zustand immediately for responsive UI
      updateScene(projectId, sceneId, {
        name: newName
      });
      
      // Persist to database
      updateSceneNameMutation.mutate({
        projectId,
        sceneId,
        name: newName
      });
    }
    setEditingSceneId(null);
  }, [projectId, updateScene, updateSceneNameMutation]);
  
  // Handle timeline seek
  const handleSeek = useCallback((frame: number) => {
    const clampedFrame = Math.max(0, Math.min(totalDuration - 1, frame));
    setCurrentFrame(clampedFrame);
    const event = new CustomEvent('timeline-seek', { 
      detail: { frame: clampedFrame }
    });
    window.dispatchEvent(event);
  }, [totalDuration]);
  
  // Handle keyboard events for delete and play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        (activeElement as HTMLElement).isContentEditable ||
        activeElement.getAttribute('role') === 'textbox'
      );

      // Space bar for play/pause - only if not typing
      if ((e.key === ' ' || e.code === 'Space') && !isTyping) {
        // Prevent default scrolling behavior
        e.preventDefault();
        togglePlayPause();
      }
      // Delete/Backspace for deleting selected scene - only if not typing
      else if ((e.key === 'Backspace' || e.key === 'Delete') && !isTyping) {
        if (selectedSceneId && !isDeletionBusy) {
          e.preventDefault();
          // Call with skipConfirmation=false for keyboard shortcuts
          handleDeleteScene(selectedSceneId, false);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedSceneId, handleDeleteScene, togglePlayPause, isDeletionBusy]);

  // Keyboard shortcuts: [ start, ] end, | split
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing
      const active = document.activeElement as HTMLElement | null;
      const isTyping = !!active && (
        active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('role') === 'textbox'
      );
      if (isTyping) return;

      const findSceneAtFrame = (): { scene: Scene; index: number; start: number } | null => {
        let start = 0;
        for (let i = 0; i < scenes.length; i++) {
          const s = scenes[i];
          const end = start + (s.duration || 150);
          if (currentFrame >= start && currentFrame < end) {
            return { scene: s, index: i, start };
          }
          start = end;
        }
        return null;
      };

      const minFrames = 1;
      const target = selectedSceneId
        ? (() => {
            const i = scenes.findIndex((s: any) => s.id === selectedSceneId);
            if (i >= 0) {
              const start = scenes.slice(0, i).reduce((acc, s) => acc + (s.duration || 150), 0);
              return { scene: scenes[i] as Scene, index: i, start };
            }
            return findSceneAtFrame();
          })()
        : findSceneAtFrame();

      if (!target) return;
      const { scene, start } = target;
      const offset = Math.max(0, currentFrame - start);

      // [ set start (perfect trim-from-start)
      if (e.key === '[') {
        const splitAt = Math.max(1, Math.min((scene.duration || 150) - 1, offset));
        if (splitAt >= 1 && splitAt < (scene.duration || 150)) {
          (async () => {
            try {
              const res = await splitSceneMutation.mutateAsync({ projectId, sceneId: scene.id, frame: splitAt });
              if (res?.rightSceneId) {
                removeSceneMutation.mutate({ projectId, sceneId: scene.id });
                setSelectedSceneId(res.rightSceneId);
                await utils.generation.getProjectScenes.invalidate({ projectId });
                toast.success('Trimmed from start');
              }
            } catch (err) {
              console.error('Trim-from-start error', err);
              toast.error('Failed to trim from start');
            }
          })();
        }
        e.preventDefault();
        return;
      }

      // ] set end (trim-to-end)
      if (e.key === ']') {
        const newDuration = Math.max(minFrames, offset);
        if (newDuration !== scene.duration) {
          updateScene(projectId, scene.id, { duration: newDuration });
          updateSceneDurationMutation.mutate({ projectId, sceneId: scene.id, duration: newDuration });
        }
        e.preventDefault();
        return;
      }

      // | split (Shift+Backslash on many keyboards)
      if (e.key === '|' || (e.shiftKey && e.key === '\\')) {
        if (isSplitBusy || splitSceneMutation.isPending) {
          e.preventDefault();
          return;
        }
        (async () => {
          try {
            const sceneAt = target;
            if (sceneAt) {
              const { scene, start } = sceneAt;
              const offset = Math.max(0, currentFrame - start);
              if (offset > 0 && offset < (scene.duration || 150)) {
                setIsSplitBusy(true);
                await splitSceneMutation.mutateAsync({ projectId, sceneId: scene.id, frame: offset });
              } else {
                toast.info('Move playhead inside the scene to split');
              }
            }
          } catch (err) {
            console.error('Split error', err);
          } finally {
            setIsSplitBusy(false);
          }
        })();
        e.preventDefault();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scenes, selectedSceneId, currentFrame, projectId, updateScene, updateSceneDurationMutation, isSplitBusy, splitSceneMutation.isPending]);
  
  const handleDuplicateScene = useCallback((sceneId: string) => {
    const scene = scenes.find((s: Scene) => s.id === sceneId);
    if (!scene) return;
    
    // Create duplicate with new ID
    const duplicateScene = {
      ...scene,
      id: `${scene.id}-copy-${Date.now()}`,
      data: {
        ...scene.data,
        name: `${scene.data?.name || 'Scene'} Copy`
      }
    };
    
    // Add to scenes array
    const newScenes = [...scenes, duplicateScene];
    const replace = useVideoState.getState().replace;
    const currentProps = project?.props;
    
    if (currentProps) {
      replace(projectId, {
        ...currentProps,
        scenes: newScenes
      });
    }
    
    toast.success('Scene duplicated');
    setContextMenu(null);
  }, [scenes, project, projectId]);
  
  
  // Extract and cache scene colors
  const sceneColors = useMemo(() => {
    const colors: Record<string, { primary: string; secondary?: string; gradient?: string }> = {};
    scenes.forEach((scene: Scene) => {
      // Get the actual code for the scene - check multiple possible locations
      const sceneCode = (scene as any).tsxCode || scene.data?.code || scene.data?.tsxCode || '';
      if (sceneCode) {
        colors[scene.id] = extractSceneColors(sceneCode);
      } else {
        // Fallback colors based on type
        const type = scene.type || scene.data?.type || 'default';
        switch(type) {
          case 'text':
          case 'text-animation':
            colors[scene.id] = { primary: '#6366f1', gradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)' };
            break;
          case 'video':
          case 'custom':
            colors[scene.id] = { primary: '#6b7280', gradient: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)' };
            break;
          case 'image':
            colors[scene.id] = { primary: '#10b981', gradient: 'linear-gradient(90deg, #10b981 0%, #059669 100%)' };
            break;
          case 'sound':
          case 'audio':
            colors[scene.id] = { primary: '#f97316', gradient: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)' };
            break;
          default:
            colors[scene.id] = { primary: '#6b7280', gradient: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)' };
        }
      }
    });
    return colors;
  }, [scenes]);
  
  // Get scene color based on extracted colors
  const getSceneStyles = useCallback((scene: Scene): React.CSSProperties => {
    const isSelected = selectedSceneId === scene.id;
    const colors = sceneColors[scene.id] || { primary: '#6b7280', gradient: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)' };
    
    return {
      background: colors.gradient || colors.primary,
      border: isSelected ? '2px solid rgba(251, 146, 60, 0.6)' : '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: isSelected 
        ? '0 0 15px rgba(251, 146, 60, 0.3)' 
        : '0 1px 3px rgba(0, 0, 0, 0.1)',
      color: '#ffffff',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
    };
  }, [selectedSceneId, sceneColors]);
  
  // Calculate timeline height based on content - make it reactive to audio changes
  const timelineHeight = useMemo(() => {
    // Controls (60) + ruler (32) + scenes area + padding
    const sceneCount = scenes?.length || 0;
    const compact = !audioTrack && sceneCount <= 1;
    const height = audioTrack ? 280 : compact ? 180 : 220;
    console.log('[Timeline] Height calculation:', { hasAudio: !!audioTrack, sceneCount, height });
    return height;
  }, [audioTrack, scenes]);
  
  // Synchronize scrolling - timeline controls ruler
  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (timeRulerRef.current && e.currentTarget === timelineRef.current) {
      // Move the inner content of the ruler instead of scrolling it
      const rulerContent = timeRulerRef.current.firstElementChild as HTMLElement;
      if (rulerContent) {
        rulerContent.style.transform = `translateX(-${e.currentTarget.scrollLeft}px)`;
      }
    }
  }, []);
  
  return (
    <div className="flex flex-col bg-white dark:bg-gray-950 rounded-xl shadow-sm select-none" style={{ height: `${timelineHeight}px`, overflow: 'hidden' }}>
      {/* Timeline Controls - Modern design */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50/70 dark:bg-gray-900/50 backdrop-blur-sm">
        {/* Left cluster: frame/time display */}
        <div className="flex items-center gap-3 min-w-[220px]">
          {/* Frame/Time Counter - Minimal with switch indicator */}
          <div className="flex items-center gap-1">
            {displayMode === 'frames' ? (
              <button
                onClick={() => setDisplayMode('time')}
                className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                title="Switch to time display"
              >
                <span className="font-mono text-base font-medium text-gray-900 dark:text-gray-100">
                  {currentFrame}
                </span>
                <span className="text-sm text-gray-400">/</span>
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                  {totalDuration}f
                </span>
              </button>
            ) : (
              <button
                onClick={() => setDisplayMode('frames')}
                className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                title="Switch to frame display"
              >
                <span className="font-mono text-base font-medium text-gray-900 dark:text-gray-100">
                  {(currentFrame / FPS).toFixed(2)}s
                </span>
                <span className="text-sm text-gray-400">/</span>
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                  {(totalDuration / FPS).toFixed(2)}s
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Center cluster: playback controls */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => {
                const newFrame = Math.max(0, currentFrame - 30);
                const event = new CustomEvent('timeline-seek', { 
                  detail: { frame: newFrame }
                });
                window.dispatchEvent(event);
                setCurrentFrame(newFrame);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
              title="Previous second"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200 transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => {
                const newFrame = Math.min(totalDuration - 1, currentFrame + 30);
                const event = new CustomEvent('timeline-seek', { 
                  detail: { frame: newFrame }
                });
                window.dispatchEvent(event);
                setCurrentFrame(newFrame);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
              title="Next second"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Edit Controls: Trim Left, Split, Trim Right */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={handleTrimLeftClick}
              disabled={!selectedSceneId}
              className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Trim start to playhead ([)"
            >
              [
            </button>
            <button
              onClick={() => selectedSceneId && handleSplitAtPlayhead(selectedSceneId)}
              disabled={!selectedSceneId || isSplitBusy || splitSceneMutation.isPending}
              className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              title={isSplitBusy || splitSceneMutation.isPending ? "Splitting…" : "Split at playhead (|)"}
            >
              {isSplitBusy || splitSceneMutation.isPending ? (
                <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                '|'
              )}
            </button>
            <button
              onClick={handleTrimRightClick}
              disabled={!selectedSceneId}
              className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              title=
                "Trim end to playhead (])"
            >
              ]
            </button>
          </div>

          {/* Loop Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            {([
              { key: 'off', label: 'Off' },
              { key: 'scene', label: 'Scene' },
              { key: 'video', label: 'Video' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => {
                  setLoopState(opt.key);
                  const ev = new CustomEvent('loop-state-change', { detail: { state: opt.key } });
                  window.dispatchEvent(ev);
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-xs transition-colors",
                  loopState === opt.key
                    ? "bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title={`Loop: ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Playback Speed */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <PlaybackSpeedSlider
              currentSpeed={storePlaybackSpeed}
              onSpeedChange={(speed) => {
                if (projectId) {
                  storeSetPlaybackSpeed(projectId, speed);
                }
                try {
                  const ev = new CustomEvent('playback-speed-change', { detail: { speed } });
                  window.dispatchEvent(ev);
                } catch {}
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setZoomScale(prev => Math.max(0.25, Math.round((prev - 0.1) * 100) / 100))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setZoomScale(1)}
            className="text-sm text-gray-700 dark:text-gray-300 px-2 min-w-[3rem] text-center font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={`Zoom: ${Math.round(zoomScale * 100)}%\n${
              zoomScale >= 3 ? 'Frame-level precision' :
              zoomScale >= 2 ? '5-frame precision' :
              zoomScale >= 1.5 ? '10-frame precision' :
              zoomScale >= 1 ? '0.5 second precision' :
              '1-2 second precision'
            }\n(Shift+drag for no snapping)`}
          >
            {Math.round(zoomScale * 100)}%
          </button>
          
          <button
            onClick={() => setZoomScale(prev => Math.min(4, Math.round((prev + 0.1) * 100) / 100))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
            title="Close Timeline"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        </div>
      </div>
      
      {/* Timeline Container */}
      <div className="flex flex-col overflow-hidden bg-white dark:bg-gray-950" style={{ height: `${timelineHeight - 60}px` }}>
        {/* Time Ruler - not independently scrollable */}
        <div 
          ref={timeRulerRef}
          className="h-8 bg-gray-100 dark:bg-gray-900 relative overflow-hidden cursor-pointer select-none"
          onClick={(e) => {
            // Move playhead when clicking on time ruler
            if (timelineRef.current) {
              const rect = e.currentTarget.getBoundingClientRect();
              const scrollLeft = timelineRef.current.scrollLeft;
              const clickX = e.clientX - rect.left;
              
              // Account for scroll and use true content width (exclude spacer)
              const actualClickX = clickX + scrollLeft;
              const contentScrollWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
              const actualWidth = Math.max(1, contentScrollWidth);
              
              // Calculate percentage and frame
              const percentage = Math.max(0, Math.min(1, actualClickX / actualWidth));
              const newFrame = Math.round(percentage * totalDuration);
              const clampedFrame = Math.max(0, Math.min(totalDuration - 1, newFrame));
              
              // Update playhead position
              setCurrentFrame(clampedFrame);
              const event = new CustomEvent('timeline-seek', { 
                detail: { frame: clampedFrame }
              });
              window.dispatchEvent(event);
            }
          }}
        >
          <div 
            className="h-full relative"
            style={{ 
              width: `${Math.max(100, zoomScale * 100)}%`, 
              minWidth: '100%',
              transition: 'none'
            }}
          >
          {/* Dynamic time markers that adapt to zoom */}
          {(() => {
            // Calculate pixel width of the timeline
            const timelinePixelWidth = window.innerWidth * zoomScale;
            const minPixelsBetweenMarkers = 60; // Minimum pixels between time markers to avoid overlap
            
            // Calculate how many seconds should be between markers based on available space
            const pixelsPerSecond = timelinePixelWidth / (totalDuration / 30);
            let secondsBetweenMarkers = Math.ceil(minPixelsBetweenMarkers / pixelsPerSecond);
            
            // Round to nice intervals (1, 2, 5, 10, 15, 30, 60 seconds)
            const niceIntervals = [1, 2, 5, 10, 15, 30, 60];
            const interval = niceIntervals.find(i => i >= secondsBetweenMarkers) || 60;
            const frameInterval = interval * 30; // Convert to frames
            
            const markers = [];
            for (let frame = 0; frame <= totalDuration; frame += frameInterval) {
              const position = (frame / totalDuration) * 100;
              
              markers.push(
                <div
                  key={`time-${frame}`}
                  className="absolute top-0 h-full"
                  style={{ left: `${position}%` }}
                >
                  <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                  <span className="absolute top-3 left-0 text-[10px] text-gray-500 dark:text-gray-400 transform -translate-x-1/2 font-mono whitespace-nowrap select-none pointer-events-none">
                    {formatTime(frame)}
                  </span>
                </div>
              );
            }
            
            return markers;
          })()}
          </div>
        </div>
        
        {/* Timeline Track */}
        <div 
          ref={timelineRef}
          className="relative overflow-x-auto overflow-y-hidden bg-gray-50 dark:bg-gray-950"
          onClick={handleTimelineClick}
          onWheel={handleWheelZoom}
          onScroll={handleTimelineScroll}
          onMouseEnter={() => setIsPointerInside(true)}
          onMouseLeave={() => setIsPointerInside(false)}
          style={{ 
            height: `${timelineHeight - 60 - 32}px`,
            cursor: isDragging ? 'grabbing' : (isSplitBusy || splitSceneMutation.isPending) ? 'progress' : 'crosshair' 
          }}
        >
          <div
            className="relative"
            style={{ 
              width: `${Math.max(100, zoomScale * 100)}%`,
              minWidth: '100%',
              minHeight: '100%'
            }}
            ref={innerContentRef}
          >
            {/* IMPORTANT: Do not use padding on this container. Block left/width are percent-based
               and must be relative to the true content width. Adding inner padding distorts the
               percentage base and makes visual block boundaries drift from the actual video frames.
               We add a separate absolute spacer after the content (see below) to provide extra
               drag space without affecting percent calculations. */}
            {/* Dynamic grid lines matching time markers */}
            <div className="absolute inset-0 pointer-events-none">
              {(() => {
                // Use same calculation as time markers for consistency
                const timelinePixelWidth = window.innerWidth * zoomScale;
                const minPixelsBetweenMarkers = 60;
                const pixelsPerSecond = timelinePixelWidth / (totalDuration / 30);
                let secondsBetweenMarkers = Math.ceil(minPixelsBetweenMarkers / pixelsPerSecond);
                
                const niceIntervals = [1, 2, 5, 10, 15, 30, 60];
                const interval = niceIntervals.find(i => i >= secondsBetweenMarkers) || 60;
                const frameInterval = interval * 30;
                
                const gridLines = [];
                for (let frame = 0; frame <= totalDuration; frame += frameInterval) {
                  const position = (frame / totalDuration) * 100;
                  
                  gridLines.push(
                    <div
                      key={`grid-${frame}`}
                      className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800 opacity-50"
                      style={{ left: `${position}%` }}
                    />
                  );
                  
                  // Add finer grid lines between major ones when zoomed in
                  if (zoomScale > 1.5 && interval <= 5) {
                    const subInterval = frameInterval / 2;
                    const subFrame = frame + subInterval;
                    if (subFrame <= totalDuration) {
                      const subPosition = (subFrame / totalDuration) * 100;
                      gridLines.push(
                        <div
                          key={`subgrid-${subFrame}`}
                          className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800 opacity-25"
                          style={{ left: `${subPosition}%` }}
                        />
                      );
                    }
                  }
                }
                
                return gridLines;
              })()}
            </div>
            
            {/* Scene Items */}
            <div className="relative" style={{ height: ROW_HEIGHT, marginTop: '20px', marginBottom: '20px' }}>
              {scenes.map((scene: any, index: number) => {
                // Calculate scene start position based on previous scenes (sequential)
                const sceneStart = scenes.slice(0, index).reduce((acc, s) => acc + (s.duration || 150), 0);
                // DEBUG: Log what Timeline sees
                if (index === 0) {
                  console.log('[Timeline] Scene positions:', scenes.map((s: any, i: number) => ({
                    id: s.id,
                    order: s.order,
                    start: s.start,
                    duration: s.duration,
                    calculatedStart: scenes.slice(0, i).reduce((acc: number, sc: any) => acc + (sc.duration || 150), 0)
                  })));
                }
                // When zoomed, scenes need to scale with the container
                const left = (sceneStart / totalDuration) * 100;
                const width = (scene.duration / totalDuration) * 100;
                
                // DEBUG: Log width calculation for all scenes
                if (index === 0) {
                  console.log(`[Timeline] First scene rendering:`, {
                    sceneId: scene.id,
                    sceneDuration: scene.duration,
                    actualDuration: scene.data?.duration,
                    expectedWidth: (430 / 640) * 100,
                    calculatedWidth: width,
                    totalDuration,
                    sceneObject: scene
                  });
                }
                const isBeingDragged = isDragging && dragInfo?.sceneId === scene.id && dragInfo?.action === 'reorder';
                const displayName = cleanSceneName(scene.name || scene.data?.name) || `Scene ${index + 1}`;
                
                return (
                  <div
                    key={scene.id}
                    className={cn(
                      "absolute flex items-center rounded-lg text-sm font-medium transition-all cursor-move",
                      isBeingDragged ? "opacity-50 z-40 scale-105" : "z-10 hover:scale-102 hover:z-15"
                    )}
                    style={{ 
                      left: `${left}%`,
                      width: `${width}%`,
                      height: TIMELINE_ITEM_HEIGHT,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      minWidth: '40px',
                      ...getSceneStyles(scene),
                      transition: 'all 0.2s ease'
                    }}
                    draggable
                    onDragStart={(e) => {
                      try {
                        const payload = {
                          type: 'timeline-scene',
                          projectId,
                          sceneId: scene.id,
                          index: index + 1,
                          name: displayName,
                        };
                        e.dataTransfer.setData('application/json', JSON.stringify(payload));
                        e.dataTransfer.setData('text/plain', `@scene ${index + 1}`);
                        e.dataTransfer.effectAllowed = 'copy';
                      } catch {}
                    }}
                    onMouseDown={(e) => {
                      // Check if we're clicking on a resize handle
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relativeX = e.clientX - rect.left;
                    const isLeftEdge = relativeX < 10;
                    const isRightEdge = relativeX > rect.width - 10;
                      
                      if (isLeftEdge) {
                        handleResizeDragStart(e, scene.id, 'resize-start');
                      } else if (isRightEdge) {
                        handleResizeDragStart(e, scene.id, 'resize-end');
                      } else {
                        // Do not start reorder from the block body; reserved for drag-to-chat.
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, scene.id)}
                    onClick={(e) => {
                      // Simple click selects the scene without starting reorder
                      e.stopPropagation();
                      setSelectedSceneId(scene.id);
                      try {
                        const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId: scene.id } });
                        window.dispatchEvent(ev);
                      } catch {}
                    }}
                  >
                    {/* Resize Handle Start */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 md:w-3 cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-l-lg transition-colors backdrop-blur-sm"
                      title="Trim start (drag)"
                    />

                    {/* Reorder Grip */}
                    <div
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/80 hover:text-white/100 cursor-grab active:cursor-grabbing select-none"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragInfo({
                          action: 'reorder',
                          sceneId: scene.id,
                          startX: e.clientX,
                          startPosition: sceneStart,
                          startDuration: scene.duration,
                          sceneIndex: index
                        });
                        setIsDragging(true);
                        setSelectedSceneId(scene.id);
                        try {
                          const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId: scene.id } });
                          window.dispatchEvent(ev);
                        } catch {}
                      }}
                      draggable={false}
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    
                    {/* Scene Label */}
                    {editingSceneId === scene.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveName(scene.id, editingName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveName(scene.id, editingName);
                          } else if (e.key === 'Escape') {
                            setEditingSceneId(null);
                          }
                        }}
                        className="flex-1 text-center px-2 bg-transparent text-white font-semibold outline-none border-b border-white/50 mx-4"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        className="flex-1 text-center px-8 truncate select-none font-semibold drop-shadow-sm"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingSceneId(scene.id);
                          setEditingName(displayName);
                        }}
                      >
                        {displayName}
                      </span>
                    )}
                    
                    {/* Resize Handle End */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 md:w-3 cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-r-lg transition-colors backdrop-blur-sm"
                      title="Trim end (drag)"
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Audio Track - only show when audio exists */}
            {audioTrack && (
              <div className="relative" style={{ height: ROW_HEIGHT, marginTop: '10px' }}>
                <div
                  className="absolute border border-gray-300/30 rounded-lg"
                  style={{
                    // Audio duration is in seconds, convert to frames
                    left: `${((audioTrack.startTime || 0) * FPS / totalDuration) * 100}%`,
                    width: `${(((audioTrack.endTime || audioTrack.duration || 1) - (audioTrack.startTime || 0)) * FPS / totalDuration) * 100}%`,
                    height: TIMELINE_ITEM_HEIGHT,
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  {/* Audio waveform canvas - no background, just the waveform */}
                  <canvas
                    ref={audioCanvasRef}
                    className="absolute inset-0 w-full h-full"
                    width={1200}
                    height={TIMELINE_ITEM_HEIGHT * 2}
                  />
                </div>
              </div>
            )}
            
            {/* End spacer (visual extra space that does not affect percent-based widths)
                This lives outside the content's percent base (left: 100%). It lets users drag
                beyond the last block without altering how block percentages are computed. */}
            <div
              className="absolute top-0 bottom-0"
              style={{ left: '100%', width: `${END_SPACER_PX}px` }}
            />

            {/* Playhead - with Bazaar orange gradient */}
            <div
              className="absolute top-0 bottom-0 w-1 cursor-ew-resize z-30"
              style={{ 
                left: `${(currentFrame / totalDuration) * 100}%`,
                background: 'linear-gradient(180deg, #fb923c 0%, #fed7aa 100%)',
                boxShadow: '0 0 10px rgba(251, 146, 60, 0.6), 0 0 20px rgba(254, 215, 170, 0.4)'
              }}
              title={`Frame: ${currentFrame} / ${totalDuration} (${((currentFrame / totalDuration) * 100).toFixed(1)}%)`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragInfo({
                  action: 'playhead',
                  startX: e.clientX,
                  startPosition: currentFrame,
                  startDuration: 0
                });
                setIsDragging(true);
              }}
            >
              {/* Modern playhead indicator with Bazaar orange gradient */}
              <div 
                className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #fb923c 0%, #fed7aa 100%)' }}
              />
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 
                              w-0 h-0 
                              border-l-[5px] border-l-transparent
                              border-r-[5px] border-r-transparent
                              border-t-[6px] pointer-events-none"
                   style={{ borderTopColor: '#fb923c' }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Context Menu - using fixed positioning and high z-index */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[180px] text-sm backdrop-blur-sm"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 150),
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const sceneIndex = scenes.findIndex((s: any) => s.id === contextMenu.sceneId);
              const scene = scenes[sceneIndex];
              if (scene) {
                // Start inline editing
                setEditingSceneId(contextMenu.sceneId);
                setEditingName((scene as any).name || scene.data?.name || `Scene ${sceneIndex + 1}`);
              }
              setContextMenu(null);
            }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Rename Scene
          </button>
          <button
            onClick={() => handleDuplicateScene(contextMenu.sceneId)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicate Scene
          </button>
          <button
            onClick={() => {
              handleSplitAtPlayhead(contextMenu.sceneId);
              setContextMenu(null);
            }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Scissors className="w-4 h-4" />
            Split at Playhead
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            onClick={() => handleDeleteScene(contextMenu.sceneId, true)}
            disabled={isDeletionBusy}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {isDeletionBusy ? 'Deleting...' : 'Delete Scene'}
          </button>
        </div>
      )}
    </div>
  );
}
