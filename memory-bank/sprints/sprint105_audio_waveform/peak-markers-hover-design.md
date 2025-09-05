# Audio Peak Markers in Timeline — Hover + Prompt Integration

Date: 2025-09-01
Sprint: 105 — Audio Waveform Improvements
Owner: Timeline/Preview

## Summary
Add lightweight, timeline-aware “peak markers” for project audio that:
- Show detected peak frames when hovering the waveform
- Let users jump the playhead to a peak or insert a prefilled prompt referencing that exact frame
- Recompute peak-frame mapping instantly when the audio segment is moved/trimmed (no re-extraction)
- Keep detection fast by caching analysis per `audioUrl` and mapping peaks at render time

This is a quick, high-value step toward music-synced authoring without backend changes.

## Goals
- Precise timing: Users can say “Make X happen at frame N” where N is a detected beat/peak
- Dynamic mapping: Peaks update visually as audio `startTime`/`endTime` move
- Low overhead: One-time peak extraction per URL; simple mapping on hover/render
- Frictionless prompting: One click to prefill a chat prompt at an exact frame

## Architecture Overview
- Peak extraction in audio space (seconds) from the decoded buffer
  - Store `peaksSec: number[]` keyed by `audioUrl` in a client cache (Map)
  - Downsample + simple moving-average smoothing + local maxima + min spacing + threshold
- Timeline mapping
  - Convert peaks to frames using `frame = round((audio.startTime + peakSec) * FPS)`
  - Filter to `[0, totalVideoDuration]` and within `[startTime, endTime]`
  - No re-extraction on drag/trim — only remap
- UI interactions
  - On hover: show small orange tick markers and a tooltip with nearby peaks
  - Click a marker: jump playhead to that frame
  - Right‑click a marker: quick actions (Copy frame, Insert prompt at frame)
- Prompt integration
  - Dispatch `timeline-insert-prompt` CustomEvent with `{ frame, text }`
  - `ChatPanelG` listens, pre-fills composer, focuses input

## Data Flow
1) Decode (existing): Timeline already decodes audio for waveform
2) Extract peaks (new, once per URL)
   - Cache: `peaksCache.get(audioUrl)`
   - If missing: run `extractPeaks(buffer)` → `peaksSec[]`, store in cache
3) Map on render/hover
   - `peaksFrames = peaksSec.map(sec => round((audio.startTime + sec)*FPS))`
   - Filter to video duration and audio segment window
4) Interactions
   - Hover: compute nearby frames around mouse frame; tooltip shows list
   - Click: set playhead + dispatch `timeline-seek`
   - Right‑click: context menu → “Insert prompt at frame N” → dispatch `timeline-insert-prompt`

## Peak Extraction (Fast Path)
- Inputs: `audioBuffer.getChannelData(0)`
- Steps:
  - Downsample to ~2–4 kHz equivalent for speed (or use existing resampled waveform)
  - Rectify → moving average (window ~10–20 ms) → threshold
  - Local maxima (prev < curr > next) above threshold
  - Enforce min spacing (e.g., 180 ms) to avoid clustered peaks
- Output: `peaksSec: number[]` (audio time), not frames
- Cache: `Map<string, number[]>` by `audioUrl`

## UI/UX Details
- Markers: thin orange ticks overlaid on waveform; density limited by zoom and viewport
- Tooltip on hover (if peaks exist near cursor):
  - Title: “Audio Peaks Detected”
  - Content: frames list (e.g., 35, 48, 72) and quick-hint copy
- Interactions:
  - Click tick: seek to frame
  - Right‑click tick: menu
    - “Copy frame N” (clipboard)
    - “Insert prompt at frame N…” (fires event with prefilled text)
- Accessibility: Tooltip disappears on mouse leave; markers hidden if no peaks

## Events
- `timeline-insert-prompt` (detail: `{ frame: number, text: string }`)
  - Consumption: `ChatPanelG` pre-fills composer with `text`, focuses input
- `timeline-seek` (existing) for playhead jump

## Pseudocode
```
// Cache
const peaksCache = new Map<string, number[]>(); // url -> peaksSec[]

function extractPeaks(buffer: AudioBuffer): number[] {
  const data = buffer.getChannelData(0);
  // downsample + rectify + smooth + local maxima + min spacing → peaksSec[]
  return peaksSec;
}

function getPeaksForUrl(url, buffer) {
  if (peaksCache.has(url)) return peaksCache.get(url)!;
  const peaks = extractPeaks(buffer);
  peaksCache.set(url, peaks);
  return peaks;
}

function mapPeaksToFrames(peaksSec, audio, FPS, totalFrames) {
  const start = audio.startTime || 0;
  const end = audio.endTime ?? audio.duration;
  return peaksSec
    .map(sec => Math.round((start + sec) * FPS))
    .filter(f => f >= 0 && f <= totalFrames && (f/FPS) >= start && (f/FPS) <= end);
}

// Hover
onAudioHover(e) {
  const peaksSec = getPeaksForUrl(audio.url, decodedBuffer);
  const peaksFrames = mapPeaksToFrames(peaksSec, audio, FPS, totalDuration);
  const mouseFrame = getFrameFromMouse(e);
  const nearby = peaksFrames.filter(f => Math.abs(f - mouseFrame) < FPS);
  showTooltip(nearby, e.clientX, e.clientY);
}

// Click marker
onPeakClick(frame) {
  dispatch('timeline-seek', { frame });
}

// Right‑click marker
onPeakContext(frame) {
  const text = `Make the button appear exactly at frame ${frame}`;
  dispatch('timeline-insert-prompt', { frame, text });
}
```

## Performance
- Peak extraction runs once per `audioUrl` and is O(n) on a downsampled array
- Marker rendering is limited by zoom/viewport
- No DB writes; all client-side

## Rollout Plan
1) Implement cache + extraction + basic markers and tooltip
2) Add playhead jump + “Insert prompt at frame N” event to chat
3) Add density control (max markers in view) and zoom-aware filtering
4) Optional: add RMS overlay and/or faint vertical lines (configurable toggle)

## Acceptance Criteria
- Hovering the audio shows peak indicators and a tooltip with nearby frames
- Clicking a peak jumps to that frame; right‑click can insert a prefilled prompt
- Dragging/trimming the audio updates displayed peak frames immediately
- No noticeable latency or frame drops while hovering

## Future Extensions
- Server-side peak precomputation/caching for long files
- Spectral view (FFT) overlay (worker-based, optional)
- Multi-track audio model with separate per-track peaks

References
- See sprint docs: `timeline-audio-waveform-desync.md`, `feasibility-analysis.md`, `advanced-waveform-improvements.md`

