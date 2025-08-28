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
  
  // Get audio data from project state
  const projectAudio = useVideoState((state) => state.projects[projectId]?.audio);
  
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

  // NOTE: Auto-fix hook is now only used in ChatPanelG to avoid duplicate event listeners
  // PreviewPanelG only dispatches errors, ChatPanelG handles the fixing
  
  // Update VideoState when database scenes change
  const { replace } = useVideoState();
  const [lastSyncedSceneIds, setLastSyncedSceneIds] = useState<string>('');
  const [syncDebounceTimer, setSyncDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (dbScenes && dbScenes.length > 0 && currentProps) {
      // 🚨 FIX: Check if scenes have actually changed to prevent redundant syncs
      const currentSceneIds = dbScenes.map(s => `${s.id}-${s.updatedAt}`).join(',');
      
      if (currentSceneIds === lastSyncedSceneIds) {
        // Database scenes unchanged, skipping sync
        return;
      }
      
      // 🔍 SMART SYNC: Check if VideoState already has the same scenes
      const stateSceneIds = currentProps.scenes?.map((s: any) => s.id).sort().join(',') || '';
      const dbSceneIdsOnly = dbScenes.map(s => s.id).sort().join(',');
      
      if (stateSceneIds === dbSceneIdsOnly) {
        // VideoState already has these scenes, just update sync tracker
        console.log('[PreviewPanelG] 🎯 VideoState already up-to-date, skipping redundant sync');
        setLastSyncedSceneIds(currentSceneIds);
        return;
      }
      
      // Clear existing sync timer
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }
      
      // Debounce the sync to avoid rapid updates
      const timer = setTimeout(() => {
        console.log('[PreviewPanelG] 🔄 Database scenes changed, syncing to VideoState...');
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
        
        // Check if there's a local scene with this ID
        const localScene = currentProps.scenes?.find((s: any) => s.id === dbScene.id);
        const localName = (localScene as any)?.name || localScene?.data?.name;
        
        const scene = {
          id: dbScene.id,
          type: 'custom' as const,
          start: currentStart,
          duration: sceneDuration,
          // Preserve local name if it exists and is different from DB name
          name: localName || dbScene.name,
          data: {
            code: dbScene.tsxCode,
            // Also preserve local name in data for backward compatibility
            name: localName || dbScene.name,
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
      }, 300); // 300ms debounce for DB sync
      
      setSyncDebounceTimer(timer);
    }
    
    // Cleanup on unmount or deps change
    return () => {
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }
    };
  }, [dbScenes, projectId, currentProps, lastSyncedSceneIds]);
  
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
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Loop state - using the three-state system
  const [loopState, setLoopState] = useState<'video' | 'off' | 'scene'>('video');
  
  // Fonts are now loaded via CSS - no JavaScript loading needed
  // All 99 Google Fonts are available through fonts.css imported in MainCompositionSimple
  
  // Get scenes from reactive state
  const scenes = currentProps?.scenes || [];
  
  // Force preview refresh when audio settings change
  useEffect(() => {
    if (projectAudio) {
      setRefreshToken(`audio-${Date.now()}`);
    }
  }, [projectAudio?.fadeInDuration, projectAudio?.fadeOutDuration, projectAudio?.playbackRate, projectAudio?.volume, projectAudio?.startTime, projectAudio?.endTime]);

  // Broadcast current frame to header for external counter
  useEffect(() => {
    const interval = window.setInterval(() => {
      try {
        const frame = (playerRef.current as any)?.getCurrentFrame?.();
        if (typeof frame === 'number') {
          const ev = new CustomEvent('preview-frame-update', { detail: { frame } });
          window.dispatchEvent(ev);
          setCurrentFrame(frame);
        }
      } catch {}
    }, Math.max(1000 / 30, 16));
    return () => window.clearInterval(interval);
  }, []);
  
  // Listen for Timeline events
  useEffect(() => {
    const handleTimelineSeek = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.frame === 'number' && playerRef.current) {
        try {
          const frame = Math.round(event.detail.frame); // Ensure integer frame
          console.log('[PreviewPanelG] Timeline seek to frame:', frame);
          
          // Remotion Player's seekTo expects frame number directly
          playerRef.current.seekTo(frame);
          setCurrentFrame(frame); // Update local state
          
          console.log('[PreviewPanelG] Seek completed, updating timeline');
          
          // Force a frame update event after seek completes
          // This ensures the timeline updates to the new position
          setTimeout(() => {
            const updateEvent = new CustomEvent('preview-frame-update', { 
              detail: { frame: frame }
            });
            window.dispatchEvent(updateEvent);
          }, 50); // Reduced timeout for faster response
        } catch (error) {
          console.error('[PreviewPanelG] Failed to seek:', error);
        }
      }
    };
    
    const handleTimelinePlayPause = () => {
      console.log('[PreviewPanelG] Received timeline play/pause event, current isPlaying:', isPlaying);
      if (playerRef.current) {
        try {
          // Use our state variable instead of trying to get player state
          if (isPlaying) {
            playerRef.current.pause();
            setIsPlaying(false);
            // Dispatch play state change event
            const event = new CustomEvent('preview-play-state-change', { 
              detail: { playing: false }
            });
            window.dispatchEvent(event);
          } else {
            playerRef.current.play();
            setIsPlaying(true);
            // Dispatch play state change event
            const event = new CustomEvent('preview-play-state-change', { 
              detail: { playing: true }
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          console.warn('Failed to play/pause from timeline:', error);
        }
      }
    };
    
    window.addEventListener('timeline-seek' as any, handleTimelineSeek);
    window.addEventListener('timeline-play-pause' as any, handleTimelinePlayPause);
    
    return () => {
      window.removeEventListener('timeline-seek' as any, handleTimelineSeek);
      window.removeEventListener('timeline-play-pause' as any, handleTimelinePlayPause);
    };
  }, [isPlaying, setCurrentFrame]);

  // (moved below selectedSceneRange definition to avoid TDZ)
  
  // Memoized scene fingerprint to prevent unnecessary re-renders
  const scenesFingerprint = useMemo(() => {
    // Check both possible code locations and use actual code content hash
    return scenes.map(s => {
      const code = (s.data as any)?.code || (s.data as any)?.tsxCode || '';
      // Create stable fingerprint including id, duration, and code hash
      // Use code length + first 200 chars to detect changes while being stable
      const codeHash = code ? `${code.length}-${code.substring(0, 200).replace(/\s+/g, '')}` : 'empty';
      return `${s.id}-${s.duration || 150}-${codeHash}`;
    }).join('|');
  }, [scenes]);
  
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

  // Ensure when entering scene-loop or changing selected scene, playback seeks to the start
  useEffect(() => {
    if (loopState === 'scene' && selectedSceneRange && playerRef.current) {
      try {
        playerRef.current.seekTo(selectedSceneRange.start);
      } catch {}
    }
  }, [loopState, selectedSceneRange?.start]);

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
      let transformedCode: string;
      try {
        const result = transform(testCompositeCode, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });
        transformedCode = result.code;
      } catch (syntaxError) {
        // Sucrase compilation failed - this is a syntax error
        console.error(`[PreviewPanelG] ❌ Scene ${index} (${sceneName}) has SYNTAX ERROR:`, syntaxError);
        console.log('[PreviewPanelG] Dispatching preview-scene-error event for auto-fix');
        
        // Still dispatch the error event for auto-fix
        const errorMessage = syntaxError instanceof Error ? syntaxError.message : 'Syntax error in scene code';
        const errorEvent = new CustomEvent('preview-scene-error', {
          detail: {
            sceneId,
            sceneName,
            sceneIndex: index + 1,
            error: new Error(`Syntax Error in ${sceneName}: ${errorMessage}`)
          }
        });
        window.dispatchEvent(errorEvent);
        console.log('[PreviewPanelG] Error event dispatched for scene:', sceneId);
        
        // Re-throw to handle in outer catch
        throw syntaxError;
      }

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
        borderRadius: '24px',
        padding: '56px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        maxWidth: '680px',
        textAlign: 'center',
        transform: \`scale(\${scale})\`,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Status Badge */}
        <div style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'white',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          AI FIXING IN PROGRESS
        </div>
        
        {/* Animated icon */}
        <div style={{ 
          fontSize: '4.5rem', 
          marginBottom: '2rem',
          transform: \`translateY(\${iconFloat}px)\`,
          transition: 'transform 0.3s ease',
        }}>
          🤖
        </div>
        
        <h3 style={{ 
          color: '#111827', 
          marginBottom: '12px',
          fontSize: '1.875rem',
          fontWeight: '800',
          letterSpacing: '-0.02em',
        }}>
          Compilation Issue Detected
        </h3>
        
        <p style={{ 
          color: '#4b5563', 
          marginBottom: '8px',
          fontSize: '1.125rem',
          lineHeight: '1.5',
          fontWeight: '500',
        }}>
          Scene: <strong style={{ color: '#111827' }}>${sceneName || `Scene ${sceneIndex + 1}`}</strong>
        </p>
        
        <p style={{ 
          color: '#6b7280', 
          marginBottom: '32px',
          fontSize: '1rem',
          lineHeight: '1.6',
          maxWidth: '500px',
          margin: '16px auto 32px',
        }}>
          The AI-generated code has a compilation error that prevents it from running.
          <strong style={{ color: '#059669', display: 'block', marginTop: '12px' }}>
            Good news: Our AI agent is already working on a fix and will automatically update your video when ready!
          </strong>
        </p>
        
        {/* Progress indicator */}
        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              animation: 'spin 1s linear infinite',
            }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                Auto-Fix Agent Active
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Analyzing and repairing code...
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '8px',
          }}>
            This usually takes 15-30 seconds
          </div>
        </div>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#10b981',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '24px',
        }}>
          <span style={{ 
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'inline-block',
          }} />
          Other scenes continue playing normally
        </div>
        
        ${errorDetails ? `
        <div style={{ 
          marginTop: '24px',
          padding: '16px',
          background: '#fef2f2',
          borderRadius: '12px',
          border: '1px solid #fecaca',
          textAlign: 'left',
        }}>
          <div style={{ 
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#991b1b',
            marginBottom: '8px',
          }}>
            Technical Details:
          </div>
          <div style={{ 
            fontSize: '0.7rem',
            color: '#dc2626',
            fontFamily: 'monospace',
            lineHeight: '1.5',
            wordBreak: 'break-word',
            maxHeight: '120px',
            overflowY: 'auto',
          }}>
            ${errorDetails}
          </div>
        </div>
        ` : ''}
        
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#9ca3af', 
          marginTop: '24px', 
          fontStyle: 'italic',
          maxWidth: '420px',
          margin: '24px auto 0',
          lineHeight: '1.5',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb',
        }}>
          "If you're not embarrassed by the first version of your product, you've launched too late."
          <br />
          <span style={{ fontWeight: '500' }}>— Reid Hoffman</span>
        </div>
      </div>
      
      <style jsx>{\`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      \`}</style>
      
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
// Preserve native Audio constructor for scenes that might need it
const NativeAudio = window.NativeAudio || window.Audio;

// Create a wrapper component that loads fonts before rendering the scene
const FontLoader = ({ children }) => {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  
  React.useEffect(() => {
    // Inject font styles directly into the document
    if (!document.getElementById('bazaar-preview-fonts')) {
      const style = document.createElement('style');
      style.id = 'bazaar-preview-fonts';
      style.textContent = \`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
      \`;
      document.head.appendChild(style);
      
      // Wait a bit for fonts to load
      setTimeout(() => setFontsLoaded(true), 100);
    } else {
      setFontsLoaded(true);
    }
  }, []);
  
  // Show loading state while fonts load
  if (!fontsLoaded) {
    return React.createElement(AbsoluteFill, {
      style: { backgroundColor: 'white' }
    });
  }
  
  return children;
};

// Create a REAL implementation of RemotionGoogleFonts that actually loads fonts
if (!window.RemotionGoogleFontsLoaded) {
  window.RemotionGoogleFontsLoaded = new Set();
}

window.RemotionGoogleFonts = {
  loadFont: (fontFamily, options) => {
    const fontKey = \`\${fontFamily}-\${JSON.stringify(options?.weights || [])}\`;
    
    if (!window.RemotionGoogleFontsLoaded.has(fontKey)) {
      window.RemotionGoogleFontsLoaded.add(fontKey);
      
      // Build the Google Fonts URL with the specific weights
      const weights = options?.weights || ['400'];
      const weightString = weights.join(';');
      const fontUrl = \`https://fonts.googleapis.com/css2?family=\${fontFamily.replace(' ', '+')}:wght@\${weightString}&display=swap\`;
      
      // Create and inject the font link
      const linkId = \`font-\${fontFamily}-\${weightString}\`.replace(/[^a-zA-Z0-9-]/g, '');
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
        console.log(\`[PreviewPanelG] Loading font: \${fontFamily} with weights \${weights.join(', ')}\`);
        
        // Force font loading by checking if it's available
        if (document.fonts && document.fonts.check) {
          setTimeout(() => {
            weights.forEach(weight => {
              const testString = \`\${weight} 16px "\${fontFamily}"\`;
              if (!document.fonts.check(testString)) {
                console.log(\`[PreviewPanelG] Font not yet loaded: \${testString}\`);
                // Try to trigger loading by using the font
                const testDiv = document.createElement('div');
                testDiv.style.fontFamily = \`"\${fontFamily}", sans-serif\`;
                testDiv.style.fontWeight = weight;
                testDiv.style.position = 'absolute';
                testDiv.style.visibility = 'hidden';
                testDiv.textContent = 'Test';
                document.body.appendChild(testDiv);
                setTimeout(() => document.body.removeChild(testDiv), 100);
              } else {
                console.log(\`[PreviewPanelG] Font confirmed loaded: \${testString}\`);
              }
            });
          }, 500); // Give time for CSS to load
        }
      }
    }
    
    // Return a mock result similar to @remotion/google-fonts
    return {
      fontFamily: fontFamily,
      fonts: {},
      unicodeRanges: {},
      waitUntilDone: () => Promise.resolve()
    };
  }
};

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
              borderRadius: '24px',
              padding: '48px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              maxWidth: '640px',
              textAlign: 'center',
              transform: \`scale(\${scale})\`,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              position: 'relative',
            }}>
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                AI FIXING IN PROGRESS
              </div>
              
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚡</div>
              <h3 style={{ color: '#92400e', marginBottom: '12px', fontSize: '1.75rem', fontWeight: '700' }}>
                Runtime Error Detected
              </h3>
              <p style={{ color: '#b45309', marginBottom: '8px', fontSize: '1.125rem', fontWeight: '500' }}>
                Scene crashed during playback
              </p>
              <p style={{ 
                color: '#6b7280', 
                marginBottom: '32px',
                fontSize: '1rem',
                lineHeight: '1.6',
                maxWidth: '480px',
                margin: '16px auto 32px',
              }}>
                The scene compiled successfully but encountered an error while running.
                <strong style={{ color: '#059669', display: 'block', marginTop: '12px' }}>
                  Don't worry! Our AI agent is automatically fixing this and will update your video shortly.
                </strong>
              </p>
              
              {/* Progress indicator */}
              <div style={{
                background: '#fef3c7',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '3px solid #fed7aa',
                    borderTopColor: '#f59e0b',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e' }}>
                      Auto-Fix Agent Working
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                      Debugging and repairing...
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#92400e',
                  marginTop: '8px',
                }}>
                  Typically resolves in 15-30 seconds
                </div>
              </div>
              
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#10b981',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '24px',
              }}>
                <span style={{ 
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                }} />
                Your other scenes are playing normally
              </div>
              
              <div style={{ 
                marginTop: '24px',
                padding: '16px',
                background: '#fef2f2',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                textAlign: 'left',
              }}>
                <div style={{ 
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#991b1b',
                  marginBottom: '8px',
                }}>
                  Technical Details:
                </div>
                <div style={{ 
                  fontSize: '0.7rem',
                  color: '#dc2626',
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  maxHeight: '100px',
                  overflowY: 'auto',
                }}>
                  {this.state.error?.message || 'Unknown error'}
                </div>
              </div>
            </div>
            
            <style jsx>{\`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            \`}</style>
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
  
  return React.createElement(FontLoader, {},
    React.createElement(AbsoluteFill, {},
      projectAudio && projectAudio.url && React.createElement(EnhancedAudio, { audioData: projectAudio }),
      React.createElement(SingleSceneErrorBoundary)
    )
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
              borderRadius: '24px',
              padding: '48px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              maxWidth: '640px',
              textAlign: 'center',
              transform: \`scale(\${scale})\`,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              position: 'relative',
            }
          }, [
            // Status Badge
            React.createElement('div', {
              key: 'badge',
              style: {
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }
            }, [
              React.createElement('span', {
                key: 'pulse',
                style: {
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }
              }),
              'AI FIXING IN PROGRESS'
            ]),
            
            React.createElement('div', {
              key: 'icon',
              style: { 
                fontSize: '4rem', 
                marginBottom: '1.5rem',
              }
            }, '⚡'),
            
            React.createElement('h3', {
              key: 'title',
              style: { 
                color: '#92400e', 
                marginBottom: '12px',
                fontSize: '1.75rem',
                fontWeight: '700'
              }
            }, 'Runtime Error - Scene ${index + 1}'),
            
            React.createElement('p', {
              key: 'scene-name',
              style: { 
                color: '#b45309', 
                marginBottom: '8px',
                fontSize: '1.125rem',
                fontWeight: '500'
              }
            }, '${(originalScene.data as any)?.name || 'Unnamed Scene'}'),
            
            React.createElement('p', {
              key: 'msg',
              style: { 
                color: '#6b7280', 
                marginBottom: '32px',
                fontSize: '1rem',
                lineHeight: '1.6',
                maxWidth: '480px',
                margin: '16px auto 32px',
              }
            }, [
              'The scene compiled successfully but crashed during playback.',
              React.createElement('strong', {
                key: 'good-news',
                style: { color: '#059669', display: 'block', marginTop: '12px' }
              }, "Don't worry! Our AI agent is automatically fixing this and will update your video shortly.")
            ]),
            
            // Progress indicator
            React.createElement('div', {
              key: 'progress',
              style: {
                background: '#fef3c7',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }
            }, [
              React.createElement('div', {
                key: 'progress-content',
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }
              }, [
                React.createElement('div', {
                  key: 'spinner',
                  style: {
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '3px solid #fed7aa',
                    borderTopColor: '#f59e0b',
                    animation: 'spin 1s linear infinite',
                  }
                }),
                React.createElement('div', {
                  key: 'progress-text',
                  style: { textAlign: 'left' }
                }, [
                  React.createElement('div', {
                    key: 'agent-status',
                    style: { fontSize: '0.875rem', fontWeight: '600', color: '#92400e' }
                  }, 'Auto-Fix Agent Working'),
                  React.createElement('div', {
                    key: 'agent-action',
                    style: { fontSize: '0.75rem', color: '#b45309' }
                  }, 'Debugging and repairing...')
                ])
              ]),
              React.createElement('div', {
                key: 'eta',
                style: {
                  fontSize: '0.75rem',
                  color: '#92400e',
                  marginTop: '8px',
                }
              }, 'Typically resolves in 15-30 seconds')
            ]),
            
            React.createElement('div', {
              key: 'status',
              style: { 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#10b981',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '24px',
              }
            }, [
              React.createElement('span', {
                key: 'dot',
                style: { 
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block'
                }
              }),
              'Your other scenes are playing normally'
            ]),
            
            React.createElement('div', {
              key: 'error-details',
              style: { 
                marginTop: '24px',
                padding: '16px',
                background: '#fef2f2',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                textAlign: 'left',
              }
            }, [
              React.createElement('div', {
                key: 'details-title',
                style: { 
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#991b1b',
                  marginBottom: '8px',
                }
              }, 'Technical Details:'),
              React.createElement('div', {
                key: 'error-text',
                style: { 
                  fontSize: '0.7rem',
                  color: '#dc2626',
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  maxHeight: '100px',
                  overflowY: 'auto',
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
                React.createElement(Series.Sequence, { durationInFrames: ${originalScene.duration || 150}, premountFor: 60 },
                  React.createElement(${compiled.componentName}WithErrorBoundary, {})
                )
              `);
              
            } else {
              // 🚨 INVALID SCENE: Already has fallback code, just add it with error boundary
              // Scene isolation: failed compilation, using safe fallback
              
              // ✅ INVALID: Add fallback scene (compiled.compiledCode is already the fallback)
              sceneImports.push(compiled.compiledCode);
              sceneComponents.push(`
                React.createElement(Series.Sequence, { durationInFrames: ${originalScene.duration || 150}, premountFor: 60 },
                  React.createElement(${compiled.componentName}, {})
                )
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
              React.createElement(Series.Sequence, { durationInFrames: ${originalScene.duration || 150}, premountFor: 60 },
                React.createElement(EmergencyScene${index}, {})
              )
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
// Preserve native Audio constructor for scenes that might need it
const NativeAudio = window.NativeAudio || window.Audio;

// Load Google Fonts for consistent rendering between preview and export
if (typeof window !== 'undefined' && !window.bazaarFontsLoaded) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://fonts.googleapis.com';
  document.head.appendChild(link);
  
  const link2 = document.createElement('link');
  link2.rel = 'preconnect';
  link2.href = 'https://fonts.gstatic.com';
  link2.crossOrigin = 'anonymous';
  document.head.appendChild(link2);
  
  // Load comprehensive font collection in batches to avoid URL length limits
  const fontGroups = [
    // Group 1: Core Sans-Serif - Ensure Inter 700 is explicitly included
    'Inter:wght@100;200;300;400;500;600;700;800;900&family=Roboto:wght@100;300;400;500;700;900&family=Poppins:wght@100..900&family=Montserrat:wght@100..900&family=Open+Sans:wght@300..800&family=Lato:wght@100;300;400;700;900&family=Raleway:wght@100..900&family=Ubuntu:wght@300..700&family=Oswald:wght@200..700&family=Nunito:wght@200..900',
    // Group 2: Extended Sans-Serif
    'Work+Sans:wght@100..900&family=Rubik:wght@300..900&family=Barlow:wght@100..900&family=Kanit:wght@100..900&family=DM+Sans:wght@400..700&family=Plus+Jakarta+Sans:wght@200..800&family=Space+Grotesk:wght@300..700&family=Outfit:wght@100..900&family=Lexend:wght@100..900&family=Manrope:wght@200..800',
    // Group 3: Serif & Display
    'Playfair+Display:wght@400..900&family=Merriweather:wght@300..900&family=Lora:wght@400..700&family=Roboto+Slab:wght@100..900&family=Bebas+Neue&family=Permanent+Marker&family=Lobster&family=Dancing+Script:wght@400..700&family=Pacifico&family=Caveat:wght@400..700',
    // Group 4: Monospace & Additional
    'Roboto+Mono:wght@100..700&family=Fira+Code:wght@300..700&family=JetBrains+Mono:wght@100..800&family=Source+Code+Pro:wght@200..900&family=Quicksand:wght@300..700&family=Comfortaa:wght@300..700&family=Righteous&family=Anton&family=Fredoka:wght@300..700&family=Bungee'
  ];
  
  fontGroups.forEach((group, index) => {
    const fontsLink = document.createElement('link');
    fontsLink.rel = 'stylesheet';
    fontsLink.href = 'https://fonts.googleapis.com/css2?' + group + '&display=swap';
    fontsLink.setAttribute('data-font-group', String(index + 1));
    document.head.appendChild(fontsLink);
  });
  
  console.log('[Bazaar] Loading 100+ Google Fonts for consistent rendering');
  
  window.bazaarFontsLoaded = true;
  console.log('[Bazaar] Google Fonts loaded for consistent rendering');
}

// Create a wrapper component that loads fonts before rendering scenes
const FontLoader = ({ children }) => {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  
  React.useEffect(() => {
    // Inject font styles directly into the document
    if (!document.getElementById('bazaar-preview-fonts')) {
      const style = document.createElement('style');
      style.id = 'bazaar-preview-fonts';
      style.textContent = \`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
      \`;
      document.head.appendChild(style);
      
      // Wait a bit for fonts to load
      setTimeout(() => setFontsLoaded(true), 100);
    } else {
      setFontsLoaded(true);
    }
  }, []);
  
  // Show loading state while fonts load
  if (!fontsLoaded) {
    return React.createElement(AbsoluteFill, {
      style: { backgroundColor: 'white' }
    });
  }
  
  return children;
};

// Create a REAL implementation of RemotionGoogleFonts that actually loads fonts
if (!window.RemotionGoogleFontsLoaded) {
  window.RemotionGoogleFontsLoaded = new Set();
}

window.RemotionGoogleFonts = {
  loadFont: (fontFamily, options) => {
    const fontKey = \`\${fontFamily}-\${JSON.stringify(options?.weights || [])}\`;
    
    if (!window.RemotionGoogleFontsLoaded.has(fontKey)) {
      window.RemotionGoogleFontsLoaded.add(fontKey);
      
      // Build the Google Fonts URL with the specific weights
      const weights = options?.weights || ['400'];
      const weightString = weights.join(';');
      const fontUrl = \`https://fonts.googleapis.com/css2?family=\${fontFamily.replace(' ', '+')}:wght@\${weightString}&display=swap\`;
      
      // Create and inject the font link
      const linkId = \`font-\${fontFamily}-\${weightString}\`.replace(/[^a-zA-Z0-9-]/g, '');
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
        console.log(\`[PreviewPanelG] Loading font: \${fontFamily} with weights \${weights.join(', ')}\`);
        
        // Force font loading by checking if it's available
        if (document.fonts && document.fonts.check) {
          setTimeout(() => {
            weights.forEach(weight => {
              const testString = \`\${weight} 16px "\${fontFamily}"\`;
              if (!document.fonts.check(testString)) {
                console.log(\`[PreviewPanelG] Font not yet loaded: \${testString}\`);
                // Try to trigger loading by using the font
                const testDiv = document.createElement('div');
                testDiv.style.fontFamily = \`"\${fontFamily}", sans-serif\`;
                testDiv.style.fontWeight = weight;
                testDiv.style.position = 'absolute';
                testDiv.style.visibility = 'hidden';
                testDiv.textContent = 'Test';
                document.body.appendChild(testDiv);
                setTimeout(() => document.body.removeChild(testDiv), 100);
              } else {
                console.log(\`[PreviewPanelG] Font confirmed loaded: \${testString}\`);
              }
            });
          }, 500); // Give time for CSS to load
        }
      }
    }
    
    // Return a mock result similar to @remotion/google-fonts
    return {
      fontFamily: fontFamily,
      fonts: {},
      unicodeRanges: {},
      waitUntilDone: () => Promise.resolve()
    };
  }
};

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

export default function MultiSceneComposition(props) {
  // Get audio from props passed by Remotion Player
  const projectAudio = props?.audio || window.projectAudio;
  
  // Debug audio
  React.useEffect(() => {
    console.log('[MultiSceneComposition] Audio data:', projectAudio);
    if (projectAudio) {
      console.log('[MultiSceneComposition] Audio URL:', projectAudio.url);
      console.log('[MultiSceneComposition] Audio volume:', projectAudio.volume);
      console.log('[MultiSceneComposition] Audio duration:', projectAudio.duration);
    }
  }, [projectAudio]);
  
  return React.createElement(FontLoader, {},
    React.createElement(AbsoluteFill, {},
      projectAudio && projectAudio.url && React.createElement(EnhancedAudio, { audioData: projectAudio }),
      React.createElement(Loop, { durationInFrames: ${totalDuration} },
        React.createElement(Series, {},
          ${sceneComponents.join(',\n          ')}
        )
      )
    )
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

  // 🚨 SMART COMPILATION: Use ref to avoid recreating timer on every render
  const compilationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCompiledFingerprintRef = useRef<string>('');
  const isCompilingRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (scenes.length > 0) {
      const currentFingerprint = `${scenesFingerprint}-${audioFingerprint}`;
      
      // Skip if fingerprint hasn't actually changed (prevents duplicate compiles)
      if (currentFingerprint === lastCompiledFingerprintRef.current) {
        console.log('[PreviewPanelG] 🎯 Fingerprint unchanged, skipping compilation');
        return;
      }
      
      // Skip if already compiling
      if (isCompilingRef.current) {
        console.log('[PreviewPanelG] ⏳ Already compiling, will queue next compilation');
      }
      
      // Clear existing timer
      if (compilationTimerRef.current) {
        clearTimeout(compilationTimerRef.current);
      }
      
      // Set new debounced timer with increased delay to batch rapid updates
      compilationTimerRef.current = setTimeout(async () => {
        // Double-check fingerprint hasn't become the same during debounce
        const latestFingerprint = `${scenesFingerprint}-${audioFingerprint}`;
        if (latestFingerprint === lastCompiledFingerprintRef.current) {
          console.log('[PreviewPanelG] 🎯 Fingerprint became unchanged during debounce, skipping');
          return;
        }
        
        // Prevent overlapping compilations
        if (isCompilingRef.current) {
          console.log('[PreviewPanelG] ⏳ Still compiling previous, skipping this update');
          return;
        }
        
        console.log('[PreviewPanelG] 📝 Scene content changed, triggering compilation');
        console.log('[PreviewPanelG] Old fingerprint:', lastCompiledFingerprintRef.current?.substring(0, 50) + '...');
        console.log('[PreviewPanelG] New fingerprint:', latestFingerprint.substring(0, 50) + '...');
        
        isCompilingRef.current = true;
        lastCompiledFingerprintRef.current = latestFingerprint;
        
        try {
          await compileMultiSceneComposition();
        } finally {
          isCompilingRef.current = false;
        }
      }, 600); // Increased to 600ms to better batch rapid updates
    }
    
    // Cleanup on unmount
    return () => {
      if (compilationTimerRef.current) {
        clearTimeout(compilationTimerRef.current);
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
      inputProps: {
        audio: projectAudio || null
      }
    };
  }, [scenes, currentProps?.meta, projectAudio]);
  
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
                onPlay={() => {
                  setIsPlaying(true);
                  const event = new CustomEvent('preview-play-state-change', { 
                    detail: { playing: true }
                  });
                  window.dispatchEvent(event);
                }}
                onPause={() => {
                  setIsPlaying(false);
                  const event = new CustomEvent('preview-play-state-change', { 
                    detail: { playing: false }
                  });
                  window.dispatchEvent(event);
                }}
              />
            </ErrorBoundary>
            {/* Frame counter is now rendered inside the Remotion Player via portal for correct fullscreen behavior. */}
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