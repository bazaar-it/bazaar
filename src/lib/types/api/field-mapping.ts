// src/lib/types/api/field-mapping.ts

import type { 
  SceneData,
  SceneBuilderServiceResponse,
  CodeServiceResponse,
  CodeEditServiceResponse,
  AddSceneToolOutput,
  EditSceneToolOutput,
  FixBrokenSceneToolOutput
} from './index';

/**
 * Field mapping documentation and helper functions
 * Shows how to transform between current and standardized formats
 */

// ============= SERVICE TO SCENE DATA MAPPINGS =============

/**
 * Convert SceneBuilderService response to SceneData
 */
export function sceneBuilderToSceneData(
  response: SceneBuilderServiceResponse,
  id: string
): SceneData {
  return {
    id,
    name: response.name,        // Display name -> name
    tsxCode: response.code,     // code -> tsxCode
    duration: response.duration,
    layoutJson: JSON.stringify(response.layoutJson), // Object -> string
    props: {}
  };
}

/**
 * Convert CodeGeneratorService response to SceneData
 */
export function codeServiceToSceneData(
  response: CodeServiceResponse,
  id: string
): SceneData {
  return {
    id,
    name: response.name,        // Function name -> name
    tsxCode: response.code,     // code -> tsxCode
    duration: response.duration,
    props: {}
  };
}

/**
 * Convert DirectCodeEditorService response to SceneData
 */
export function codeEditServiceToSceneData(
  response: CodeEditServiceResponse,
  id: string,
  existingName: string
): SceneData {
  return {
    id,
    name: existingName,         // Keep existing name
    tsxCode: response.code,     // code -> tsxCode
    duration: response.newDurationFrames || 180, // Use new duration or default
    props: {}
  };
}

// ============= TOOL OUTPUT TO SCENE DATA MAPPINGS =============

/**
 * Convert AddScene tool output to SceneData
 */
export function addSceneOutputToSceneData(
  output: AddSceneToolOutput,
  id: string
): SceneData {
  return {
    id,
    name: output.sceneName,      // sceneName -> name
    tsxCode: output.sceneCode,   // sceneCode -> tsxCode
    duration: output.duration,
    layoutJson: output.layoutJson, // Already stringified
    props: {}
  };
}

/**
 * Convert EditScene tool output to SceneData
 */
export function editSceneOutputToSceneData(
  output: EditSceneToolOutput,
  id: string
): SceneData {
  return {
    id,
    name: output.sceneName,      // sceneName -> name
    tsxCode: output.sceneCode,   // sceneCode -> tsxCode
    duration: output.duration,
    props: {}
  };
}

/**
 * Convert FixBrokenScene tool output to SceneData
 */
export function fixBrokenSceneOutputToSceneData(
  output: FixBrokenSceneToolOutput
): SceneData {
  return {
    id: output.sceneId,
    name: output.sceneName,      // sceneName -> name
    tsxCode: output.fixedCode,   // fixedCode -> tsxCode (DIFFERENT!)
    duration: output.duration,
    props: {}
  };
}

// ============= FIELD NAME MAPPING REFERENCE =============

/**
 * Field name mappings across the system
 */
export const FIELD_MAPPINGS = {
  // Database -> Service -> Tool -> VideoState
  tsxCode: {
    database: 'tsxCode',
    service: 'code',
    tool: 'sceneCode',      // or 'fixedCode' for FixBrokenScene
    videoState: 'data.code'
  },
  
  name: {
    database: 'name',
    service: 'name',
    tool: 'sceneName',
    videoState: 'data.name'
  },
  
  duration: {
    database: 'duration',
    service: 'duration',
    tool: 'duration',
    videoState: 'duration'
  },
  
  changes: {
    database: 'changesApplied', // In scene_iterations table
    service: 'changes',
    tool: 'changes',            // or 'changesApplied' for FixBrokenScene
    videoState: null            // Not stored in video state
  }
} as const;

/**
 * Special cases that don't follow the standard pattern
 */
export const SPECIAL_CASES = {
  fixBrokenScene: {
    codeField: 'fixedCode',     // Instead of 'sceneCode'
    changesField: 'changesApplied' // Instead of 'changes'
  },
  
  changeDuration: {
    // Doesn't output scene data at all
    // Returns frame/second pairs instead
  },
  
  analyzeImage: {
    // Doesn't output scene data
    // Returns analysis results
  }
} as const;