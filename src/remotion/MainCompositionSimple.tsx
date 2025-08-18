// src/remotion/MainCompositionSimple.tsx
// Simplified version for Lambda without any dynamic compilation
import React from "react";
import { Composition, Series, AbsoluteFill, useCurrentFrame, interpolate, spring, Sequence, Img, Audio, Video, staticFile, continueRender, delayRender } from "remotion";
import { loadFont } from '@remotion/fonts';

// Font registry for Lambda - using staticFile() for bundled fonts
// Fonts are now bundled with the Lambda site in public/fonts/
const FONT_REGISTRY = {
  'Inter': [
    { weight: '300', url: staticFile('fonts/Inter-Light.woff2') },
    { weight: '400', url: staticFile('fonts/Inter-Regular.woff2') },
    { weight: '500', url: staticFile('fonts/Inter-Medium.woff2') },
    { weight: '600', url: staticFile('fonts/Inter-SemiBold.woff2') },
    { weight: '700', url: staticFile('fonts/Inter-Bold.woff2') },
    { weight: '800', url: staticFile('fonts/Inter-ExtraBold.woff2') },
    { weight: '900', url: staticFile('fonts/Inter-Black.woff2') },
  ],
  'DM Sans': [
    { weight: '400', url: staticFile('fonts/DMSans-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/DMSans-Bold.woff2') },
  ],
  'Plus Jakarta Sans': [
    // Fallback to Inter which is bundled - Plus Jakarta Sans not available in Lambda bundle
    { weight: '400', url: staticFile('fonts/Inter-Regular.woff2') },
    { weight: '500', url: staticFile('fonts/Inter-Medium.woff2') },
    { weight: '600', url: staticFile('fonts/Inter-SemiBold.woff2') },
    { weight: '700', url: staticFile('fonts/Inter-Bold.woff2') },
  ],
  'Roboto': [
    { weight: '400', url: staticFile('fonts/Roboto-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/Roboto-Bold.woff2') },
  ],
  'Poppins': [
    { weight: '400', url: staticFile('fonts/Poppins-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/Poppins-Bold.woff2') },
  ],
  'Montserrat': [
    { weight: '400', url: staticFile('fonts/Montserrat-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/Montserrat-Bold.woff2') },
  ],
  'Playfair Display': [
    { weight: '400', url: staticFile('fonts/PlayfairDisplay-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/PlayfairDisplay-Bold.woff2') },
  ],
  'Merriweather': [
    { weight: '400', url: staticFile('fonts/Merriweather-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/Merriweather-Bold.woff2') },
  ],
  'Lobster': [
    { weight: '400', url: staticFile('fonts/Lobster-Regular.woff2') },
  ],
  'Dancing Script': [
    { weight: '400', url: staticFile('fonts/DancingScript-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/DancingScript-Bold.woff2') },
  ],
  'Pacifico': [
    { weight: '400', url: staticFile('fonts/Pacifico-Regular.woff2') },
  ],
  'Fira Code': [
    { weight: '400', url: staticFile('fonts/FiraCode-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/FiraCode-Bold.woff2') },
  ],
  'JetBrains Mono': [
    { weight: '400', url: staticFile('fonts/JetBrainsMono-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/JetBrainsMono-Bold.woff2') },
  ],
  'Raleway': [
    { weight: '400', url: staticFile('fonts/Raleway-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/Raleway-Bold.woff2') },
  ],
  'Ubuntu': [
    { weight: '400', url: staticFile('fonts/Ubuntu-Regular.woff2') },
    { weight: '700', url: staticFile('fonts/Ubuntu-Bold.woff2') },
  ],
  'Bebas Neue': [
    { weight: '400', url: staticFile('fonts/BebasNeue-Regular.woff2') },
  ],
};

// Function to extract fonts from scene code
function extractFontsFromScenes(scenes: any[]): Set<string> {
  const fonts = new Set<string>();
  
  for (const scene of scenes) {
    const code = scene.jsCode || scene.tsxCode || '';
    
    // Match various font patterns
    const patterns = [
      /fontFamily:\s*["']([^"']+)["']/g,
      /font:\s*["']([^"']+)["']/g,
      /family:\s*["']([^"']+)["']/g,
    ];
    
    for (const pattern of patterns) {
      const matches = [...code.matchAll(pattern)];
      for (const match of matches) {
        const fontString = match[1];
        const primaryFont = fontString.split(',')[0].trim().replace(/["']/g, '');
        fonts.add(primaryFont);
      }
    }
  }
  
  return fonts;
}

// Load fonts before rendering using @remotion/fonts
// This is Remotion's official approach for Lambda font loading
// Fonts are loaded synchronously BEFORE rendering starts
let fontsLoaded = false;

async function ensureFontsLoaded(scenes: any[]) {
  if (fontsLoaded) return;
  
  const fontsNeeded = extractFontsFromScenes(scenes);
  console.log('[Lambda Font Loading] Fonts detected in scenes:', Array.from(fontsNeeded));
  
  const loadPromises = [];
  
  for (const fontName of fontsNeeded) {
    const fontConfig = FONT_REGISTRY[fontName as keyof typeof FONT_REGISTRY];
    if (fontConfig) {
      console.log(`[Lambda Font Loading] Loading font: ${fontName}`);
      for (const variant of fontConfig) {
        loadPromises.push(
          loadFont({
            family: fontName,
            url: variant.url,
            weight: variant.weight,
            style: 'normal',
          }).then(() => {
            console.log(`[Lambda Font Loading] Loaded ${fontName} weight ${variant.weight}`);
          }).catch((err) => {
            console.warn(`[Lambda Font Loading] Failed to load ${fontName} weight ${variant.weight}:`, err);
          })
        );
      }
    } else {
      console.warn(`[Lambda Font Loading] Font ${fontName} not in registry, skipping`);
    }
  }
  
  await Promise.all(loadPromises);
  fontsLoaded = true;
}

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
  // Load fonts before rendering
  const [fontsReady, setFontsReady] = React.useState(false);
  const [handle] = React.useState(() => delayRender());
  
  React.useEffect(() => {
    // Load fonts using bundled staticFile() URLs - no network timeouts in Lambda
    console.log('[Lambda] Loading fonts from bundled files');
    ensureFontsLoaded(scenes).then(() => {
      console.log('[Lambda Font Loading] Successfully loaded fonts');
      setFontsReady(true);
      continueRender(handle);
    }).catch((err) => {
      console.error('[Lambda Font Loading] Failed to load fonts:', err);
      setFontsReady(true); // Continue anyway
      continueRender(handle);
    });
  }, [scenes, handle]);
  
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

  // Calculate total video duration for audio looping
  const totalVideoDuration = scenes.reduce((sum, scene) => {
    return sum + extractSceneDuration(scene);
  }, 0);

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