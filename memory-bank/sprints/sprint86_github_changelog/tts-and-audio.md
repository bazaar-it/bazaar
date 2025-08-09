# Audio & Voiceover (8s videos)

## Script
- 8 seconds → 2–3 short sentences max. Keep verbs active; avoid jargon.

## TTS options
- Amazon Polly, Google Cloud TTS, ElevenLabs as premium.
- Generate ~8s WAV/MP3; normalize -14 LUFS; trim silence.

## Muxing
- If renderer doesn’t accept audio input, mux with FFmpeg post-render.
- Keep 30fps; AAC audio at 128–160 kbps.

## Fallbacks
- If VO disabled, use kinetic text + subtle UI callouts. Always generate captions.
