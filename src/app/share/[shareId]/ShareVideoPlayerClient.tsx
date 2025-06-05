//src/app/share/[shareId]/ShareVideoPlayerClient.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { transform } from "sucrase";
import { Player } from "@remotion/player";
import type { InputProps, Scene } from "~/types/input-props";
import { COMP_NAME as SHARED_COMP_NAME } from "~/types/remotion-constants";

interface ShareVideoPlayerClientProps {
  inputProps: InputProps;
}

export default function ShareVideoPlayerClient({ inputProps }: ShareVideoPlayerClientProps) {
  const [componentImporter, setComponentImporter] = useState<(() => Promise<any>) | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const prepareComposition = useCallback(async () => {
    setIsPreparing(true);
    setError(null);
    try {
      if (!inputProps || !inputProps.scenes || inputProps.scenes.length === 0) {
        throw new Error("No scenes provided to render.");
      }

      const sceneComponentDefinitions = inputProps.scenes.map((scene, index) => {
        let idPart = `idx${index}`;
        if (scene.id !== null && scene.id !== undefined) {
          if (typeof scene.id === 'string') {
            idPart = scene.id.replace(/-/g, '_');
          } else {
            idPart = String(scene.id).replace(/[^a-zA-Z0-9_]/g, '_');
          }
        }
        const sceneFunctionName = `SceneComponent_${idPart}`;
        
        let sceneCodeValue = scene.data?.code;
        let sceneCode: string;
        if (typeof sceneCodeValue === 'string') {
          sceneCode = sceneCodeValue;
        } else {
          sceneCode = '() => null'; 
        }
        
        sceneCode = sceneCode.replace(/^export\s+default\s+function\s+\w+\s*\(.*?\)\s*{/s, '() => {');
        sceneCode = sceneCode.replace(/const\s+\{[^}]+\}\s*=\s*window\.Remotion;?/s, '');
        const escapedCode = sceneCode.replace(/`/g, '\\`');
        return `const ${sceneFunctionName} = (props) => { ${escapedCode} };`;
      }).join('\\n\\n');

      const sequenceItems = inputProps.scenes.map((scene, index) => {
        let idPart = `idx${index}`;
        if (scene.id !== null && scene.id !== undefined) {
          if (typeof scene.id === 'string') {
            idPart = scene.id.replace(/-/g, '_');
          } else {
            idPart = String(scene.id).replace(/[^a-zA-Z0-9_]/g, '_');
          }
        }
        const sceneFunctionName = `SceneComponent_${idPart}`;
        const sceneName = scene.data?.name || `Scene ${index + 1}`;
        return (
          `<Sequence from={${scene.start}} durationInFrames={${scene.duration}} name="${sceneName}">\\n` +
          `  <${sceneFunctionName} {...${JSON.stringify(scene.data?.props || {})}} />\\n` +
          `</Sequence>`
        );
      }).join('\\n        ');

      const compositeCode = `
        const { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, random } = window.Remotion;
        
        ${sceneComponentDefinitions}
        
        export default function ${SHARED_COMP_NAME}() {
          return (
            <AbsoluteFill style={{ backgroundColor: '${inputProps.meta.backgroundColor || '#000000'}' }}>
              ${sequenceItems}
            </AbsoluteFill>
          );
        }
      `;
      
      if (process.env.NODE_ENV === 'development') {
        console.log("[ShareVideoPlayerClient] Composite Code:\\n", compositeCode);
      }

      const { code: transformedCode } = transform(compositeCode, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: true, 
      });

      const blob = new Blob([transformedCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      
      const module = await import(/* webpackIgnore: true */ blobUrl);
      setComponentImporter(() => () => Promise.resolve({ default: module.default }));
      
      URL.revokeObjectURL(blobUrl); 
      
    } catch (err) {
      console.error('Composition preparation failed:', err);
      setError(err instanceof Error ? err : new Error('Composition preparation failed'));
    } finally {
      setIsPreparing(false);
    }
  }, [inputProps]);

  useEffect(() => {
    prepareComposition();
  }, [prepareComposition]);

  if (isPreparing) {
    return (
      <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center aspect-video">
        <div className="text-center text-white/80">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading video...</p>
          <p className="text-sm text-white/60">Preparing composition</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center aspect-video">
        <div className="text-center text-white/80 p-4">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">Unable to load video</p>
          <p className="text-sm text-white/60">Error: {error.message}</p>
          {process.env.NODE_ENV === 'development' && error.stack && (
            <pre className="mt-2 text-xs text-left bg-black/50 p-2 rounded overflow-auto max-h-40">
              {error.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (!componentImporter) {
    return (
      <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center aspect-video">
        <div className="text-center text-white/80">
          <p className="text-lg font-medium">Preparing player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video">
      <Suspense fallback={
        <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
          <div className="text-white/80">Loading Remotion player...</div>
        </div>
      }>
        <Player
          lazyComponent={componentImporter}
          inputProps={inputProps} 
          durationInFrames={inputProps.meta.duration}
          compositionWidth={1280} 
          compositionHeight={720}
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
          autoPlay={false}
          key={inputProps.meta.title}
        />
      </Suspense>
    </div>
  );
}
