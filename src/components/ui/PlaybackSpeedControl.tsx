// src/components/ui/PlaybackSpeedControl.tsx

"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { PlayIcon, CheckIcon } from "lucide-react";

interface PlaybackSpeedControlProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  className?: string;
}

const SPEED_PRESETS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x', default: true },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' }
];

export function PlaybackSpeedControl({ 
  currentSpeed, 
  onSpeedChange, 
  className = "" 
}: PlaybackSpeedControlProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSpeed, setCustomSpeed] = useState(currentSpeed.toString());
  
  // Update customSpeed when currentSpeed changes
  React.useEffect(() => {
    setCustomSpeed(currentSpeed.toString());
  }, [currentSpeed]);
  
  // Check if current speed is a preset value
  const isPresetSpeed = SPEED_PRESETS.some(preset => preset.value === currentSpeed);
  
  const handleCustomSpeedSubmit = () => {
    const speed = parseFloat(customSpeed);
    console.log('[PlaybackSpeedControl] Submitting custom speed:', speed, 'from input:', customSpeed);
    if (!isNaN(speed) && speed > 0 && speed <= 4) {
      onSpeedChange(speed);
      setShowCustomInput(false);
      // Update the internal state to reflect the new speed
      setCustomSpeed(speed.toString());
    } else if (!isNaN(speed) && speed > 4) {
      // Clamp to max 4x (Remotion limitation)
      alert('Maximum playback speed is 4x due to browser limitations');
      setCustomSpeed('4');
    }
  };
  
  const handleCustomSpeedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSpeedSubmit();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomSpeed(currentSpeed.toString());
    }
  };
  
  return (
    <DropdownMenu onOpenChange={(open) => {
      if (!open) {
        setShowCustomInput(false);
        setCustomSpeed(currentSpeed.toString());
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 px-2 text-xs font-mono ${className}`}
          title="Playback Speed"
        >
          <PlayIcon className="h-3 w-3 mr-1" />
          {currentSpeed}x
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-0" style={{ width: '70px' }}>
        {SPEED_PRESETS.map((speed) => (
          <DropdownMenuItem
            key={speed.value}
            onClick={() => onSpeedChange(speed.value)}
            className={currentSpeed === speed.value ? 'bg-accent font-medium' : ''}
          >
            <span>{speed.label}</span>
            {currentSpeed === speed.value && (
              <CheckIcon className="h-3 w-3 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            if (showCustomInput) {
              e.preventDefault();
            } else {
              e.preventDefault();
              setShowCustomInput(true);
            }
          }}
          className={!isPresetSpeed && !showCustomInput ? 'bg-accent font-medium' : ''}
        >
          {showCustomInput ? (
            <div 
              className="flex items-center gap-1 w-full" 
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Input
                type="number"
                value={customSpeed}
                onChange={(e) => setCustomSpeed(e.target.value)}
                onKeyDown={handleCustomSpeedKeyDown}
                placeholder="0.1-4"
                className="h-6 text-xs w-14"
                min="0.1"
                max="4"
                step="0.1"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleCustomSpeedSubmit();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <CheckIcon className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span>Custom</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}