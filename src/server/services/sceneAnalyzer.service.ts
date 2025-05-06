import { type SceneAnalysis } from '~/types/chat';

/**
 * Extract details from a scene object for regeneration
 * 
 * @param scene - The scene object from the project properties
 * @returns Scene details including description and duration
 */
export function getSceneDetails(scene: any) {
  // Extract scene description from various possible locations
  const description = 
    scene.data?.description || 
    scene.data?.text || 
    scene.data?.name || 
    `Scene with effect: ${scene.type}`;
  
  // Calculate duration in seconds based on frames (assumes 30fps if not specified)
  const fps = scene.fps || 30;
  const durationInSeconds = scene.duration / fps;
  
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
  // Generate a consistent component name based on description
  const words = description
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  const componentName = `${words}Scene` || 'CustomScene';
  
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
    // Determine scene position type (first, middle, last)
    const isFirstScene = sceneIndex === 0;
    const isLastScene = sceneIndex === totalScenes - 1;
    const scenePosition = isFirstScene ? 'opening' : isLastScene ? 'closing' : 'middle';
    
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
    
    return {
        requiredElements,
        visualStyle,
        complexity,
        suggestedComponentName
    };
}

/**
 * Generates a component name based on scene description and position
 * 
 * @param description - Scene description
 * @param position - Scene position (opening, middle, closing)
 * @returns A suggested component name
 */
function generateComponentName(description: string, position: string): string {
    // Extract main subject/action from description
    const words = description.split(/\s+/);
    let mainSubject = '';
    
    // Look for nouns after action words
    const actionWords = ['show', 'display', 'present', 'introduce', 'highlight', 'demonstrate'];
    for (let i = 0; i < words.length - 1; i++) {
        const word = words[i]?.toLowerCase() || '';
        if (actionWords.includes(word)) {
            mainSubject = words[i + 1] || '';
            break;
        }
    }
    
    // If no action word found, use words 1-3 if available
    if (!mainSubject && words.length > 1) {
        // Skip articles/prepositions
        const skipWords = ['the', 'a', 'an', 'in', 'on', 'at', 'with', 'by', 'for', 'to'];
        for (let i = 0; i < Math.min(3, words.length); i++) {
            const word = words[i]?.toLowerCase() || '';
            if (!skipWords.includes(word) && words[i]) {
                mainSubject = words[i] || '';
                break;
            }
        }
    }
    
    // Fall back to first word if needed
    if (!mainSubject && words.length > 0 && words[0]) {
        mainSubject = words[0];
    }
    
    // Clean and capitalize the subject
    mainSubject = mainSubject
        .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric
        .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
    
    // If empty or too short, use position-based default
    if (!mainSubject || mainSubject.length < 2) {
        mainSubject = position === 'opening' ? 'Intro' : 
                      position === 'closing' ? 'Outro' : 'Content';
    }
    
    // Combine with scene position
    return `${position.charAt(0).toUpperCase() + position.slice(1)}${mainSubject}Scene`;
} 