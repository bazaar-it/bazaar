// src/components/ui/PlaybackSpeedControl.tsx

"use client";

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { PlayIcon } from "lucide-react";

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
  { value: 2, label: '2x' }
];

export function PlaybackSpeedControl({ 
  currentSpeed, 
  onSpeedChange, 
  className = "" 
}: PlaybackSpeedControlProps) {
  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end" className="w-24">
        {SPEED_PRESETS.map((speed) => (
          <DropdownMenuItem
            key={speed.value}
            onClick={() => onSpeedChange(speed.value)}
            className={currentSpeed === speed.value ? 'bg-accent font-medium' : ''}
          >
            <span>{speed.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}