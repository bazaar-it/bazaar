// src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense, useRef } from 'react';
import { useVideoState } from '~/stores/videoState';
import type { InputProps } from '~/lib/types/video/input-props';
import { Button } from "~/components/ui/button";
import { RefreshCwIcon, CodeIcon, WrenchIcon } from "lucide-react";
import { ErrorBoundary } from 'react-error-boundary';
import { transform } from 'sucrase';
import RemotionPreview from '../../components/RemotionPreview';
import { Player, type PlayerRef } from '@remotion/player';
import { api } from "~/trpc/react";
import { PlaybackSpeedControl } from "~/components/ui/PlaybackSpeedControl";

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200">
      <h3 className="font-bold mb-2">Component Error</h3>
      <p className="mb-2">{error.message}</p>
    </div>
  );
}

export function PreviewPanelG({ 
  projectId, 
  initial,
  selectedSceneId 
}: { 
  projectId: string;
  initial?: InputProps;
  selectedSceneId?: string | null;
}) {
  // ✅ FIXED: Use separate selectors to prevent infinite loops
  const currentProps = useVideoState((state) => {
    const project = state.projects[projectId];
    return project?.props || initial;
  });
  
  // 🚨 CLEANED UP: Only use project-specific refresh token
  const projectRefreshToken = useVideoState((state) => state.projects[projectId]?.refreshToken);
  
  // Component compilation state
  const [componentImporter, setComponentImporter] = useState<(() => Promise<any>) | null>(null);
  const [componentBlobUrl, setComponentBlobUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [componentError, setComponentError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(`initial-${Date.now()}`);
  
  // Playback speed state
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playerRef = useRef<PlayerRef>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  
  // Loop state - using the three-state system
  const [loopState, setLoopState] = useState<'video' | 'off' | 'scene'>('video');
  
  // Get scenes from reactive state
  const scenes = currentProps?.scenes || [];
  
  // Calculate scene boundaries for scene loop functionality
  const sceneRanges = useMemo(() => {
    let start = 0;
    return scenes.map(scene => {
      const duration = scene.duration || 150;
      const range = { 
        id: scene.id,
        start, 
        end: start + duration - 1, // -1 because frames are 0-indexed
        duration 
      };
      start += duration;
      return range;
    });
  }, [scenes]);
  
  // Find the selected scene range
  const selectedSceneRange = useMemo(() => {
    if (!selectedSceneId) return null;
    return sceneRanges.find(range => range.id === selectedSceneId);
  }, [selectedSceneId, sceneRanges]);

  // 🚨 SIMPLIFIED: Direct scene compilation
  const compileSceneDirectly = useCallback(async (scene: any, index: number) => {
    const sceneCode = (scene.data as any)?.code;
    const sceneName = (scene.data as any)?.name || scene.id;
    const sceneId = scene.id;
    
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
      
      // 🚨 NEW: Dispatch success event to clear any existing errors
      const successEvent = new CustomEvent('scene-fixed', {
        detail: {
          sceneId,
          sceneName
        }
      });
      window.dispatchEvent(successEvent);
      
      return {
        isValid: true,
        compiledCode: cleanSceneCode,
        componentName: componentName
      };

    } catch (error) {
      console.error(`[PreviewPanelG] ❌ Scene ${index} (${sceneName}) REAL compilation failed:`, error);
      
      // 🚨 NEW: Dispatch error event to ChatPanelG for auto-fix
      if (error instanceof Error) {
        const errorEvent = new CustomEvent('preview-scene-error', {
          detail: {
            sceneId,
            sceneName,
            error: error
          }
        });
        window.dispatchEvent(errorEvent);
      }
      
      // ONLY use fallback when REAL compilation actually fails
      return {
        isValid: false,
        compiledCode: createFallbackScene(sceneName, index, `Compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`),
        componentName: `FallbackScene${index}`
      };
    }
  }, []);

  // 🚨 ENHANCED: Create safe fallback scene with autofix button
  const createFallbackScene = useCallback((sceneName: string, sceneIndex: number, errorDetails?: string) => {
    return `
function FallbackScene${sceneIndex}() {
  const handleAutoFix = () => {
    console.log('[PreviewPanelG] 🔧 AUTOFIX: Direct button clicked from fallback scene ${sceneIndex}');
    
    // 🚨 DIRECT: Trigger autofix in ChatPanelG
    const autoFixEvent = new CustomEvent('trigger-autofix', {
      detail: {
        sceneId: '${sceneName}', // This will be the actual scene ID
        sceneName: '${sceneName || `Scene ${sceneIndex + 1}`}',
        error: { message: '${errorDetails || 'Compilation error'}' }
      }
    });
    window.dispatchEvent(autoFixEvent);
  };

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      border: '2px dashed #ffc107',
      borderRadius: '12px',
      margin: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛠️</div>
      
      <h3 style={{ 
        color: '#856404', 
        marginBottom: '16px',
        fontSize: '1.5rem',
        fontWeight: '600'
      }}>
        Scene needs a quick fix
      </h3>
      
      <p style={{ 
        color: '#856404', 
        marginBottom: '16px',
        textAlign: 'center',
        maxWidth: '400px',
        lineHeight: '1.5'
      }}>
        "${sceneName || `Scene ${sceneIndex + 1}`}" has a compilation issue, but don't worry!
      </p>
      
      <button
        onClick={handleAutoFix}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          cursor: 'pointer',
          marginBottom: '1rem',
          transition: 'all 0.2s'
        }}
      >
        🚀 Auto-Fix Scene
      </button>
      
      <small style={{ 
        color: '#856404', 
        opacity: '0.8',
        textAlign: 'center',
        maxWidth: '350px'
      }}>
        Other scenes continue to work normally
      </small>
      
      <div style={{ 
        fontSize: '11px', 
        color: '#856404', 
        marginTop: '12px', 
        fontStyle: 'italic',
        opacity: '0.7',
        textAlign: 'center'
      }}>
        "If you are not embarrassed by the first version of your product, you've launched too late." - Reid Hoffman
      </div>
      
      ${errorDetails ? `<div style={{ fontSize: '10px', color: '#856404', marginTop: '8px', maxWidth: '300px', textAlign: 'center', opacity: '0.6' }}>${errorDetails.substring(0, 100)}...</div>` : ''}
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
      // 🚨 FIXED: Compile each scene individually with ISOLATION (no cascade failures)
      const compiledScenes = await Promise.all(
        scenesWithCode.map((scene, index) => compileSceneDirectly(scene, index))
      );
      
      const validScenes = compiledScenes.filter(s => s.isValid).length;
      console.log(`[PreviewPanelG] 🛡️ ISOLATION: ${validScenes}/${compiledScenes.length} scenes compiled successfully - broken scenes isolated`);
      
      // 🚨 CRITICAL FIX: If ALL scenes fail, show fallback. If SOME work, continue with working ones
      if (validScenes === 0) {
        console.warn('[PreviewPanelG] ⚠️ All scenes failed compilation, using fallback composition');
        throw new Error('All scenes failed compilation');
      }

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
        
        // 🚨 CRITICAL: Force new refresh token to guarantee RemotionPreview remount
        const newRefreshToken = `compiled-single-${Date.now()}-${Math.random()}`;
        setRefreshToken(newRefreshToken);
        console.log('[PreviewPanelG] 🔄 Set new refresh token for single scene:', newRefreshToken);
        
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
            // 🚨 CRITICAL FIX: Handle both valid AND invalid scenes gracefully
            if (compiled.isValid) {
              // ✅ VALID SCENE: Process normally
              const sceneCode = compiled.compiledCode;
              const remotionFunctions = ['useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'Sequence', 'Audio', 'Video', 'Img', 'staticFile'];
              remotionFunctions.forEach(func => {
                if (sceneCode.includes(func)) {
                  allImports.add(func);
                }
              });

              // ✅ VALID: Add working scene with error boundary for runtime protection
              const errorBoundaryWrapper = `
// React Error Boundary for Scene ${index} (Valid)
class ${compiled.componentName}ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Scene ${index} runtime error caught by boundary:', error, errorInfo);
    
    // 🚨 RUNTIME ERROR: Dispatch error event to ChatPanelG for auto-fix
    const errorEvent = new CustomEvent('preview-scene-error', {
      detail: {
        sceneId: '${originalScene.id}',
        sceneName: '${(originalScene.data as any)?.name || `Scene ${index + 1}`}',
        error: error
      }
    });
    window.dispatchEvent(errorEvent);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          padding: '20px',
          backgroundColor: '#fff3cd',
          border: '2px dashed #ffc107',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#856404',
          margin: '10px'
        }
      }, [
        React.createElement('h3', {key: 'title'}, '⚠️ Scene ${index + 1} Runtime Error'),
        React.createElement('p', {key: 'msg'}, 'This scene crashed during playback'),
        React.createElement('small', {key: 'hint'}, 'Error: ' + (this.state.error?.message || 'Unknown error')),
        React.createElement('div', {key: 'tech', style: {fontSize: '10px', marginTop: '8px', color: '#999'}}, 
          'Scene isolated - other scenes continue playing')
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
              
            } else {
              // 🚨 INVALID SCENE: Already has fallback code, just add it with error boundary
              console.log(`[PreviewPanelG] 🛡️ ISOLATION: Scene ${index} failed compilation, using safe fallback`);
              
              // ✅ INVALID: Add fallback scene (compiled.compiledCode is already the fallback)
              sceneImports.push(compiled.compiledCode);
              sceneComponents.push(`
                <Series.Sequence durationInFrames={${originalScene.duration || 150}} premountFor={60}>
                  <${compiled.componentName} />
                </Series.Sequence>
              `);
            }

          } catch (error) {
            console.error(`[PreviewPanelG] Error processing scene ${index}:`, error);
            // 🚨 LAST RESORT: Add emergency fallback for this scene
            const emergencyFallback = `
function EmergencyScene${index}() {
  return React.createElement('div', {
    style: {
      padding: '20px',
      backgroundColor: '#f8d7da',
      border: '2px dashed #dc3545',
      borderRadius: '8px',
      textAlign: 'center',
      color: '#721c24',
      margin: '10px'
    }
  }, [
    React.createElement('h3', {key: 'title'}, '🚨 Scene ${index + 1} Emergency Fallback'),
    React.createElement('p', {key: 'msg'}, 'This scene had critical errors'),
    React.createElement('small', {key: 'hint'}, 'Other scenes continue normally')
  ]);
}`;
            sceneImports.push(emergencyFallback);
            sceneComponents.push(`
              <Series.Sequence durationInFrames={${originalScene.duration || 150}} premountFor={60}>
                <EmergencyScene${index} />
              </Series.Sequence>
            `);
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
        
        // 🚨 CRITICAL: Force new refresh token to guarantee RemotionPreview remount
        const newRefreshToken = `compiled-multi-${Date.now()}-${Math.random()}`;
        setRefreshToken(newRefreshToken);
        console.log('[PreviewPanelG] 🔄 Set new refresh token for multi scene:', newRefreshToken);
        
        setComponentImporter(() => () => Promise.resolve({ default: Component }));
      }
      
    } catch (error) {
      console.error('[PreviewPanelG] Error during compilation:', error);
      
      // 🚨 CRITICAL FIX: Dispatch error event for autofixer when compilation fails
      const firstSceneWithCode = scenesWithCode[0];
      if (firstSceneWithCode) {
        console.log('[PreviewPanelG] 🔧 COMPILATION ERROR: Dispatching preview-scene-error event for autofixer');
        const errorEvent = new CustomEvent('preview-scene-error', {
          detail: {
            sceneId: firstSceneWithCode.id,
            sceneName: (firstSceneWithCode.data as any)?.name || 'Scene 1',
            error: error
          }
        });
        window.dispatchEvent(errorEvent);
      }
      
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
        
        // 🚨 CRITICAL FIX: Dispatch error event even for fallback failures
        const firstSceneWithCode = scenesWithCode[0];
        if (firstSceneWithCode) {
          console.log('[PreviewPanelG] 🔧 FALLBACK ERROR: Dispatching preview-scene-error event for autofixer');
          const errorEvent = new CustomEvent('preview-scene-error', {
            detail: {
              sceneId: firstSceneWithCode.id,
              sceneName: (firstSceneWithCode.data as any)?.name || 'Scene 1',
              error: fallbackError
            }
          });
          window.dispatchEvent(errorEvent);
        }
        
        setComponentError(new Error('Critical compilation failure'));
      }
    } finally {
      setIsCompiling(false);
    }
  }, [scenes]);

  // Single effect: Compile when scenes change
  useEffect(() => {
    if (scenes.length > 0) {
      console.log('[PreviewPanelG] Scenes changed, recompiling...');
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

  // Listen for playback speed change events from header
  useEffect(() => {
    const handleSpeedChange = (event: CustomEvent) => {
      const speed = event.detail?.speed;
      if (typeof speed === 'number' && speed >= 0.1 && speed <= 4) {
        console.log('[PreviewPanelG] Received speed change event:', speed);
        setPlaybackSpeed(speed);
        
        // Save preference
        try {
          localStorage.setItem('bazaar-playback-speed', speed.toString());
        } catch (error) {
          console.warn('[PreviewPanelG] Failed to save playback speed preference:', error);
        }
      }
    };

    window.addEventListener('playback-speed-change', handleSpeedChange as EventListener);
    return () => {
      window.removeEventListener('playback-speed-change', handleSpeedChange as EventListener);
    };
  }, []);

  // Load saved playback speed preference on mount
  useEffect(() => {
    try {
      const savedSpeed = localStorage.getItem('bazaar-playback-speed');
      if (savedSpeed) {
        const speed = parseFloat(savedSpeed);
        if (speed >= 0.1 && speed <= 4) {
          setPlaybackSpeed(speed);
          console.log('[PreviewPanelG] Loaded saved playback speed:', speed);
          
          // Dispatch event to update header display
          const event = new CustomEvent('playback-speed-loaded', { detail: { speed } });
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.warn('[PreviewPanelG] Failed to load playback speed preference:', error);
    }
  }, []);

  // Listen for loop state change events from header
  useEffect(() => {
    const handleLoopStateChange = (event: CustomEvent) => {
      const state = event.detail?.state;
      if (state === 'video' || state === 'off' || state === 'scene') {
        console.log('[PreviewPanelG] Received loop state change:', state);
        setLoopState(state);
        
        // Save preference
        try {
          localStorage.setItem('bazaar-loop-state', state);
        } catch (error) {
          console.warn('[PreviewPanelG] Failed to save loop state preference:', error);
        }
      }
    };

    window.addEventListener('loop-state-change', handleLoopStateChange as EventListener);
    return () => {
      window.removeEventListener('loop-state-change', handleLoopStateChange as EventListener);
    };
  }, []);

  // Load saved loop preference on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('bazaar-loop-state');
      let state: 'video' | 'off' | 'scene' = 'video'; // Default to video loop
      
      if (savedState === 'video' || savedState === 'off' || savedState === 'scene') {
        state = savedState;
      } else {
        // Check old boolean format for backwards compatibility
        const oldSaved = localStorage.getItem('bazaar-loop-enabled');
        if (oldSaved === 'false') {
          state = 'off';
        }
        // Save the new format
        localStorage.setItem('bazaar-loop-state', state);
      }
      
      setLoopState(state);
      
      // Dispatch event to sync with header
      const event = new CustomEvent('loop-state-loaded', { detail: { state } });
      window.dispatchEvent(event);
      console.log('[PreviewPanelG] Loop state initialized:', state);
    } catch (error) {
      console.warn('[PreviewPanelG] Failed to load loop preference:', error);
      // Even on error, ensure default video loop
      setLoopState('video');
    }
  }, []);


  // Player props
  const playerProps = useMemo(() => {
    if (!scenes.length) return null;
    
    // Calculate total duration of all scenes for proper multi-scene playback
    const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 150), 0);
    
    return {
      fps: 30,
      width: 1920,
      height: 1080,
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
              playerRef={playerRef}
              playbackRate={playbackSpeed}
              loop={loopState !== 'off'}
              inFrame={loopState === 'scene' && selectedSceneRange ? selectedSceneRange.start : undefined}
              outFrame={loopState === 'scene' && selectedSceneRange ? selectedSceneRange.end : undefined}
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