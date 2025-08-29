// src/remotion/MainCompositionSimple.tsx
// Simplified version for Lambda without any dynamic compilation
import React from "react";
import { Composition, AbsoluteFill, useCurrentFrame, interpolate, spring, Sequence, Img, Audio, Video, staticFile, continueRender, delayRender } from "remotion";
// Import CSS fonts - works in both local and Lambda without cancelRender() errors
import './fonts.css';

// Fonts are loaded via CSS @import in fonts.css
// This works in both local and Lambda without cancelRender() errors

// Font extraction no longer needed - CSS handles all fonts

// Fonts are now loaded via CSS import (see fonts.css)
// This avoids cancelRender() errors in Lambda
// Remotion automatically waits for CSS fonts to load

// Simple scene component that safely evaluates pre-compiled JavaScript
const DynamicScene: React.FC<{ scene: any; index: number; width?: number; height?: number }> = ({ scene, index, width = 1920, height = 1080 }) => {
  
  // Log what we're receiving
  console.log(`[DynamicScene] Scene ${index}:`, {
    hasJsCode: !!scene.jsCode,
    hasTsxCode: !!scene.tsxCode,
    name: scene.name,
    id: scene.id,
    duration: scene.duration,
    codePreview: scene.jsCode ? scene.jsCode.substring(0, 100) + '...' : 'No jsCode',
    tsxCodePreview: scene.tsxCode ? scene.tsxCode.substring(0, 100) + '...' : 'No tsxCode'
  });
  
  // CRITICAL DEBUG: Log the full jsCode to see what we're actually getting
  if (scene.jsCode) {
    console.log(`[DynamicScene] FULL jsCode for scene ${index}:`);
    console.log(scene.jsCode);
    console.log(`[DynamicScene] END jsCode for scene ${index}`);
  }
  
  // Use the duration that was already extracted and passed down
  const sceneDuration = scene.duration || 150;
  
  // If we have jsCode (pre-compiled JavaScript), try to render it
  if (scene.jsCode) {
    try {
      console.log(`[DynamicScene] Attempting to create component from jsCode`);
      console.log(`[DynamicScene] First 300 chars of jsCode:`, scene.jsCode.substring(0, 300));
      
      // Convert export default to variable assignment for Function constructor compatibility
      let executableCode = scene.jsCode;
      
      // Replace export default function with const Component assignment
      executableCode = executableCode.replace(
        /export\s+default\s+function\s+(\w+)/g,
        'const Component = function $1'
      );
      
      // Replace export default variable with const Component assignment
      executableCode = executableCode.replace(
        /export\s+default\s+([a-zA-Z_$][\w$]*);?/g,
        'const Component = $1;'
      );
      
      console.log(`[DynamicScene] After export conversion, executableCode starts with:`, executableCode.substring(0, 200));
      
      // Create a component factory function
      const createComponent = new Function(
        'React',
        'AbsoluteFill',
        'useCurrentFrame',
        'interpolate',
        'spring',
        'Sequence',
        'useVideoConfig',
        'random',
        'useEffect',
        'useState',
        'videoWidth',
        'videoHeight',
        'videoDuration',
        'Img',
        'Audio',
        'Video',
        'staticFile',
        `
        try {
          // Additional Remotion components that might be used
          const Series = Sequence; // Alias for compatibility
          
          // Stubs for external dependencies
          const window = {
            RemotionGoogleFonts: {
              loadFont: () => {} // No-op for Lambda
            },
            // IconifyIcon should already be replaced with SVGs during preprocessing
            BazaarAvatars: {
              'asian-woman': '/avatars/asian-woman.png',
              'black-man': '/avatars/black-man.png', 
              'hispanic-man': '/avatars/hispanic-man.png',
              'middle-eastern-man': '/avatars/middle-eastern-man.png',
              'white-woman': '/avatars/white-woman.png'
            }
          };
          
          // Override useVideoConfig to use actual dimensions
          const actualUseVideoConfig = () => ({ width: videoWidth, height: videoHeight, fps: 30, durationInFrames: videoDuration });
          
          ${executableCode}
          
          // Log what we're trying to execute
          console.log('[ComponentFactory] Executing scene code...');
          
          // Try to return the component (it should be assigned to Component variable)
          if (typeof Component !== 'undefined') {
            console.log('[ComponentFactory] Found Component variable');
            return Component;
          }
          
          // Fallback attempts
          if (typeof Scene !== 'undefined') {
            console.log('[ComponentFactory] Found Scene variable');
            return Scene;
          }
          if (typeof MyScene !== 'undefined') {
            console.log('[ComponentFactory] Found MyScene variable');
            return MyScene;
          }
          
          // Check if we have any function that looks like a component
          const localVars = Object.getOwnPropertyNames(this || {});
          console.log('[ComponentFactory] Available local variables:', localVars);
          
          // Try to find a component-like function
          for (const varName of localVars) {
            if ((varName.includes('Scene') || varName.includes('Component')) && typeof this[varName] === 'function') {
              console.log('[ComponentFactory] Found component via variable scan:', varName);
              return this[varName];
            }
          }
          
          console.error('[ComponentFactory] No component found in scene code');
          console.error('[ComponentFactory] typeof Component:', typeof Component);
          console.error('[ComponentFactory] typeof Scene:', typeof Scene);
          return null;
        } catch (e) {
          console.error('Scene component factory error:', e);
          return null;
        }
        `
      );
      
      // Get the component factory
      const ComponentFactory = createComponent(
        React, 
        AbsoluteFill, 
        useCurrentFrame, 
        interpolate, 
        spring, 
        Sequence,
        () => ({ width: width, height: height, fps: 30, durationInFrames: scene.duration || 150 }),
        (seed: number) => {
          const x = Math.sin(seed) * 10000;
          return x - Math.floor(x);
        },
        React.useEffect,
        React.useState,
        width,
        height,
        scene.duration || 150,
        Img,
        Audio,
        Video,
        staticFile
      );
      
      if (ComponentFactory) {
        console.log(`[DynamicScene] Successfully created component factory for scene ${index}`);
        // Render the component
        return <ComponentFactory />;
      } else {
        console.error(`[DynamicScene] Component factory returned null/undefined for scene ${index}`);
      }
    } catch (error) {
      console.error(`[DynamicScene] Failed to render scene ${index}:`, error);
      console.error(`[DynamicScene] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : 'No stack trace'
      });
    }
  }
  
  // Fallback: Show scene metadata with diagnostic info
  const errorReason = !scene.jsCode ? 
    'No compiled JavaScript code' : 
    'Failed to render component (check logs for details)';
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {scene.name || `Scene ${index + 1}`}
        </h1>
        <p style={{ fontSize: '1.5rem', opacity: 0.8, marginBottom: '2rem' }}>
          Duration: {Math.round(sceneDuration / 30)}s ({sceneDuration} frames)
        </p>
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          <p style={{ fontSize: '1rem', opacity: 0.7, marginBottom: '1rem' }}>
            {scene.id}
          </p>
          <p style={{ fontSize: '0.875rem', opacity: 0.5, color: '#ef4444' }}>
            {errorReason}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Duration extraction removed - DB duration is the single source of truth

// Video composition component
export const VideoComposition: React.FC<{
  scenes?: any[];
  projectId?: string;
  width?: number;
  height?: number;
  audio?: {
    url: string;
    name: string;
    duration: number;
    startTime: number;
    endTime: number;
    volume: number;
    fadeInDuration?: number;
    fadeOutDuration?: number;
    playbackRate?: number;
  };
}> = ({ scenes = [], width = 1920, height = 1080, audio }) => {
  // Fonts are loaded via CSS - no delay needed
  const [handle] = React.useState(() => delayRender());
  
  React.useEffect(() => {
    console.log(`[VideoComposition] Using CSS-loaded fonts from fonts.css`);
    console.log(`[VideoComposition] Project dimensions: ${width}x${height}`);
    // Continue immediately - CSS fonts are loaded automatically
    continueRender(handle);
  }, [handle, width, height]);
  
  // Debug audio prop
  console.log('[VideoComposition] Audio prop received:', audio ? {
    url: audio.url,
    name: audio.name,
    duration: audio.duration,
    startTime: audio.startTime,
    endTime: audio.endTime,
    volume: audio.volume,
    playbackRate: audio.playbackRate
  } : 'No audio');
  if (!scenes || scenes.length === 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <h1>No scenes to render</h1>
      </AbsoluteFill>
    );
  }

  // Sort scenes by order field to ensure consistency with Timeline
  const sortedScenes = [...scenes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  // Calculate total video duration for audio looping - use DB durations strictly
  const totalVideoDuration = sortedScenes.reduce((sum, scene) => {
    return sum + (scene.duration || 150); // Use DB duration as truth
  }, 0);

  // Build sequences with cumulative start positions - DB as truth
  let cumulativeStart = 0;
  const sequences = sortedScenes.map((scene, index) => {
    const dbDuration = scene.duration || 150; // Use DB duration strictly
    const sequenceElement = (
      <Sequence
        key={scene.id || index}
        from={cumulativeStart}
        durationInFrames={dbDuration}
      >
        <DynamicScene scene={{...scene, duration: dbDuration}} index={index} width={width} height={height} />
      </Sequence>
    );
    
    console.log(`[VideoComposition] Scene ${index} (${scene.id}): from=${cumulativeStart}, duration=${dbDuration} frames`);
    cumulativeStart += dbDuration;
    return sequenceElement;
  });
  
  return (
    <AbsoluteFill>
      {/* Background audio track */}
      {audio && (
        <>
          {console.log('[VideoComposition] Rendering Audio component with:', {
            src: audio.url,
            volume: audio.volume,
            startFrom: Math.round(audio.startTime * 30),
            endAt: Math.round(audio.endTime * 30),
            loop: audio.endTime - audio.startTime < totalVideoDuration / 30,
            playbackRate: audio.playbackRate || 1,
            totalVideoDuration,
            audioDuration: audio.endTime - audio.startTime,
            videoDurationSeconds: totalVideoDuration / 30
          })}
          <Audio
            src={audio.url}
            volume={audio.volume}
            startFrom={Math.round(audio.startTime * 30)} // Convert seconds to frames
            endAt={Math.round(audio.endTime * 30)} // Convert seconds to frames
            loop={audio.endTime - audio.startTime < totalVideoDuration / 30} // Loop if audio is shorter than video
            playbackRate={audio.playbackRate || 1}
          />
        </>
      )}
      
      {/* Video scenes with DB duration enforcement via Sequence */}
      {sequences}
    </AbsoluteFill>
  );
};

export const MainComposition: React.FC = () => {
  return (
    <>
      <Composition
        id="MainCompositionSimple"
        component={VideoComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: [],
          projectId: '',
          audio: undefined,
        }}
        calculateMetadata={({ props }: { props: { scenes?: any[]; projectId?: string; width?: number; height?: number; audio?: any } }) => {
          // Calculate total duration using DB durations strictly - sort first
          const sortedScenes = [...(props.scenes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const totalDuration = sortedScenes.reduce((sum: number, scene: any) => {
            return sum + (scene.duration || 150); // DB duration as truth
          }, 0);
          
          console.log(`[MainComposition] Total calculated duration: ${totalDuration} frames (${Math.round(totalDuration / 30)}s)`);
          
          return {
            durationInFrames: totalDuration || 300,
            fps: 30,
            width: props.width || 1920,
            height: props.height || 1080,
          };
        }}
      />
    </>
  );
};

// Export for Lambda usage
export const MainCompositionSimple = MainComposition;