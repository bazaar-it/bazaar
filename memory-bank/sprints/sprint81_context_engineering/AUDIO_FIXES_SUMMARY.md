# Audio Issues Fixed

## Problem Summary
1. **Audio not included in exported renders**: Audio was uploaded and configured in AudioPanel but not included when exporting videos
2. **Audio disappearing on page refresh**: Audio settings were lost when users refreshed the page

## Root Causes Identified

### Issue 1: Audio Not in Exports
- The `prepareRenderConfig` function in `/src/server/services/render/render.service.ts` didn't accept or handle audio data
- The render router didn't pass audio data from client to Lambda
- The Remotion composition didn't receive audio props

### Issue 2: Audio Not Persisting
- Zustand store was not using persistence middleware
- Audio data was stored in memory only and lost on page refresh

## Solutions Implemented

### 1. Audio Export Integration

#### Updated Render Router Input Schema
```typescript
// src/server/api/routers/render.ts
.input(z.object({
  projectId: z.string(),
  format: z.enum(['mp4', 'webm', 'gif']).default('mp4'),
  quality: z.enum(['low', 'medium', 'high']).default('high'),
  audio: z.object({
    url: z.string(),
    name: z.string(),
    duration: z.number(),
    startTime: z.number(),
    endTime: z.number(),
    volume: z.number(),
    fadeInDuration: z.number().optional(),
    fadeOutDuration: z.number().optional(),
    playbackRate: z.number().optional(),
  }).optional(),
}))
```

#### Enhanced Render Service
```typescript
// src/server/services/render/render.service.ts
export interface RenderConfig {
  projectId: string;
  scenes: any[];
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  projectProps?: any;
  audio?: AudioTrack; // NEW
  onProgress?: (progress: number) => void;
}
```

#### Updated Remotion Composition
```typescript
// src/remotion/MainCompositionSimple.tsx
export const VideoComposition: React.FC<{
  scenes?: any[];
  projectId?: string;
  width?: number;
  height?: number;
  audio?: AudioTrack; // NEW
}> = ({ scenes = [], width = 1920, height = 1080, audio }) => {
  
  return (
    <AbsoluteFill>
      {/* Background audio track */}
      {audio && (
        <Audio
          src={audio.url}
          volume={audio.volume}
          startFrom={Math.round(audio.startTime * 30)}
          endAt={Math.round(audio.endTime * 30)}
          loop={audio.endTime - audio.startTime < totalVideoDuration / 30}
          playbackRate={audio.playbackRate || 1}
        />
      )}
      
      {/* Video scenes */}
      <Series>
        {/* scenes... */}
      </Series>
    </AbsoluteFill>
  );
};
```

#### Updated Export Button
```typescript
// src/components/export/ExportButton.tsx
export function ExportButton({ projectId, projectTitle = "video", className, size = "sm" }: ExportButtonProps) {
  // Get audio from Zustand state
  const projectAudio = useVideoState(state => state.projects[projectId]?.audio);
  
  const handleExport = (format: ExportFormat, quality: ExportQuality) => {
    startRender.mutate({ 
      projectId,
      format,
      quality,
      audio: projectAudio || undefined, // NEW
    });
  };
}
```

### 2. Audio Persistence Fix

#### Added Zustand Persistence
```typescript
// src/stores/videoState.ts
export const useVideoState = create<VideoState>()(
  persist(
    (set, get) => ({
      // store implementation...
    }),
    {
      name: 'bazaar-video-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects, // Includes audio data
        currentProjectId: state.currentProjectId,
        selectedScenes: state.selectedScenes,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset non-persistent state
          state.chatHistory = {};
          state.refreshTokens = {};
          state.lastSyncTime = 0;
          state.pendingDbSync = {};
          state.generatingScenes = {};
        }
      },
    }
  )
);
```

## Features Preserved

1. **Audio Upload**: Continues to work via AudioPanel
2. **Audio Controls**: Volume, trim, fade effects, playback speed
3. **Audio Preview**: Real-time playback in AudioPanel
4. **Audio Metadata**: Duration, file info, etc.

## Audio in Exports Now Includes:

1. **Background Music**: Audio plays as background track
2. **Volume Control**: User-configured volume level
3. **Trimming**: Only plays the selected portion (startTime to endTime)
4. **Looping**: Automatically loops if audio is shorter than video
5. **Playback Speed**: Respects user-configured playback rate
6. **Fade Effects**: Ready for implementation (commented for Phase 2)

## Testing Recommendations

1. **Upload Audio**: Test MP3, WAV, M4A file uploads
2. **Configure Audio**: Test volume, trim, speed controls
3. **Page Refresh**: Verify audio persists after browser refresh
4. **Export Test**: Create video export and verify audio is included
5. **Different Formats**: Test MP4, WebM exports with audio
6. **Audio Length**: Test audio shorter and longer than video duration

## Known Limitations

1. **Fade Effects**: Commented out in Remotion component (requires custom interpolate implementation)
2. **Multiple Audio Tracks**: Currently supports one audio track per project
3. **Audio Waveform**: Not yet implemented (planned for Sprint 82)
4. **Beat Detection**: Not yet implemented (planned for Sprint 82)

## Next Steps (Sprint 82)

1. Implement fade effects using Remotion's interpolate()
2. Add waveform visualization
3. Implement beat detection for audio-reactive animations
4. Add multiple audio track support
5. Add audio compression/optimization options