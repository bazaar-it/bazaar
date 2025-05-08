import { type SceneAnalysis } from '~/types/chat';
import logger from '~/lib/logger';

// Create a specialized logger for scene analysis functions
const analyzerLogger = {
  analyze: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[ANALYZER:SCENE][SCENE:${sceneId}] ${message}`, { ...meta, analyzer: true });
  },
  details: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[ANALYZER:DETAILS][SCENE:${sceneId}] ${message}`, { ...meta, analyzer: true });
  },
  complexity: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.debug(`[ANALYZER:COMPLEXITY][SCENE:${sceneId}] ${message}`, { ...meta, analyzer: true });
  },
  error: (sceneId: string, message: string, meta: Record<string, any> = {}) => {
    logger.error(`[ANALYZER:ERROR][SCENE:${sceneId}] ${message}`, { ...meta, analyzer: true });
  }
};

/**
 * Extract details from a scene object for regeneration
 * 
 * @param scene - The scene object from the project properties
 * @returns Scene details including description and duration
 */
export function getSceneDetails(scene: any) {
  const sceneId = scene.id || 'unknown';
  
  // Extract scene description from various possible locations
  const description = 
    scene.data?.description || 
    scene.data?.text || 
    scene.data?.name || 
    `Scene with effect: ${scene.type}`;
  
  // Calculate duration in seconds based on frames (assumes 30fps if not specified)
  const fps = scene.fps || 30;
  const durationInSeconds = scene.duration / fps;
  
  analyzerLogger.details(sceneId, `Extracted scene details`, {
    type: scene.type,
    description: description.substring(0, 100),
    duration: durationInSeconds,
    fps
  });
  
  return {
    description,
    durationInSeconds,
    fps,
    sceneId: scene.id,
    type: scene.type,
    data: scene.data || {}
  };
}

/**
 * Analyze a scene description to determine appropriate properties for regeneration
 * 
 * @param description - The scene description text
 * @param durationInSeconds - The duration in seconds
 * @param fps - Frames per second (default: 30)
 * @returns Scene analysis with details needed for regeneration
 */
export function analyzeSceneDescription(
  description: string,
  durationInSeconds: number,
  fps: number = 30
) {
  const loggingId = 'analyze-' + description.substring(0, 10).replace(/\s+/g, '-').toLowerCase();
  
  // Generate a consistent component name based on description
  const words = description
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  const componentName = `${words}Scene` || 'CustomScene';
  
  analyzerLogger.analyze(loggingId, `Analyzed scene description`, {
    description: description.substring(0, 100),
    durationInSeconds,
    fps,
    suggestedName: componentName
  });
  
  return {
    description,
    durationInSeconds,
    fps,
    effectType: "custom",
    suggestedName: componentName
  };
}

/**
 * Analyzes scene content to determine complexity and required components
 * 
 * @param description - The scene description from the planner
 * @param sceneIndex - The position of this scene (0-based)
 * @param totalScenes - Total number of scenes in the plan
 * @returns Analysis of scene content with complexity score and component suggestion
 */
export function analyzeSceneContent(
    description: string,
    sceneIndex: number,
    totalScenes: number
): SceneAnalysis {
    const loggingId = 'scene-' + sceneIndex;
    
    // Determine scene position type (first, middle, last)
    const isFirstScene = sceneIndex === 0;
    const isLastScene = sceneIndex === totalScenes - 1;
    const scenePosition = isFirstScene ? 'opening' : isLastScene ? 'closing' : 'middle';
    
    analyzerLogger.analyze(loggingId, `Starting content analysis for ${scenePosition} scene`, {
      descriptionLength: description.length,
      position: scenePosition,
      sceneIndex,
      totalScenes
    });
    
    // Initialize complexity score based on description length and content
    let complexity = 0;
    
    // Longer descriptions usually need more sophisticated visuals
    complexity += Math.min(0.3, description.length / 200);
    
    // Check for keywords indicating visual elements that would benefit from a component
    const visualKeywords = [
        'animation', 'animate', 'transition', 'effect', 'highlight',
        'showcase', 'display', 'demonstrate', 'present', 'reveal',
        'graphic', 'visual', 'chart', 'graph', 'diagram',
        'illustration', 'avatar', 'character', 'model', '3d',
        'logo', 'brand', 'product', 'interface', 'screen',
        'fade', 'zoom', 'pan', 'slide', 'rotate', 'scale',
        'explode', 'transform', 'morph', 'reveal', 'unfold'
    ];
    
    // Check for mention of assets that would need handling
    const assetKeywords = [
        'image', 'photo', 'picture', 'screenshot', 'video', 'clip',
        'footage', 'recording', 'animation', 'gif', 'mp4', 'audio',
        'sound', 'music', 'voice', 'narration', 'icon', 'emoji'
    ];
    
    // Check for complex scene concepts
    const complexConceptKeywords = [
        'comparison', 'before and after', 'side by side', 'timeline',
        'process', 'workflow', 'steps', 'journey', 'transformation',
        'data visualization', 'statistics', 'numbers', 'percentages',
        'testimonial', 'review', 'rating', 'feedback', 'quote',
        'dynamic', 'interactive', 'responsive', 'real-time', 'simulation'
    ];
    
    // Count matches and add to complexity
    let visualMatches = 0;
    let assetMatches = 0;
    let conceptMatches = 0;
    
    // Get lowercase description for case-insensitive matching
    const lowerDesc = description.toLowerCase();
    
    // Check for visual keywords
    visualKeywords.forEach(keyword => {
        if (lowerDesc.includes(keyword.toLowerCase())) {
            visualMatches++;
        }
    });
    
    // Check for asset keywords
    assetKeywords.forEach(keyword => {
        if (lowerDesc.includes(keyword.toLowerCase())) {
            assetMatches++;
        }
    });
    
    // Check for complex concept keywords
    complexConceptKeywords.forEach(keyword => {
        if (lowerDesc.includes(keyword.toLowerCase())) {
            conceptMatches++;
        }
    });
    
    // Add complexity based on matches
    complexity += Math.min(0.3, visualMatches * 0.03); // Max 0.3 from visual matches
    complexity += Math.min(0.2, assetMatches * 0.04);  // Max 0.2 from asset matches
    complexity += Math.min(0.3, conceptMatches * 0.06); // Max 0.3 from concept matches
    
    // Add complexity based on scene position
    // First and last scenes are often more complex/important
    if (isFirstScene || isLastScene) {
        complexity += 0.1;
    }
    
    // Cap complexity at 1.0
    complexity = Math.min(1.0, complexity);
    
    analyzerLogger.complexity(loggingId, `Calculated scene complexity`, {
      complexity,
      visualMatches,
      assetMatches,
      conceptMatches,
      isFirstScene,
      isLastScene
    });
    
    // Determine visual style
    let visualStyle = 'minimal';
    if (complexity > 0.7) {
        visualStyle = 'elaborate';
    } else if (complexity > 0.4) {
        visualStyle = 'standard';
    }
    
    // Generate a component name suggestion based on content
    let suggestedComponentName = generateComponentName(description, scenePosition);
    
    // Determine required elements based on keywords found
    const requiredElements: string[] = [];
    
    // Check for common elements needed in scenes
    if (visualMatches > 0) {
        requiredElements.push('Animation');
    }
    
    if (assetMatches > 0) {
        requiredElements.push('MediaAsset');
    }
    
    if (lowerDesc.includes('text') || lowerDesc.includes('title') || lowerDesc.includes('heading')) {
        requiredElements.push('TextElement');
    }
    
    if (lowerDesc.includes('background') || lowerDesc.includes('backdrop')) {
        requiredElements.push('Background');
    }
    
    if (conceptMatches > 0) {
        requiredElements.push('DataVisualization');
    }
    
    // Always include at least one element
    if (requiredElements.length === 0) {
        requiredElements.push('BasicScene');
    }
    
    analyzerLogger.analyze(loggingId, `Completed scene analysis`, {
      complexity,
      visualStyle,
      suggestedComponentName,
      requiredElements: requiredElements.join(','),
    });
    
    return {
        requiredElements,
        visualStyle,
        complexity,
        suggestedComponentName,
    };
}

/**
 * Generate a component name based on scene description and position
 * 
 * @param description Scene description text
 * @param position Position in video (opening, middle, closing)
 * @returns Suggested component name
 */
function generateComponentName(description: string, position: string): string {
    // Extract significant words from description (nouns, verbs, adjectives)
    const words = description
        .split(/\s+/)
        .filter(word => word.length > 3) // Skip short words
        .slice(0, 2)  // Take first two significant words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()); // Capitalize
    
    // Create a name prefix based on position
    let prefix = '';
    if (position === 'opening') prefix = 'Intro';
    else if (position === 'closing') prefix = 'Outro';
    
    // Build the component name
    let componentName = words.join('');
    if (prefix && componentName) {
        componentName = prefix + componentName;
    } else if (prefix) {
        componentName = prefix + 'Scene';
    } else if (!componentName) {
        componentName = 'ContentScene';
    }
    
    // Ensure it ends with 'Scene'
    if (!componentName.endsWith('Scene')) {
        componentName += 'Scene';
    }
    
    return componentName;
} 