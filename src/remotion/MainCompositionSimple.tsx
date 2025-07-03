// src/remotion/MainCompositionSimple.tsx
// Simplified version for Lambda without any dynamic compilation
import React from "react";
import { Composition, Series, AbsoluteFill, useCurrentFrame, interpolate, spring, Sequence } from "remotion";

// Simple scene component that safely evaluates pre-compiled JavaScript
const DynamicScene: React.FC<{ scene: any; index: number }> = ({ scene, index }) => {
  
  // Log what we're receiving
  console.log(`[DynamicScene] Scene ${index}:`, {
    hasJsCode: !!scene.jsCode,
    hasTsxCode: !!scene.tsxCode,
    name: scene.name,
    id: scene.id,
    duration: scene.duration,
    codePreview: scene.jsCode ? scene.jsCode.substring(0, 100) + '...' : 'No jsCode'
  });
  
  // Use the duration that was already extracted and passed down
  const sceneDuration = scene.duration || 150;
  
  // If we have jsCode (pre-compiled JavaScript), try to render it
  if (scene.jsCode) {
    try {
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
        `
        try {
          // Additional Remotion components that might be used
          const Series = Sequence; // Alias for compatibility
          const Audio = () => null; // Stub for Lambda
          const Video = () => null; // Stub for Lambda
          const Img = () => null; // Stub for Lambda
          const staticFile = (path) => path; // Stub for Lambda
          
          // Stubs for external dependencies
          const window = {
            RemotionGoogleFonts: {
              loadFont: () => {} // No-op for Lambda
            },
            IconifyIcon: (props) => React.createElement('span', { style: props.style }, '⬤'), // Simple circle icon
            BazaarAvatars: {
              'asian-woman': '/avatars/asian-woman.png',
              'black-man': '/avatars/black-man.png', 
              'hispanic-man': '/avatars/hispanic-man.png',
              'middle-eastern-man': '/avatars/middle-eastern-man.png',
              'white-woman': '/avatars/white-woman.png'
            }
          };
          
          ${scene.jsCode}
          
          // Try to return the component (it should be assigned to Component variable)
          if (typeof Component !== 'undefined') {
            return Component;
          }
          
          // Fallback attempts
          if (typeof Scene !== 'undefined') return Scene;
          if (typeof MyScene !== 'undefined') return MyScene;
          
          console.error('No component found in scene code');
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
        () => ({ width: 1920, height: 1080, fps: 30, durationInFrames: sceneDuration }),
        (seed: number) => {
          const x = Math.sin(seed) * 10000;
          return x - Math.floor(x);
        },
        React.useEffect,
        React.useState
      );
      
      if (ComponentFactory) {
        // Render the component
        return <ComponentFactory />;
      }
    } catch (error) {
      console.error(`Failed to render scene ${index}:`, error);
    }
  }
  
  // Fallback: Show scene metadata
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
          <p style={{ fontSize: '1rem', opacity: 0.7 }}>
            {scene.id}
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
}> = ({ scenes = [] }) => {
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

  return (
    <Series>
      {scenes.map((scene, index) => {
        // Extract the real duration from the scene code
        const realDuration = extractSceneDuration(scene);
        
        console.log(`[VideoComposition] Scene ${index} duration: ${realDuration} frames (${Math.round(realDuration / 30)}s)`);
        
        return (
          <Series.Sequence key={scene.id || index} durationInFrames={realDuration}>
            <DynamicScene scene={{...scene, duration: realDuration}} index={index} />
          </Series.Sequence>
        );
      })}
    </Series>
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
        }}
        calculateMetadata={({ props }: { props: { scenes?: any[]; projectId?: string } }) => {
          // Calculate total duration by extracting from each scene's code
          const totalDuration = (props.scenes || []).reduce((sum: number, scene: any) => {
            const sceneDuration = extractSceneDuration(scene);
            return sum + sceneDuration;
          }, 0);
          
          console.log(`[MainComposition] Total calculated duration: ${totalDuration} frames (${Math.round(totalDuration / 30)}s)`);
          
          return {
            durationInFrames: totalDuration || 300,
            fps: 30,
            width: 1920,
            height: 1080,
          };
        }}
      />
    </>
  );
};