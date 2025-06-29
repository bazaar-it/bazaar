// src/server/services/render/render.service.ts
// This file prepares the render configuration but doesn't execute rendering
// Actual rendering happens via Lambda

export interface RenderConfig {
  projectId: string;
  scenes: any[];
  format: 'mp4' | 'webm' | 'gif';
  quality: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
}

// Quality presets that will be used by Lambda
export const qualitySettings = {
  low: { 
    crf: 28, 
    jpegQuality: 70,
    resolution: { width: 1280, height: 720 },
    videoBitrate: '1M',
  },
  medium: { 
    crf: 23, 
    jpegQuality: 80,
    resolution: { width: 1920, height: 1080 },
    videoBitrate: '2.5M',
  },
  high: { 
    crf: 18, 
    jpegQuality: 90,
    resolution: { width: 1920, height: 1080 },
    videoBitrate: '5M',
  },
};

// Pre-compile TypeScript to JavaScript for Lambda
function preprocessSceneForLambda(scene: any) {
  console.log(`[Preprocess] Checking scene:`, {
    id: scene.id,
    name: scene.name,
    hasTsxCode: !!scene.tsxCode,
    hasData: !!scene.data,
    dataKeys: scene.data ? Object.keys(scene.data) : []
  });
  
  // Check both direct tsxCode and nested data.code
  const tsxCode = scene.tsxCode || (scene.data && scene.data.code);
  
  if (!tsxCode) {
    console.log(`[Preprocess] No code found for scene ${scene.id}`);
    return scene;
  }
  
  try {
    // Import sucrase for server-side compilation
    const { transform } = require('sucrase');
    
    // Transform TypeScript/JSX to JavaScript
    let { code: transformedCode } = transform(tsxCode, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'classic',
      production: true,
    });
    
    // Remove the window.Remotion destructuring line (we'll provide it differently)
    transformedCode = transformedCode.replace(
      /const\s*{\s*[^}]+\s*}\s*=\s*window\.Remotion\s*;?/g,
      ''
    );
    
    // Replace export default with a direct assignment
    transformedCode = transformedCode.replace(
      /export\s+default\s+function\s+(\w+)/g,
      'const Component = function $1'
    );
    
    // Replace window.React with React
    transformedCode = transformedCode.replace(/window\.React/g, 'React');
    
    // Remove or replace window.RemotionGoogleFonts (not available in Lambda)
    transformedCode = transformedCode.replace(
      /window\.RemotionGoogleFonts\.loadFont[^;]+;/g,
      '// Font loading removed for Lambda'
    );
    
    // Replace window.IconifyIcon with a simple span (icons won't work in Lambda)
    transformedCode = transformedCode.replace(
      /<window\.IconifyIcon[^>]+\/>/g,
      '<span />'
    );
    
    console.log(`[Preprocess] Scene ${scene.id} transformed for Lambda`);
    console.log(`[Preprocess] Original code starts with:`, tsxCode.substring(0, 100));
    console.log(`[Preprocess] Transformed code starts with:`, transformedCode.substring(0, 100));
    
    // Return scene with compiled JavaScript code
    return {
      ...scene,
      jsCode: transformedCode,
      // Keep tsxCode for reference but Lambda will use jsCode
      tsxCode: tsxCode,
    };
  } catch (error) {
    console.error(`Failed to preprocess scene ${scene.id}:`, error);
    // Return scene as-is if compilation fails
    return scene;
  }
}

// Prepare render configuration for Lambda
export function prepareRenderConfig({
  projectId,
  scenes,
  format = 'mp4',
  quality = 'high',
}: RenderConfig) {
  const settings = qualitySettings[quality];
  
  // Pre-compile all scenes for Lambda
  const processedScenes = scenes.map(scene => preprocessSceneForLambda(scene));
  
  // Calculate total duration
  const totalDuration = processedScenes.reduce((sum, scene) => {
    return sum + (scene.duration || 150); // Default 5 seconds at 30fps
  }, 0);
  
  const estimatedDurationMinutes = totalDuration / 30 / 60; // frames to minutes
  
  return {
    projectId,
    scenes: processedScenes,
    format,
    quality,
    settings,
    totalDuration,
    estimatedDurationMinutes,
    // This will be used by Lambda
    inputProps: {
      scenes: processedScenes,
      projectId,
    },
  };
}

// Temporary mock function until Lambda is set up
export async function renderVideo(config: RenderConfig) {
  throw new Error(
    "Direct rendering is not available. Please set up AWS Lambda following the guide in /memory-bank/sprints/sprint63_export/lambda-setup.md"
  );
}