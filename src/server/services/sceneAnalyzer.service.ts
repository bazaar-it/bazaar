// src/server/services/sceneAnalyzer.service.ts
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
  
  try {
    // Extract scene description from various possible locations
    const description = 
      scene.data?.description || 
      scene.data?.text || 
      scene.data?.name || 
      `Scene with effect: ${scene.type}`;
    
    // Calculate duration in seconds based on frames (assumes 30fps if not specified)
    const fps = scene.fps || 30;
    const durationInSeconds = (scene.duration || 180) / fps; // Provide fallback of 6s (180 frames)
    
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
  } catch (error) {
    analyzerLogger.error(sceneId, `Error extracting scene details: ${error instanceof Error ? error.message : String(error)}`, {
      error: error instanceof Error ? error.message : String(error),
      sceneData: JSON.stringify(scene).substring(0, 200) // Log partial scene data for debugging
    });
    
    // Return safe defaults so the pipeline can continue
    return {
      description: "Scene with unknown content",
      durationInSeconds: 6, // Default 6 seconds
      fps: 30,
      sceneId: scene.id || 'unknown',
      type: scene.type || 'text',
      data: {}
    };
  }
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
  
  try {
    // Generate a consistent component name based on description
    const words = description
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    const componentName = sanitizeComponentName(`${words}Scene` || 'CustomScene');
    
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
      suggestedName: componentName,
      durationInFrames: Math.round(durationInSeconds * fps)
    };
  } catch (error) {
    analyzerLogger.error(loggingId, `Error analyzing scene description: ${error instanceof Error ? error.message : String(error)}`, {
      error: error instanceof Error ? error.message : String(error),
      description: description.substring(0, 100),
      durationInSeconds,
      fps
    });
    
    // Return safe defaults so the pipeline can continue
    return {
      description: description || "Scene with unknown content",
      durationInSeconds: durationInSeconds || 6, // Use provided duration or default
      fps: fps || 30,
      suggestedName: 'SafeFallbackScene',
      durationInFrames: Math.round((durationInSeconds || 6) * (fps || 30))
    };
  }
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
    // Provide safe defaults for parameters
    const safeDescription = description || "Scene with default content";
    const safeSceneIndex = typeof sceneIndex === 'number' ? sceneIndex : 0;
    const safeTotalScenes = typeof totalScenes === 'number' && totalScenes > 0 ? totalScenes : 1;
    
    const loggingId = 'scene-' + safeSceneIndex;
    
    try {
        // Determine scene position type (first, middle, last)
        const isFirstScene = safeSceneIndex === 0;
        const isLastScene = safeSceneIndex === safeTotalScenes - 1;
        const scenePosition = isFirstScene ? 'opening' : isLastScene ? 'closing' : 'middle';
        
        analyzerLogger.analyze(loggingId, `Starting content analysis for ${scenePosition} scene`, {
          descriptionLength: safeDescription.length,
          position: scenePosition,
          sceneIndex: safeSceneIndex,
          totalScenes: safeTotalScenes
        });
        
        // Initialize complexity score based on description length and content
        let complexity = 0;
        
        // Longer descriptions usually need more sophisticated visuals
        complexity += Math.min(0.3, safeDescription.length / 200);
        
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
        const lowerDesc = safeDescription.toLowerCase();
        
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
        let suggestedComponentName = generateComponentName(safeDescription, scenePosition);
        
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
        
        // Log the analysis results
        analyzerLogger.analyze(loggingId, `Completed scene analysis`, {
            complexity,
            requiredElements: requiredElements.join(','),
            suggestedComponentName,
            visualStyle
        });
        
        // Properly log using structured logging, not just the ID
        logger.debug(`Completed analysis for scene ${loggingId}`, {
            sceneId: loggingId,
            complexity,
            type: "analysis_complete"
        });
        
        // Return the analysis
        return {
            complexity,
            requiredElements,
            suggestedComponentName,
            visualStyle,
            isFirstScene,
            isLastScene
        };
    } catch (error) {
        // Log the error but return a safe default analysis
        analyzerLogger.error(loggingId, `Error analyzing scene content: ${error instanceof Error ? error.message : String(error)}`, {
            error: error instanceof Error ? error.message : String(error),
            description: safeDescription.substring(0, 100),
            sceneIndex: safeSceneIndex,
            totalScenes: safeTotalScenes
        });
        
        // Properly log error with structured data
        logger.debug(`Analysis failed for scene ${loggingId}, using fallback values`, {
            sceneId: loggingId,
            type: "analysis_fallback",
            error: error instanceof Error ? error.message : String(error)
        });
        
        // Return a safe default so the pipeline can continue
        return {
            complexity: 0.5, // Medium complexity as default
            requiredElements: ['Animation', 'TextElement', 'Background'],
            suggestedComponentName: 'FallbackScene',
            visualStyle: 'standard',
            isFirstScene: safeSceneIndex === 0,
            isLastScene: safeSceneIndex === safeTotalScenes - 1
        };
    }
}

/**
 * Generate a component name based on scene description and position
 * 
 * @param description Scene description text
 * @param position Position in video (opening, middle, closing)
 * @returns Suggested component name
 */
function generateComponentName(description: string, position: string): string {
    try {
        // Use all words or default to position + scene
        const nameBase = description
            .split(/\s+/)
            .filter(word => word.length > 2)
            .slice(0, 3)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        // Add position context to the name when empty or for first/last scenes
        let name = nameBase;
        if (!nameBase || position === 'opening') {
            name = 'Intro' + (nameBase || 'DisplayText');
        } else if (position === 'closing') {
            name = 'Outro' + (nameBase || 'Simple');
        }
        
        // Add Scene suffix if missing
        if (!name.endsWith('Scene')) {
            name += 'Scene';
        }
        
        return sanitizeComponentName(name);
    } catch (error) {
        // Return a safe default on error
        return sanitizeComponentName(`Default${position.charAt(0).toUpperCase() + position.slice(1)}Scene`);
    }
}

/**
 * Sanitizes a component name to ensure it's a valid JavaScript identifier
 * - Cannot start with a number
 * - Can only contain letters, numbers, $ and _
 */
function sanitizeComponentName(name: string): string {
    try {
        // Sanitize to ensure valid JavaScript identifier
        let sanitized = name || 'DefaultScene';
        
        // Replace non-alphanumeric characters with empty string
        sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
        
        // Ensure it starts with a letter
        if (!/^[a-zA-Z]/.test(sanitized)) {
            sanitized = 'Scene' + sanitized;
        }
        
        // Ensure it's not empty
        if (!sanitized || sanitized.length < 2) {
            sanitized = 'SafeDefaultScene';
        }
        
        return sanitized;
    } catch (error) {
        // Return the most basic safe name on any error
        return 'FailsafeScene';
    }
} 