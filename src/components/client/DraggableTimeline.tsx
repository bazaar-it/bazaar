"use client";

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import TimelinePanel from '~/app/projects/[id]/edit/panels/TimelinePanel';
import { Button } from '~/components/ui/button';
import { GripVerticalIcon, MinimizeIcon, XIcon, MaximizeIcon } from 'lucide-react';

interface DraggableTimelineProps {
  onClose: () => void;
}

export function DraggableTimeline({ onClose }: DraggableTimelineProps) {
  const { id } = useParams<{ id: string }>();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 600, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState<{ position: typeof position, size: typeof size } | null>(null);
  
  // Set initial position relative to parent container
  useEffect(() => {
    if (timelineRef.current) {
      const container = timelineRef.current.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        // Position in the center
        setPosition({
          x: (containerRect.width - size.width) / 2,
          y: (containerRect.height - size.height) / 2,
        });
      }
    }
  }, []);
  
  // Start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return; // Don't allow dragging when maximized
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    
    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';
    
    // Add global event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  // Calculate new position during drag
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    
    // Get container bounds
    const container = timelineRef.current?.parentElement;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      
      // Constrain to container boundaries
      const maxX = containerRect.width - size.width;
      const maxY = containerRect.height - size.height;
      
      newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
      newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));
    }
    
    setPosition(newPosition);
  };
  
  // End dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    document.body.style.userSelect = '';
    
    // Remove global event listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Start resizing
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    if (isMaximized) return; // Don't allow resizing when maximized
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection(direction);
    setInitialSize({ width: size.width, height: size.height });
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    
    // Add global event listeners
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  // Calculate new size during resize
  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const minWidth = 300;
    const minHeight = 200;
    
    let newWidth = initialSize.width;
    let newHeight = initialSize.height;
    let newX = position.x;
    let newY = position.y;
    
    // Calculate new size based on resize direction
    switch (resizeDirection) {
      case 'right':
        newWidth = Math.max(minWidth, initialSize.width + deltaX);
        break;
      case 'bottom':
        newHeight = Math.max(minHeight, initialSize.height + deltaY);
        break;
      case 'left':
        newWidth = Math.max(minWidth, initialSize.width - deltaX);
        newX = position.x + initialSize.width - newWidth;
        break;
      case 'top':
        newHeight = Math.max(minHeight, initialSize.height - deltaY);
        newY = position.y + initialSize.height - newHeight;
        break;
      case 'bottom-right':
        newWidth = Math.max(minWidth, initialSize.width + deltaX);
        newHeight = Math.max(minHeight, initialSize.height + deltaY);
        break;
      case 'bottom-left':
        newWidth = Math.max(minWidth, initialSize.width - deltaX);
        newHeight = Math.max(minHeight, initialSize.height + deltaY);
        newX = position.x + initialSize.width - newWidth;
        break;
      case 'top-right':
        newWidth = Math.max(minWidth, initialSize.width + deltaX);
        newHeight = Math.max(minHeight, initialSize.height - deltaY);
        newY = position.y + initialSize.height - newHeight;
        break;
      case 'top-left':
        newWidth = Math.max(minWidth, initialSize.width - deltaX);
        newHeight = Math.max(minHeight, initialSize.height - deltaY);
        newX = position.x + initialSize.width - newWidth;
        newY = position.y + initialSize.height - newHeight;
        break;
    }
    
    // Update position and size
    setPosition({ x: newX, y: newY });
    setSize({ width: newWidth, height: newHeight });
  };
  
  // Toggle maximize/restore
  const toggleMaximize = () => {
    if (isMaximized) {
      // Restore previous state
      if (preMaximizeState) {
        setPosition(preMaximizeState.position);
        setSize(preMaximizeState.size);
      }
    } else {
      // Save current state and maximize
      setPreMaximizeState({ position, size });
      
      // Get container dimensions
      const container = timelineRef.current?.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        setPosition({ x: 0, y: 0 });
        setSize({ width: containerRect.width, height: containerRect.height });
      }
    }
    
    setIsMaximized(!isMaximized);
  };
  
  return (
    <div
      ref={timelineRef}
      className="absolute bg-background border rounded-lg shadow-lg overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 50,
      }}
    >
      {/* Timeline header with drag handle */}
      <div 
        className="bg-muted px-2 py-1 cursor-move flex items-center justify-between select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Timeline</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-muted-foreground/20" 
            onClick={toggleMaximize}
          >
            {isMaximized ? <MinimizeIcon className="h-3 w-3" /> : <MaximizeIcon className="h-3 w-3" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-destructive/20" 
            onClick={onClose}
          >
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Timeline content */}
      <div className="w-full h-[calc(100%-32px)] overflow-auto">
        <TimelinePanel />
      </div>
      
      {/* Resize handles (only shown when not maximized) */}
      {!isMaximized && (
        <>
          {/* Corner resize handles */}
          <div
            className="absolute w-4 h-4 right-0 bottom-0 cursor-se-resize"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          />
          <div
            className="absolute w-4 h-4 left-0 bottom-0 cursor-sw-resize"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
          />
          <div
            className="absolute w-4 h-4 right-0 top-0 cursor-ne-resize"
            onMouseDown={(e) => handleResizeStart(e, 'top-right')}
          />
          <div
            className="absolute w-4 h-4 left-0 top-0 cursor-nw-resize"
            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          />
          
          {/* Edge resize handles */}
          <div
            className="absolute w-4 h-full right-0 top-0 cursor-e-resize"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
          <div
            className="absolute w-full h-4 bottom-0 left-0 cursor-s-resize"
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
          <div
            className="absolute w-4 h-full left-0 top-0 cursor-w-resize"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
          <div
            className="absolute w-full h-4 top-0 left-0 cursor-n-resize"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
        </>
      )}
    </div>
  );
} 