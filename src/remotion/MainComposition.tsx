// src/remotion/MainComposition.tsx
import React from "react";
import { Composition, Series, AbsoluteFill } from "remotion";
import { FontLoader, loadFonts } from "./FontLoader";

// Load fonts immediately when module loads (for Lambda)
if (typeof window !== 'undefined') {
  loadFonts();
}

// Helper to compile and render scene code
function compileSceneCode(scene: any): React.ComponentType | null {
  try {
    // Check if we have pre-compiled JavaScript (from Lambda preprocessing)
    const codeToUse = scene.jsCode || scene.tsxCode;
    
    if (!codeToUse) {
      console.error('No code available for scene:', scene.id);
      return null;
    }
    
    // For jsCode, it's already JavaScript, so we can evaluate directly
    // For tsxCode, we need to compile it (only happens in local dev)
    let compiledCode = codeToUse;
    
    if (!scene.jsCode && scene.tsxCode) {
      // Only compile if we don't have jsCode (local development)
      try {
        const { transform } = require('sucrase');
        const { code: transformedCode } = transform(scene.tsxCode, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });
        compiledCode = transformedCode;
      } catch (error) {
        console.error('Failed to compile TypeScript:', error);
        return null;
      }
    }
    
    // ✅ FIXED: Check if code already has Remotion destructuring
    const hasRemotionDestructuring = compiledCode.includes('window.Remotion');
    
    let finalCode;
    if (hasRemotionDestructuring) {
      // ✅ Code already has destructuring, use as-is
      finalCode = compiledCode;
    } else {
      // ✅ Code needs destructuring, add it
      finalCode = `
        const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random, Sequence, Audio, Video, Img, staticFile } = window.Remotion || {};
        // Preserve native Audio constructor for scenes that might need it
        const NativeAudio = window.NativeAudio || window.Audio;
        ${compiledCode}
      `;
    }
    
    // Create function that returns the component
    const componentFunction = new Function(
      'React',
      'window',
      finalCode
    );
    
    // Create a window proxy that preserves the native Audio constructor
    const windowProxy = new Proxy(window, {
      get(target, prop) {
        if (prop === 'Audio') {
          // Return the native Audio constructor
          return (window as any).NativeAudio || window.Audio;
        }
        return target[prop as keyof Window];
      }
    });
    
    // Execute and get the component
    const Component = componentFunction(React, windowProxy);
    return Component;
  } catch (error) {
    console.error('Failed to compile scene:', error);
    return null;
  }
}

// Error boundary for individual scenes
class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; sceneName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Scene ${this.props.sceneName} error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <AbsoluteFill
          style={{
            backgroundColor: '#f8f9fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <h2 style={{ color: '#dc3545', marginBottom: '10px' }}>
              ⚠️ Scene Error: {this.props.sceneName}
            </h2>
            <p style={{ color: '#6c757d' }}>
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>
        </AbsoluteFill>
      );
    }

    return this.props.children;
  }
}

// Video composition component that renders scenes
export const VideoComposition: React.FC<{
  scenes?: any[];
  projectId?: string;
}> = ({ scenes = [] }) => {
  // If no scenes, show placeholder
  if (!scenes || scenes.length === 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <h1>No scenes to render</h1>
      </AbsoluteFill>
    );
  }

  // Render scenes in series with font loading
  return (
    <FontLoader>
      <Series>
        {scenes.map((scene, index) => {
          const duration = scene.duration || 150; // Default 5 seconds at 30fps
          const SceneComponent = compileSceneCode(scene);
          
          if (!SceneComponent) {
            // Show error placeholder for invalid scenes
            return (
              <Series.Sequence key={scene.id || index} durationInFrames={duration}>
                <AbsoluteFill
                  style={{
                    backgroundColor: '#fff3cd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #ffc107',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <h2 style={{ color: '#856404', fontFamily: 'Inter, sans-serif' }}>
                      ⚠️ Invalid Scene: {scene.name || `Scene ${index + 1}`}
                    </h2>
                    <p style={{ color: '#856404', fontFamily: 'Inter, sans-serif' }}>
                      This scene could not be compiled
                    </p>
                  </div>
                </AbsoluteFill>
              </Series.Sequence>
            );
          }
          
          return (
            <Series.Sequence key={scene.id || index} durationInFrames={duration}>
              <SceneErrorBoundary sceneName={scene.name || `Scene ${index + 1}`}>
                <SceneComponent />
              </SceneErrorBoundary>
            </Series.Sequence>
          );
        })}
      </Series>
    </FontLoader>
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
          // Calculate total duration from scenes
          const totalDuration = (props.scenes || []).reduce(
            (sum: number, scene: any) => sum + (scene.duration || 150),
            0
          );
          
          return {
            durationInFrames: totalDuration || 300, // Default to 300 if no scenes
            fps: 30,
            width: 1920,
            height: 1080,
          };
        }}
      />
    </>
  );
};