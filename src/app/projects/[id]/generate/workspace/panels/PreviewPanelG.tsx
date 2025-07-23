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
import { PlaybackSpeedSlider } from "~/components/ui/PlaybackSpeedSlider";
import { cn } from '~/lib/cn';
import { detectProblematicScene, enhanceErrorMessage } from '~/lib/utils/scene-error-detector';
import { useAutoFix } from '~/hooks/use-auto-fix';

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
  
  // Get scenes from database to ensure we have the latest data
  const { data: dbScenes } = api.generation.getProjectScenes.useQuery(
    { projectId },
    { 
      refetchOnWindowFocus: false,
      // This will be invalidated when scenes are created
    }
  );

  // Initialize auto-fixer to listen for compilation errors
  useAutoFix(projectId, dbScenes || []);
  
  // Update VideoState when database scenes change
  const { replace } = useVideoState();
  const [lastSyncedSceneIds, setLastSyncedSceneIds] = useState<string>('');
  
  useEffect(() => {
    if (dbScenes && dbScenes.length > 0 && currentProps) {
      // 🚨 FIX: Check if scenes have actually changed to prevent redundant syncs
      const currentSceneIds = dbScenes.map(s => `${s.id}-${s.updatedAt}`).join(',');
      
      if (currentSceneIds === lastSyncedSceneIds) {
        // Database scenes unchanged, skipping sync
        return;
      }
      
      // Database scenes updated, syncing to VideoState
      setLastSyncedSceneIds(currentSceneIds);
      
      // Convert database scenes to InputProps format
      let currentStart = 0;
      const convertedScenes = dbScenes.map((dbScene: any) => {
        const sceneDuration = dbScene.duration || 150;
        
        // Debug log to check if tsxCode exists
        if (!dbScene.tsxCode) {
          console.warn('[PreviewPanelG] Scene missing tsxCode:', dbScene.id, dbScene.name);
        }
        
        const scene = {
          id: dbScene.id,
          type: 'custom' as const,
          start: currentStart,
          duration: sceneDuration,
          data: {
            code: dbScene.tsxCode,
            name: dbScene.name,
            componentId: dbScene.id,
            props: dbScene.props || {}
          }
        };
        currentStart += sceneDuration;
        return scene;
      });
      
      // Update VideoState with new scenes
      const updatedProps = {
        ...currentProps,
        scenes: convertedScenes,
        meta: {
          ...currentProps.meta,
          duration: currentStart
        }
      };
      
      replace(projectId, updatedProps);
    }
  }, [dbScenes, projectId]);
  
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
  
  // Get scenes and audio from reactive state
  const scenes = currentProps?.scenes || [];
  const projectAudio = useVideoState(state => state.projects[projectId]?.audio);
  
  // Force preview refresh when audio settings change
  useEffect(() => {
    if (projectAudio) {
      setRefreshToken(`audio-${Date.now()}`);
    }
  }, [projectAudio?.fadeInDuration, projectAudio?.fadeOutDuration, projectAudio?.playbackRate, projectAudio?.volume, projectAudio?.startTime, projectAudio?.endTime]);
  
  // Memoized scene fingerprint to prevent unnecessary re-renders
  const scenesFingerprint = useMemo(() => {
    return `${scenes.length}-${scenes.map(s => `${s.id}-${typeof s.data?.tsxCode === 'string' ? s.data.tsxCode.length : 0}`).join(',')}`;
  }, [scenes.length, scenes.map(s => s.id).join(','), scenes.map(s => typeof s.data?.tsxCode === 'string' ? s.data.tsxCode.length : 0).join(',')]);
  
  // Memoized audio fingerprint to prevent unnecessary re-renders
  const audioFingerprint = useMemo(() => {
    return `${projectAudio?.url || ''}-${projectAudio?.startTime || 0}-${projectAudio?.endTime || 0}-${projectAudio?.volume || 1}`;
  }, [projectAudio?.url, projectAudio?.startTime, projectAudio?.endTime, projectAudio?.volume]);
  
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
    // Get code from scene.data.code (the correct location based on the type)
    const sceneCode = (scene.data as any)?.code;
    const sceneName = (scene.data as any)?.name || scene.id;
    const sceneId = scene.id;
    
    if (!sceneCode) {
      console.warn(`[PreviewPanelG] Scene ${index} has no code. Scene structure:`, {
        id: scene.id,
        hasDataCode: !!(scene.data as any)?.code,
        dataKeys: scene.data ? Object.keys(scene.data) : [],
        sceneKeys: Object.keys(scene)
      });
      return {
        isValid: false,
        compiledCode: createFallbackScene(sceneName, index, 'No code found', sceneId),
        componentName: `FallbackScene${index}`
      };
    }

    try {
      // Extract component name from the actual generated code
      // Handle both: export default function ComponentName and export default ComponentName
      let componentNameMatch = sceneCode.match(/export\s+default\s+function\s+(\w+)/);
      let componentName = componentNameMatch ? componentNameMatch[1] : null;
      
      // If no function export, check for const declaration and export
      if (!componentName) {
        const constMatch = sceneCode.match(/const\s+(\w+)\s*=\s*\(/);
        if (constMatch) {
          componentName = constMatch[1];
        }
      }
      
      // Fallback to generic name
      if (!componentName) {
        componentName = `Scene${index}Component`;
      }
      
      // Log original code for debugging
      // Original scene code processing
      
      // Clean the scene code for compilation (remove imports/exports that don't work in our system)
      let cleanSceneCode = sceneCode
        .replace(/import\s+\{[^}]+\}\s+from\s+['"]remotion['"];?\s*/g, '') // Remove remotion imports
        .replace(/import\s+.*from\s+['"]react['"];?\s*/g, '') // Remove React imports
        .replace(/const\s+\{\s*[^}]+\s*\}\s*=\s*window\.Remotion;\s*/g, '') // Remove window.Remotion destructuring
        .replace(/export\s+default\s+function\s+\w+/, `function ${componentName}`) // Remove export default function
        .replace(/export\s+default\s+\w+;?\s*/g, '') // Remove export default ComponentName
        .replace(/export\s+const\s+\w+\s*=\s*[^;]+;?\s*/g, ''); // Remove export const statements
      
      // Log cleaned code for debugging
      // Cleaned scene code processing

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

      // Scene compiled successfully
      
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
      
      // Enhanced error message with scene identification
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const detailedError = `Scene ${index + 1} (${sceneName}): ${errorMessage}`;
      
      // 🚨 NEW: Dispatch error event to ChatPanelG for auto-fix
      if (error instanceof Error) {
        const errorEvent = new CustomEvent('preview-scene-error', {
          detail: {
            sceneId,
            sceneName,
            sceneIndex: index + 1,
            error: new Error(detailedError)
          }
        });
        // Dispatching preview-scene-error event for scene compilation error
        window.dispatchEvent(errorEvent);
      }
      
      // ONLY use fallback when REAL compilation actually fails
      return {
        isValid: false,
        compiledCode: createFallbackScene(sceneName, index, detailedError, sceneId),
        componentName: `FallbackScene${index}`
      };
    }
  }, []);

  // 🚨 ENHANCED: Create safe fallback scene with autofix button
  const createFallbackScene = useCallback((sceneName: string, sceneIndex: number, errorDetails?: string, sceneId?: string) => {
    return `
function FallbackScene${sceneIndex}() {
  const handleAutoFix = () => {
    console.log('[PreviewPanelG] 🔧 AUTOFIX: Direct button clicked from fallback scene ${sceneIndex}');
    
    // 🚨 DIRECT: Trigger autofix in ChatPanelG
    const autoFixEvent = new CustomEvent('trigger-autofix', {
      detail: {
        sceneId: '${sceneId || sceneName}', // Use actual scene ID if available
        sceneName: '${sceneName || `Scene ${sceneIndex + 1}`}',
        sceneIndex: ${sceneIndex + 1},
        error: { message: '${errorDetails || 'Compilation error'}' }
      }
    });
    window.dispatchEvent(autoFixEvent);
  };

  const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Smooth fade in
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Gentle scale animation
  const scale = spring({
    frame,
    fps,
    from: 0.95,
    to: 1,
    config: {
      damping: 20,
      stiffness: 40,
    },
  });
  
  // Floating animation for the icon
  const iconFloat = Math.sin(frame / 10) * 5;
  
  // Subtle background animation
  const bgRotation = interpolate(frame, [0, 300], [0, 360], {
    extrapolateRight: 'clamp',
  });
  
  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    }}>
      {/* Animated background shapes */}
      <div style={{
        position: 'absolute',
        width: '200%',
        height: '200%',
        top: '-50%',
        left: '-50%',
        opacity: 0.1,
        transform: \`rotate(\${bgRotation}deg)\`,
      }}>
        <div style={{
          position: 'absolute',
          width: '40%',
          height: '40%',
          top: '10%',
          left: '10%',
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute',
          width: '30%',
          height: '30%',
          bottom: '20%',
          right: '20%',
          background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>
      
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '48px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        maxWidth: '520px',
        textAlign: 'center',
        transform: \`scale(\${scale})\`,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Animated icon */}
        <div style={{ 
          fontSize: '4rem', 
          marginBottom: '1.5rem',
          transform: \`translateY(\${iconFloat}px)\`,
          transition: 'transform 0.3s ease',
        }}>
          🛠️
        </div>
        
        <h3 style={{ 
          color: '#1f2937', 
          marginBottom: '16px',
          fontSize: '1.5rem',
          fontWeight: '700',
          letterSpacing: '-0.02em',
        }}>
          Scene ${sceneIndex + 1} Needs Attention
        </h3>
        
        <p style={{ 
          color: '#6b7280', 
          marginBottom: '24px',
          fontSize: '1rem',
          lineHeight: '1.6',
          maxWidth: '400px',
          margin: '0 auto 24px',
        }}>
          <strong>${sceneName || `Scene ${sceneIndex + 1}`}</strong> encountered a temporary issue. 
          The good news? All other scenes are playing perfectly!
        </p>
        
        <button
          onClick={handleAutoFix}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0.875rem 2rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)',
            transition: 'all 0.2s',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.25)';
          }}
        >
          <span style={{ marginRight: '8px' }}>✨</span>
          Fix Scene Automatically
        </button>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#10b981',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '1rem',
        }}>
          <span style={{ 
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          Other scenes playing normally
        </div>
        
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#9ca3af', 
          marginTop: '16px', 
          fontStyle: 'italic',
          maxWidth: '380px',
          margin: '16px auto 0',
          lineHeight: '1.5',
        }}>
          "If you're not embarrassed by the first version of your product, you've launched too late."
          <br />
          <span style={{ fontWeight: '500' }}>— Reid Hoffman</span>
        </div>
        
        ${errorDetails ? `
        <details style={{ 
          marginTop: '16px',
          textAlign: 'left',
          background: '#f9fafb',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}>
          <summary style={{ 
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: '#6b7280',
            fontWeight: '500',
            userSelect: 'none',
          }}>
            Technical Details
          </summary>
          <div style={{ 
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginTop: '8px',
            fontFamily: 'monospace',
            lineHeight: '1.4',
            wordBreak: 'break-word',
          }}>
            ${errorDetails.substring(0, 150)}${errorDetails.length > 150 ? '...' : ''}
          </div>
        </details>
        ` : ''}
      </div>
      
      <style jsx>{\`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      \`}</style>
    </AbsoluteFill>
  );
}`;
  }, []);

  // Compile a multi-scene composition
  const compileMultiSceneComposition = useCallback(async () => {
    // Filter scenes that have code in their data
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

    // Declare compiledScenes outside try block so it's accessible in catch block
    let compiledScenes: any[] = [];

    try {
      // 🚨 FIXED: Compile each scene individually with ISOLATION (no cascade failures)
      compiledScenes = await Promise.all(
        scenesWithCode.map((scene, index) => compileSceneDirectly(scene, index))
      );
      
      const validScenes = compiledScenes.filter(s => s.isValid).length;
      console.log(`[PreviewPanelG] 🛡️ ISOLATION: ${validScenes}/${compiledScenes.length} scenes compiled successfully - broken scenes isolated`);
      
      // 🚨 CRITICAL FIX: Continue even if some scenes fail - we'll use fallbacks for broken scenes
      if (validScenes === 0 && compiledScenes.length > 0) {
        console.warn('[PreviewPanelG] ⚠️ All scenes failed compilation, but continuing with fallback scenes');
        // Don't throw - continue with fallback scenes
      }

      // For single scene, use simpler approach
      if (compiledScenes.length === 1) {
        const scene = compiledScenes[0];
        if (!scene) {
          // Create a fallback scene instead of throwing
          const fallbackScene = {
            isValid: false,
            compiledCode: createFallbackScene('Scene 1', 0, 'Scene compilation failed'),
            componentName: 'FallbackScene0'
          };
          compiledScenes[0] = fallbackScene;
        }
        
        const allImports = new Set(['AbsoluteFill', 'useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'random']);
        
        // If it's a valid scene, scan for Remotion functions
        if (scene.isValid) {
          const remotionFunctions = ['Sequence', 'Audio', 'Video', 'Img', 'staticFile', 'Loop', 'Series'];
          remotionFunctions.forEach(func => {
            if (scene.compiledCode.includes(func)) {
              allImports.add(func);
            }
          });
        }

        // Always include Audio and related functions if project has audio
        if (projectAudio?.url) {
          allImports.add('Audio');
          allImports.add('useCurrentFrame');
          allImports.add('interpolate');
        }
        
        const allImportsArray = Array.from(allImports);
        const singleDestructuring = `const { ${allImportsArray.join(', ')} } = window.Remotion;`;

        // Generate simple single scene composition
        const compositeCode = `
${singleDestructuring}

${scene.compiledCode}

// Single Scene Error Boundary
class SingleSceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Single scene runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Create a function component that can use hooks for the error display
      const ErrorDisplay = () => {
        const frame = useCurrentFrame();
        const { fps } = useVideoConfig();
        
        const opacity = interpolate(frame, [0, 20], [0, 1], {
          extrapolateRight: 'clamp',
        });
        
        const scale = spring({
          frame,
          fps,
          from: 0.95,
          to: 1,
          config: {
            damping: 20,
            stiffness: 40,
          },
        });
        
        return (
          <AbsoluteFill style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity,
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              maxWidth: '450px',
              textAlign: 'center',
              transform: \`scale(\${scale})\`,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
              <h3 style={{ color: '#92400e', marginBottom: '12px', fontSize: '1.25rem', fontWeight: '600' }}>
                Runtime Error
              </h3>
              <p style={{ color: '#b45309', marginBottom: '16px', fontSize: '0.875rem' }}>
                This scene encountered an error during playback
              </p>
              <details style={{ 
                marginTop: '12px',
                textAlign: 'left',
                background: '#fef3c7',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#92400e'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '500', userSelect: 'none' }}>
                  Error Details
                </summary>
                <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.8, wordBreak: 'break-word' }}>
                  {this.state.error?.message || 'Unknown error'}
                </div>
              </details>
            </div>
          </AbsoluteFill>
        );
      };
      
      return React.createElement(ErrorDisplay);
    }

    return React.createElement(${scene.componentName});
  }
}

// Enhanced Audio Component with Fade Effects
const EnhancedAudio = ({ audioData }) => {
  const frame = useCurrentFrame();
  const startFrame = Math.floor(audioData.startTime * 30);
  const endFrame = Math.floor(audioData.endTime * 30);
  const fadeInFrames = Math.floor((audioData.fadeInDuration || 0) * 30);
  const fadeOutFrames = Math.floor((audioData.fadeOutDuration || 0) * 30);
  const duration = endFrame - startFrame;
  
  // Calculate volume with fade effects
  let volume = audioData.volume;
  
  // Apply fade in
  if (fadeInFrames > 0 && frame < startFrame + fadeInFrames) {
    volume *= interpolate(
      frame,
      [startFrame, startFrame + fadeInFrames],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Apply fade out
  if (fadeOutFrames > 0 && frame > endFrame - fadeOutFrames) {
    volume *= interpolate(
      frame,
      [endFrame - fadeOutFrames, endFrame],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Only render if Audio is available
  if (typeof Audio === 'undefined' || !Audio) {
    return null;
  }
  
  return React.createElement(Audio, {
    src: audioData.url,
    startFrom: startFrame,
    endAt: endFrame,
    volume: volume,
    playbackRate: audioData.playbackRate || 1
  });
};

export default function SingleSceneComposition() {
  // Get audio from props
  const projectAudio = window.projectAudio;
  
  return React.createElement(AbsoluteFill, {},
    projectAudio && projectAudio.url && React.createElement(EnhancedAudio, { audioData: projectAudio }),
    React.createElement(SingleSceneErrorBoundary)
  );
}
        `;

        console.log('[PreviewPanelG] Generated single scene code:', compositeCode);

        // Transform with Sucrase
        const { code: transformedCode } = transform(compositeCode, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });

        // Sucrase transformation successful
        
        // Cleanup old blob URL before creating new one
        if (componentBlobUrl) {
          URL.revokeObjectURL(componentBlobUrl);
        }
        
        // Create blob URL
        const blob = new Blob([transformedCode], { type: 'application/javascript' });
        const newBlobUrl = URL.createObjectURL(blob);
        setComponentBlobUrl(newBlobUrl);
        
        // Created new single scene blob URL
        
        // Set audio data in window before importing
        const projectState = useVideoState.getState().projects[projectId];
        (window as any).projectAudio = projectState?.audio || null;
        
        // Import the module
        // Importing single scene module
        const module = await import(/* webpackIgnore: true */ newBlobUrl);
        const Component = module.default;
        
        if (!Component) {
          throw new Error('No default export found in generated component');
        }
        
        // Single scene dynamic import successful
        
        // 🚨 CRITICAL: Force new refresh token to guarantee RemotionPreview remount
        const newRefreshToken = `compiled-single-${Date.now()}-${Math.random()}`;
        setRefreshToken(newRefreshToken);
        // Set new refresh token for single scene
        
        setComponentImporter(() => () => Promise.resolve({ default: Component }));
        
      } else {
        // Multi-scene composition logic with compiled scenes
        const sceneImports: string[] = [];
        const sceneComponents: string[] = [];
        const totalDuration = scenesWithCode.reduce((sum, scene) => sum + (scene.duration || 150), 0);
        const allImports = new Set(['Series', 'AbsoluteFill', 'Loop', 'Audio', 'useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'random']);

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
      // Create a function component that can use hooks for the error display
      const ErrorDisplay = () => {
        const { useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
        const frame = useCurrentFrame();
        const { fps } = useVideoConfig();
        
        const opacity = interpolate(frame, [0, 20], [0, 1], {
          extrapolateRight: 'clamp',
        });
        
        const scale = spring({
          frame,
          fps,
          from: 0.95,
          to: 1,
          config: {
            damping: 20,
            stiffness: 40,
          },
        });
        
        return React.createElement('div', {
          style: {
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity,
          }
        }, 
          React.createElement('div', {
            style: {
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              maxWidth: '450px',
              textAlign: 'center',
              transform: \`scale(\${scale})\`,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            }
          }, [
            React.createElement('div', {
              key: 'icon',
              style: { 
                fontSize: '3rem', 
                marginBottom: '1rem',
              }
            }, '⚡'),
            
            React.createElement('h3', {
              key: 'title',
              style: { 
                color: '#92400e', 
                marginBottom: '12px',
                fontSize: '1.25rem',
                fontWeight: '600'
              }
            }, 'Scene ${index + 1} Runtime Error'),
            
            React.createElement('p', {
              key: 'scene-name',
              style: { 
                color: '#b45309', 
                marginBottom: '8px',
                fontSize: '0.875rem',
                fontWeight: '500'
              }
            }, '${(originalScene.data as any)?.name || 'Unnamed Scene'}'),
            
            React.createElement('p', {
              key: 'msg',
              style: { 
                color: '#92400e', 
                marginBottom: '16px',
                fontSize: '0.875rem',
                opacity: 0.8
              }
            }, 'This scene crashed during playback, but other scenes continue normally.'),
            
            React.createElement('button', {
              key: 'autofix',
              onClick: () => {
                const autoFixEvent = new CustomEvent('trigger-autofix', {
                  detail: {
                    sceneId: '${originalScene.id}',
                    sceneName: '${(originalScene.data as any)?.name || `Scene ${index + 1}`}',
                    sceneIndex: ${index + 1},
                    error: this.state.error
                  }
                });
                window.dispatchEvent(autoFixEvent);
              },
              style: {
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '0.625rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '1rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.2s'
              }
            }, '✨ Auto-Fix Scene'),
            
            React.createElement('div', {
              key: 'status',
              style: { 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: '#059669',
                fontSize: '0.75rem',
                fontWeight: '500',
              }
            }, [
              React.createElement('span', {
                key: 'dot',
                style: { 
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#059669',
                  display: 'inline-block'
                }
              }),
              'Other scenes playing normally'
            ]),
            
            React.createElement('details', {
              key: 'error-details',
              style: { 
                marginTop: '12px',
                textAlign: 'left',
                background: '#fef3c7',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#92400e'
              }
            }, [
              React.createElement('summary', {
                key: 'summary',
                style: { 
                  cursor: 'pointer',
                  fontWeight: '500',
                  userSelect: 'none'
                }
              }, 'Error Details'),
              React.createElement('div', {
                key: 'error-text',
                style: { 
                  marginTop: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  opacity: 0.8,
                  wordBreak: 'break-word'
                }
              }, this.state.error?.message || 'Unknown error')
            ])
          ])
        );
      };
      
      return React.createElement(ErrorDisplay);
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
              // Scene isolation: failed compilation, using safe fallback
              
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
  const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;
  const frame = useCurrentFrame();
  
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  return React.createElement(AbsoluteFill, {
    style: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    }
  }, 
    React.createElement('div', {
      style: {
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        maxWidth: '380px',
        textAlign: 'center',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }
    }, [
      React.createElement('div', {
        key: 'icon',
        style: { 
          fontSize: '2.5rem', 
          marginBottom: '0.75rem',
        }
      }, '🚧'),
      
      React.createElement('h3', {
        key: 'title',
        style: { 
          color: '#dc2626', 
          marginBottom: '8px',
          fontSize: '1.125rem',
          fontWeight: '600'
        }
      }, 'Scene ${index + 1} Unavailable'),
      
      React.createElement('p', {
        key: 'msg',
        style: { 
          color: '#b91c1c', 
          marginBottom: '12px',
          fontSize: '0.875rem',
          opacity: 0.9
        }
      }, 'This scene encountered critical errors during processing.'),
      
      React.createElement('div', {
        key: 'status',
        style: { 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#dcfce7',
          color: '#166534',
          fontSize: '0.75rem',
          fontWeight: '500',
          padding: '4px 12px',
          borderRadius: '9999px',
        }
      }, [
        React.createElement('span', {
          key: 'dot',
          style: { 
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#166534',
            display: 'inline-block'
          }
        }),
        'Other scenes continue normally'
      ])
    ])
  );
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
        // Always include Audio and related functions if project has audio
        if (projectAudio?.url) {
          allImports.add('Audio');
          allImports.add('useCurrentFrame');
          allImports.add('interpolate');
        }
        
        const allImportsArray = Array.from(allImports);
        const singleDestructuring = `const { ${allImportsArray.join(', ')} } = window.Remotion;`;

        // Generate the composite code with single destructuring at top
        const compositeCode = `
${singleDestructuring}

${sceneImports.join('\n\n')}

// Enhanced Audio Component with Fade Effects
const EnhancedAudio = ({ audioData }) => {
  const frame = useCurrentFrame();
  const startFrame = Math.floor(audioData.startTime * 30);
  const endFrame = Math.floor(audioData.endTime * 30);
  const fadeInFrames = Math.floor((audioData.fadeInDuration || 0) * 30);
  const fadeOutFrames = Math.floor((audioData.fadeOutDuration || 0) * 30);
  
  // Calculate volume with fade effects
  let volume = audioData.volume;
  
  // Apply fade in
  if (fadeInFrames > 0 && frame < startFrame + fadeInFrames) {
    volume *= interpolate(
      frame,
      [startFrame, startFrame + fadeInFrames],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Apply fade out
  if (fadeOutFrames > 0 && frame > endFrame - fadeOutFrames) {
    volume *= interpolate(
      frame,
      [endFrame - fadeOutFrames, endFrame],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Only render if Audio is available
  if (typeof Audio === 'undefined' || !Audio) {
    return null;
  }
  
  return React.createElement(Audio, {
    src: audioData.url,
    startFrom: startFrame,
    endAt: endFrame,
    volume: volume,
    playbackRate: audioData.playbackRate || 1
  });
};

export default function MultiSceneComposition() {
  // Get audio from props
  const projectAudio = window.projectAudio;
  
  return (
    <AbsoluteFill>
      {projectAudio && projectAudio.url && React.createElement(EnhancedAudio, { audioData: projectAudio })}
      <Loop durationInFrames={${totalDuration}}>
        <Series>
          ${sceneComponents.join('\n          ')}
        </Series>
      </Loop>
    </AbsoluteFill>
  );
}
        `;

        // Generated multi-scene composite code

        // Transform with Sucrase
        const { code: transformedCode } = transform(compositeCode, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });

        // Sucrase transformation successful
        
        // Cleanup old blob URL before creating new one
        if (componentBlobUrl) {
          URL.revokeObjectURL(componentBlobUrl);
        }
        
        // Create blob URL
        const blob = new Blob([transformedCode], { type: 'application/javascript' });
        const newBlobUrl = URL.createObjectURL(blob);
        setComponentBlobUrl(newBlobUrl);
        
        // Created new multi-scene blob URL
        
        // Set audio data in window before importing
        const projectState = useVideoState.getState().projects[projectId];
        (window as any).projectAudio = projectState?.audio || null;
        
        // Import the module
        // Importing multi-scene module
        const module = await import(/* webpackIgnore: true */ newBlobUrl);
        const Component = module.default;
        
        if (!Component) {
          throw new Error('No default export found in generated component');
        }
        
        // Multi-scene dynamic import successful
        
        // 🚨 CRITICAL: Force new refresh token to guarantee RemotionPreview remount
        const newRefreshToken = `compiled-multi-${Date.now()}-${Math.random()}`;
        setRefreshToken(newRefreshToken);
        // Set new refresh token for multi scene
        
        setComponentImporter(() => () => Promise.resolve({ default: Component }));
      }
      
    } catch (error) {
      console.error('[PreviewPanelG] Error during composition compilation:', error);
      
      // Try to identify which scene might be causing the issue
      let problematicSceneInfo = null;
      if (error instanceof Error) {
        problematicSceneInfo = detectProblematicScene(error, compiledScenes, scenesWithCode);
        
        if (problematicSceneInfo) {
          const enhancedMessage = enhanceErrorMessage(error, problematicSceneInfo);
          console.error('[PreviewPanelG] Scene-specific error detected:', enhancedMessage);
          
          // Create a more informative error
          error = new Error(enhancedMessage);
        }
      }
      
      // 🚨 CRITICAL FIX: Dispatch error event for autofixer when compilation fails
      if (problematicSceneInfo) {
        // We know which specific scene is problematic
        const problematicScene = scenesWithCode[problematicSceneInfo.sceneIndex];
        if (problematicScene) {
          // Compilation error: dispatching error for specific scene
          const errorEvent = new CustomEvent('preview-scene-error', {
            detail: {
              sceneId: problematicSceneInfo.sceneId,
              sceneName: problematicSceneInfo.sceneName,
              sceneIndex: problematicSceneInfo.sceneIndex + 1,
              error: error
            }
          });
          window.dispatchEvent(errorEvent);
        }
      } else {
        // Fallback to first scene if we can't identify the specific one
        const firstSceneWithCode = scenesWithCode[0];
        if (firstSceneWithCode) {
          // Compilation error: dispatching preview-scene-error event for autofixer
          const errorEvent = new CustomEvent('preview-scene-error', {
            detail: {
              sceneId: firstSceneWithCode.id,
              sceneName: (firstSceneWithCode.data as any)?.name || 'Scene 1',
              error: error
            }
          });
          window.dispatchEvent(errorEvent);
        }
      }
      
      // IDIOT PROOF: Create a simple fallback that always works
      try {
        // Creating fallback composition
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
          ⚡ Oops, it broke
        </h2>
        <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
          But don't worry, we already have an agent on it.
        </p>
        <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
          Give it a couple of seconds.
        </p>
        <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.5', fontWeight: 'bold' }}>
          Thanks for reading. You are awesome! 🎉
        </p>
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
          // Fallback error: dispatching preview-scene-error event for autofixer
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

  // 🚨 FIX: Debounced compilation to prevent multiple rapid recompiles
  const [compilationDebounceTimer, setCompilationDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (scenes.length > 0) {
      // Clear existing timer
      if (compilationDebounceTimer) {
        clearTimeout(compilationDebounceTimer);
      }
      
      // Set new debounced timer
      const timer = setTimeout(() => {
        // Scenes changed (debounced), recompiling
        compileMultiSceneComposition();
      }, 100); // 100ms debounce
      
      setCompilationDebounceTimer(timer);
    }
    
    // Cleanup on unmount
    return () => {
      if (compilationDebounceTimer) {
        clearTimeout(compilationDebounceTimer);
      }
    };
  }, [scenesFingerprint, audioFingerprint, compileMultiSceneComposition]);


  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (scenes.length > 0) {
      // Manual refresh - recompiling multi-scene
      compileMultiSceneComposition();
    }
  }, [compileMultiSceneComposition]);

  // Listen for playback speed change events from header
  useEffect(() => {
    const handleSpeedChange = (event: CustomEvent) => {
      const speed = event.detail?.speed;
      if (typeof speed === 'number' && speed >= 0.1 && speed <= 4) {
        // Received speed change event
        setPlaybackSpeed(speed);
        
        // Save preference per project
        try {
          localStorage.setItem(`bazaar-playback-speed-${projectId}`, speed.toString());
        } catch (error) {
          console.warn('[PreviewPanelG] Failed to save playback speed preference:', error);
        }
      }
    };

    window.addEventListener('playback-speed-change', handleSpeedChange as EventListener);
    return () => {
      window.removeEventListener('playback-speed-change', handleSpeedChange as EventListener);
    };
  }, [projectId]);

  // Load saved playback speed preference on mount (project-specific)
  useEffect(() => {
    try {
      const savedSpeed = localStorage.getItem(`bazaar-playback-speed-${projectId}`);
      if (savedSpeed) {
        const speed = parseFloat(savedSpeed);
        if (speed >= 0.1 && speed <= 4) {
          setPlaybackSpeed(speed);
          // Loaded saved playback speed for project
          
          // Dispatch event to update header display
          const event = new CustomEvent('playback-speed-loaded', { detail: { speed } });
          window.dispatchEvent(event);
        }
      } else {
        // Reset to default speed when switching projects
        setPlaybackSpeed(1);
        const event = new CustomEvent('playback-speed-loaded', { detail: { speed: 1 } });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.warn('[PreviewPanelG] Failed to load playback speed preference:', error);
      // Reset to default on error
      setPlaybackSpeed(1);
    }
  }, [projectId]);

  // Listen for scenes created in bulk
  useEffect(() => {
    const handleScenesCreatedBulk = (event: CustomEvent) => {
      if (event.detail?.projectId === projectId) {
        // Bulk scenes created, refreshing
        // Force a re-render by updating refresh token
        setRefreshToken(`bulk-${Date.now()}`);
        // Recompile the scenes
        if (scenes.length > 0 || event.detail?.count > 0) {
          setTimeout(() => {
            compileMultiSceneComposition();
          }, 500); // Small delay to ensure data is synced
        }
      }
    };

    const handleSceneCreated = (event: CustomEvent) => {
      if (event.detail?.projectId === projectId) {
        // Single scene created, refreshing
        setRefreshToken(`single-${Date.now()}`);
        if (scenes.length > 0) {
          setTimeout(() => {
            compileMultiSceneComposition();
          }, 500);
        }
      }
    };

    window.addEventListener('scenes-created-bulk', handleScenesCreatedBulk as EventListener);
    window.addEventListener('scene-created', handleSceneCreated as EventListener);
    return () => {
      window.removeEventListener('scenes-created-bulk', handleScenesCreatedBulk as EventListener);
      window.removeEventListener('scene-created', handleSceneCreated as EventListener);
    };
  }, [projectId, compileMultiSceneComposition, scenes.length]);

  // Listen for loop state change events from header
  useEffect(() => {
    const handleLoopStateChange = (event: CustomEvent) => {
      const state = event.detail?.state;
      if (state === 'video' || state === 'off' || state === 'scene') {
        // Received loop state change
        setLoopState(state);
        
        // Save preference per project
        try {
          localStorage.setItem(`bazaar-loop-state-${projectId}`, state);
        } catch (error) {
          console.warn('[PreviewPanelG] Failed to save loop state preference:', error);
        }
      }
    };

    window.addEventListener('loop-state-change', handleLoopStateChange as EventListener);
    return () => {
      window.removeEventListener('loop-state-change', handleLoopStateChange as EventListener);
    };
  }, [projectId]);

  // Load saved loop preference on mount (project-specific)
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(`bazaar-loop-state-${projectId}`);
      let state: 'video' | 'off' | 'scene' = 'video'; // Default to video loop
      
      if (savedState === 'video' || savedState === 'off' || savedState === 'scene') {
        state = savedState;
      }
      
      setLoopState(state);
      
      // Dispatch event to sync with header
      const event = new CustomEvent('loop-state-loaded', { detail: { state } });
      window.dispatchEvent(event);
      // Loop state initialized for project
    } catch (error) {
      console.warn('[PreviewPanelG] Failed to load loop preference:', error);
      // Even on error, ensure default video loop
      setLoopState('video');
    }
  }, [projectId]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Cleanup blob URLs to prevent memory leaks
      if (componentBlobUrl) {
        URL.revokeObjectURL(componentBlobUrl);
      }
      
      // Event listeners are already cleaned up in their respective useEffects
      // but we could add additional cleanup here if needed
    };
  }, [componentBlobUrl]);

  // Player props
  const playerProps = useMemo(() => {
    if (!scenes.length) return null;
    
    // Calculate total duration of all scenes for proper multi-scene playback
    const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 150), 0);
    
    // Get format dimensions from project props, fallback to landscape
    const width = currentProps?.meta?.width || 1920;
    const height = currentProps?.meta?.height || 1080;
    const format = currentProps?.meta?.format || 'landscape';
    
    return {
      fps: 30,
      width,
      height,
      format,
      durationInFrames: totalDuration, // Use total duration, not just last scene
      inputProps: {}
    };
  }, [scenes, currentProps?.meta]);
  
  // Get format icon
  const formatIcon = useMemo(() => {
    const format = currentProps?.meta?.format || 'landscape';
    switch (format) {
      case 'portrait': return '📱';
      case 'square': return '□';
      default: return '🖥️';
    }
  }, [currentProps?.meta?.format]);

  return (
    <div className="h-full flex flex-col bg-gray-100 relative overflow-hidden">
      {/* Hidden refresh button that the upper header can trigger */}
      <button 
        id="refresh-preview-button-g"
        onClick={handleRefresh}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      
      <div className="relative flex-grow flex items-center justify-center">
        {componentImporter && playerProps ? (
          <div 
            className={cn(
              "relative bg-black shadow-xl flex items-center justify-center",
              // On mobile, optimize for viewport
              "w-full h-full"
            )}
          >
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
          </div>
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