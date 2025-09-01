# Sprint 105: Advanced Audio Waveform Improvements

## Overview
This document outlines 10 advanced improvements to enhance the audio waveform visualization in TimelinePanel. These go beyond basic waveform display to provide professional-grade audio intelligence and editing capabilities.

---

## 1. Spectral Frequency Display

### Concept
Overlay frequency spectrum data as a color heat map directly on the waveform, providing instant visual feedback about the audio's tonal characteristics.

### Technical Implementation
```typescript
// Use Web Audio API's AnalyserNode for FFT
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const frequencyData = new Uint8Array(analyser.frequencyBinCount);

// Map frequency bins to colors
const getFrequencyColor = (freq: number) => {
  if (freq < 250) return 'hsl(0, 70%, 50%)';    // Red for bass
  if (freq < 2000) return 'hsl(120, 70%, 50%)'; // Green for mids  
  if (freq < 8000) return 'hsl(200, 70%, 50%)'; // Blue for highs
  return 'hsl(280, 70%, 50%)';                   // Purple for air
};
```

### Visual Design
- Bass frequencies (20-250Hz): Red gradient
- Mid frequencies (250-2kHz): Green/yellow gradient
- High frequencies (2-8kHz): Blue gradient
- Air frequencies (8kHz+): Purple gradient
- Overlay with 40% opacity to maintain waveform visibility

### Benefits
- Instantly identify frequency buildups
- Spot missing frequency ranges
- Visual EQ guidance for audio mixing
- Identify dialogue vs music vs effects

---

## 2. RMS vs Peak Dual Display

### What It Does
Currently, you show **peak values** (the maximum amplitude at each point). This shows transients well but doesn't represent how "loud" audio actually sounds to humans.

**RMS (Root Mean Square)** calculates the average power over a time window - this matches human perception of loudness. Professional DAWs show both:
- **Peaks**: Thin outline showing maximum values (headroom)
- **RMS**: Filled area showing perceived loudness

### Visual Example
```
CURRENT (Peak only):
│    ╱\    ╱\    │  <- Just shows spikes
│   ╱  \  ╱  \   │
│  ╱    \╱    \  │

WITH RMS + Peak:
│    ╱\    ╱\    │  <- Peak outline (transients)
│   ╱██\  ╱██\   │  <- RMS filled (loudness)
│  ╱████\╱████\  │
```

### Benefits
- **See true loudness** - RMS shows what listeners actually hear
- **Identify over-compression** - If RMS fills entire peak area = no dynamics
- **Better mixing decisions** - Can see if audio is too quiet/loud perceptually
- **Professional standard** - This is how Pro Tools, Logic, Premiere show audio
- **Spot problems** - Easily see sections that are too quiet or too loud

### Real-World Example
In your current implementation, a drum hit and sustained piano note might look similar (both show peaks). With RMS:
- **Drum hit**: Tall peak, small RMS fill (short loud burst)
- **Piano note**: Medium peak, large RMS fill (sustained loudness)

This instantly tells you the character of the audio without listening.

### Technical Implementation
```typescript
const calculateRMS = (samples: Float32Array, windowSize: number) => {
  const rmsValues = [];
  for (let i = 0; i < samples.length; i += windowSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, samples.length);
    for (let j = i; j < end; j++) {
      sum += samples[j] * samples[j];
    }
    rmsValues.push(Math.sqrt(sum / (end - i)));
  }
  return rmsValues;
};

// Draw dual waveform
const drawDualWaveform = (ctx: CanvasRenderingContext2D) => {
  // Draw peak outline
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
  ctx.stroke(peakPath);
  
  // Fill RMS area
  ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
  ctx.fill(rmsPath);
};
```

### Visual Design
- Peak values: Thin outline stroke (1px)
- RMS values: Filled solid area
- Dynamic range indicator: Gap between peak and RMS
- Color coding: Green (good headroom), Yellow (moderate), Red (limited)

### Benefits
- Better understanding of audio dynamics
- Identify over-compressed audio
- See true loudness vs transient peaks
- Professional mixing standard

---

## 3. Transient Detection Markers

### Concept
Automatically detect and mark transient events (drum hits, vocal onsets, sharp sounds) using onset detection algorithms. Enable snap-to-transient for precise editing.

### Technical Implementation
```typescript
// Spectral flux onset detection
const detectTransients = (audioBuffer: AudioBuffer) => {
  const spectralFlux = [];
  const fftSize = 2048;
  const hopSize = 512;
  
  for (let i = 0; i < audioBuffer.length - fftSize; i += hopSize) {
    const currentSpectrum = getFFT(audioBuffer, i, fftSize);
    const previousSpectrum = getFFT(audioBuffer, i - hopSize, fftSize);
    
    let flux = 0;
    for (let bin = 0; bin < fftSize / 2; bin++) {
      const diff = currentSpectrum[bin] - previousSpectrum[bin];
      if (diff > 0) flux += diff;
    }
    
    spectralFlux.push({ position: i, strength: flux });
  }
  
  // Find peaks in spectral flux
  return findPeaks(spectralFlux, threshold);
};
```

### Visual Design
- Vertical lines at transient positions
- Color intensity based on transient strength
- Optional labels for transient type (kick, snare, vocal)
- Magnetic snapping zone when dragging near transients

### Benefits
- Perfect beat alignment for music
- Precise speech editing at word boundaries
- Automatic beat grid generation
- Professional rhythm editing

---

## 4. WebGL Waveform Rendering

### Concept
Replace Canvas 2D API with WebGL for GPU-accelerated rendering, enabling smooth interaction with massive waveforms and real-time effects.

### Technical Implementation
```typescript
// WebGL shader for waveform rendering
const vertexShader = `
  attribute vec2 position;
  attribute float amplitude;
  uniform mat3 transform;
  varying float vAmplitude;
  
  void main() {
    vAmplitude = amplitude;
    vec3 transformed = transform * vec3(position, 1.0);
    gl_Position = vec4(transformed.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  varying float vAmplitude;
  uniform vec3 color;
  
  void main() {
    float alpha = smoothstep(0.0, 1.0, vAmplitude);
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

// Initialize WebGL
const initWebGL = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl2');
  const program = createShaderProgram(gl, vertexShader, fragmentShader);
  
  // Create vertex buffer for waveform points
  const vertices = new Float32Array(waveformData.length * 2);
  // ... populate vertices
  
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
};
```

### Performance Benefits
- 60fps smooth scrolling/zooming even with 1M+ samples
- Real-time glow, blur, shadow effects
- Efficient batch rendering of multiple waveforms
- GPU-based interpolation for smooth curves

### Visual Enhancements
- Antialiased smooth waveforms
- Gradient fills with GPU shaders
- Real-time zoom without recalculation
- Smooth transitions and animations

---

## 5. Progressive Resolution Loading

### Concept
Load waveform data at multiple resolutions, streaming higher detail as needed. Store pre-computed levels in IndexedDB for instant access.

### Technical Implementation
```typescript
interface WaveformMipmap {
  level0: Float32Array;  // 100 points - overview
  level1: Float32Array;  // 1,000 points - normal
  level2: Float32Array;  // 10,000 points - detailed
  level3: Float32Array;  // 100,000 points - fine
}

class WaveformCache {
  private db: IDBDatabase;
  
  async getWaveform(audioUrl: string, level: number): Promise<Float32Array> {
    // Check IndexedDB cache
    const cached = await this.db.get('waveforms', `${audioUrl}_${level}`);
    if (cached) return cached;
    
    // Generate and cache if not found
    const waveform = await this.generateLevel(audioUrl, level);
    await this.db.put('waveforms', waveform, `${audioUrl}_${level}`);
    return waveform;
  }
  
  private async generateLevel(url: string, level: number) {
    const targetSamples = Math.pow(10, level + 2);
    // Downsample or upsample as needed
    return this.processAudio(url, targetSamples);
  }
}
```

### Loading Strategy
1. **Initial Load**: Show level 0 (100 points) immediately
2. **Background Load**: Fetch level 1 (1K points) asynchronously
3. **Zoom Trigger**: Load level 2 when zoom > 150%
4. **Detail Mode**: Load level 3 when zoom > 300%

### Benefits
- Instant initial display
- No lag when zooming out (lower res ready)
- Efficient memory usage (only load needed detail)
- Persistent cache across sessions

---

## 6. Virtual Scrolling for Long Audio

### Concept
Implement windowing technique to only render the visible portion of the waveform plus a small buffer, similar to react-window for lists.

### Technical Implementation
```typescript
class VirtualWaveform {
  private visibleRange: { start: number; end: number };
  private buffer = 0.2; // 20% buffer on each side
  
  updateVisibleRange(scrollLeft: number, viewportWidth: number, totalWidth: number) {
    const startRatio = scrollLeft / totalWidth;
    const endRatio = (scrollLeft + viewportWidth) / totalWidth;
    
    // Add buffer
    const bufferSize = (endRatio - startRatio) * this.buffer;
    this.visibleRange = {
      start: Math.max(0, startRatio - bufferSize),
      end: Math.min(1, endRatio + bufferSize)
    };
  }
  
  render(ctx: CanvasRenderingContext2D, waveformData: Float32Array) {
    const startIndex = Math.floor(this.visibleRange.start * waveformData.length);
    const endIndex = Math.ceil(this.visibleRange.end * waveformData.length);
    
    // Only process and render visible samples
    const visibleData = waveformData.slice(startIndex, endIndex);
    this.drawWaveform(ctx, visibleData, startIndex);
  }
}
```

### Performance Metrics
- 1-hour audio: Renders in <16ms (from 500ms)
- Memory usage: Reduced by 90% for viewport
- Smooth 60fps scrolling regardless of audio length
- Instant zoom response

---

## 7. Scrub Preview with Audio Feedback

### Concept
Play audio in real-time while dragging the playhead, with variable speed based on drag velocity. Similar to "scrubbing" in professional video editors.

### Technical Implementation
```typescript
class AudioScrubber {
  private audioContext: AudioContext;
  private bufferSource: AudioBufferSourceNode | null;
  private scrubSpeed = 1;
  private lastPosition = 0;
  
  startScrub(audioBuffer: AudioBuffer, position: number) {
    this.stopCurrentPlayback();
    
    // Create granular synthesis for smooth scrubbing
    this.bufferSource = this.audioContext.createBufferSource();
    this.bufferSource.buffer = audioBuffer;
    this.bufferSource.playbackRate.value = this.scrubSpeed;
    
    // Use small grains for smooth scrubbing
    const grainSize = 0.05; // 50ms grains
    this.bufferSource.loop = true;
    this.bufferSource.loopStart = position;
    this.bufferSource.loopEnd = position + grainSize;
    
    this.bufferSource.connect(this.audioContext.destination);
    this.bufferSource.start();
  }
  
  updateScrub(newPosition: number, deltaTime: number) {
    // Calculate scrub speed from drag velocity
    const distance = Math.abs(newPosition - this.lastPosition);
    this.scrubSpeed = Math.min(3, distance / deltaTime);
    
    if (this.bufferSource) {
      this.bufferSource.playbackRate.value = this.scrubSpeed;
      this.bufferSource.loopStart = newPosition;
      this.bufferSource.loopEnd = newPosition + 0.05;
    }
    
    this.lastPosition = newPosition;
  }
}
```

### User Experience
- Drag slowly: Hear audio at 0.25x-0.5x speed
- Drag normal: Hear audio at 1x speed
- Drag fast: Hear audio at 2x-3x speed
- Release: Resume normal playback or pause

### Benefits
- Find specific words/sounds by ear
- Musical beat matching by feel
- Precise edit points without looking at waveform
- Professional editing workflow

---

## 8. Smart Grid Snapping with Beat Detection

### Concept
Analyze audio for tempo and rhythm patterns, then provide intelligent snapping to musical beats or speech pauses.

### Technical Implementation
```typescript
class BeatDetector {
  async detectTempo(audioBuffer: AudioBuffer): Promise<{bpm: number, beats: number[]}> {
    // Use onset detection for beat positions
    const onsets = this.detectOnsets(audioBuffer);
    
    // Autocorrelation for tempo detection
    const intervals = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i-1]);
    }
    
    // Find most common interval (the beat)
    const tempo = this.findTempo(intervals);
    
    // Generate beat grid
    const beats = this.generateBeatGrid(tempo.bpm, audioBuffer.duration);
    
    return { bpm: tempo.bpm, beats };
  }
  
  private findTempo(intervals: number[]): {bpm: number} {
    // Histogram of intervals
    const histogram = new Map<number, number>();
    const tolerance = 0.03; // 30ms tolerance
    
    intervals.forEach(interval => {
      const rounded = Math.round(interval / tolerance) * tolerance;
      histogram.set(rounded, (histogram.get(rounded) || 0) + 1);
    });
    
    // Find peak in histogram
    const mostCommon = [...histogram.entries()]
      .sort((a, b) => b[1] - a[1])[0][0];
    
    const bpm = 60 / mostCommon;
    return { bpm: Math.round(bpm) };
  }
}
```

### Grid Display
- Vertical lines at beat positions
- Stronger lines for measures (every 4 beats)
- Adjustable grid strength (1/4, 1/8, 1/16 notes)
- Toggle between musical and timecode grid

### Snapping Behavior
- Magnetic attraction within 5% of beat
- Stronger attraction to downbeats
- Shift key to temporarily disable snapping
- Visual feedback when snapped to grid

---

## 9. Adaptive Waveform Normalization

### What It Does
Currently, your waveform displays audio at a fixed scale. If you have a quiet section followed by a loud section, the quiet part looks almost flat - making it hard to see any detail.

**Adaptive normalization** dynamically adjusts the waveform height based on what's currently visible on screen. It finds the loudest peak in the visible area and scales everything relative to that peak.

### Visual Example
```
BEFORE (Fixed Scale):
Quiet section:  ___-_-___  (barely visible)
Loud section:   ▆▇█▇▆▇█▇▆  (fills height)

AFTER (Adaptive):
Quiet section:  ▃▅▇▅▃▅▇▅▃  (scaled up to be visible)
Loud section:   ▆▇█▇▆▇█▇▆  (still fills height)
```

### Benefits
- **See details in quiet audio** - Dialogue and quiet moments become visible
- **Maintain relative dynamics** - Loud parts still look louder than quiet parts within view
- **Better editing precision** - Can see where to cut even in quiet sections
- **No clipping** - Automatically prevents waveform from exceeding canvas bounds

### Technical Implementation
```typescript
class AdaptiveNormalizer {
  private targetHeadroom = 0.1; // 10% headroom
  
  normalizeVisible(
    waveformData: Float32Array,
    visibleStart: number,
    visibleEnd: number
  ): {data: Float32Array, scale: number} {
    // Find peak in visible range
    let maxAmplitude = 0;
    for (let i = visibleStart; i < visibleEnd; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(waveformData[i]));
    }
    
    // Calculate scale factor
    const scale = maxAmplitude > 0 
      ? (1 - this.targetHeadroom) / maxAmplitude 
      : 1;
    
    // Apply logarithmic scaling for better dynamic range
    const logScale = Math.log10(scale + 1) / Math.log10(2);
    
    // Smooth transition to prevent jumps
    const smoothedScale = this.smoothTransition(this.lastScale, logScale);
    
    // Apply normalization
    const normalized = new Float32Array(visibleEnd - visibleStart);
    for (let i = 0; i < normalized.length; i++) {
      normalized[i] = waveformData[visibleStart + i] * smoothedScale;
    }
    
    this.lastScale = smoothedScale;
    return { data: normalized, scale: smoothedScale };
  }
  
  private smoothTransition(oldScale: number, newScale: number): number {
    // Exponential smoothing
    const alpha = 0.3;
    return oldScale * (1 - alpha) + newScale * alpha;
  }
}
```

### Visual Feedback
- Scale indicator showing current normalization level
- Smooth transitions when zooming/scrolling
- Optional "AGC" (Automatic Gain Control) indicator
- Peak level meters showing true vs normalized levels

### Benefits
- Always see waveform detail regardless of level
- Maintain relative dynamics within view
- No clipping or distortion of display
- Better visibility for quiet dialogue sections

---

## 10. Multi-Channel & Phase Correlation Display

### Concept
Advanced stereo analysis showing L/R channels separately, Mid/Side processing, and phase correlation for professional mixing decisions.

### Technical Implementation
```typescript
class StereoAnalyzer {
  // Convert L/R to Mid/Side
  toMidSide(left: Float32Array, right: Float32Array) {
    const mid = new Float32Array(left.length);
    const side = new Float32Array(left.length);
    
    for (let i = 0; i < left.length; i++) {
      mid[i] = (left[i] + right[i]) / 2;  // Sum (center)
      side[i] = (left[i] - right[i]) / 2; // Difference (stereo)
    }
    
    return { mid, side };
  }
  
  // Calculate phase correlation
  calculateCorrelation(left: Float32Array, right: Float32Array): number {
    let correlation = 0;
    let leftPower = 0;
    let rightPower = 0;
    
    for (let i = 0; i < left.length; i++) {
      correlation += left[i] * right[i];
      leftPower += left[i] * left[i];
      rightPower += right[i] * right[i];
    }
    
    const denominator = Math.sqrt(leftPower * rightPower);
    return denominator > 0 ? correlation / denominator : 0;
  }
  
  // Generate Lissajous pattern for vectorscope
  generateVectorscope(left: Float32Array, right: Float32Array): Path2D {
    const path = new Path2D();
    const downsample = 100; // Display every 100th sample
    
    for (let i = 0; i < left.length; i += downsample) {
      const x = left[i];  // X-axis is left channel
      const y = right[i]; // Y-axis is right channel
      
      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    
    return path;
  }
}
```

### Display Modes
1. **Dual Channel**: L/R waveforms stacked
2. **Mid/Side**: Center vs stereo information
3. **Correlation Meter**: -1 (out of phase) to +1 (mono)
4. **Vectorscope**: Lissajous pattern showing stereo field

### Visual Design
```
┌─────────────────────────────────────┐
│  Left Channel     ╱╲╱╲╱╲╱╲          │
├─────────────────────────────────────┤
│  Right Channel    ╲╱╲╱╲╱╲╱          │
├─────────────────────────────────────┤
│  Phase: ■■■■■■■□□□ +0.7 (Good)     │
│  Width: ████████░░ 80% Stereo       │
└─────────────────────────────────────┘
```

### Professional Benefits
- Identify phase issues before they cause problems
- Check mono compatibility for broadcast
- Visualize stereo width and balance
- Detect inverted channels or wiring issues
- Essential for mastering and broadcast work

---

## Implementation Priorities

### Phase 1: Performance Foundation (Sprint 105)
1. **WebGL Rendering** (#4) - Core performance upgrade
2. **Progressive Loading** (#5) - Smooth UX at all scales
3. **Virtual Scrolling** (#6) - Handle long recordings

### Phase 2: Professional Features (Sprint 106)
4. **RMS/Peak Display** (#2) - Industry standard visualization
5. **Transient Detection** (#3) - Precision editing
6. **Scrub Preview** (#7) - Audio feedback while editing

### Phase 3: Advanced Analysis (Sprint 107)
7. **Spectral Display** (#1) - Frequency visualization
8. **Beat Detection** (#8) - Musical grid snapping
9. **Adaptive Normalization** (#9) - Smart amplitude scaling
10. **Stereo Analysis** (#10) - Professional mixing tools

---

## Technical Requirements

### Dependencies
```json
{
  "dependencies": {
    "gl-matrix": "^3.4.3",        // WebGL matrix operations
    "dsp.js": "^1.0.0",           // DSP algorithms
    "meyda": "^5.5.0",            // Audio feature extraction
    "peaks.js": "^3.0.0",         // Alternative: BBC waveform library
    "wavesurfer.js": "^7.0.0"    // Alternative: Full-featured library
  }
}
```

### Browser APIs Required
- Web Audio API (all browsers)
- WebGL 2.0 (all modern browsers)
- IndexedDB (for caching)
- OffscreenCanvas (optional, for workers)

### Performance Targets
- Initial render: <100ms
- Zoom/scroll: 60fps
- Scrub response: <16ms
- Cache hit rate: >90%

---

## Testing Strategy

### Unit Tests
- Waveform generation accuracy
- Peak/RMS calculations
- Transient detection precision
- Normalization algorithms

### Integration Tests
- Canvas/WebGL rendering
- Audio playback sync
- Cache persistence
- Memory management

### Performance Tests
- Large file handling (>1GB)
- Zoom/scroll frame rates
- Memory usage over time
- Cache efficiency

### User Experience Tests
- Scrubbing responsiveness
- Visual clarity at all zoom levels
- Grid snapping accuracy
- Cross-browser compatibility

---

## Conclusion

These 10 improvements transform the basic waveform into a professional audio editing interface. The combination of GPU acceleration, intelligent analysis, and advanced visualization provides users with powerful tools for precise audio work while maintaining excellent performance.

The phased approach allows for incremental implementation, with each phase providing immediate value while building toward the complete professional audio editing experience.