# Timeline Audio Waveform Desync — Deep Dive

Date: 2025-09-01
Sprint: 98 — Auto-Fix Analysis & Stabilization

## Summary
Users reported that the audio “waves” in the timeline were not in sync with the actual music playback. Investigation revealed the waveform rendering logic drew the entire audio file instead of the selected segment (start/end), and the canvas backing store sizing caused visual drift. Fixes were applied to align waveform visualization with the audible segment and the playhead.

## Findings
- Segment mismatch: The waveform renderer used `audio.duration` and ignored `startTime`/`endTime`. The audio track container was positioned using the segment, but the waveform itself visualized the beginning of the file, creating visible/aural mismatch.
- Canvas scaling drift: The canvas used a fixed width/height attribute (1200px), while the container width varied with zoom and layout. The browser scaled the bitmap, leading to misalignment and blurriness.
- Redraw gaps: No listener for window resizes; zoom changes triggered redraws, but container size changes could still leave the waveform stale.
- Resolution: 200 samples was too coarse at high zoom, making timing cues look off.

## Changes
File: `src/app/projects/[id]/generate/workspace/panels/TimelinePanel.tsx`

- Segment-aware rendering:
  - Decode audio once and store `decodedAudioDurationRef`.
  - In `drawWaveform`, compute sample indices for `[startTime, endTime]` and draw only that slice.
  - Map the segment samples directly to the canvas width for precise alignment.

- Proper canvas sizing:
  - Match canvas backing store to CSS size using `devicePixelRatio`.
  - Scale context and clear in CSS pixels to avoid drift and keep the waveform crisp.

- Redraw triggers and fidelity:
  - Add window `resize` listener to redraw waveform.
  - Increase generated waveform samples adaptively (up to ~2000) based on canvas width for better detail.

## Result
The waveform now visually matches the audible segment and the playhead position across zoom levels. Beats and transients line up with playback, eliminating the perceived desynchronization.

## Follow-ups (Optional)
- Replace manual canvas logic with a small `useCanvas` utility (handles dpr, resize observer).
- Persist decoded audio duration into state to avoid re-decoding when switching panels.
- Consider precomputing peaks server-side for long files.

