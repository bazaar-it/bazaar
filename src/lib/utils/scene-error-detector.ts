// Scene Error Detection Utility
// Helps identify which scene is causing runtime errors

export interface SceneErrorInfo {
  sceneIndex: number;
  sceneName: string;
  sceneId: string;
  errorMessage: string;
  variableName?: string;
  lineNumber?: number;
}

/**
 * Analyzes an error and compiled scenes to determine which scene is likely causing the issue
 */
export function detectProblematicScene(
  error: Error,
  compiledScenes: Array<{
    isValid: boolean;
    compiledCode: string;
    componentName: string;
  }>,
  originalScenes: Array<any>
): SceneErrorInfo | null {
  const errorMessage = error.message;
  
  // Check for duplicate identifier errors (like "Identifier 'currentFrame' has already been declared")
  const duplicateIdentifierMatch = errorMessage.match(/Identifier '(\w+)' has already been declared/);
  if (duplicateIdentifierMatch) {
    const variableName = duplicateIdentifierMatch[1];
    
    // Check each scene for duplicate declarations of this variable
    for (let i = 0; i < compiledScenes.length; i++) {
      const scene = compiledScenes[i];
      if (scene && scene.isValid && scene.compiledCode) {
        // Count occurrences of variable declarations
        const declarationPattern = new RegExp(`(let|const|var)\\s+${variableName}\\b`, 'g');
        const matches = scene.compiledCode.match(declarationPattern);
        
        if (matches && matches.length > 1) {
          // Found the problematic scene with duplicate declarations
          const originalScene = originalScenes[i];
          const sceneName = originalScene?.data?.name || originalScene?.name || `Scene ${i + 1}`;
          
          return {
            sceneIndex: i,
            sceneName,
            sceneId: originalScene?.id || '',
            errorMessage: `Duplicate declaration of '${variableName}' in ${sceneName}`,
            variableName,
            lineNumber: undefined
          };
        }
      }
    }
  }
  
  // Try to extract undefined variable name
  const undefinedVarMatch = errorMessage.match(/(\w+) is not defined/);
  if (undefinedVarMatch) {
    const variableName = undefinedVarMatch[1];
    
    // Check each scene for usage of this variable
    for (let i = 0; i < compiledScenes.length; i++) {
      const scene = compiledScenes[i];
      if (scene && scene.isValid && scene.compiledCode.includes(variableName)) {
        // Found the problematic scene
        const originalScene = originalScenes[i];
        const sceneName = originalScene?.data?.name || originalScene?.name || `Scene ${i + 1}`;
        
        // Try to find line number
        const lines = scene.compiledCode.split('\n');
        const lineIndex = lines.findIndex(line => line.includes(variableName));
        
        return {
          sceneIndex: i,
          sceneName,
          sceneId: originalScene?.id || '',
          errorMessage: `Variable '${variableName}' is not defined in ${sceneName}`,
          variableName,
          lineNumber: lineIndex >= 0 ? lineIndex + 1 : undefined
        };
      }
    }
  }
  
  // Try to extract scene information from stack trace
  const stackMatch = errorMessage.match(/Scene(\d+)Component|FallbackScene(\d+)/);
  if (stackMatch) {
    const sceneIndex = parseInt(stackMatch[1] || stackMatch[2], 10);
    const originalScene = originalScenes[sceneIndex];
    const sceneName = originalScene?.data?.name || `Scene ${sceneIndex + 1}`;
    
    return {
      sceneIndex,
      sceneName,
      sceneId: originalScene?.id || '',
      errorMessage: `Error in ${sceneName}: ${errorMessage}`,
    };
  }
  
  // Check for syntax errors
  const syntaxMatch = errorMessage.match(/Unexpected token|SyntaxError/);
  if (syntaxMatch) {
    // For syntax errors, check which scene failed compilation
    for (let i = 0; i < compiledScenes.length; i++) {
      if (!compiledScenes[i]?.isValid) {
        const originalScene = originalScenes[i];
        const sceneName = originalScene?.data?.name || `Scene ${i + 1}`;
        
        return {
          sceneIndex: i,
          sceneName,
          sceneId: originalScene?.id || '',
          errorMessage: `Syntax error in ${sceneName}: ${errorMessage}`,
        };
      }
    }
  }
  
  return null;
}

/**
 * Enhances an error message with scene-specific information
 */
export function enhanceErrorMessage(
  error: Error,
  sceneInfo: SceneErrorInfo
): string {
  let enhanced = `Error in Scene ${sceneInfo.sceneIndex + 1} (${sceneInfo.sceneName}):\n`;
  enhanced += sceneInfo.errorMessage;
  
  if (sceneInfo.variableName) {
    enhanced += `\n\nThe variable '${sceneInfo.variableName}' was used but not defined.`;
    enhanced += `\nThis often happens when:`;
    enhanced += `\n- A typo in the variable name`;
    enhanced += `\n- Missing import or declaration`;
    enhanced += `\n- Variable is out of scope`;
  }
  
  if (sceneInfo.lineNumber) {
    enhanced += `\n\nError likely at line ${sceneInfo.lineNumber}`;
  }
  
  return enhanced;
}