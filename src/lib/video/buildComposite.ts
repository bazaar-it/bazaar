"use client";
// src/lib/video/buildComposite.ts
import { buildCompositeHeader } from './buildCompositeHeader';

export type CompiledScene = {
  code: string;       // wrapped or raw compiled code for the scene
  componentName: string; // name of the component returned by the compiled code
};

export function buildSingleSceneModule(scene: CompiledScene, options?: { includeFontsLoader?: boolean; includeIconFallback?: boolean; includeBulkFontsPreconnect?: boolean; withAudio?: boolean; }) {
  const header = buildCompositeHeader({ includeFontsLoader: options?.includeFontsLoader !== false, includeIconFallback: options?.includeIconFallback !== false });

  // Minimal single scene composition with qualified Remotion globals
  const module = `
${header}
${scene.code}

// Enhanced Audio helper
var EnhancedAudio = ({ audioData }) => {
  const { useCurrentFrame, interpolate, Sequence, Audio } = window.Remotion;
  const frame = useCurrentFrame();
  const videoStartFrame = 0;
  const audioOffsetFrames = Math.floor((audioData.startTime || 0) * 30);
  const audioEndFrames = Math.floor((audioData.endTime || audioData.duration || 0) * 30);
  const audioDurationFrames = audioEndFrames - audioOffsetFrames;
  let volume = typeof audioData.volume === 'number' ? audioData.volume : 1;
  const fadeInFrames = Math.floor((audioData.fadeIn || 0) * 30);
  const fadeOutFrames = Math.floor((audioData.fadeOut || 0) * 30);
  if (fadeInFrames > 0 && frame < videoStartFrame + fadeInFrames) {
    volume *= interpolate(frame, [videoStartFrame, videoStartFrame + fadeInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  if (fadeOutFrames > 0 && frame > videoStartFrame + audioDurationFrames - fadeOutFrames) {
    volume *= interpolate(frame, [videoStartFrame + audioDurationFrames - fadeOutFrames, videoStartFrame + audioDurationFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  if (typeof Audio === 'undefined' || !Audio) return null;
  return React.createElement(Sequence, { from: videoStartFrame, durationInFrames: audioDurationFrames },
    React.createElement(Audio, { src: audioData.url, startFrom: audioOffsetFrames, volume: volume, playbackRate: audioData.playbackRate || 1 })
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
`;
  return module;
}

export function buildMultiSceneModule(args: { sceneImports: string[]; sceneComponents: string[]; includeFontsLoader?: boolean; includeIconFallback?: boolean; }) {
  const header = buildCompositeHeader({ includeFontsLoader: args.includeFontsLoader !== false, includeIconFallback: args.includeIconFallback !== false });
  const module = `
${header}
${args.sceneImports.join('\n')}

export default function MultiSceneComposition() {
  const projectAudio = window.projectAudio;
  return React.createElement(FontLoader, {},
    React.createElement(window.Remotion.AbsoluteFill, {},
      projectAudio && projectAudio.url && React.createElement((function(){
        // inline EnhancedAudio minimal wrapper
        const { useCurrentFrame, interpolate, Sequence, Audio } = window.Remotion;
        return function EA(){
          const frame = useCurrentFrame();
          const audio = window.projectAudio || {};
          const videoStartFrame = 0;
          const audioOffsetFrames = Math.floor((audio.startTime || 0) * 30);
          const audioEndFrames = Math.floor((audio.endTime || audio.duration || 0) * 30);
          const audioDurationFrames = audioEndFrames - audioOffsetFrames;
          let volume = typeof audio.volume === 'number' ? audio.volume : 1;
          const fadeInFrames = Math.floor((audio.fadeIn || 0) * 30);
          const fadeOutFrames = Math.floor((audio.fadeOut || 0) * 30);
          if (fadeInFrames > 0 && frame < videoStartFrame + fadeInFrames) {
            volume *= interpolate(frame, [videoStartFrame, videoStartFrame + fadeInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          }
          if (fadeOutFrames > 0 && frame > videoStartFrame + audioDurationFrames - fadeOutFrames) {
            volume *= interpolate(frame, [videoStartFrame + audioDurationFrames - fadeOutFrames, videoStartFrame + audioDurationFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          }
          if (typeof Audio === 'undefined' || !Audio) return null;
          return React.createElement(Sequence, { from: videoStartFrame, durationInFrames: audioDurationFrames },
            React.createElement(Audio, { src: audio.url, startFrom: audioOffsetFrames, volume: volume, playbackRate: audio.playbackRate || 1 })
          );
        };
      })(), {}) ,
      React.createElement(window.Remotion.Series, {},
        ${args.sceneComponents.join(',\n        ')}
      )
    )
  );
}
`;
  return module;
}
