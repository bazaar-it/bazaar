// src/remotion/MainCompositionSimple.tsx
// Simplified version for Lambda without any dynamic compilation
import React from "react";
import { Composition, Series, AbsoluteFill, useCurrentFrame, interpolate, spring, Sequence } from "remotion";

// Simple scene component that safely evaluates pre-compiled JavaScript
const DynamicScene: React.FC<{ scene: any; index: number; width?: number; height?: number }> = ({ scene, index, width = 1920, height = 1080 }) => {
  
  // Log what we're receiving
  console.log(`[DynamicScene] Scene ${index}:`, {
    hasJsCode: !!scene.jsCode,
    hasTsxCode: !!scene.tsxCode,
    name: scene.name,
    id: scene.id,
    codePreview: scene.jsCode ? scene.jsCode.substring(0, 100) + '...' : 'No jsCode'
  });
  
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
        'videoWidth',
        'videoHeight',
        'videoDuration',
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
        () => ({ width: width, height: height, fps: 30, durationInFrames: scene.duration || 150 }),
        (seed: number) => {
          const x = Math.sin(seed) * 10000;
          return x - Math.floor(x);
        },
        React.useEffect,
        React.useState,
        width,
        height,
        scene.duration || 150
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
          Duration: {Math.round((scene.duration || 150) / 30)}s
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

// Video composition component
export const VideoComposition: React.FC<{
  scenes?: any[];
  projectId?: string;
  width?: number;
  height?: number;
}> = ({ scenes = [], width = 1920, height = 1080 }) => {
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
        const duration = scene.duration || 150;
        
        return (
          <Series.Sequence key={scene.id || index} durationInFrames={duration}>
            <DynamicScene scene={scene} index={index} width={width} height={height} />
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
        calculateMetadata={({ props }: { props: { scenes?: any[]; projectId?: string; width?: number; height?: number } }) => {
          const totalDuration = (props.scenes || []).reduce(
            (sum: number, scene: any) => sum + (scene.duration || 150),
            0
          );
          
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