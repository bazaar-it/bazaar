// src/remotion/MainCompositionLambda.tsx
// Lambda-compatible version without runtime compilation
import React from "react";
import { Composition, Series, AbsoluteFill, useCurrentFrame, interpolate, spring } from "remotion";

// Simple scene renderer that evaluates pre-compiled code
const SceneRenderer: React.FC<{ code: string; sceneName: string }> = ({ code, sceneName }) => {
  try {
    // Create a function that returns JSX
    const renderFunction = new Function(
      'React',
      'AbsoluteFill',
      'useCurrentFrame',
      'interpolate',
      'spring',
      `
      try {
        ${code}
        return typeof Component !== 'undefined' ? React.createElement(Component) : null;
      } catch (e) {
        console.error('Scene execution error:', e);
        return null;
      }
      `
    );
    
    const element = renderFunction(React, AbsoluteFill, useCurrentFrame, interpolate, spring);
    
    if (!element) {
      throw new Error('No component returned');
    }
    
    return element;
  } catch (error) {
    console.error(`Failed to render scene ${sceneName}:`, error);
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#fff3cd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #ffc107',
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ color: '#856404' }}>
            ⚠️ Scene Error: {sceneName}
          </h2>
          <p style={{ color: '#856404' }}>
            {error instanceof Error ? error.message : 'Failed to render scene'}
          </p>
        </div>
      </AbsoluteFill>
    );
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
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <h1>No scenes to render</h1>
      </AbsoluteFill>
    );
  }

  // For Lambda, we expect pre-processed scene data
  return (
    <Series>
      {scenes.map((scene, index) => {
        const duration = scene.duration || 150;
        
        // Check if scene has compiledCode (preprocessed) or needs basic rendering
        if (scene.compiledCode) {
          return (
            <Series.Sequence key={scene.id || index} durationInFrames={duration}>
              <SceneRenderer 
                code={scene.compiledCode} 
                sceneName={scene.name || `Scene ${index + 1}`} 
              />
            </Series.Sequence>
          );
        }
        
        // Fallback for scenes without compiled code
        return (
          <Series.Sequence key={scene.id || index} durationInFrames={duration}>
            <AbsoluteFill
              style={{
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'sans-serif',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <h2>{scene.name || `Scene ${index + 1}`}</h2>
                <p>Scene data not available for rendering</p>
              </div>
            </AbsoluteFill>
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