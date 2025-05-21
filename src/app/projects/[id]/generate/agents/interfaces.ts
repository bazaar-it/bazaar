import type { Storyboard, Scene, VideoStyle, Asset } from '../types/storyboard';

/**
 * Interface for the SceneAgent
 * Responsible for planning scenes based on the user prompt
 */
export interface SceneAgent {
  planScenes(userPrompt: string, additionalInstructions?: string, maxScenes?: number): Promise<Scene[]>;
}

/**
 * Interface for the StyleAgent
 * Responsible for generating a consistent visual style for the video
 */
export interface StyleAgent {
  generateStyle(userPrompt: string, additionalInstructions?: string): Promise<VideoStyle>;
}

/**
 * Interface for the AssetAgent
 * Responsible for identifying and potentially generating required assets
 */
export interface AssetAgent {
  identifyAssets(storyboard: Storyboard): Promise<Asset[]>;
}

/**
 * Interface for the CodeGenerator
 * Responsible for generating Remotion components for each scene
 */
export interface CodeGenerator {
  generateSceneComponents(
    storyboard: Storyboard, 
    progressCallback: (completedScenes: number) => void
  ): Promise<boolean>;
} 