//src/app/share/[shareId]/ShareVideoPlayerClient.tsx
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, Sequence } from 'remotion';
import { transform } from 'sucrase';
import type { InputProps } from '~/lib/types/video/input-props';

interface ShareVideoPlayerClientProps {
  inputProps: InputProps;
}

const DynamicScene: React.FC<{ code: string; sceneProps: any }> = ({ code, sceneProps }) => {
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
                const transformedCode = transform(code, {
                    transforms: ['typescript', 'jsx'],
                    production: true,
                }).code;
                
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

export default function ShareVideoPlayerClient({ inputProps }: ShareVideoPlayerClientProps) {
  console.log('[ShareVideoPlayerClient] Rendering with inputProps:', {
    sceneCount: inputProps?.scenes?.length || 0,
    duration: inputProps?.meta?.duration || 0,
    title: inputProps?.meta?.title || 'Untitled'
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
                <DynamicScene code={scene.data.code} sceneProps={scene.data.props || {}} />
              </Sequence>
            );
          })}
        </AbsoluteFill>
      );
    };
    return ShareComposition;
  }, []);

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <Player
        component={composition}
        inputProps={{ scenes: inputProps.scenes }}
        durationInFrames={totalDuration}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls
        showVolumeControls
        doubleClickToFullscreen
        clickToPlay
        loop={true}
        autoPlay={true}
      />
    </div>
  );
}
