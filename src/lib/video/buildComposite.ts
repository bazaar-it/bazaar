"use client";
// src/lib/video/buildComposite.ts
import { buildCompositeHeader } from './buildCompositeHeader';

export type CompiledScene = {
  code: string;       // wrapped or raw compiled code for the scene
  componentName: string; // name of the component returned by the compiled code
};

export function buildSingleSceneModule(scene: CompiledScene, options?: { includeFontsLoader?: boolean; includeIconFallback?: boolean; includeBulkFontsPreconnect?: boolean; withAudio?: boolean; }) {
  const header = buildCompositeHeader({ includeFontsLoader: options?.includeFontsLoader !== false, includeIconFallback: options?.includeIconFallback !== false });

  // Build with string parts to avoid template-literal interpolation of scene code (${...})
  const parts: string[] = [];
  parts.push(header);
  parts.push(scene.code);
  parts.push(`
// Enhanced Audio helper (single-scene): respects within-file trim and timeline offset
var EnhancedAudio = ({ audioData }) => {
  const { useCurrentFrame, useVideoConfig, interpolate, Sequence, Audio } = window.Remotion;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioOffsetFrames = Math.floor((audioData.startTime || 0) * fps);
  const audioEndFrames = Math.floor((audioData.endTime || audioData.duration || 0) * fps);
  const audioDurationFrames = Math.max(0, audioEndFrames - audioOffsetFrames);
  const videoStartFrame = Math.max(0, Math.floor((audioData.timelineOffsetSec || 0) * fps));
  let volume = typeof audioData.volume === 'number' ? audioData.volume : 1;
  const fadeInFrames = Math.floor((audioData.fadeIn || audioData.fadeInDuration || 0) * fps);
  const fadeOutFrames = Math.floor((audioData.fadeOut || audioData.fadeOutDuration || 0) * fps);
  if (fadeInFrames > 0 && frame < videoStartFrame + fadeInFrames) {
    volume *= interpolate(frame, [videoStartFrame, videoStartFrame + fadeInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  if (fadeOutFrames > 0 && frame > videoStartFrame + audioDurationFrames - fadeOutFrames) {
    volume *= interpolate(frame, [videoStartFrame + audioDurationFrames - fadeOutFrames, videoStartFrame + audioDurationFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  if (typeof Audio === 'undefined' || !Audio) return null;
  return React.createElement(Sequence, { from: videoStartFrame, durationInFrames: audioDurationFrames },
    React.createElement(Audio, { src: audioData.url, startFrom: audioOffsetFrames, volume: volume, playbackRate: audioData.playbackRate || 1, crossOrigin: 'anonymous' })
  );
};

export default function SingleSceneComposition() {
  const projectAudio = window.projectAudio;
  return React.createElement(FontLoader, {},
    React.createElement(window.Remotion.AbsoluteFill, {},
      projectAudio && projectAudio.url && React.createElement(EnhancedAudio, { audioData: projectAudio }),
      React.createElement(${scene.componentName})
    )
  );
}
`);

  return parts.join('\n');
}

export function buildMultiSceneModule(args: { sceneImports: string[]; sceneComponents: string[]; includeFontsLoader?: boolean; includeIconFallback?: boolean; totalDurationInFrames?: number; }) {
  const header = buildCompositeHeader({ includeFontsLoader: args.includeFontsLoader !== false, includeIconFallback: args.includeIconFallback !== false });
  // Build with string parts to avoid template-literal interpolation of scene code (${...})
  const parts: string[] = [];
  parts.push(header);
  parts.push(args.sceneImports.join('\n'));
  parts.push(`
export default function MultiSceneComposition() {
  const projectAudio = window.projectAudio;
  return React.createElement(FontLoader, {},
    React.createElement(window.Remotion.AbsoluteFill, {},
      projectAudio && projectAudio.url && React.createElement((function(){
        // Inline EnhancedAudio with timeline offset + duration bounding + optional loop
        const { useCurrentFrame, useVideoConfig, interpolate, Sequence, Audio } = window.Remotion;
        const TOTAL_FRAMES = ${typeof args.totalDurationInFrames === 'number' ? Math.max(0, Math.floor(args.totalDurationInFrames)) : 'null'};
        return function EA(){
          const frame = useCurrentFrame();
          const { fps } = useVideoConfig();
          const audio = window.projectAudio || {};
          const trimStart = audio.startTime || 0;
          const trimEnd = audio.endTime || audio.duration || 0;
          const trimmedSec = Math.max(0, trimEnd - trimStart);
          const audioOffsetFrames = Math.floor(trimStart * fps);
          const audioEndFrames = Math.floor(trimEnd * fps);
          const audioDurationFrames = Math.max(0, audioEndFrames - audioOffsetFrames);
          const offsetSec = Math.max(0, audio.timelineOffsetSec || 0);
          const videoStartFrame = Math.max(0, Math.floor(offsetSec * fps));
          let seqDurationFrames = audioDurationFrames;
          if (TOTAL_FRAMES !== null) {
            const remaining = Math.max(0, TOTAL_FRAMES - videoStartFrame);
            seqDurationFrames = Math.max(1, Math.min(audioDurationFrames, remaining));
          }
          let volume = typeof audio.volume === 'number' ? audio.volume : 1;
          const fadeInFrames = Math.floor((audio.fadeIn || audio.fadeInDuration || 0) * fps);
          const fadeOutFrames = Math.floor((audio.fadeOut || audio.fadeOutDuration || 0) * fps);
          if (fadeInFrames > 0 && frame < videoStartFrame + fadeInFrames) {
            volume *= interpolate(frame, [videoStartFrame, videoStartFrame + fadeInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          }
          if (fadeOutFrames > 0 && frame > videoStartFrame + seqDurationFrames - fadeOutFrames) {
            volume *= interpolate(frame, [videoStartFrame + seqDurationFrames - fadeOutFrames, videoStartFrame + seqDurationFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          }
          const shouldLoop = (TOTAL_FRAMES !== null) ? (trimmedSec * fps < (TOTAL_FRAMES - videoStartFrame)) : false;
          if (typeof Audio === 'undefined' || !Audio) return null;
          return React.createElement(Sequence, { from: videoStartFrame, durationInFrames: seqDurationFrames },
            React.createElement(Audio, { src: audio.url, startFrom: audioOffsetFrames, volume: volume, playbackRate: audio.playbackRate || 1, loop: shouldLoop, crossOrigin: 'anonymous' })
          );
        };
      })(), {}) ,
      React.createElement(window.Remotion.Series, {},
        ${args.sceneComponents.join(',\n        ')}
      )
    )
  );
}
`);
  return parts.join('\n');
}
