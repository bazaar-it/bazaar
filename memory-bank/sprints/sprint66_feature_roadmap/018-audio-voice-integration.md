# Feature 018: Audio & Voice Integration

**Status**: Not Started  
**Priority**: Medium  
**Complexity**: High (5-6 days)  
**Sprint**: 66 - Feature Roadmap

## Overview

Implement a complete audio solution for Bazaar videos, including background music uploads, ElevenLabs AI voice integration for narration, voice-over recording capability, and multi-track audio support. This transforms silent motion graphics into fully-produced videos with professional audio.

## Problem Statement

**Current Limitations**:
- Videos are completely silent
- No way to add background music
- No narration or voice-over capability
- Missing emotional impact from audio
- Limited use cases without sound

**User Pain Points**:
- "My marketing videos need voice narration"
- "Can't create educational content without voice explanations"
- "Videos feel incomplete without background music"
- "Need different voices for different characters"
- "Want to sync animations with voice timing"

## Requirements

### Functional Requirements

1. **Audio Upload & Library**:
   - Upload MP3, WAV, M4A files
   - Audio file storage in R2
   - Background music library
   - Sound effects collection
   - Audio preview before use

2. **ElevenLabs AI Voice Integration**:
   - Text-to-speech for scene narration
   - Multiple voice options (male/female/accents)
   - Emotion and pacing control
   - Natural language commands
   - Voice preview before generation
   - Sync with text animations

3. **Voice Recording**:
   - Browser-based recording
   - Waveform visualization
   - Basic editing (trim, normalize)
   - Multiple takes support

4. **Multi-Track Audio**:
   - Separate tracks for music/voice/effects
   - Volume mixing controls
   - Fade in/out per track
   - Track muting/soloing
   - Master volume control

5. **Timeline Integration**:
   - Audio waveform display
   - Precise timing control
   - Sync points with animations
   - Audio scrubbing

### Non-Functional Requirements
- <2 second voice generation time
- Support audio files up to 50MB
- Real-time audio preview
- Smooth playback without glitches
- Export with proper audio sync

## Technical Design

### Database Schema
```sql
-- Audio assets table
CREATE TABLE audio_assets (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) CHECK (type IN ('music', 'voiceover', 'ai-voice', 'sfx')),
  source VARCHAR(50) CHECK (source IN ('upload', 'elevenlabs', 'library', 'record')),
  name VARCHAR(255) NOT NULL,
  url TEXT, -- R2 URL for uploads
  duration_ms INTEGER NOT NULL,
  file_size_bytes BIGINT,
  metadata JSONB, -- waveform data, voice settings, etc
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audio tracks in scenes
CREATE TABLE scene_audio_tracks (
  id UUID PRIMARY KEY,
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE,
  audio_asset_id UUID REFERENCES audio_assets(id),
  track_type VARCHAR(50),
  start_time_ms INTEGER DEFAULT 0,
  duration_ms INTEGER,
  volume DECIMAL(3,2) DEFAULT 1.0,
  fade_in_ms INTEGER DEFAULT 0,
  fade_out_ms INTEGER DEFAULT 0,
  settings JSONB, -- pan, effects, etc
  created_at TIMESTAMP DEFAULT NOW()
);

-- ElevenLabs voice presets
CREATE TABLE voice_presets (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  voice_id VARCHAR(255) NOT NULL, -- ElevenLabs voice ID
  settings JSONB, -- stability, similarity, style, etc
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audio_assets_project ON audio_assets(project_id);
CREATE INDEX idx_scene_audio_tracks_scene ON scene_audio_tracks(scene_id);
```

### Audio Track Interface
```typescript
interface AudioTrack {
  id: string;
  type: 'music' | 'voiceover' | 'ai-voice' | 'sfx';
  source: 'upload' | 'elevenlabs' | 'library' | 'record';
  assetId: string;
  url?: string;
  text?: string; // for TTS
  voice?: ElevenLabsVoiceSettings;
  
  // Timing
  startTime: number; // ms
  duration: number; // ms
  
  // Audio settings
  volume: number; // 0-1
  fadeIn?: number; // ms
  fadeOut?: number; // ms
  pan?: number; // -1 to 1
  
  // Visual
  waveform?: number[]; // normalized amplitude data
  color?: string; // for timeline display
}

interface ElevenLabsVoiceSettings {
  voiceId: string;
  modelId?: string;
  stability?: number; // 0-1
  similarityBoost?: number; // 0-1
  style?: number; // 0-1
  useSpeakerBoost?: boolean;
}
```

### API Routes
```typescript
// Audio upload
uploadAudio: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    file: z.any(), // File upload
    type: z.enum(['music', 'voiceover', 'sfx'])
  }))
  .mutation(async ({ input, ctx }) => {
    // Upload to R2
    // Extract audio metadata (duration, waveform)
    // Store in database
  }),

// ElevenLabs TTS
generateVoice: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    text: z.string(),
    voiceId: z.string(),
    settings: z.object({
      stability: z.number().optional(),
      similarityBoost: z.number().optional(),
      style: z.number().optional()
    }).optional()
  }))
  .mutation(async ({ input, ctx }) => {
    // Call ElevenLabs API
    // Stream audio generation
    // Upload result to R2
    // Return audio asset
  }),

// Audio track management
addAudioTrack: protectedProcedure
  .input(z.object({
    sceneId: z.string(),
    audioAssetId: z.string(),
    startTime: z.number(),
    settings: z.object({
      volume: z.number().optional(),
      fadeIn: z.number().optional(),
      fadeOut: z.number().optional()
    }).optional()
  }))
  .mutation(async ({ input, ctx }) => {
    // Add track to scene
    // Update timeline
  })
```

### ElevenLabs Integration
```typescript
class ElevenLabsService {
  private apiKey: string;
  
  async textToSpeech(params: {
    text: string;
    voiceId: string;
    settings?: VoiceSettings;
  }): Promise<ReadableStream> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${params.voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: params.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: params.settings,
        }),
      }
    );
    
    return response.body;
  }
  
  async getVoices(): Promise<Voice[]> {
    // Fetch available voices
    // Cache for performance
  }
}
```

### Audio Processing
```typescript
class AudioProcessor {
  async extractWaveform(audioBuffer: ArrayBuffer): Promise<number[]> {
    // Decode audio
    // Downsample for visualization
    // Normalize amplitude values
    // Return array of peaks
  }
  
  async mixTracks(tracks: AudioTrack[]): Promise<ArrayBuffer> {
    // Load all audio buffers
    // Apply volume and effects
    // Mix into single output
    // Apply master compression
  }
  
  async applyFades(
    buffer: AudioBuffer,
    fadeIn: number,
    fadeOut: number
  ): AudioBuffer {
    // Apply linear/exponential fades
  }
}
```

## Implementation Plan

### Phase 1: Audio Infrastructure (Day 1)
1. Database schema for audio assets
2. R2 upload integration
3. Audio metadata extraction
4. Basic audio player component
5. Waveform visualization

### Phase 2: ElevenLabs Integration (Day 2-3)
1. ElevenLabs API setup
2. Voice selection UI
3. TTS generation flow
4. Voice preview functionality
5. Settings customization
6. Natural language parsing

### Phase 3: Timeline Integration (Day 3-4)
1. Audio track UI in timeline
2. Waveform display
3. Drag-and-drop positioning
4. Volume/fade controls
5. Multi-track support

### Phase 4: Audio Tools (Day 4-5)
1. Voice recording interface
2. Audio library browser
3. Sound effects integration
4. Mixing controls
5. Export with audio

### Phase 5: Polish & Testing (Day 5-6)
1. Sync with animations
2. Performance optimization
3. Error handling
4. User testing
5. Documentation

## UI/UX Considerations

### Audio Panel Design
```
┌─────────────────────────────────────────────────┐
│ Audio                                    [+ Add] │
├─────────────────────────────────────────────────┤
│ 🎵 Background Music          ━━━━━━━━━━━ 🔊 75% │
│    Fade in: 500ms | Fade out: 1000ms           │
├─────────────────────────────────────────────────┤
│ 🎙️ AI Voice (Emma)           ━━━━━━━━━━━ 🔊 100%│
│    "Welcome to our product demo..."             │
├─────────────────────────────────────────────────┤
│ 🎵 Sound Effect              ━━━       🔊 50%   │
│    Swoosh_01.mp3                               │
└─────────────────────────────────────────────────┘
```

### Voice Generation UI
```
┌─────────────────────────────────────────────────┐
│ Generate AI Voice                               │
├─────────────────────────────────────────────────┤
│ Text: [Welcome to our video presentation...]    │
│                                                 │
│ Voice: [Emma - British Female ▼]               │
│                                                 │
│ Settings:                                       │
│ Stability:     ━━━━━━━━━━━ 50%                │
│ Clarity:       ━━━━━━━━━━━ 75%                │
│ Style:         ━━━━━━━━━━━ 30%                │
│                                                 │
│ [Preview] [Generate]                            │
└─────────────────────────────────────────────────┘
```

## Natural Language Commands

Support intuitive audio commands:
- "Add upbeat background music"
- "Create a British female voice reading the title"
- "Add a swoosh sound when the logo appears"
- "Make the voice sound more excited"
- "Fade out music during narration"
- "Add dramatic pause after 'introducing'"

## Testing Strategy

### Unit Tests
- Audio upload and processing
- ElevenLabs API integration
- Waveform generation
- Audio mixing logic

### Integration Tests
- Multi-track synchronization
- Export with audio
- Timeline scrubbing
- Real-time preview

### Performance Tests
- Large audio file handling
- Multiple track playback
- Waveform rendering
- Export time impact

### User Testing
- Voice selection flow
- Audio timing adjustments
- Natural language understanding
- Export quality satisfaction

## Success Metrics

### Quantitative
- 60% of videos include audio within 3 months
- <2 second voice generation time
- 90% successful audio exports
- 50% reduction in silent video exports

### Qualitative
- Professional audio quality
- Intuitive audio workflow
- Positive voice variety feedback
- Increased video completion rates

## Migration & Rollback

### Migration
- Feature flag: `enableAudioFeatures`
- Existing videos remain silent
- Gradual UI rollout
- Beta testing with power users

### Rollback
- Disable audio UI components
- Keep audio assets for future
- Export without audio track
- No data loss

## Dependencies

### Internal
- Video timeline system
- R2 storage integration
- Export pipeline
- Natural language processing

### External
- ElevenLabs API subscription
- Audio processing libraries
- Web Audio API support
- FFmpeg for export

## Pricing Considerations

### ElevenLabs Pricing
- $5/month: 10,000 characters
- $22/month: 100,000 characters
- $99/month: 500,000 characters
- Need usage tracking and limits

### Storage Costs
- R2: $0.015 per GB/month
- Average audio: 5MB per minute
- Need retention policies

## Risks & Mitigations

### Risk 1: Audio Sync Issues
**Mitigation**: Precise timing system, frame-accurate sync, extensive testing

### Risk 2: ElevenLabs API Limits
**Mitigation**: Implement caching, usage quotas, queue system for generation

### Risk 3: Browser Compatibility
**Mitigation**: Web Audio API polyfills, fallback options, format conversion

### Risk 4: Large File Handling
**Mitigation**: Chunked uploads, compression, streaming playback

## Future Enhancements

1. **Advanced Audio Effects**:
   - Reverb, echo, filters
   - Audio ducking
   - Noise reduction
   - Dynamic range compression

2. **Music Library**:
   - Royalty-free music collection
   - AI music generation
   - Mood-based selection
   - Beat matching

3. **Voice Cloning**:
   - Custom voice creation
   - Brand voice consistency
   - Multiple languages
   - Voice morphing

4. **Audio Analytics**:
   - Engagement tracking
   - Optimal volume analysis
   - Voice clarity scoring
   - Music mood matching

## References

- ElevenLabs API Documentation
- Web Audio API Specification
- Remotion audio documentation
- Professional video editing audio workflows
- Descript audio features