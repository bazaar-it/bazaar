# Audiovisual Synchronization Architecture: Technical Specification

**Document Version:** 1.0  
**Last Updated:** July 22, 2025  
**Session Context:** Sprint 82 Planning - 20:41 CEST

## Executive Summary

This document outlines the technical architecture for implementing advanced audio-visual synchronization in Bazaar-Vid. The system will enable automatic alignment of visual elements with musical events, transforming our platform from manual timing adjustments to intelligent, beat-aware video generation.

## System Architecture

### High-Level Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Audio Upload  │────▶│  DSP Pipeline    │────▶│  Beat Map JSON  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
┌─────────────────┐     ┌──────────────────┐              │
│  User Prompt    │────▶│ Brain + Context  │◀─────────────┘
└─────────────────┘     └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │ Audio-Aware Gen  │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐     ┌─────────────────┐
                        │  Scene Graph     │────▶│ Remotion Render │
                        └──────────────────┘     └─────────────────┘
```

### Component Architecture

#### 1. Audio Processing Service (`/src/server/services/audio/`)

```typescript
interface AudioProcessingService {
  // Main processing pipeline
  processAudio(file: File): Promise<AudioAnalysis>;
  
  // Beat detection algorithms
  detectBeats(audioBuffer: AudioBuffer): BeatMap;
  
  // Waveform generation
  generateWaveform(audioBuffer: AudioBuffer): WaveformData;
  
  // Genre classification
  classifyGenre(features: AudioFeatures): Genre;
}

interface AudioAnalysis {
  beatMap: BeatMap;
  waveform: WaveformData;
  metadata: AudioMetadata;
  features: AudioFeatures;
}

interface BeatMap {
  beats: Beat[];
  tempo: number;
  timeSignature: string;
  sections: MusicSection[];
}
```

#### 2. Beat Detection Pipeline

```typescript
// Spectral Flux Algorithm Implementation
class SpectralFluxDetector {
  private sampleRate: number;
  private fftSize: number = 2048;
  private hopSize: number = 512;
  
  detectOnsets(audioBuffer: AudioBuffer): number[] {
    // 1. Apply window function
    // 2. Compute FFT
    // 3. Calculate spectral flux
    // 4. Peak picking with adaptive threshold
    // 5. Return onset times
  }
}

// Onset Strength with Complex Domain
class OnsetStrengthDetector {
  detectOnsets(audioBuffer: AudioBuffer): number[] {
    // 1. STFT computation
    // 2. Phase deviation calculation
    // 3. Magnitude increase detection
    // 4. Combine phase and magnitude
    // 5. Peak detection
  }
}

// Ensemble Method
class EnsembleBeatDetector {
  detectors: BeatDetector[] = [
    new SpectralFluxDetector(),
    new OnsetStrengthDetector(),
    new TemporalPatternDetector()
  ];
  
  detect(audioBuffer: AudioBuffer): BeatMap {
    // Run all detectors
    // Aggregate results with voting
    // Refine with tempo tracking
    // Quantize to 30fps grid
  }
}
```

#### 3. Waveform Visualization Component

```typescript
// React component for GPU-accelerated waveform
const WaveformVisualizer: React.FC<WaveformProps> = ({ 
  audioUrl, 
  beatMap,
  currentFrame 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>();
  const webglContext = useWebGL(canvasRef);
  
  useEffect(() => {
    // Initialize WebGL shaders
    // Upload waveform data to GPU
    // Render with requestAnimationFrame
  }, [audioUrl]);
  
  return (
    <canvas 
      ref={canvasRef}
      className="waveform-canvas"
      width={1920}
      height={200}
    />
  );
};
```

#### 4. Audio-Reactive Scene Mutations

```typescript
// Middleware for scene graph mutations
class AudioReactiveMiddleware {
  private beatMap: BeatMap;
  private sceneGraph: SceneGraph;
  
  applyBeatSync(scenes: Scene[]): Scene[] {
    return scenes.map(scene => {
      // Find nearest beat to scene start
      const nearestBeat = this.findNearestBeat(scene.startFrame);
      
      // Adjust scene timing
      if (this.shouldSnapToBeat(scene, nearestBeat)) {
        scene.startFrame = nearestBeat.frame;
      }
      
      // Add beat-triggered animations
      scene.animations = this.injectBeatAnimations(
        scene.animations, 
        this.beatMap
      );
      
      return scene;
    });
  }
  
  injectBeatAnimations(animations: Animation[], beatMap: BeatMap): Animation[] {
    // Add scale pulses on kicks
    // Add color shifts on snares
    // Add position bounces on hi-hats
  }
}
```

#### 5. Context Enhancement for AI

```typescript
// Extend brain context with audio information
interface AudioEnhancedContext extends Context {
  audio?: {
    hasAudio: boolean;
    beatMap?: BeatMap;
    genre?: Genre;
    tempo?: number;
    energy?: EnergyProfile;
    sections?: MusicSection[];
  };
}

// Update context builder
class ContextBuilder {
  async buildContext(
    project: Project, 
    audioAnalysis?: AudioAnalysis
  ): Promise<AudioEnhancedContext> {
    const baseContext = await this.buildBaseContext(project);
    
    if (audioAnalysis) {
      return {
        ...baseContext,
        audio: {
          hasAudio: true,
          beatMap: audioAnalysis.beatMap,
          genre: audioAnalysis.metadata.genre,
          tempo: audioAnalysis.beatMap.tempo,
          energy: this.calculateEnergyProfile(audioAnalysis),
          sections: audioAnalysis.beatMap.sections
        }
      };
    }
    
    return baseContext;
  }
}
```

### Database Schema Extensions

```sql
-- Audio metadata storage
CREATE TABLE audio_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  beat_map JSONB NOT NULL,
  waveform_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_audio_analysis_project ON audio_analysis(project_id);

-- Cached beat detection results
CREATE TABLE beat_cache (
  audio_hash VARCHAR(64) PRIMARY KEY,
  beat_map JSONB NOT NULL,
  algorithm_version VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

```typescript
// tRPC router for audio operations
export const audioRouter = createTRPCRouter({
  // Upload and analyze audio
  uploadAudio: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      audioFile: z.instanceof(File)
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Upload to R2
      // 2. Queue analysis job
      // 3. Return upload status
    }),
  
  // Get audio analysis results
  getAnalysis: protectedProcedure
    .input(z.object({
      projectId: z.string()
    }))
    .query(async ({ input, ctx }) => {
      // Return cached analysis
    }),
  
  // Manual beat adjustment
  adjustBeat: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      beatIndex: z.number(),
      newFrame: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      // Update beat position
      // Recalculate affected scenes
    })
});
```

### Performance Optimizations

#### 1. Caching Strategy
```typescript
class BeatMapCache {
  private cache = new Map<string, BeatMap>();
  private lru = new LRUCache<string, BeatMap>({ max: 100 });
  
  async get(audioHash: string): Promise<BeatMap | null> {
    // Check memory cache
    if (this.cache.has(audioHash)) {
      return this.cache.get(audioHash);
    }
    
    // Check LRU cache
    if (this.lru.has(audioHash)) {
      return this.lru.get(audioHash);
    }
    
    // Check database
    const cached = await db.query.beatCache.findFirst({
      where: eq(beatCache.audioHash, audioHash)
    });
    
    if (cached) {
      this.lru.set(audioHash, cached.beatMap);
      return cached.beatMap;
    }
    
    return null;
  }
}
```

#### 2. WebWorker Processing
```typescript
// Offload heavy computation to WebWorker
class AudioWorker {
  private worker: Worker;
  
  constructor() {
    this.worker = new Worker('/workers/audio-processor.js');
  }
  
  async processAudio(audioBuffer: AudioBuffer): Promise<AudioAnalysis> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({
        type: 'PROCESS_AUDIO',
        audioData: audioBuffer.getChannelData(0),
        sampleRate: audioBuffer.sampleRate
      });
      
      this.worker.onmessage = (e) => {
        if (e.data.type === 'ANALYSIS_COMPLETE') {
          resolve(e.data.analysis);
        }
      };
    });
  }
}
```

### Error Handling & Fallbacks

```typescript
class AudioSyncService {
  async syncToAudio(scenes: Scene[], beatMap?: BeatMap): Promise<Scene[]> {
    try {
      if (!beatMap) {
        // Fallback: Use amplitude-based sync
        return this.amplitudeBasedSync(scenes);
      }
      
      // Primary: Beat-based sync
      return this.beatBasedSync(scenes, beatMap);
    } catch (error) {
      console.error('Audio sync failed:', error);
      
      // Ultimate fallback: Return original scenes
      return scenes;
    }
  }
  
  private amplitudeBasedSync(scenes: Scene[]): Scene[] {
    // Simple energy-based transitions
    // Less accurate but always works
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Days 1-5)
- Set up audio upload pipeline
- Implement basic waveform visualization
- Create database schema
- Build caching infrastructure

### Phase 2: Beat Detection (Days 6-10)
- Implement spectral flux algorithm
- Add onset strength detection
- Create ensemble voting system
- Build WebWorker for processing

### Phase 3: Integration (Days 11-15)
- Connect to scene generation
- Update AI prompts
- Implement scene mutations
- Add preview synchronization

### Phase 4: Polish (Days 16-20)
- Performance optimization
- Cross-browser testing
- User controls UI
- Documentation

## Testing Strategy

### Unit Tests
```typescript
describe('BeatDetection', () => {
  it('should detect beats in 4/4 time signature', async () => {
    const audioBuffer = await loadTestAudio('4-4-beat.mp3');
    const beats = detector.detectBeats(audioBuffer);
    
    expect(beats.length).toBeGreaterThan(0);
    expect(beats[0].confidence).toBeGreaterThan(0.8);
  });
  
  it('should handle edge cases', async () => {
    const silentBuffer = createSilentBuffer(10); // 10 seconds
    const beats = detector.detectBeats(silentBuffer);
    
    expect(beats.length).toBe(0);
  });
});
```

### Integration Tests
- Test full pipeline from upload to render
- Verify beat sync accuracy
- Test performance under load
- Cross-genre validation

### Performance Benchmarks
- Beat detection: < 2s for 3-minute song
- Waveform render: 60fps scrolling
- Preview update: < 100ms latency
- Memory usage: < 200MB peak

## Security Considerations

1. **File Validation**: Verify audio file types and sizes
2. **Processing Limits**: Rate limit analysis requests
3. **Storage Quotas**: Implement per-user audio limits
4. **Sanitization**: Clean metadata before storage

## Future Enhancements

1. **Advanced Features**
   - Multi-track synchronization
   - MIDI import support
   - Real-time audio input
   - Stem separation

2. **AI Improvements**
   - Genre-specific generation prompts
   - Mood-based scene selection
   - Lyric synchronization
   - Musical structure awareness

3. **Professional Tools**
   - Manual beat grid editing
   - Tempo mapping
   - Crossfade detection
   - DJ-style beat matching

---

**Note**: This architecture is designed for scalability and performance while maintaining the simplicity that makes Bazaar-Vid accessible to non-technical users. The modular approach allows for incremental implementation and testing.