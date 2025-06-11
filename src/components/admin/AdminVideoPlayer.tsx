"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { AbsoluteFill, Sequence } from 'remotion';
import { transform } from 'sucrase';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { PlayIcon, PauseIcon, RefreshCwIcon, AlertCircleIcon } from 'lucide-react';

interface Scene {
  id: string;
  name: string;
  tsxCode: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date | null;
  iterationCount: number;
}

interface AdminVideoPlayerProps {
  scenes: Scene[];
  projectTitle: string;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
}

// Dynamic scene component that compiles and renders TSX code
const DynamicScene: React.FC<{ code: string; sceneProps?: any }> = ({ code, sceneProps = {} }) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(true);

  useEffect(() => {
    let blobUrl: string | undefined;
    let isCancelled = false;

    const compileScene = async () => {
      if (!code) {
        if (!isCancelled) {
          setError("No TSX code provided for this scene.");
          setIsCompiling(false);
        }
        return;
      }

      try {
        setIsCompiling(true);
        setError(null);

        // Transform TSX code to JavaScript
        const transformedCode = transform(code, {
          transforms: ['typescript', 'jsx'],
          production: true,
        }).code;
        
        // Create a blob URL and dynamically import the component
        const blob = new Blob([transformedCode], { type: 'application/javascript' });
        blobUrl = URL.createObjectURL(blob);

        const module = await import(/* webpackIgnore: true */ blobUrl);
        
        if (!isCancelled) {
          if (module.default && typeof module.default === 'function') {
            setComponent(() => module.default);
            setError(null);
          } else {
            setError("Scene does not have a valid default export component.");
          }
          setIsCompiling(false);
        }
      } catch (err) {
        console.error("Scene compilation error:", err);
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Unknown compilation error');
          setIsCompiling(false);
        }
      } finally {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      }
    };

    compileScene();

    return () => {
      isCancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [code]);

  if (isCompiling) {
    return (
      <AbsoluteFill style={{
        backgroundColor: '#1a202c',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '1.2rem'
      }}>
        <div className="flex items-center space-x-2">
          <RefreshCwIcon className="h-5 w-5 animate-spin" />
          <span>Compiling Scene...</span>
        </div>
      </AbsoluteFill>
    );
  }

  if (error) {
    return (
      <AbsoluteFill style={{
        backgroundColor: '#dc2626',
        color: 'white',
        padding: 40,
        fontSize: 18,
        textAlign: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <AlertCircleIcon className="h-8 w-8 mb-4" />
        <div>Scene Compilation Error</div>
        <div style={{ fontSize: 14, marginTop: 10, opacity: 0.8 }}>
          {error}
        </div>
      </AbsoluteFill>
    );
  }

  if (!Component) {
    return (
      <AbsoluteFill style={{
        backgroundColor: '#374151',
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '1.2rem'
      }}>
        Loading Scene...
      </AbsoluteFill>
    );
  }

  return <Component {...sceneProps} />;
};

// Error fallback for the ErrorBoundary
function VideoErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-800 p-6">
      <AlertCircleIcon className="h-12 w-12 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Video Playback Error</h3>
      <p className="text-sm text-center mb-4">{error.message}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </div>
  );
}

export default function AdminVideoPlayer({ 
  scenes, 
  projectTitle, 
  className,
  autoPlay = false,
  showControls = true 
}: AdminVideoPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);

  // Create the main composition
  const VideoComposition = useMemo(() => {
    const AdminVideoComposition = () => {
      if (!scenes || scenes.length === 0) {
        return (
          <AbsoluteFill style={{
            backgroundColor: '#111827',
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '1.5rem'
          }}>
            No scenes available for this project
          </AbsoluteFill>
        );
      }

      let startFrame = 0;
      return (
        <AbsoluteFill>
          {scenes.map((scene) => {
            const sceneDuration = scene.duration || 150; // Default 5 seconds at 30fps
            const from = startFrame;
            startFrame += sceneDuration;
            
            return (
              <Sequence key={scene.id} from={from} durationInFrames={sceneDuration}>
                <DynamicScene 
                  code={scene.tsxCode} 
                  sceneProps={{
                    name: scene.name,
                    sceneId: scene.id
                  }} 
                />
              </Sequence>
            );
          })}
        </AbsoluteFill>
      );
    };
    
    return AdminVideoComposition;
  }, [scenes]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return scenes.reduce((total, scene) => total + (scene.duration || 150), 0);
  }, [scenes]);

  if (!scenes || scenes.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <PlayIcon className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No Video Content</p>
            <p className="text-sm">This project doesn't have any scenes to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Video Preview</h3>
              <p className="text-sm text-gray-600">{projectTitle}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline">
                {Math.round(totalDuration / 30)}s
              </Badge>
            </div>
          </div>

          {/* Video Player */}
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
            <ErrorBoundary FallbackComponent={VideoErrorFallback}>
              <Player
                ref={playerRef}
                component={VideoComposition}
                durationInFrames={totalDuration}
                compositionWidth={1280}
                compositionHeight={720}
                fps={30}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls={showControls}
                showVolumeControls={showControls}
                doubleClickToFullscreen={showControls}
                clickToPlay={showControls}
                loop={false}
                autoPlay={autoPlay}
              />
            </ErrorBoundary>
          </div>

          {/* Scene List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Scenes</h4>
            <div className="grid gap-2">
              {scenes.map((scene, index) => (
                <div key={scene.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{scene.name}</p>
                      <p className="text-xs text-gray-500">
                        {Math.round((scene.duration || 150) / 30)}s duration
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {scene.iterationCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {scene.iterationCount} edit{scene.iterationCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 