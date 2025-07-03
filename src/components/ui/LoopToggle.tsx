// src/components/ui/LoopToggle.tsx

"use client";

import React, { useState } from 'react';
import { Button } from "~/components/ui/button";
import { Repeat, Repeat1, ChevronDown } from "lucide-react";
import { cn } from "~/lib/cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

export type LoopState = 'video' | 'off' | 'scene';

interface LoopToggleProps {
  loopState: LoopState;
  onStateChange: (state: LoopState) => void;
  selectedSceneId?: string | null;
  onSceneSelect?: (sceneId: string) => void;
  scenes?: Array<{ id: string; name?: string }>;
  className?: string;
}

export function LoopToggle({ 
  loopState,
  onStateChange,
  selectedSceneId,
  onSceneSelect,
  scenes = [],
  className = "" 
}: LoopToggleProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Handle clicking the loop toggle button
  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Cycle through states: video -> off -> scene -> video
    const nextState: LoopState = 
      loopState === 'video' ? 'off' : 
      loopState === 'off' ? 'scene' : 
      'video';
    
    console.log('[LoopToggle] State cycling:', loopState, '->', nextState);
    onStateChange(nextState);
  };
  
  // Get scene display name - position based numbering
  const getSceneName = (scene: { id: string; name?: string }, index: number) => {
    return `Scene ${index + 1}`;
  };
  
  // Find current selected scene index
  const selectedSceneIndex = scenes.findIndex(s => s.id === selectedSceneId);
  const selectedSceneName = selectedSceneIndex >= 0 ? getSceneName(scenes[selectedSceneIndex]!, selectedSceneIndex) : 'Select Scene';
  
  return (
    <div className="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="sm" 
        className={cn(
          "h-8 px-2 text-xs gap-1",
          loopState === 'off' ? "text-gray-400 hover:text-gray-600" : "text-blue-600 hover:text-blue-700",
          className
        )}
        onClick={handleToggleClick}
        title={
          loopState === 'video' ? "Looping entire video - Click to turn off" : 
          loopState === 'off' ? "Loop disabled - Click to loop scene" : 
          "Looping single scene - Click to loop video"
        }
      >
        {loopState === 'scene' ? (
          <Repeat1 className="h-3.5 w-3.5" />
        ) : (
          <Repeat className="h-3.5 w-3.5" />
        )}
      </Button>
      
      {/* Show scene selector only when in scene loop mode */}
      {loopState === 'scene' && scenes.length > 0 && (
        <Select
          value={selectedSceneId || ''}
          onValueChange={(value) => {
            console.log('[LoopToggle] Scene selected:', value);
            onSceneSelect?.(value);
          }}
          open={isDropdownOpen}
          onOpenChange={setIsDropdownOpen}
        >
          <SelectTrigger 
            className="h-8 px-2 text-xs border-0 bg-transparent hover:bg-gray-100 w-auto min-w-[100px]"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue placeholder="Select Scene">
              {selectedSceneName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {scenes.map((scene, index) => (
              <SelectItem key={scene.id} value={scene.id}>
                {getSceneName(scene, index)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}