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
  GripVertical
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { toast } from 'sonner';
import { api } from '~/trpc/react';

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

interface TimelinePanelProps {
  projectId: string;
  userId?: string;
}

interface DragInfo {
  action: 'move' | 'resize-start' | 'resize-end' | 'playhead';
  sceneId?: string;
  startX: number;
  startPosition: number;  // In frames
  startDuration: number;  // In frames
  sceneIndex?: number;
}

export default function TimelinePanel({ projectId, userId }: TimelinePanelProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
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
  
  // Get video state from Zustand store
  const project = useVideoState(state => state.projects[projectId]);
  const scenes = project?.props?.scenes || [];
  const updateScene = useVideoState(state => state.updateScene);
  const deleteScene = useVideoState(state => state.deleteScene);
  
  // API mutation for persisting duration changes
  const updateSceneDurationMutation = api.scenes.updateSceneDuration.useMutation({
    onSuccess: () => {
      console.log('[Timeline] Scene duration persisted to database');
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene duration:', error);
      toast.error('Failed to save duration changes');
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
  
  // Get current frame from PreviewPanelG via event system
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
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
  
  // Format time display
  const formatTime = useCallback((frames: number): string => {
    // Ensure frames is an integer
    frames = Math.round(frames);
    const totalSeconds = Math.floor(frames / FPS);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frameRemainder = frames % FPS;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frameRemainder.toString().padStart(2, '0')}`;
  }, []);
  
  // Handle timeline click for scrubbing
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    // Clamp to timeline bounds
    const clampedX = Math.max(0, Math.min(rect.width, clickX));
    
    // Calculate percentage (0 to 1)
    const percentage = clampedX / rect.width;
    
    // Convert to frame
    const newFrame = Math.round(percentage * totalDuration);
    const clampedFrame = Math.max(0, Math.min(totalDuration - 1, newFrame));
    
    console.log('[Timeline Click] Seek to frame:', clampedFrame);
    
    // Update state and dispatch event
    setCurrentFrame(clampedFrame);
    const event = new CustomEvent('timeline-seek', { 
      detail: { frame: clampedFrame }
    });
    window.dispatchEvent(event);
  }, [isDragging, totalDuration]);
  
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
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomScale(prev => Math.max(0.25, Math.min(4, prev + delta)));
  }, []);
  
  // Handle drag start
  const handleDragStart = useCallback((
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
  
  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragInfo || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    
    if (dragInfo.action === 'playhead') {
      // Get mouse position relative to timeline container
      const mouseX = e.clientX - rect.left;
      
      // Clamp to timeline bounds
      const clampedX = Math.max(0, Math.min(rect.width, mouseX));
      
      // Calculate percentage (0 to 1)
      const percentage = clampedX / rect.width;
      
      // Convert percentage to frame number
      const newFrame = Math.round(percentage * totalDuration);
      const clampedFrame = Math.max(0, Math.min(totalDuration - 1, newFrame));
      
      console.log('[Playhead Drag] Position:', {
        mouseX: mouseX.toFixed(1),
        containerWidth: rect.width.toFixed(1),
        percentage: (percentage * 100).toFixed(1) + '%',
        frame: clampedFrame,
        totalDuration
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
    const deltaFrames = Math.round(deltaX / pixelsPerFrame);
    
    // Get current scenes from store to avoid dependency issues
    const currentProject = useVideoState.getState().projects[projectId];
    const currentScenes = currentProject?.props?.scenes || [];
    const scene = currentScenes.find((s: Scene) => s.id === dragInfo.sceneId);
    if (!scene) return;
    
    if (dragInfo.action === 'resize-start') {
      // Trim from start - dragging right decreases duration, dragging left increases it
      const newDuration = Math.max(30, dragInfo.startDuration - deltaFrames);
      
      if (newDuration !== scene.duration) {
        updateScene(projectId, dragInfo.sceneId || '', {
          ...scene,
          duration: newDuration
        });
      }
      
    } else if (dragInfo.action === 'resize-end') {
      // Trim from end - dragging right increases duration, dragging left decreases it
      const newDuration = Math.max(30, dragInfo.startDuration + deltaFrames);
      
      if (newDuration !== scene.duration) {
        updateScene(projectId, dragInfo.sceneId || '', {
          ...scene,
          duration: newDuration
        });
      }
    }
  }, [dragInfo, totalDuration, zoomScale, updateScene, projectId]);
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    // If we were doing a resize operation, persist the duration change
    if (dragInfo && (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end')) {
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
  }, [dragInfo, updateSceneDurationMutation, projectId]);
  
  // Set up drag event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);
  
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
  
  // Handle keyboard events for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedSceneId) {
          e.preventDefault();
          handleDeleteScene(selectedSceneId);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedSceneId, handleDeleteScene]);
  
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
  
  
  // Get scene color based on type (Modern professional colors)
  const getSceneColor = useCallback((scene: Scene): string => {
    const isSelected = selectedSceneId === scene.id;
    
    // Color by type with modern palette
    const type = scene.type || scene.data?.type || 'default';
    
    switch(type) {
      case 'text':
      case 'text-animation':
        return isSelected 
          ? "bg-indigo-500 text-white border-indigo-400 shadow-indigo-200" 
          : "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200"; // Indigo for text
      case 'video':
      case 'custom':
        return isSelected
          ? "bg-blue-500 text-white border-blue-400 shadow-blue-200"
          : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"; // Blue for video  
      case 'image':
        return isSelected
          ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-200"
          : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"; // Emerald for image
      case 'sound':
      case 'audio':
        return isSelected
          ? "bg-orange-500 text-white border-orange-400 shadow-orange-200"
          : "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100"; // Orange for audio
      default:
        return isSelected
          ? "bg-gray-500 text-white border-gray-400 shadow-gray-200"
          : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"; // Gray default
    }
  }, [selectedSceneId]);
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
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
          
          {/* Time Display */}
          <div className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {formatTime(currentFrame)} / {formatTime(totalDuration)}
            </span>
          </div>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setZoomScale(Math.max(0.25, zoomScale - 0.25))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <span className="text-sm text-gray-700 dark:text-gray-300 px-2 min-w-[3rem] text-center font-medium">
            {Math.round(zoomScale * 100)}%
          </span>
          
          <button
            onClick={() => setZoomScale(Math.min(4, zoomScale + 0.25))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Timeline Container */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950">
        {/* Time Ruler */}
        <div 
          className="h-8 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 relative overflow-hidden"
          style={{ width: `${zoomScale * 100}%` }}
        >
          {/* Time markers every second */}
          {Array.from({ length: Math.ceil(totalDuration / 30) + 1 }).map((_, i) => {
            const frame = i * 30;
            const position = (frame / totalDuration) * 100;
            
            return (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{ left: `${position}%` }}
              >
                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                <span className="absolute top-3 left-0 text-[10px] text-gray-500 dark:text-gray-400 transform -translate-x-1/2 font-mono">
                  {formatTime(frame)}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Timeline Track */}
        <div 
          ref={timelineRef}
          className="flex-1 relative overflow-x-auto overflow-y-hidden bg-gray-50 dark:bg-gray-950"
          onClick={handleTimelineClick}
          onWheel={handleWheelZoom}
          style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
        >
          <div
            className="relative h-full"
            style={{ 
              width: `${zoomScale * 100}%`,
              minWidth: '100%'
            }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: Math.ceil(totalDuration / 30) + 1 }).map((_, i) => {
                const frame = i * 30;
                const position = (frame / totalDuration) * 100;
                
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800 opacity-50"
                    style={{ left: `${position}%` }}
                  />
                );
              })}
            </div>
            
            {/* Scene Items */}
            <div className="relative" style={{ height: ROW_HEIGHT, marginTop: '10px' }}>
              {scenes.map((scene: Scene, index: number) => {
                // Calculate scene start position based on previous scenes (sequential)
                const sceneStart = scenes.slice(0, index).reduce((acc, s) => acc + (s.duration || 150), 0);
                const left = (sceneStart / totalDuration) * 100;
                const width = (scene.duration / totalDuration) * 100;
                const isBeingDragged = isDragging && dragInfo?.sceneId === scene.id;
                
                return (
                  <div
                    key={scene.id}
                    className={cn(
                      "absolute flex items-center rounded-lg text-sm font-medium transition-all shadow-sm border",
                      getSceneColor(scene),
                      isBeingDragged ? "opacity-75 z-20 scale-105" : "z-10",
                      selectedSceneId === scene.id ? "ring-2 ring-blue-500 ring-opacity-50" : ""
                    )}
                    style={{ 
                      left: `${left}%`,
                      width: `${width}%`,
                      height: TIMELINE_ITEM_HEIGHT,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      minWidth: '40px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSceneId(scene.id);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, scene.id)}
                  >
                    {/* Resize Handle Start */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-black/10 hover:bg-black/20 rounded-l-lg transition-colors"
                      onMouseDown={(e) => handleDragStart(e, scene.id, 'resize-start')}
                    />
                    
                    {/* Drag Handle */}
                    <div
                      className="absolute left-2 top-0 bottom-0 w-5 cursor-move flex items-center justify-center opacity-30 hover:opacity-70 transition-opacity"
                      onMouseDown={(e) => handleDragStart(e, scene.id, 'move')}
                    >
                      <GripVertical className="w-3 h-3" />
                    </div>
                    
                    {/* Scene Label */}
                    <span className="flex-1 text-center px-8 truncate select-none">
                      {scene.name || scene.data?.name || `Scene ${index + 1}`}
                    </span>
                    
                    {/* Resize Handle End */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-black/10 hover:bg-black/20 rounded-r-lg transition-colors"
                      onMouseDown={(e) => handleDragStart(e, scene.id, 'resize-end')}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 cursor-ew-resize z-30 shadow-lg"
              style={{ left: `${(currentFrame / totalDuration) * 100}%` }}
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
              {/* Modern playhead indicator */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-md" />
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 
                              w-0 h-0 
                              border-l-[4px] border-l-transparent
                              border-r-[4px] border-r-transparent
                              border-t-[5px] border-t-blue-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[160px] text-sm backdrop-blur-sm"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 170),
            top: Math.min(contextMenu.y, window.innerHeight - 120)
          }}
          onClick={(e) => e.stopPropagation()}
        >
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