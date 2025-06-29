// src/remotion/MainCompositionSimple.tsx
// Simplified version for Lambda without any dynamic compilation
import React from "react";
import { Composition, Series, AbsoluteFill, useCurrentFrame, interpolate, spring, Sequence } from "remotion";

// Simple scene component that safely evaluates pre-compiled JavaScript
const DynamicScene: React.FC<{ scene: any; index: number }> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  
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
      // Create a sandboxed function to execute the component
      const createComponent = new Function(
        'React',
        'AbsoluteFill',
        'useCurrentFrame',
        'interpolate',
        'spring',
        'Sequence',
        'frame',
        `
        try {
          // Inject all Remotion functions the scene might need
          const useVideoConfig = () => ({ width: 1920, height: 1080, fps: 30, durationInFrames: ${scene.duration || 150} });
          const random = (seed) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
          };
          
          // Additional Remotion utilities that might be used
          const Audio = () => null; // Stub for Lambda
          const Video = () => null; // Stub for Lambda
          const Img = () => null; // Stub for Lambda
          const staticFile = (path) => path; // Stub for Lambda
          
          ${scene.jsCode}
          
          // Try to return the component (it should be assigned to Component variable)
          if (typeof Component !== 'undefined') {
            return React.createElement(Component);
          }
          
          // Fallback attempts
          if (typeof Scene !== 'undefined') return React.createElement(Scene);
          if (typeof MyScene !== 'undefined') return React.createElement(MyScene);
          
          console.error('No component found in scene code');
          return null;
        } catch (e) {
          console.error('Scene execution error:', e);
          return null;
        }
        `
      );
      
      const element = createComponent(React, AbsoluteFill, useCurrentFrame, interpolate, spring, Sequence, frame);
      if (element) return element;
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
        const duration = scene.duration || 150;
        
        return (
          <Series.Sequence key={scene.id || index} durationInFrames={duration}>
            <DynamicScene scene={scene} index={index} />
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
        calculateMetadata={({ props }) => {
          const totalDuration = (props.scenes || []).reduce(
            (sum: number, scene: any) => sum + (scene.duration || 150),
            0
          );
          
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