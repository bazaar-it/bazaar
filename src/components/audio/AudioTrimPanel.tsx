"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Scissors } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { type UploadedMedia } from '~/components/chat/MediaUpload';

interface AudioTrimPanelProps {
  audio: UploadedMedia | null;
  onClose: () => void;
  onTrimComplete: (audio: UploadedMedia, startTime: number, endTime: number) => void;
}

export function AudioTrimPanel({ audio, onClose, onTrimComplete }: AudioTrimPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  useEffect(() => {
    if (!audio) return;
    
    // Reset state when new audio is selected
    setIsPlaying(false);
    setCurrentTime(0);
    setStartTime(0);
    setEndTime(0);
  }, [audio]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audioDuration = audioRef.current.duration;
      setDuration(audioDuration);
      setEndTime(audioDuration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      // Loop within trim range during preview
      if (audioRef.current.currentTime >= endTime) {
        audioRef.current.currentTime = startTime;
      }
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Start from trim start point
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTrim = () => {
    if (audio) {
      onTrimComplete(audio, startTime, endTime);
    }
  };

  if (!audio) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trim Audio</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">{audio.file.name}</p>
          
          {/* Audio element */}
          <audio
            ref={audioRef}
            src={audio.url}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Playback controls */}
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={togglePlayPause}
              size="sm"
              variant="outline"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <span className="text-sm text-gray-600">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Simple waveform visualization (placeholder) */}
          <div className="relative h-16 bg-gray-100 rounded mb-4">
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
              Audio Waveform
            </div>
            {/* Trim range indicator */}
            <div
              className="absolute top-0 bottom-0 bg-blue-200/50 border-l-2 border-r-2 border-blue-500"
              style={{
                left: `${(startTime / duration) * 100}%`,
                width: `${((endTime - startTime) / duration) * 100}%`
              }}
            />
            {/* Current time indicator */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500"
              style={{
                left: `${(currentTime / duration) * 100}%`
              }}
            />
          </div>

          {/* Trim controls */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="startTime">Start Time (seconds)</Label>
              <Input
                id="startTime"
                type="number"
                min="0"
                max={endTime - 1}
                step="0.1"
                value={startTime}
                onChange={(e) => setStartTime(Math.max(0, Math.min(parseFloat(e.target.value) || 0, endTime - 1)))}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time (seconds)</Label>
              <Input
                id="endTime"
                type="number"
                min={startTime + 1}
                max={duration}
                step="0.1"
                value={endTime}
                onChange={(e) => setEndTime(Math.max(startTime + 1, Math.min(parseFloat(e.target.value) || duration, duration)))}
              />
            </div>
          </div>

          {/* Duration info */}
          <p className="text-sm text-gray-600 mb-4">
            Trimmed duration: {formatTime(endTime - startTime)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTrim}
            className="flex items-center gap-2"
          >
            <Scissors className="w-4 h-4" />
            Apply Trim
          </Button>
        </div>
      </div>
    </div>
  );
}