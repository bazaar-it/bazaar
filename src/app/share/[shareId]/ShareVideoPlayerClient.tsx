//src/app/share/[shareId]/ShareVideoPlayerClient.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { transform } from "sucrase";
import { Player } from "@remotion/player";

interface ShareVideoPlayerClientProps {
  sceneData: {
    tsxCode: string;
    duration: number;
  };
}

export default function ShareVideoPlayerClient({ sceneData }: ShareVideoPlayerClientProps) {
  const [componentImporter, setComponentImporter] = useState<(() => Promise<any>) | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const compileScene = useCallback(async () => {
    if (!sceneData?.tsxCode) return;

    setIsCompiling(true);
    setError(null);
    setComponentImporter(null);

    try {
      // Extract component name from the code
      const componentNameMatch = sceneData.tsxCode.match(/export\s+default\s+function\s+(\w+)/);
      const componentName = componentNameMatch ? componentNameMatch[1] : 'Scene';

      // Clean the scene code for compilation
      let cleanSceneCode = sceneData.tsxCode
        .replace(/import\s+\{[^}]+\}\s+from\s+['"]remotion['"];?\s*/g, '') // Remove remotion imports
        .replace(/import\s+.*from\s+['"]react['"];?\s*/g, '') // Remove React imports
        .replace(/const\s+\{\s*[^}]+\s*\}\s*=\s*window\.Remotion;\s*/g, '') // Remove window.Remotion destructuring
        .replace(/export\s+default\s+function\s+\w+/, `function ${componentName}`); // Remove export default

      // Setup Remotion globals and create composition
      const allImports = new Set(['AbsoluteFill', 'useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'random']);
      
      // Scan for additional Remotion functions
      const remotionFunctions = ['Sequence', 'Audio', 'Video', 'Img', 'staticFile', 'Loop', 'Series'];
      remotionFunctions.forEach(func => {
        if (cleanSceneCode.includes(func)) {
          allImports.add(func);
        }
      });

      const allImportsArray = Array.from(allImports);
      const destructuring = `const { ${allImportsArray.join(', ')} } = window.Remotion;`;

      // Generate composition code
      const compositeCode = `
${destructuring}

${cleanSceneCode}

export default function ShareComposition() {
  return <${componentName} />;
}
      `;

      // Transform with Sucrase
      const { code: transformedCode } = transform(compositeCode, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: false,
      });

      // Create blob URL and import module
      const blob = new Blob([transformedCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      
      const module = await import(/* webpackIgnore: true */ blobUrl);
      setComponentImporter(() => () => Promise.resolve({ default: module.default }));
      
      URL.revokeObjectURL(blobUrl);
      
    } catch (err) {
      console.error('Scene compilation failed:', err);
      setError(err instanceof Error ? err : new Error('Compilation failed'));
    } finally {
      setIsCompiling(false);
    }
  }, [sceneData?.tsxCode]);

  useEffect(() => {
    compileScene();
  }, [compileScene]);

  if (isCompiling) {
    return (
      <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center aspect-video">
        <div className="text-center text-white/80">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading video...</p>
          <p className="text-sm text-white/60">Compiling scene code</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center aspect-video">
        <div className="text-center text-white/80">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">Unable to load video</p>
          <p className="text-sm text-white/60">Scene compilation error</p>
        </div>
      </div>
    );
  }

  if (!componentImporter) {
    return (
      <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center aspect-video">
        <div className="text-center text-white/80">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 5v10l8-5-8-5z"/>
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">Interactive Video Player</p>
          <p className="text-sm text-white/60">Preparing scene...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video">
      <Suspense fallback={
        <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
          <div className="text-white/80">Loading player...</div>
        </div>
      }>
        <Player
          lazyComponent={componentImporter}
          inputProps={{}}
          durationInFrames={sceneData.duration || 150}
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
        />
      </Suspense>
    </div>
  );
}
