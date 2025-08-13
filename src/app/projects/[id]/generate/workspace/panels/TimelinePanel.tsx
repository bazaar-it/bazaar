"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useVideoState } from '~/stores/videoState';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ZoomIn, 
  ZoomOut,
  Scissors,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { toast } from 'sonner';
import type { Scene } from '~/lib/types/video/scene';
import { formatTime } from '~/lib/utils/timeline';

interface TimelinePanelProps {
  projectId: string;
  userId?: string;
}

interface DragInfo {
  type: 'move' | 'trim-start' | 'trim-end';
  sceneId: string;
  initialX: number;
  initialDuration: number;
  initialStart: number;
}

export default function TimelinePanel({ projectId, userId }: TimelinePanelProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sceneId: string } | null>(null);
  const [framePrompt, setFramePrompt] = useState('');
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  
  // Get video state
  const project = useVideoState(state => state.projects[projectId]);
  const scenes = project?.scenes || [];
  const currentFrame = useVideoState(state => state.currentFrame);
  const isPlaying = useVideoState(state => state.isPlaying);
  const setIsPlaying = useVideoState(state => state.setIsPlaying);
  const setCurrentFrame = useVideoState(state => state.setCurrentFrame);
  const updateScene = useVideoState(state => state.updateScene);
  const deleteScene = useVideoState(state => state.deleteScene);
  const reorderScenes = useVideoState(state => state.reorderScenes);
  
  // Calculate total duration
  const totalDuration = scenes.reduce((acc, scene) => acc + (scene.durationInFrames || 120), 0);
  const fps = 30; // Default FPS
  
  // Playhead position as percentage
  const playheadPosition = (currentFrame / totalDuration) * 100;
  
  // Handle timeline click for scrubbing
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragInfo) return; // Don't scrub while dragging
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newFrame = Math.round(percentage * totalDuration);
    
    setCurrentFrame(newFrame);
    setSelectedFrame(newFrame);
  }, [totalDuration, setCurrentFrame, dragInfo]);
  
  // Handle scene selection
  const handleSceneClick = useCallback((sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSceneId(sceneId);
  }, []);
  
  // Handle drag start for scene manipulation
  const handleDragStart = useCallback((e: React.MouseEvent, sceneId: string, type: DragInfo['type']) => {
    e.preventDefault();
    e.stopPropagation();
    
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    // Calculate scene start frame
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    const startFrame = scenes.slice(0, sceneIndex).reduce((acc, s) => acc + (s.durationInFrames || 120), 0);
    
    setDragInfo({
      type,
      sceneId,
      initialX: e.clientX,
      initialDuration: scene.durationInFrames || 120,
      initialStart: startFrame
    });
  }, [scenes]);
  
  // Handle drag movement
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragInfo || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragInfo.initialX;
    const deltaFrames = Math.round((deltaX / rect.width) * totalDuration);
    
    if (dragInfo.type === 'move') {
      // Implement scene reordering logic here
      // For now, just show visual feedback
    } else if (dragInfo.type === 'trim-start') {
      const newDuration = Math.max(30, dragInfo.initialDuration - deltaFrames);
      updateScene(projectId, dragInfo.sceneId, { durationInFrames: newDuration });
    } else if (dragInfo.type === 'trim-end') {
      const newDuration = Math.max(30, dragInfo.initialDuration + deltaFrames);
      updateScene(projectId, dragInfo.sceneId, { durationInFrames: newDuration });
    }
  }, [dragInfo, totalDuration, updateScene, projectId]);
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragInfo(null);
  }, []);
  
  // Set up drag event listeners
  useEffect(() => {
    if (dragInfo) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragInfo, handleDragMove, handleDragEnd]);
  
  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, sceneId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sceneId });
  }, []);
  
  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  // Handle scene cut
  const handleCutScene = useCallback((sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    // Calculate cut point (middle of scene for now)
    const cutPoint = Math.floor((scene.durationInFrames || 120) / 2);
    
    // Create two new scenes from the original
    const firstHalf = {
      ...scene,
      id: `${scene.id}-1`,
      durationInFrames: cutPoint
    };
    
    const secondHalf = {
      ...scene,
      id: `${scene.id}-2`,
      durationInFrames: (scene.durationInFrames || 120) - cutPoint
    };
    
    // Update scenes array
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    const newScenes = [...scenes];
    newScenes.splice(sceneIndex, 1, firstHalf, secondHalf);
    
    reorderScenes(projectId, newScenes);
    toast.success('Scene cut successfully');
    setContextMenu(null);
  }, [scenes, reorderScenes, projectId]);
  
  // Handle scene delete
  const handleDeleteScene = useCallback((sceneId: string) => {
    deleteScene(projectId, sceneId);
    toast.success('Scene deleted');
    setContextMenu(null);
  }, [deleteScene, projectId]);
  
  // Handle frame-specific AI prompt
  const handleFramePrompt = useCallback(async () => {
    if (!selectedFrame || !framePrompt) return;
    
    // Find which scene the frame belongs to
    let accumulatedFrames = 0;
    let targetScene: Scene | undefined;
    
    for (const scene of scenes) {
      const sceneDuration = scene.durationInFrames || 120;
      if (selectedFrame <= accumulatedFrames + sceneDuration) {
        targetScene = scene;
        break;
      }
      accumulatedFrames += sceneDuration;
    }
    
    if (!targetScene) return;
    
    // Send prompt to AI with frame context
    toast.info(`Sending prompt for frame ${selectedFrame}: ${framePrompt}`);
    // TODO: Implement actual AI prompt sending
    
    setFramePrompt('');
  }, [selectedFrame, framePrompt, scenes]);
  
  // Calculate scene positions
  const getScenePosition = (index: number) => {
    const precedingDuration = scenes.slice(0, index).reduce((acc, s) => acc + (s.durationInFrames || 120), 0);
    return (precedingDuration / totalDuration) * 100;
  };
  
  const getSceneWidth = (scene: Scene) => {
    return ((scene.durationInFrames || 120) / totalDuration) * 100;
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-3 bg-white border-b">
        <div className="flex items-center gap-2">
          {/* Playback Controls */}
          <button
            onClick={() => setCurrentFrame(Math.max(0, currentFrame - 30))}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Previous second"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 hover:bg-gray-100 rounded"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setCurrentFrame(Math.min(totalDuration, currentFrame + 30))}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Next second"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          
          {/* Frame Display */}
          <div className="ml-4 text-sm font-mono">
            Frame: {currentFrame} / {totalDuration} | {formatTime(currentFrame / fps)}
          </div>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
          
          <button
            onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Timeline Ruler */}
      <div className="h-8 bg-gray-100 border-b relative">
        {/* Time markers */}
        {Array.from({ length: Math.ceil(totalDuration / 30) + 1 }).map((_, i) => {
          const frame = i * 30;
          const position = (frame / totalDuration) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 h-full flex flex-col justify-end"
              style={{ left: `${position}%` }}
            >
              <div className="w-px h-2 bg-gray-400" />
              <span className="text-xs text-gray-600 transform -translate-x-1/2 mt-1">
                {formatTime(frame / fps)}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Timeline Track */}
      <div 
        ref={timelineRef}
        className="flex-1 relative bg-gray-50 overflow-x-auto cursor-pointer"
        onClick={handleTimelineClick}
        style={{ 
          minHeight: '120px',
          transform: `scaleX(${zoomLevel})`,
          transformOrigin: 'left center'
        }}
      >
        {/* Scene Blocks */}
        <div className="absolute inset-x-0 top-4 h-16">
          {scenes.map((scene, index) => {
            const position = getScenePosition(index);
            const width = getSceneWidth(scene);
            const isSelected = selectedSceneId === scene.id;
            
            return (
              <div
                key={scene.id}
                className={cn(
                  "absolute h-full rounded cursor-move transition-all",
                  "flex items-center justify-center text-xs font-medium text-white",
                  isSelected ? "bg-blue-600 ring-2 ring-blue-400" : "bg-gray-700 hover:bg-gray-600"
                )}
                style={{ 
                  left: `${position}%`,
                  width: `${width}%`
                }}
                onClick={(e) => handleSceneClick(scene.id, e)}
                onContextMenu={(e) => handleContextMenu(e, scene.id)}
                onMouseDown={(e) => handleDragStart(e, scene.id, 'move')}
              >
                {/* Trim Handles */}
                <div
                  className="absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-blue-400/50"
                  onMouseDown={(e) => handleDragStart(e, scene.id, 'trim-start')}
                />
                <div
                  className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-blue-400/50"
                  onMouseDown={(e) => handleDragStart(e, scene.id, 'trim-end')}
                />
                
                {/* Scene Label */}
                <span className="truncate px-2">
                  {scene.name || `Scene ${index + 1}`}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
          style={{ left: `${playheadPosition}%` }}
        >
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 
                          border-l-[6px] border-l-transparent
                          border-r-[6px] border-r-transparent
                          border-t-[8px] border-t-red-500" />
        </div>
      </div>
      
      {/* Frame-specific AI Prompt */}
      {selectedFrame !== null && (
        <div className="p-3 bg-white border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              AI Prompt at Frame {selectedFrame}:
            </span>
            <input
              type="text"
              value={framePrompt}
              onChange={(e) => setFramePrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFramePrompt()}
              placeholder="Enter prompt for this frame..."
              className="flex-1 px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleFramePrompt}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute bg-white rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleCutScene(contextMenu.sceneId)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 w-full text-left"
          >
            <Scissors className="w-4 h-4" />
            Cut Scene
          </button>
          <button
            onClick={() => handleDeleteScene(contextMenu.sceneId)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 w-full text-left text-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Delete Scene
          </button>
        </div>
      )}
    </div>
  );
}