"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { Music, Upload, Play, Pause, Scissors, Volume2, X, Check, Zap, Volume1 } from "lucide-react";
import { useVideoState } from "~/stores/videoState";
import { toast } from "sonner";
import { api } from "~/trpc/react";

interface AudioPanelProps {
  projectId: string;
}

interface AudioTrack {
  id: string;
  url: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  volume: number;
  // Phase 1 enhancements
  fadeInDuration?: number;
  fadeOutDuration?: number;
  playbackRate?: number;
}

export function AudioPanel({ projectId }: AudioPanelProps) {
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get project state from Zustand
  const updateProjectAudio = useVideoState(state => state.updateProjectAudio);
  
  // Database sync mutation
  const updateAudioMutation = api.project.updateAudio.useMutation({
    onError: (error) => {
      console.error('[AudioPanel] Failed to sync audio to database:', error);
      toast.error('Failed to save audio settings');
    },
  });
  
  // Load project data from database
  const { data: project } = api.project.getById.useQuery({ id: projectId });
  
  console.log('[AudioPanel] Rendering with projectId:', projectId);

  // Helper function to sync audio to both Zustand and database
  const syncAudioSettings = (audio: AudioTrack | null) => {
    // Update Zustand state immediately for UI responsiveness
    updateProjectAudio(projectId, audio);
    
    // Sync to database in background
    updateAudioMutation.mutate({
      projectId,
      audio,
    });
  };

  // Load audio settings from database (takes priority over Zustand)
  useEffect(() => {
    if (project?.audio) {
      console.log('[AudioPanel] Loading audio from database:', project.audio);
      setAudioTrack(project.audio);
      // Also sync to Zustand for consistency
      updateProjectAudio(projectId, project.audio);
    } else {
      // Fallback to Zustand state if no database audio
      const projectState = useVideoState.getState().projects[projectId];
      if (projectState?.audio) {
        console.log('[AudioPanel] Loading audio from Zustand:', projectState.audio);
        setAudioTrack(projectState.audio);
      }
    }
  }, [project?.audio, projectId, updateProjectAudio]);

  // Update HTML audio element when audio track changes
  useEffect(() => {
    if (audioRef.current && audioTrack) {
      audioRef.current.volume = audioTrack.volume;
      audioRef.current.playbackRate = audioTrack.playbackRate || 1;
    }
  }, [audioTrack?.volume, audioTrack?.playbackRate]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('[AudioPanel] No file selected');
      return;
    }
    
    console.log('[AudioPanel] File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Validate file type
    const isAudio = file.type.startsWith('audio/') || 
                   file.name.endsWith('.mp3') || 
                   file.name.endsWith('.m4a') || 
                   file.name.endsWith('.wav') ||
                   file.name.endsWith('.ogg') ||
                   file.name.endsWith('.aac');
                   
    if (!isAudio) {
      toast.error('Please upload an audio file (MP3, WAV, M4A, OGG, or AAC)');
      return;
    }

    // Validate file size (4.5MB max for Vercel)
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`Audio file too large (${fileSizeMB}MB). Maximum size is 4.5MB`);
      return;
    }

    setIsUploading(true);

    try {
      // Upload to R2
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Check for 413 (Payload Too Large) error
        if (response.status === 413) {
          throw new Error('File too large. Please upload an audio file smaller than 4.5MB');
        }
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Create audio element to get duration
      // Use native Audio constructor explicitly to avoid conflicts with Remotion's Audio component
      const audio = new (window as any).NativeAudio(result.url) || new Audio(result.url);
      audio.addEventListener('loadedmetadata', () => {
        const newTrack: AudioTrack = {
          id: result.key,
          url: result.url,
          name: file.name,
          duration: audio.duration,
          startTime: 0,
          endTime: audio.duration,
          volume: 1,
        };
        
        setAudioTrack(newTrack);
        syncAudioSettings(newTrack);
        toast.success('Audio uploaded successfully');
      });
    } catch (error) {
      console.error('Audio upload failed:', error);
      // Show specific error message if available
      if (error instanceof Error && error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to upload audio');
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !audioTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = audioTrack.startTime;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioTrack) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      
      // Loop within trim range
      if (time >= audioTrack.endTime) {
        audioRef.current.currentTime = audioTrack.startTime;
      }
    }
  };

  const handleTrimChange = (type: 'start' | 'end', value: number[]) => {
    if (!audioTrack) return;
    
    const updatedTrack = {
      ...audioTrack,
      [type === 'start' ? 'startTime' : 'endTime']: value[0]
    };
    
    setAudioTrack(updatedTrack);
    syncAudioSettings(updatedTrack);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioTrack) return;
    
    const updatedTrack = {
      ...audioTrack,
      volume: value[0]
    };
    
    setAudioTrack(updatedTrack);
    syncAudioSettings(updatedTrack);
    
    if (audioRef.current) {
      audioRef.current.volume = value[0];
    }
  };

  // Phase 1 Enhancement Handlers
  const handleFadeInChange = (value: number[]) => {
    if (!audioTrack) return;
    
    const updatedTrack = {
      ...audioTrack,
      fadeInDuration: value[0]
    };
    
    setAudioTrack(updatedTrack);
    syncAudioSettings(updatedTrack);
  };

  const handleFadeOutChange = (value: number[]) => {
    if (!audioTrack) return;
    
    const updatedTrack = {
      ...audioTrack,
      fadeOutDuration: value[0]
    };
    
    setAudioTrack(updatedTrack);
    syncAudioSettings(updatedTrack);
  };

  const handleSpeedChange = (value: number[]) => {
    if (!audioTrack) return;
    
    const updatedTrack = {
      ...audioTrack,
      playbackRate: value[0]
    };
    
    setAudioTrack(updatedTrack);
    syncAudioSettings(updatedTrack);
    
    // Update HTML audio element playback rate for preview
    if (audioRef.current) {
      audioRef.current.playbackRate = value[0];
    }
  };

  const removeAudio = () => {
    setAudioTrack(null);
    syncAudioSettings(null);
    setIsPlaying(false);
    toast.success('Audio removed');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {audioTrack && (
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={removeAudio}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        )}
        {!audioTrack ? (
          // Upload state
          <div className="h-full flex items-center justify-center">
            <Card className="w-full max-w-md p-8 text-center">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Add Background Music</h3>
              <p className="text-sm text-gray-600 mb-6">
                Upload an MP3 file to add audio to your video
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => {
                  console.log('[AudioPanel] Upload button clicked');
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
                className="mx-auto"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Audio
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: MP3, WAV, M4A (max 50MB)
              </p>
            </Card>
          </div>
        ) : (
          // Audio controls state
          <div className="space-y-6">
            {/* Audio element */}
            <audio
              ref={audioRef}
              src={audioTrack.url}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onLoadedMetadata={() => {
                if (audioRef.current) {
                  audioRef.current.volume = audioTrack.volume;
                  audioRef.current.playbackRate = audioTrack.playbackRate || 1;
                }
              }}
            />

            {/* Track info */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">{audioTrack.name}</h4>
                  <p className="text-sm text-gray-600">
                    Duration: {formatTime(audioTrack.duration)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-gray-200 rounded-full mb-2">
                <div
                  className="absolute h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${(currentTime / audioTrack.duration) * 100}%`
                  }}
                />
                {/* Trim indicators */}
                <div
                  className="absolute h-full bg-green-400 opacity-30"
                  style={{
                    left: `${(audioTrack.startTime / audioTrack.duration) * 100}%`,
                    width: `${((audioTrack.endTime - audioTrack.startTime) / audioTrack.duration) * 100}%`
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 text-center">
                {formatTime(currentTime)} / {formatTime(audioTrack.duration)}
              </p>
            </Card>

            {/* Trim controls */}
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Scissors className="w-4 h-4" />
                Trim Audio
              </h4>
              
              <div className="space-y-4">
                <div>
                  <Label>Start Time: {formatTime(audioTrack.startTime)}</Label>
                  <Slider
                    value={[audioTrack.startTime]}
                    onValueChange={(value) => handleTrimChange('start', value)}
                    max={audioTrack.endTime - 1}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>End Time: {formatTime(audioTrack.endTime)}</Label>
                  <Slider
                    value={[audioTrack.endTime]}
                    onValueChange={(value) => handleTrimChange('end', value)}
                    min={audioTrack.startTime + 1}
                    max={audioTrack.duration}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
                
                <p className="text-sm text-gray-600">
                  Trimmed duration: {formatTime(audioTrack.endTime - audioTrack.startTime)}
                </p>
              </div>
            </Card>

            {/* Volume control */}
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Volume
              </h4>
              <Slider
                value={[audioTrack.volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="mt-2"
              />
              <p className="text-sm text-gray-600 mt-2">
                {Math.round(audioTrack.volume * 100)}%
              </p>
            </Card>

            {/* Fade Effects */}
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Volume1 className="w-4 h-4" />
                Fade Effects
              </h4>
              <div className="space-y-4">
                <div>
                  <Label>Fade In: {(audioTrack.fadeInDuration || 0).toFixed(1)}s</Label>
                  <Slider
                    value={[audioTrack.fadeInDuration || 0]}
                    onValueChange={handleFadeInChange}
                    max={5}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Fade Out: {(audioTrack.fadeOutDuration || 0).toFixed(1)}s</Label>
                  <Slider
                    value={[audioTrack.fadeOutDuration || 0]}
                    onValueChange={handleFadeOutChange}
                    max={5}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Smooth audio transitions at start and end
              </p>
            </Card>

            {/* Speed Control */}
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Playback Speed
              </h4>
              <Slider
                value={[audioTrack.playbackRate || 1]}
                onValueChange={handleSpeedChange}
                min={0.5}
                max={2}
                step={0.1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0.5x (Slow)</span>
                <span>{(audioTrack.playbackRate || 1).toFixed(1)}x</span>
                <span>2.0x (Fast)</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Change playback speed without affecting pitch
              </p>
            </Card>

            {/* Instructions */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Audio will automatically loop if shorter than video</li>
                <li>• Trim to select specific portions of your audio</li>
                <li>• Adjust volume to balance with any scene audio</li>
                <li>• Audio will be included in the final export</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}