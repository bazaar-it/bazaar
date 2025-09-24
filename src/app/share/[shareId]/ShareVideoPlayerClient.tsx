//src/app/share/[shareId]/ShareVideoPlayerClient.tsx
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, Sequence } from 'remotion';
import * as Remotion from 'remotion';
import { transform } from 'sucrase';
import type { InputProps } from '~/lib/types/video/input-props';
// Loop control is handled by SharePageContent; no overlay here

interface ShareVideoPlayerClientProps {
  inputProps: InputProps;
  audio?: any;
  isLooping: boolean;
  setIsLooping: (value: boolean) => void;
}

const DynamicScene: React.FC<{ code: string; sceneProps: any; isPreCompiled?: boolean }> = ({ code, sceneProps, isPreCompiled }) => {
    const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let blobUrl: string | undefined;
        let isCancelled = false;

        const compile = async () => {
            if (!code) {
                if (!isCancelled) setError("No TSX code provided for this scene.");
                return;
            }

            try {
                // Ensure globals used by dynamic modules
                (window as any).React = (window as any).React || React;
                (window as any).Remotion = (window as any).Remotion || Remotion;

                // Skip transformation if we already have compiled JS; adapt Lambda-compiled code to ESM
                let transformedCode = code;
                if (isPreCompiled) {
                    const hasExportDefault = /export\s+default\s+/.test(code);
                    const hasReactVar = /\b(?:const|let|var)\s+React\b/.test(code);
                    const hasRemotionDestructure = /\bconst\s*\{[^}]*\}\s*=\s*window\.Remotion\b/.test(code);
                    const headerParts: string[] = [];
                    if (!hasReactVar) headerParts.push('const React = window.React;');
                    if (!hasRemotionDestructure) headerParts.push('const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random, Sequence, Audio, Video, Img, staticFile } = (window.Remotion || {});');
                    const header = headerParts.length ? headerParts.join('\n') + '\n' : '';

                    if (!hasExportDefault) {
                      const iife = `(function __bazaar_module__(){\n${code}\n})();`;
                      transformedCode = `${header}const __bazaar_default__ = ${iife}\nexport default __bazaar_default__;`;
                    } else {
                      transformedCode = `${header}${code}`;
                    }
                } else {
                    transformedCode = transform(code, {
                        transforms: ['typescript', 'jsx'],
                        production: true,
                    }).code;
                    if (!/\b(?:const|let|var)\s+React\b/.test(transformedCode)) {
                      transformedCode = `const React = window.React;\n` + transformedCode;
                    }
                }

                const blob = new Blob([transformedCode], { type: 'application/javascript' });
                blobUrl = URL.createObjectURL(blob);

                const module = await import(/* webpackIgnore: true */ blobUrl);
                
                if (!isCancelled) {
                    if (module.default && typeof module.default === 'function') {
                        setComponent(() => module.default);
                        setError(null);
                    } else {
                        setError("Scene file does not have a default export component.");
                    }
                }
            } catch (err) {
                console.error("Scene compilation error:", err);
                if (!isCancelled) {
                    setError(err instanceof Error ? err.message : 'Unknown compilation error');
                }
            } finally {
                if (blobUrl) {
                    URL.revokeObjectURL(blobUrl);
                }
            }
        };

        compile();

        return () => {
            isCancelled = true;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [code]);

    if (error) {
        return <AbsoluteFill style={{backgroundColor: '#e53e3e', color: 'white', padding: 40, fontSize: 24, textAlign: 'center', justifyContent: 'center', alignItems: 'center'}}><div>Scene Error: {error}</div></AbsoluteFill>;
    }

    if (!Component) {
        return <AbsoluteFill style={{backgroundColor: '#1a202c', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem'}}>Loading Scene...</AbsoluteFill>;
    }

    return <Component {...sceneProps} />;
};

export default function ShareVideoPlayerClient({ inputProps, audio, isLooping, setIsLooping }: ShareVideoPlayerClientProps) {
  
  // Set audio in window for Remotion compositions to access
  useEffect(() => {
    if (audio) {
      (window as any).projectAudio = audio;
      console.log('[ShareVideoPlayerClient] Audio set in window:', audio);
    }
    
    // Cleanup on unmount
    return () => {
      if ((window as any).projectAudio) {
        delete (window as any).projectAudio;
      }
    };
  }, [audio]);
  
  // Ensure React and Remotion are accessible for dynamically imported scene modules
  useEffect(() => {
    (window as any).React = (window as any).React || React;
    (window as any).Remotion = (window as any).Remotion || Remotion;
  }, []);
  
  console.log('[ShareVideoPlayerClient] Rendering with inputProps:', {
    sceneCount: inputProps?.scenes?.length || 0,
    duration: inputProps?.meta?.duration || 0,
    title: inputProps?.meta?.title || 'Untitled',
    hasAudio: !!audio
  });

  // Validate inputProps
  if (!inputProps || !inputProps.scenes || inputProps.scenes.length === 0) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-white/80">No scenes available</div>
      </div>
    );
  }

  const totalDuration = inputProps.meta.duration || 300; // Default 10 seconds at 30fps
  
  // Get dimensions from project metadata
  const width = inputProps.meta?.width || 1920;
  const height = inputProps.meta?.height || 1080;
  
  // Calculate aspect ratio class based on format
  const format = inputProps.meta?.format || 'landscape';
  const aspectClass = format === 'portrait' ? 'aspect-[9/16]' : 
                      format === 'square' ? 'aspect-square' : 
                      'aspect-video';

  const composition = useMemo(() => {
    const ShareComposition = ({ scenes: sceneData }: { scenes: any[] }) => {
      let startFrame = 0;
      return (
        <AbsoluteFill>
          {sceneData.map(scene => {
            const duration = scene.duration || 150;
            const from = startFrame;
            startFrame += duration;
            return (
              <Sequence key={scene.id} from={from} durationInFrames={duration}>
                <DynamicScene 
                  code={scene.data.code} 
                  sceneProps={scene.data.props || {}} 
                  isPreCompiled={scene.data.isPreCompiled}
                />
              </Sequence>
            );
          })}
        </AbsoluteFill>
      );
    };
    return ShareComposition;
  }, []);

  return (
    <div className="relative">
      <div className={`w-full ${aspectClass} bg-black rounded-lg overflow-hidden relative`}>
        
        <Player
          component={composition}
          inputProps={{ scenes: inputProps.scenes, audio }}
          durationInFrames={totalDuration}
          compositionWidth={width}
          compositionHeight={height}
          fps={30}
          style={{
            width: '100%',
            height: '100%',
            aspectRatio: `${width} / ${height}`,
          }}
          controls
          showVolumeControls
          doubleClickToFullscreen
          clickToPlay
          loop={isLooping}
          autoPlay={false}
          allowFullscreen
          renderLoading={() => (
            <AbsoluteFill style={{
              backgroundColor: '#1a202c', 
              color: 'white', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              fontSize: '1.5rem'
            }}>
              <div className="flex flex-col items-center">
                <div className="animate-pulse">Loading HD Video...</div>
                {audio && <div className="text-sm mt-2 opacity-70">Preparing audio track...</div>}
              </div>
            </AbsoluteFill>
          )}
          errorFallback={({ error }) => (
            <AbsoluteFill style={{
              backgroundColor: '#991b1b',
              color: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2rem',
              fontSize: '1rem'
            }}>
              <div className="text-center">
                <div className="font-bold mb-2">Error loading video</div>
                <div className="text-sm opacity-90">{error?.message || 'Unknown error'}</div>
              </div>
            </AbsoluteFill>
          )}
        />
      </div>
    </div>
  );
}
