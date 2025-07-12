// src/components/ui/PlaybackSpeedSlider.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { Slider } from "~/components/ui/slider";
import { Button } from "~/components/ui/button";
import { ChevronsUp } from "lucide-react";
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

// Map speed value to slider position (0-100)
const speedToSliderValue = (speed: number): number => {
  // Handle exact matches first
  for (let i = 0; i < SPEED_MARKS.length; i++) {
    if (Math.abs(speed - SPEED_MARKS[i]!.value) < 0.01) {
      return (i / (SPEED_MARKS.length - 1)) * 100;
    }
  }
  
  // Find the closest marks for interpolation
  for (let i = 0; i < SPEED_MARKS.length - 1; i++) {
    const current = SPEED_MARKS[i]!;
    const next = SPEED_MARKS[i + 1]!;
    
    if (speed >= current.value && speed <= next.value) {
      // Linear interpolation between marks
      const ratio = (speed - current.value) / (next.value - current.value);
      const sliderStart = (i / (SPEED_MARKS.length - 1)) * 100;
      const sliderEnd = ((i + 1) / (SPEED_MARKS.length - 1)) * 100;
      return sliderStart + ratio * (sliderEnd - sliderStart);
    }
  }
  
  // Handle edge cases
  if (speed <= SPEED_MARKS[0]!.value) return 0;
  if (speed >= SPEED_MARKS[SPEED_MARKS.length - 1]!.value) return 100;
  
  return 50; // Default to middle
};

// Map slider position (0-100) to speed value
const sliderValueToSpeed = (sliderValue: number): number => {
  // Clamp to valid range
  const clampedValue = Math.max(0, Math.min(100, sliderValue));
  
  // Check if we're close to any exact mark positions
  const segmentSize = 100 / (SPEED_MARKS.length - 1);
  for (let i = 0; i < SPEED_MARKS.length; i++) {
    const markPosition = i * segmentSize;
    if (Math.abs(clampedValue - markPosition) < 2) { // Within 2% of exact position
      return SPEED_MARKS[i]!.value;
    }
  }
  
  // Find which segment we're in
  const segmentIndex = Math.floor(clampedValue / segmentSize);
  const segmentRatio = (clampedValue % segmentSize) / segmentSize;
  
  // Handle edge case for last segment
  if (segmentIndex >= SPEED_MARKS.length - 1) {
    return SPEED_MARKS[SPEED_MARKS.length - 1]!.value;
  }
  
  // Interpolate between the two marks
  const current = SPEED_MARKS[segmentIndex]!;
  const next = SPEED_MARKS[segmentIndex + 1]!;
  
  return current.value + segmentRatio * (next.value - current.value);
};

export function PlaybackSpeedSlider({ 
  currentSpeed, 
  onSpeedChange, 
  className = "" 
}: PlaybackSpeedSliderProps) {
  const [sliderValue, setSliderValue] = useState([speedToSliderValue(currentSpeed)]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Update slider when currentSpeed changes from outside
  useEffect(() => {
    setSliderValue([speedToSliderValue(currentSpeed)]);
  }, [currentSpeed]);
  
  const handleSliderChange = (value: number[]) => {
    const sliderPos = value[0] ?? 50;
    const newSpeed = sliderValueToSpeed(sliderPos);
    setSliderValue([sliderPos]);
    onSpeedChange(newSpeed);
  };
  
  const handleMarkClick = (speed: number) => {
    const sliderPos = speedToSliderValue(speed);
    setSliderValue([sliderPos]);
    onSpeedChange(speed);
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
          <ChevronsUp className="h-3 w-3 mr-1 rotate-90" />
          <span className="inline-block w-[2.5rem] text-left">
            {currentSpeed.toFixed(1)}x
          </span>
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
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            {SPEED_MARKS.map((mark) => (
              <button
                key={mark.value}
                className={`cursor-pointer hover:text-foreground transition-colors ${
                  Math.abs(currentSpeed - mark.value) < 0.05 ? 'text-foreground font-medium' : ''
                }`}
                onClick={() => handleMarkClick(mark.value)}
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