# Audio Peak Frame Detection & Sync Feature

## Overview
Enable users to see audio peaks as frame numbers and reference them in prompts for precise animation timing. When hovering over the audio waveform, display detected peaks with their frame numbers, allowing users to prompt: "Make the button appear at frame 48."

## Core Concept
1. **Detect peaks once** in audio space (seconds)
2. **Map to frames dynamically** based on audio position
3. **Update in real-time** as audio is dragged/repositioned
4. **Integrate with prompts** for precise timing control

---

## Technical Implementation

### 1. Peak Detection Algorithm

```typescript
interface AudioPeaks {
  audioUrl: string;
  peakTimesSeconds: number[];  // Peak positions in audio time
  threshold: number;           // Detection threshold used
  sampleRate: number;          // For reference
}

// Client-side cache to avoid reprocessing
const peaksCache = new Map<string, AudioPeaks>();

const detectAudioPeaks = async (
  audioBuffer: AudioBuffer,
  audioUrl: string
): Promise<AudioPeaks> => {
  // Check cache first
  if (peaksCache.has(audioUrl)) {
    return peaksCache.get(audioUrl)!;
  }

  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Downsample for efficiency (e.g., 100Hz resolution)
  const downsampleRate = 100;
  const windowSize = Math.floor(sampleRate / downsampleRate);
  
  // Moving window peak detection
  const peaks: number[] = [];
  const threshold = 0.7; // Configurable: 70% of max amplitude
  const minPeakDistance = 0.2; // Minimum 200ms between peaks
  
  let lastPeakTime = -minPeakDistance;
  
  for (let i = windowSize; i < channelData.length - windowSize; i += windowSize) {
    // Calculate window RMS for better peak detection
    let sumSquares = 0;
    let maxInWindow = 0;
    
    for (let j = -windowSize; j <= windowSize; j++) {
      const sample = Math.abs(channelData[i + j] || 0);
      sumSquares += sample * sample;
      maxInWindow = Math.max(maxInWindow, sample);
    }
    
    const rms = Math.sqrt(sumSquares / (windowSize * 2));
    const timeInSeconds = i / sampleRate;
    
    // Is this a significant peak?
    if (maxInWindow > threshold && 
        rms > threshold * 0.5 && // RMS check for sustained energy
        timeInSeconds - lastPeakTime >= minPeakDistance) {
      
      // Check if it's a local maximum
      const prevRms = calculateWindowRms(channelData, i - windowSize, windowSize);
      const nextRms = calculateWindowRms(channelData, i + windowSize, windowSize);
      
      if (rms > prevRms && rms > nextRms) {
        peaks.push(timeInSeconds);
        lastPeakTime = timeInSeconds;
      }
    }
  }
  
  const result = {
    audioUrl,
    peakTimesSeconds: peaks,
    threshold,
    sampleRate
  };
  
  // Cache the result
  peaksCache.set(audioUrl, result);
  
  return result;
};
```

### 2. Dynamic Frame Mapping

```typescript
// Map audio-space peaks to timeline frames
const mapPeaksToFrames = (
  audioPeaks: AudioPeaks,
  audioTrack: AudioTrack,
  totalDurationFrames: number
): number[] => {
  const { startTime = 0, endTime, duration } = audioTrack;
  const effectiveEndTime = endTime ?? duration;
  
  return audioPeaks.peakTimesSeconds
    .filter(peakSec => {
      // Only include peaks within the trimmed audio range
      return peakSec >= 0 && peakSec <= (effectiveEndTime - startTime);
    })
    .map(peakSec => {
      // Map to timeline frame
      const timelineSeconds = startTime + peakSec;
      const frame = Math.round(timelineSeconds * FPS);
      return frame;
    })
    .filter(frame => frame >= 0 && frame < totalDurationFrames);
};
```

### 3. UI Integration

#### Hover Detection & Display
```typescript
// In TimelinePanel.tsx
const [hoveredPeaks, setHoveredPeaks] = useState<number[]>([]);
const [peakTooltip, setPeakTooltip] = useState<{
  visible: boolean;
  x: number;
  y: number;
  frames: number[];
}>();

const handleAudioCanvasHover = (e: React.MouseEvent) => {
  if (!audioPeaks || !audioTrack) return;
  
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const progress = x / rect.width;
  
  // Get current mouse position as frame
  const mouseFrame = Math.round(progress * totalDuration);
  
  // Get all peak frames
  const allPeakFrames = mapPeaksToFrames(audioPeaks, audioTrack, totalDuration);
  
  // Find nearby peaks (within 1 second / 30 frames)
  const nearbyPeaks = allPeakFrames.filter(
    frame => Math.abs(frame - mouseFrame) < 30
  );
  
  setPeakTooltip({
    visible: true,
    x: e.clientX,
    y: e.clientY - 60,
    frames: nearbyPeaks
  });
  
  setHoveredPeaks(nearbyPeaks);
};
```

#### Visual Rendering
```typescript
// Draw peak indicators on waveform canvas
const drawPeakIndicators = (
  ctx: CanvasRenderingContext2D,
  peakFrames: number[],
  hoveredFrames: number[]
) => {
  peakFrames.forEach(frame => {
    const x = (frame / totalDuration) * canvasWidth;
    const isHovered = hoveredFrames.includes(frame);
    
    // Draw vertical line
    ctx.strokeStyle = isHovered 
      ? 'rgba(251, 146, 60, 0.8)'  // Bright orange when hovered
      : 'rgba(251, 146, 60, 0.3)'; // Subtle orange normally
    ctx.lineWidth = isHovered ? 2 : 1;
    
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
    
    // Draw dot at peak
    if (isHovered) {
      ctx.fillStyle = 'rgba(251, 146, 60, 1)';
      ctx.beginPath();
      ctx.arc(x, canvasHeight / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw frame number
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${frame}`, x + 5, 12);
    }
  });
};
```

#### Tooltip Component
```tsx
{peakTooltip?.visible && (
  <div 
    className="absolute z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg"
    style={{ 
      left: peakTooltip.x, 
      top: peakTooltip.y,
      pointerEvents: 'none'
    }}
  >
    <div className="text-sm font-medium">
      🎵 Audio Peaks Detected
    </div>
    <div className="text-xs text-gray-300 mt-1">
      Frames: {peakTooltip.frames.join(', ')}
    </div>
    <div className="text-xs text-orange-400 mt-2">
      💡 Try: "Add effect at frame {peakTooltip.frames[0]}"
    </div>
  </div>
)}
```

### 4. Interactive Features

#### Click to Seek
```typescript
const handlePeakClick = (frame: number) => {
  // Move playhead to peak
  setCurrentFrame(frame);
  const event = new CustomEvent('timeline-seek', { 
    detail: { frame }
  });
  window.dispatchEvent(event);
};
```

#### Right-Click Context Menu
```typescript
const handlePeakRightClick = (e: React.MouseEvent, frame: number) => {
  e.preventDefault();
  
  setContextMenu({
    visible: true,
    x: e.clientX,
    y: e.clientY,
    items: [
      {
        label: `Copy "frame ${frame}"`,
        onClick: () => navigator.clipboard.writeText(`frame ${frame}`)
      },
      {
        label: `Insert prompt at frame ${frame}`,
        onClick: () => {
          // Send to ChatPanelG
          const event = new CustomEvent('timeline-insert-prompt', {
            detail: { 
              text: `At frame ${frame}, `,
              focusAfter: true
            }
          });
          window.dispatchEvent(event);
        }
      },
      {
        label: 'Snap scene to this peak',
        onClick: () => snapSceneToPeak(frame)
      }
    ]
  });
};
```

### 5. Chat Integration

```typescript
// In ChatPanelG.tsx
useEffect(() => {
  const handleInsertPrompt = (e: CustomEvent) => {
    const { text, focusAfter } = e.detail;
    
    // Set the message draft
    setMessage(prev => prev + text);
    
    // Focus the input
    if (focusAfter && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  };
  
  window.addEventListener('timeline-insert-prompt', handleInsertPrompt);
  return () => window.removeEventListener('timeline-insert-prompt', handleInsertPrompt);
}, []);
```

### 6. AI Context Enhancement

```typescript
// Inject peak information into prompt context
const enhancePromptWithAudioContext = (userPrompt: string) => {
  const peakFrames = currentPeakFramesRef.current;
  
  // Find references to frames in the prompt
  const frameRegex = /frame\s+(\d+)/gi;
  const mentionedFrames = [...userPrompt.matchAll(frameRegex)]
    .map(match => parseInt(match[1]));
  
  // Find nearest peaks to mentioned frames
  const nearestPeaks = mentionedFrames.map(frame => {
    const nearest = peakFrames.reduce((prev, curr) => 
      Math.abs(curr - frame) < Math.abs(prev - frame) ? curr : prev
    );
    return { requested: frame, nearest };
  });
  
  return {
    prompt: userPrompt,
    audioContext: {
      detectedPeaks: peakFrames,
      nearestPeaks,
      suggestion: nearestPeaks.some(p => p.requested !== p.nearest) 
        ? `Note: Frame ${nearestPeaks[0].requested} is close to audio peak at frame ${nearestPeaks[0].nearest}`
        : null
    }
  };
};
```

## Performance Optimizations

### 1. Caching Strategy
- Cache peaks by `audioUrl` in client memory
- Persist to IndexedDB for cross-session cache
- Invalidate only when audio file changes

### 2. Rendering Optimizations
- Only render peaks in visible viewport
- Adaptive density based on zoom level
- Use requestAnimationFrame for smooth updates

### 3. Computation Efficiency
- Process audio in Web Worker if >5MB
- Downsample before peak detection
- Use WASM for heavy processing (optional)

## User Experience Flow

### Basic Interaction
1. User hovers over audio waveform
2. Sees peak indicators with frame numbers
3. Clicks tooltip suggestion or types: "Add logo at frame 48"
4. System knows frame 48 is an audio peak
5. Animation perfectly syncs with audio

### Advanced Workflow
1. User drags audio left/right
2. Peak frames update automatically
3. User can snap scenes to nearest peaks
4. Multi-select peaks for batch operations
5. Export peak list for external tools

## Configuration Options

```typescript
interface PeakDetectionConfig {
  enabled: boolean;
  threshold: number;        // 0.5 - 0.9
  minPeakDistance: number;  // 0.1 - 0.5 seconds
  visualStyle: 'subtle' | 'prominent' | 'hidden';
  autoSnapToPeaks: boolean;
  showFrameNumbers: boolean;
}
```

## Future Enhancements

### Phase 2: Beat Grid
- Detect regular tempo/BPM
- Show beat grid overlay
- Snap to musical bars/measures

### Phase 3: Frequency-Based Peaks
- Separate bass/mid/treble peaks
- "Add effect on kick drum" (bass peaks)
- "Flash text on hi-hat" (treble peaks)

### Phase 4: AI-Assisted Sync
- Learn user's sync preferences
- Auto-suggest scene timings
- Generate entire timeline from audio

## Implementation Checklist

- [ ] Add peak detection to waveform generation
- [ ] Implement client-side caching system
- [ ] Create peak-to-frame mapping function
- [ ] Add hover UI with frame display
- [ ] Implement click-to-seek on peaks
- [ ] Add right-click context menu
- [ ] Integrate with ChatPanelG for prompts
- [ ] Pass peak context to AI system
- [ ] Add visual indicators on timeline
- [ ] Test with various audio types
- [ ] Add user preferences/toggles
- [ ] Document in user guide

## Success Metrics
- Peak detection accuracy: >90% of perceptible beats
- Frame mapping precision: ±1 frame accuracy
- UI response time: <16ms for hover updates
- Cache hit rate: >95% after first analysis
- User satisfaction: Easier music synchronization

## Risk Mitigation
- Graceful degradation if Web Audio API unavailable
- Fallback to simple threshold detection
- Optional feature toggle if performance issues
- Clear visual feedback when peaks detected