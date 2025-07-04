// src/components/ui/PlaybackSpeedSlider.tsx

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { PlayIcon, RotateCcwIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

interface PlaybackSpeedSliderProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  className?: string;
}

const SPEED_MARKS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' }
];

export function PlaybackSpeedSlider({ 
  currentSpeed, 
  onSpeedChange, 
  className = "" 
}: PlaybackSpeedSliderProps) {
  const [sliderValue, setSliderValue] = useState([currentSpeed]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Update slider when currentSpeed changes from outside
  useEffect(() => {
    setSliderValue([currentSpeed]);
  }, [currentSpeed]);
  
  const handleSliderChange = (value: number[]) => {
    const newSpeed = value[0];
    setSliderValue([newSpeed]);
    onSpeedChange(newSpeed);
  };
  
  const handleReset = () => {
    setSliderValue([1]);
    onSpeedChange(1);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 px-2 text-xs font-mono ${className}`}
          title="Playback Speed"
        >
          <PlayIcon className="h-3 w-3 mr-1" />
          {currentSpeed}x
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-48 p-3"
        onPointerDownOutside={(e) => {
          // Prevent closing when interacting with the slider
          const target = e.target as HTMLElement;
          if (target.closest('[role="slider"]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="space-y-2">
          <Slider
            value={sliderValue}
            onValueChange={handleSliderChange}
            min={0.25}
            max={4}
            step={0.05}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            {SPEED_MARKS.map((mark) => (
              <button
                key={mark.value}
                className={`cursor-pointer hover:text-foreground transition-colors ${
                  Math.abs(sliderValue[0] - mark.value) < 0.05 ? 'text-foreground font-medium' : ''
                }`}
                onClick={() => handleSliderChange([mark.value])}
              >
                {mark.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}