// src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useVideoState } from '~/stores/videoState';
import type { InputProps } from '~/types/input-props';
import { Button } from "~/components/ui/button";
import { RefreshCwIcon, CodeIcon } from "lucide-react";
import { ErrorBoundary } from 'react-error-boundary';
import { transform } from 'sucrase';
import RemotionPreview from '../../components/RemotionPreview';
import { Player, type PlayerRef } from '@remotion/player';

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200">
      <h3 className="font-bold mb-2">Component Error</h3>
      <p className="mb-2">{error.message}</p>
    </div>
  );
}

// Create blob URL for component code
function createBlobUrl(code: string): string {
  const blob = new Blob([code], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

export function PreviewPanelG({ 
  projectId, 
  initial 
}: { 
  projectId: string;
  initial?: InputProps;
}) {
  const { getCurrentProps } = useVideoState();
  
  // Component compilation state
  const [componentImporter, setComponentImporter] = useState<(() => Promise<any>) | null>(null);
  const [componentBlobUrl, setComponentBlobUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [componentError, setComponentError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(`initial-${Date.now()}`);
  
  // Get current props from video state
  const currentProps = getCurrentProps() || initial;
  const scenes = currentProps?.scenes || [];
  
  console.log('[PreviewPanelG] Current props:', currentProps);
  console.log('[PreviewPanelG] Scenes:', scenes);
  
  // 🚨 SIMPLIFIED: Direct scene compilation - no stupid validation, just real compilation
  const compileSceneDirectly = useCallback(async (scene: any, index: number) => {
    const sceneCode = (scene.data as any)?.code;
    const sceneName = (scene.data as any)?.name || scene.id;
    
    if (!sceneCode) {
      console.warn(`[PreviewPanelG] Scene ${index} has no code`);
      return {
        isValid: false,
        compiledCode: createFallbackScene(sceneName, index, 'No code found'),
        componentName: `FallbackScene${index}`
      };
    }

    try {
      // Extract component name from the actual generated code
      const componentNameMatch = sceneCode.match(/export\s+default\s+function\s+(\w+)/);
      const componentName = componentNameMatch ? componentNameMatch[1] : `Scene${index}Component`;
      
      // Clean the scene code for compilation (remove imports/exports that don't work in our system)
      let cleanSceneCode = sceneCode
        .replace(/import\s+\{[^}]+\}\s+from\s+['"]remotion['"];?\s*/g, '') // Remove remotion imports
        .replace(/import\s+.*from\s+['"]react['"];?\s*/g, '') // Remove React imports
        .replace(/const\s+\{\s*[^}]+\s*\}\s*=\s*window\.Remotion;\s*/g, '') // Remove window.Remotion destructuring
        .replace(/export\s+default\s+function\s+\w+/, `function ${componentName}`); // Remove export default

      // 🚨 REAL COMPILATION TEST: Use Sucrase to verify the code actually compiles
      const testCompositeCode = `
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random } = window.Remotion;

${cleanSceneCode}

export default function TestComponent() {
  return <${componentName} />;
}`;

      // This is REAL validation - if Sucrase can't compile it, it's actually broken
      const { code: transformedCode } = transform(testCompositeCode, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: false,
      });

      console.log(`[PreviewPanelG] ✅ Scene ${index} (${sceneName}) compiled successfully`);
      return {
        isValid: true,
        compiledCode: cleanSceneCode,
        componentName: componentName
      };

    } catch (error) {
      console.error(`[PreviewPanelG] ❌ Scene ${index} (${sceneName}) REAL compilation failed:`, error);
      // ONLY use fallback when REAL compilation actually fails
      return {
        isValid: false,
        compiledCode: createFallbackScene(sceneName, index, `Compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`),
        componentName: `FallbackScene${index}`
      };
    }
  }, []);

  // 🚨 NEW: Create safe fallback scene for ACTUALLY broken scenes
  const createFallbackScene = useCallback((sceneName: string, sceneIndex: number, errorDetails?: string) => {
    return `
function FallbackScene${sceneIndex}() {
  return (
    <AbsoluteFill style={{
      backgroundColor: '#ffebee',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      border: '2px dashed #f44336',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h3 style={{ color: '#d32f2f', marginBottom: '16px' }}>
        ⚠️ Scene Error
      </h3>
      <p style={{ color: '#666', marginBottom: '8px' }}>
        "${sceneName || `Scene ${sceneIndex + 1}`}" has a compilation issue
      </p>
      <small style={{ color: '#999' }}>
        Other scenes continue to work normally
      </small>
      ${errorDetails ? `<div style={{ fontSize: '12px', color: '#999', marginTop: '8px', maxWidth: '300px', textAlign: 'center' }}>${errorDetails.substring(0, 100)}...</div>` : ''}
    </AbsoluteFill>
  );
}`;
  }, []);

  // Compile a multi-scene composition
  const compileMultiSceneComposition = useCallback(async () => {
    const scenesWithCode = scenes.filter(scene => (scene.data as any)?.code);
    
    if (scenesWithCode.length === 0) {
      setComponentError(new Error('No scenes with code found.'));
      return;
    }

    console.log('[PreviewPanelG] Compiling composition with', scenesWithCode.length, 'scenes...');
    
    setIsCompiling(true);
    setComponentError(null);
    setComponentImporter(null);

    // Revoke old blob URLs
    if (componentBlobUrl) {
      URL.revokeObjectURL(componentBlobUrl);
    }

    try {
      // 🚨 NEW: Compile each scene individually using REAL compilation
      const compiledScenes = await Promise.all(
        scenesWithCode.map((scene, index) => compileSceneDirectly(scene, index))
      );
      
      const validScenes = compiledScenes.filter(s => s.isValid).length;
      console.log(`[PreviewPanelG] Scene compilation: ${validScenes}/${compiledScenes.length} scenes compiled successfully`);

      // For single scene, use simpler approach
      if (compiledScenes.length === 1) {
        const scene = compiledScenes[0];
        if (!scene) {
          throw new Error('Scene compilation failed');
        }
        
        const allImports = new Set(['AbsoluteFill', 'useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'random']);
        
        // Scan the code for any Remotion functions that might be used
        const remotionFunctions = ['Sequence', 'Audio', 'Video', 'Img', 'staticFile', 'Loop', 'Series'];
        remotionFunctions.forEach(func => {
          if (scene.compiledCode.includes(func)) {
            allImports.add(func);
          }
        });

        const allImportsArray = Array.from(allImports);
        const singleDestructuring = `const { ${allImportsArray.join(', ')} } = window.Remotion;`;

        // Generate simple single scene composition
        const compositeCode = `
${singleDestructuring}

${scene.compiledCode}

export default function SingleSceneComposition() {
  return <${scene.componentName} />;
}
        `;

        console.log('[PreviewPanelG] Generated single scene code:', compositeCode);

        // Transform with Sucrase
        const { code: transformedCode } = transform(compositeCode, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });

        console.log('[PreviewPanelG] Sucrase transformation successful.');
        
        // Create blob URL
        const blob = new Blob([transformedCode], { type: 'application/javascript' });
        const newBlobUrl = URL.createObjectURL(blob);
        setComponentBlobUrl(newBlobUrl);
        
        console.log('[PreviewPanelG] Created new single scene blob URL:', newBlobUrl);
        
        // Import the module
        console.log('[PreviewPanelG] Importing single scene module from:', newBlobUrl);
        const module = await import(/* webpackIgnore: true */ newBlobUrl);
        const Component = module.default;
        
        if (!Component) {
          throw new Error('No default export found in generated component');
        }
        
        console.log('[PreviewPanelG] Single scene dynamic import successful.');
        
        setComponentImporter(() => () => Promise.resolve({ default: Component }));
        
      } else {
        // Multi-scene composition logic with compiled scenes
        const sceneImports: string[] = [];
        const sceneComponents: string[] = [];
        const totalDuration = scenesWithCode.reduce((sum, scene) => sum + (scene.duration || 150), 0);
        const allImports = new Set(['Series', 'AbsoluteFill', 'Loop', 'useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'random']);

        compiledScenes.forEach((compiled, index) => {
          const originalScene = scenesWithCode[index];
          if (!compiled || !originalScene) return;
          
          try {
            // Extract imports from the scene code and add to our set
            const sceneCode = compiled.compiledCode;
            const remotionFunctions = ['useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'Sequence', 'Audio', 'Video', 'Img', 'staticFile'];
            remotionFunctions.forEach(func => {
              if (sceneCode.includes(func)) {
                allImports.add(func);
              }
            });

            // ✅ FIXED: React Error Boundary wrapper for each scene (not just try-catch)
            const errorBoundaryWrapper = `
// React Error Boundary for Scene ${index}
class ${compiled.componentName}ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Scene ${index} error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          padding: '20px',
          backgroundColor: '#ffebee',
          border: '2px dashed #f44336',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#d32f2f',
          margin: '10px'
        }
      }, [
        React.createElement('h3', {key: 'title'}, '⚠️ Scene ${index + 1} Error'),
        React.createElement('p', {key: 'msg'}, 'This scene crashed but the video continues'),
        React.createElement('small', {key: 'hint'}, 'Error: ' + (this.state.error?.message || 'Unknown error')),
        React.createElement('div', {key: 'tech', style: {fontSize: '10px', marginTop: '8px', color: '#999'}}, 
          'Scene isolated - other scenes unaffected')
      ]);
    }

    return React.createElement(${compiled.componentName});
  }
}

function ${compiled.componentName}WithErrorBoundary() {
  return React.createElement(${compiled.componentName}ErrorBoundary);
}`;
            
            sceneImports.push(compiled.compiledCode);
            sceneImports.push(errorBoundaryWrapper);
            sceneComponents.push(`
              <Series.Sequence durationInFrames={${originalScene.duration || 150}} premountFor={60}>
                <${compiled.componentName}WithErrorBoundary />
              </Series.Sequence>
            `);

          } catch (error) {
            console.error(`[PreviewPanelG] Error processing compiled scene ${index}:`, error);
            // Skip problematic scenes entirely
          }
        });

        // Create ONE destructuring statement with ALL unique imports
        const allImportsArray = Array.from(allImports);
        const singleDestructuring = `const { ${allImportsArray.join(', ')} } = window.Remotion;`;

        // Generate the composite code with single destructuring at top
        const compositeCode = `
${singleDestructuring}

${sceneImports.join('\n\n')}

export default function MultiSceneComposition() {
  return (
    <AbsoluteFill>
      <Loop durationInFrames={${totalDuration}}>
        <Series>
          ${sceneComponents.join('\n          ')}
        </Series>
      </Loop>
    </AbsoluteFill>
  );
}
        `;

        console.log('[PreviewPanelG] Generated multi-scene composite code:', compositeCode);

        // Transform with Sucrase
        const { code: transformedCode } = transform(compositeCode, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });

        console.log('[PreviewPanelG] Sucrase transformation successful.');
        
        // Create blob URL
        const blob = new Blob([transformedCode], { type: 'application/javascript' });
        const newBlobUrl = URL.createObjectURL(blob);
        setComponentBlobUrl(newBlobUrl);
        
        console.log('[PreviewPanelG] Created new multi-scene blob URL:', newBlobUrl);
        
        // Import the module
        console.log('[PreviewPanelG] Importing multi-scene module from:', newBlobUrl);
        const module = await import(/* webpackIgnore: true */ newBlobUrl);
        const Component = module.default;
        
        if (!Component) {
          throw new Error('No default export found in generated component');
        }
        
        console.log('[PreviewPanelG] Multi-scene dynamic import successful.');
        
        setComponentImporter(() => () => Promise.resolve({ default: Component }));
      }
      
    } catch (error) {
      console.error('[PreviewPanelG] Error during compilation:', error);
      
      // IDIOT PROOF: Create a simple fallback that always works
      try {
        console.log('[PreviewPanelG] Creating fallback composition...');
        const fallbackCode = `
const { AbsoluteFill } = window.Remotion;

export default function FallbackComposition() {
  return (
    <AbsoluteFill style={{
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '40px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#ffebee',
        border: '2px dashed #f44336',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px'
      }}>
        <h2 style={{ color: '#d32f2f', marginBottom: '16px', fontSize: '24px' }}>
          🔧 Scene Compilation Issue
        </h2>
        <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
          There was an issue compiling the scenes, but don't worry! You can:
        </p>
        <ul style={{ color: '#666', textAlign: 'left', lineHeight: '1.5' }}>
          <li>Try refreshing the preview</li>
          <li>Check the code in Monaco editor</li>
          <li>Simplify your animation prompts</li>
        </ul>
      </div>
    </AbsoluteFill>
  );
}`;

        const { code: fallbackTransformed } = transform(fallbackCode, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });

        const fallbackBlob = new Blob([fallbackTransformed], { type: 'application/javascript' });
        const fallbackBlobUrl = URL.createObjectURL(fallbackBlob);
        const fallbackModule = await import(/* webpackIgnore: true */ fallbackBlobUrl);
        
        setComponentImporter(() => () => Promise.resolve({ default: fallbackModule.default }));
        setComponentError(new Error(`Compilation failed: ${error instanceof Error ? error.message : String(error)}`));
        
        URL.revokeObjectURL(fallbackBlobUrl);
      } catch (fallbackError) {
        console.error('[PreviewPanelG] Even fallback compilation failed:', fallbackError);
        setComponentError(new Error('Critical compilation failure'));
      }
    } finally {
      setIsCompiling(false);
    }
  }, [scenes]);

  // Auto-compile when any scene changes
  useEffect(() => {
    if (scenes.length > 0) {
      console.log('[PreviewPanelG] Auto-compiling multi-scene composition');
      compileMultiSceneComposition();
    }
  }, [scenes, compileMultiSceneComposition]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (scenes.length > 0) {
      console.log('[PreviewPanelG] Manual refresh - recompiling multi-scene...');
      compileMultiSceneComposition();
    }
  }, [compileMultiSceneComposition]);

  // Player props
  const playerProps = useMemo(() => {
    if (!scenes.length) return null;
    
    // Calculate total duration of all scenes for proper multi-scene playback
    const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 150), 0);
    
    return {
      fps: 30,
      width: 1280,
      height: 720,
      durationInFrames: totalDuration, // Use total duration, not just last scene
      inputProps: {}
    };
  }, [scenes]);

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      {/* Hidden refresh button that the upper header can trigger */}
      <button 
        id="refresh-preview-button-g"
        onClick={handleRefresh}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      
      <div className="relative flex-grow bg-white">
        {componentImporter && playerProps ? (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <RemotionPreview
              lazyComponent={componentImporter}
              durationInFrames={playerProps.durationInFrames}
              fps={playerProps.fps}
              width={playerProps.width}
              height={playerProps.height}
              inputProps={playerProps.inputProps}
              refreshToken={refreshToken}
            />
          </ErrorBoundary>
        ) : componentError ? (
          <div className="flex items-center justify-center h-full p-4">
            <ErrorFallback error={componentError} />
          </div>
        ) : isCompiling ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="flex items-center space-x-2">
              <RefreshCwIcon className="h-5 w-5 animate-spin" />
              <span>Compiling multi-scene composition...</span>
            </div>
          </div>
        ) : scenes.length ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <CodeIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No code available for this scene</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p>No scenes available</p>
              <p className="text-sm mt-1">Generate a scene in the chat to preview it here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 