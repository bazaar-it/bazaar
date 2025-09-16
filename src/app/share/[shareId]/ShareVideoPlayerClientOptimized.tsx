//src/app/share/[shareId]/ShareVideoPlayerClientOptimized.tsx
"use client";

import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, Sequence } from 'remotion';
import * as Remotion from 'remotion';
import type { InputProps } from '~/lib/types/video/input-props';
// Loop control is rendered outside the player (in SharePageContent)

// Lazy load Sucrase only if needed
const loadSucrase = () => import('sucrase').then(module => module.transform);

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
                if (!isCancelled) setError("No code provided for this scene.");
                return;
            }

            try {
                let finalCode = code;

                // Ensure globals for dynamically imported modules
                // Scenes may reference window.React and window.Remotion
                (window as any).React = (window as any).React || React;
                (window as any).Remotion = (window as any).Remotion || Remotion;

                // If code was precompiled for Lambda, adapt it to ESM for dynamic import
                if (isPreCompiled) {
                    console.log('[ShareVideoPlayerClient] Adapting Lambda-compiled JS to ESM for Share page');
                    const hasExportDefault = /export\s+default\s+/.test(finalCode);

                    // Build header conditionally to avoid redeclaration errors
                    const headerParts: string[] = [];
                    const hasReactVar = /\b(?:const|let|var)\s+React\b/.test(finalCode);
                    if (!hasReactVar) headerParts.push('const React = window.React;');
                    const hasRemotionDestructure = /\bconst\s*\{[^}]*\}\s*=\s*window\.Remotion\b/.test(finalCode);
                    if (!hasRemotionDestructure) {
                      headerParts.push(
                        'const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random, Sequence, Audio, Video, Img, staticFile } = (window.Remotion || {});'
                      );
                    }
                    const header = headerParts.length ? headerParts.join('\n') + '\n' : '';

                    // Wrap entire code in an IIFE that returns the component, then export that value.
                    // Keep header at top-level; export an expression only.
                    if (!hasExportDefault) {
                      const iife = `(function __bazaar_module__(){\n${finalCode}\n})();`;
                      finalCode = `${header}const __bazaar_default__ = ${iife}\nexport default __bazaar_default__;`;
                    } else {
                      finalCode = `${header}${finalCode}`;
                    }
                } else {
                    // Only transform TSX if not pre-compiled
                    console.log('[ShareVideoPlayerClient] Compiling TSX on client (slow path)');
                    const transform = await loadSucrase();
                    finalCode = transform(code, {
                        transforms: ['typescript', 'jsx'],
                        production: true,
                    }).code;
                    // Ensure React identifier is available in module scope (only if not already declared)
                    if (!/\b(?:const|let|var)\s+React\b/.test(finalCode)) {
                      finalCode = `const React = window.React;\n` + finalCode;
                    }
                }
                
                const blob = new Blob([finalCode], { type: 'application/javascript' });
                blobUrl = URL.createObjectURL(blob);

                const module = await import(/* webpackIgnore: true */ blobUrl);
                
                if (!isCancelled) {
                    if (module.default && typeof module.default === 'function') {
                        setComponent(() => module.default);
                        setError(null);
                    } else if (typeof module === 'function') {
                        // Handle direct function export
                        setComponent(() => module);
                        setError(null);
                    } else {
                        setError("Scene file does not have a valid export.");
                    }
                }
            } catch (err) {
                console.error("Scene execution error:", err);
                if (!isCancelled) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
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
    }, [code, isPreCompiled]);

    if (error) {
        return (
            <AbsoluteFill style={{
                backgroundColor: '#e53e3e', 
                color: 'white', 
                padding: 40, 
                fontSize: 24, 
                textAlign: 'center', 
                justifyContent: 'center', 
                alignItems: 'center'
            }}>
                <div>Scene Error: {error}</div>
            </AbsoluteFill>
        );
    }

    if (!Component) {
        return (
            <AbsoluteFill style={{
                backgroundColor: '#1a202c', 
                color: 'white', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                fontSize: '1.5rem'
            }}>
                Loading Scene...
            </AbsoluteFill>
        );
    }

    return <Component {...sceneProps} />;
};

export default function ShareVideoPlayerClientOptimized({ inputProps, audio, isLooping, setIsLooping }: ShareVideoPlayerClientProps) {
  
  // Set audio in window for Remotion compositions to access
  useEffect(() => {
    if (audio) {
      (window as any).projectAudio = audio;
      console.log('[ShareVideoPlayerClient] Audio set in window:', audio);
    }
    
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
  
  // Log performance metrics
  useEffect(() => {
    const startTime = performance.now();
    const allPreCompiled = inputProps?.scenes?.every(s => s.data?.isPreCompiled) ?? false;
    
    console.log('[ShareVideoPlayerClient] Performance metrics:', {
      sceneCount: inputProps?.scenes?.length || 0,
      preCompiledScenes: inputProps?.scenes?.filter(s => s.data?.isPreCompiled).length || 0,
      allPreCompiled,
      mode: allPreCompiled ? 'FAST (pre-compiled)' : 'SLOW (client compilation)'
    });
    
    return () => {
      const loadTime = performance.now() - startTime;
      console.log(`[ShareVideoPlayerClient] Total load time: ${loadTime.toFixed(2)}ms`);
    };
  }, [inputProps]);

  // Validate inputProps
  if (!inputProps || !inputProps.scenes || inputProps.scenes.length === 0) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-white/80">No scenes available</div>
      </div>
    );
  }

  const totalDuration = inputProps.meta.duration || 300;
  const width = inputProps.meta?.width || 1920;
  const height = inputProps.meta?.height || 1080;
  
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
                <div className="opacity-80 text-sm">{error?.message}</div>
              </div>
            </AbsoluteFill>
          )}
        />
      </div>
    </div>
  );
}
