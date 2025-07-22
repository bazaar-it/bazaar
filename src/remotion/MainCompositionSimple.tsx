// src/remotion/MainCompositionSimple.tsx
// Simplified version for Lambda without any dynamic compilation
import React from "react";
import { Composition, Series, AbsoluteFill, useCurrentFrame, interpolate, spring, Sequence, Img, Audio, Video, staticFile } from "remotion";

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
          
          ${scene.jsCode}
          
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
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
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

// Helper function to extract duration from scene code
const extractSceneDuration = (scene: any): number => {
  if (!scene.jsCode) return scene.duration || 150;
  
  try {
    // Transform the code to handle ES6 exports
    let codeWithExports = scene.jsCode;
    
    // Transform "export const durationInFrames = X;" to "exports.durationInFrames = X;"
    codeWithExports = codeWithExports.replace(
      /export\s+const\s+durationInFrames\s*=\s*([^;]+);?/g,
      'const durationInFrames = $1; exports.durationInFrames = durationInFrames;'
    );
    
    const durationExtractor = new Function(`
      try {
        let exports = {};
        ${codeWithExports}
        // Try to get duration from exports or local scope
        return exports.durationInFrames || (typeof durationInFrames !== 'undefined' ? durationInFrames : null);
      } catch (e) {
        console.warn('Duration extraction error:', e);
        return null;
      }
    `);
    
    const extractedDuration = durationExtractor();
    if (extractedDuration && extractedDuration > 0) {
      console.log(`[DurationExtractor] Successfully extracted duration: ${extractedDuration} frames`);
      return extractedDuration;
    }
    console.warn(`[DurationExtractor] Failed to extract valid duration, using fallback: ${scene.duration || 150} frames`);
    return scene.duration || 150;
  } catch (error) {
    console.warn('[DurationExtractor] Failed to extract scene duration:', error);
    return scene.duration || 150;
  }
};

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

  // Calculate total video duration for audio looping
  const totalVideoDuration = scenes.reduce((sum, scene) => {
    return sum + extractSceneDuration(scene);
  }, 0);

  return (
    <AbsoluteFill>
      {/* Background audio track */}
      {audio && (
        <Audio
          src={audio.url}
          volume={audio.volume}
          startFrom={Math.round(audio.startTime * 30)} // Convert seconds to frames
          endAt={Math.round(audio.endTime * 30)} // Convert seconds to frames
          loop={audio.endTime - audio.startTime < totalVideoDuration / 30} // Loop if audio is shorter than video
          playbackRate={audio.playbackRate || 1}
          // Note: Fade effects would need custom implementation with interpolate()
        />
      )}
      
      {/* Video scenes */}
      <Series>
        {scenes.map((scene, index) => {
          // Extract the real duration from the scene code
          const realDuration = extractSceneDuration(scene);
          
          console.log(`[VideoComposition] Scene ${index} duration: ${realDuration} frames (${Math.round(realDuration / 30)}s)`);
          
          return (
            <Series.Sequence key={scene.id || index} durationInFrames={realDuration}>
              <DynamicScene scene={{...scene, duration: realDuration}} index={index} width={width} height={height} />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};

export const MainComposition: React.FC = () => {
  return (
    <>
      <Composition
        id="MainComposition"
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
        calculateMetadata={({ props }: { props: { scenes?: any[]; projectId?: string; width?: number; height?: number } }) => {
          // Calculate total duration by extracting from each scene's code
          const totalDuration = (props.scenes || []).reduce((sum: number, scene: any) => {
            const sceneDuration = extractSceneDuration(scene);
            return sum + sceneDuration;
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