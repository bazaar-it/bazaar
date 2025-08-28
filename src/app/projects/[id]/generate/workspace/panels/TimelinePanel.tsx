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
  Hash
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { toast } from 'sonner';
import { api } from '~/trpc/react';
import { extractSceneColors } from '~/lib/utils/extract-scene-colors';

// Constants from React Video Editor Pro
const ROW_HEIGHT = 60;
const TIMELINE_ITEM_HEIGHT = 40;
const FPS = 30;

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

export default function TimelinePanel({ projectId, userId, onClose }: TimelinePanelProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timeRulerRef = useRef<HTMLDivElement>(null);
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
  
  // Get video state from Zustand store
  const project = useVideoState(state => state.projects[projectId]);
  const scenes = project?.props?.scenes || [];
  
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
      displayName: s.name || s.data?.name || 'Unnamed'
    })));
  }, [scenes]);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioWaveform, setAudioWaveform] = useState<number[]>();
  
  const updateScene = useVideoState(state => state.updateScene);
  const deleteScene = useVideoState(state => state.deleteScene);
  const updateProjectAudio = useVideoState(state => state.updateProjectAudio);
  const reorderScenes = useVideoState(state => state.reorderScenes);
  
  // API mutation for persisting duration changes
  const updateSceneDurationMutation = api.scenes.updateSceneDuration.useMutation({
    onSuccess: async () => {
      console.log('[Timeline] Scene duration persisted to database');
      // Invalidate iterations query to ensure restore button updates
      await utils.generation.getBatchMessageIterations.invalidate();
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene duration:', error);
      toast.error('Failed to save duration changes');
    }
  });
  
  // API mutation for updating scene name
  const updateSceneNameMutation = api.generation.updateSceneName.useMutation({
    onSuccess: () => {
      console.log('[Timeline] Scene name persisted to database');
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene name:', error);
      toast.error('Failed to save scene name');
    }
  });
  
  // API mutation for deleting scenes
  const removeSceneMutation = api.generation.removeScene.useMutation({
    onSuccess: () => {
      console.log('[Timeline] Scene deleted from database');
      toast.success('Scene deleted');
    },
    onError: (error) => {
      console.error('[Timeline] Failed to delete scene:', error);
      toast.error('Failed to delete scene');
    }
  });
  
  // API mutation for reordering scenes
  const reorderScenesMutation = api.scenes.reorderScenes.useMutation({
    onSuccess: () => {
      console.log('[Timeline] Scene order persisted to database');
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene order:', error);
      toast.error('Failed to save scene order');
    }
  });
  
  // Get current frame from PreviewPanelG via event system
  const [currentFrame, setCurrentFrame] = useState(0);
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
        setCurrentFrame(event.detail.frame);
      }
    };
    
    const handlePlaybackSpeed = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.speed === 'number') {
        // Update playback speed if needed
      }
    };
    
    const handlePlayStateChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.playing === 'boolean') {
        setIsPlaying(event.detail.playing);
      }
    };
    
    window.addEventListener('preview-frame-update' as any, handleFrameUpdate);
    window.addEventListener('playback-speed-change' as any, handlePlaybackSpeed);
    window.addEventListener('preview-play-state-change' as any, handlePlayStateChange);
    
    return () => {
      window.removeEventListener('preview-frame-update' as any, handleFrameUpdate);
      window.removeEventListener('playback-speed-change' as any, handlePlaybackSpeed);
      window.removeEventListener('preview-play-state-change' as any, handlePlayStateChange);
    };
  }, [isDragging, dragInfo]);
  
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
    
    // Account for scroll position and zoom scale
    const actualClickX = clickX + scrollLeft;
    const actualWidth = rect.width * zoomScale;
    
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
    if (!e.ctrlKey && !e.metaKey) return;
    
    e.preventDefault();
    // Use smaller increments for smoother zooming
    const zoomSpeed = 0.05;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    
    setZoomScale(prev => {
      const newScale = prev + delta;
      // Clamp between 0.25 and 4, and round to avoid floating point issues
      return Math.round(Math.max(0.25, Math.min(4, newScale)) * 100) / 100;
    });
  }, []);
  
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
    
    const deltaX = e.clientX - dragInfo.startX;
    const pixelsPerFrame = rect.width / totalDuration;
    let deltaFrames = Math.round(deltaX / pixelsPerFrame);
    
    // Apply snapping for resize operations
    if (!e.shiftKey && (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end')) {
      // Dynamic snap interval based on zoom level for fine control - frame-by-frame
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
      // Trim from start - dragging right decreases duration, dragging left increases it
      const newDuration = Math.max(30, dragInfo.startDuration - deltaFrames);
      
      if (newDuration !== scene.duration) {
        // Only update duration, preserve everything else
        updateScene(projectId, dragInfo.sceneId || '', {
          duration: newDuration
        });
      }
      
    } else if (dragInfo.action === 'resize-end') {
      // Trim from end - dragging right increases duration, dragging left decreases it
      const newDuration = Math.max(30, dragInfo.startDuration + deltaFrames);
      
      if (newDuration !== scene.duration) {
        // Only update duration, preserve everything else
        updateScene(projectId, dragInfo.sceneId || '', {
          duration: newDuration
        });
      }
    }
  }, [dragInfo, totalDuration, zoomScale, updateScene, projectId, snapToGrid]);
  
  // Handle resize drag end
  const handleResizeDragEnd = useCallback((e?: MouseEvent) => {
    // If we were doing a reorder operation
    if (dragInfo && dragInfo.action === 'reorder' && e && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const relativeX = mouseX / (rect.width * zoomScale);
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
            console.log('[Timeline] Reordering scenes:', dragInfo.sceneIndex, 'to', i);
            
            // Perform the reorder
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
            
            toast.success('Scenes reordered');
          }
          break;
        }
        cumulativeFrames = sceneEnd;
      }
    }
    // If we were doing a resize operation, persist the duration change
    else if (dragInfo && (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end')) {
      // Get current scenes from store to avoid dependency issues
      const currentProject = useVideoState.getState().projects[projectId];
      const currentScenes = currentProject?.props?.scenes || [];
      const scene = currentScenes.find((s: Scene) => s.id === dragInfo.sceneId);
      
      if (scene && scene.duration !== dragInfo.startDuration && dragInfo.sceneId) {
        // Duration has changed, persist to database
        updateSceneDurationMutation.mutate({
          projectId,
          sceneId: dragInfo.sceneId,
          duration: scene.duration
        });
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
  const handleDeleteScene = useCallback((sceneId: string) => {
    // Update local state immediately for responsive UI
    deleteScene(projectId, sceneId);
    
    // Persist to database
    removeSceneMutation.mutate({
      projectId,
      sceneId
    });
    
    setContextMenu(null);
  }, [deleteScene, projectId, removeSceneMutation]);
  
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
        if (selectedSceneId) {
          e.preventDefault();
          handleDeleteScene(selectedSceneId);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedSceneId, handleDeleteScene, togglePlayPause]);
  
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
    // More breathing room: 60px controls, 32px ruler, 80px scenes area, extra for audio
    const height = audioTrack ? 240 : 180;
    console.log('[Timeline] Height calculation:', { hasAudio: !!audioTrack, height });
    return height;
  }, [audioTrack]);
  
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
    <div className="flex flex-col bg-white dark:bg-gray-950" style={{ height: `${timelineHeight}px` }}>
      {/* Timeline Controls - Modern design */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* Playback Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
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
                <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
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
                <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700"
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
          className="h-8 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 relative overflow-hidden cursor-pointer"
          onClick={(e) => {
            // Move playhead when clicking on time ruler
            if (timelineRef.current) {
              const rect = e.currentTarget.getBoundingClientRect();
              const scrollLeft = timelineRef.current.scrollLeft;
              const clickX = e.clientX - rect.left;
              
              // Account for scroll position and zoom scale
              const actualClickX = clickX + scrollLeft;
              const actualWidth = rect.width * zoomScale;
              
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
                  <span className="absolute top-3 left-0 text-[10px] text-gray-500 dark:text-gray-400 transform -translate-x-1/2 font-mono whitespace-nowrap">
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
          style={{ 
            height: `${timelineHeight - 60 - 32}px`,
            cursor: isDragging ? 'grabbing' : 'crosshair' 
          }}
        >
          <div
            className="relative"
            style={{ 
              width: `${Math.max(100, zoomScale * 100)}%`,
              minWidth: '100%',
              minHeight: '100%'
            }}
          >
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
            <div className="relative" style={{ height: ROW_HEIGHT, marginTop: '10px' }}>
              {scenes.map((scene: any, index: number) => {
                // Calculate scene start position based on previous scenes (sequential)
                const sceneStart = scenes.slice(0, index).reduce((acc, s) => acc + (s.duration || 150), 0);
                // When zoomed, scenes need to scale with the container
                const left = (sceneStart / totalDuration) * 100;
                const width = (scene.duration / totalDuration) * 100;
                const isBeingDragged = isDragging && dragInfo?.sceneId === scene.id && dragInfo?.action === 'reorder';
                
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
                        // Start reorder drag
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
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, scene.id)}
                  >
                    {/* Resize Handle Start */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-l-lg transition-colors backdrop-blur-sm"
                    />
                    
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
                          setEditingName(scene.name || scene.data?.name || `Scene ${index + 1}`);
                        }}
                      >
                        {scene.name || scene.data?.name || `Scene ${index + 1}`}
                      </span>
                    )}
                    
                    {/* Resize Handle End */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-r-lg transition-colors backdrop-blur-sm"
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
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            onClick={() => handleDeleteScene(contextMenu.sceneId)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-red-600 dark:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Scene
          </button>
        </div>
      )}
    </div>
  );
}