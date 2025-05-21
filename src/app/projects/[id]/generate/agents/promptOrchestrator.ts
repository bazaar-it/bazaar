import { v4 as uuidv4 } from 'uuid';
import type { Storyboard, GenerationState, Scene, VideoStyle, Asset } from '../types/storyboard';
import type { SceneAgent, StyleAgent, AssetAgent, CodeGenerator } from './interfaces';
import { AISceneAgent } from './sceneAgent';
import { AIStyleAgent } from './styleAgent';
import { AIAssetAgent } from './assetAgent';
import { AICodeGenerator } from './codeGenerator';

interface OrchestrationOptions {
  maxScenes?: number;
  fps?: number;
  width?: number;
  height?: number;
}

export class PromptOrchestrator {
  private projectId: string;
  private storyboard: Storyboard | null = null;
  private sceneAgent: SceneAgent;
  private styleAgent: StyleAgent;
  private assetAgent: AssetAgent;
  private codeGenerator: CodeGenerator;
  private generationState: GenerationState;
  
  // Event handlers
  private onUpdateCallbacks: ((state: GenerationState) => void)[] = [];
  
  constructor(projectId: string, apiKey?: string) {
    this.projectId = projectId;
    
    // Initialize real agent implementations
    this.sceneAgent = new AISceneAgent(apiKey);
    this.styleAgent = new AIStyleAgent(apiKey);
    this.assetAgent = new AIAssetAgent(apiKey);
    this.codeGenerator = new AICodeGenerator(apiKey);
    
    // Initialize generation state
    this.generationState = {
      stage: 'idle',
      progress: 0,
      message: 'Ready to generate video',
    };
  }
  
  /**
   * Register a callback to be called when generation state updates
   */
  public onUpdate(callback: (state: GenerationState) => void): () => void {
    this.onUpdateCallbacks.push(callback);
    return () => {
      this.onUpdateCallbacks = this.onUpdateCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * Update the generation state and notify all listeners
   */
  private updateState(partialState: Partial<GenerationState>): void {
    this.generationState = { ...this.generationState, ...partialState };
    
    // Notify all listeners
    for (const callback of this.onUpdateCallbacks) {
      callback(this.generationState);
    }
  }
  
  /**
   * Start the video generation process based on a user prompt
   */
  public async generateVideo(
    userPrompt: string, 
    additionalInstructions?: string,
    options: OrchestrationOptions = {}
  ): Promise<Storyboard> {
    try {
      // Reset any previous state
      this.updateState({
        stage: 'analyzing',
        progress: 0,
        message: 'Analyzing your prompt...',
        error: undefined,
        storyboard: undefined
      });
      
      // Initialize empty storyboard
      const storyboardId = uuidv4();
      this.storyboard = {
        id: storyboardId,
        projectId: this.projectId,
        title: 'Generated Video',
        fps: options.fps || 30,
        width: options.width || 1920,
        height: options.height || 1080,
        durationInFrames: 0, // Will be calculated later
        scenes: [],
        metadata: {
          userPrompt,
          generatedAt: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      // 1. Plan scenes with the SceneAgent
      this.updateState({ 
        stage: 'planning', 
        progress: 10,
        message: 'Planning video scenes...'
      });
      
      const scenes = await this.sceneAgent.planScenes(
        userPrompt, 
        additionalInstructions, 
        options.maxScenes || 5
      );
      
      this.storyboard.scenes = scenes;
      this.updateState({ 
        progress: 30,
        message: `Planned ${scenes.length} scenes for your video`
      });
      
      // 2. Generate style with the StyleAgent
      this.updateState({ 
        stage: 'styling', 
        progress: 40,
        message: 'Creating visual style...'
      });
      
      const style = await this.styleAgent.generateStyle(
        userPrompt, 
        additionalInstructions
      );
      
      this.storyboard.style = style;
      this.updateState({ 
        progress: 50,
        message: 'Visual style defined'
      });
      
      // 3. Identify assets with the AssetAgent
      this.updateState({ 
        stage: 'assets', 
        progress: 60,
        message: 'Identifying required assets...'
      });
      
      const assets = await this.assetAgent.identifyAssets(
        this.storyboard
      );
      
      this.storyboard.assets = assets;
      this.updateState({ 
        progress: 70,
        message: `Identified ${assets.length} required assets`
      });
      
      // 4. Generate component code for each scene
      this.updateState({ 
        stage: 'components', 
        progress: 80,
        message: 'Building scene components...'
      });
      
      await this.codeGenerator.generateSceneComponents(
        this.storyboard,
        (completedScenes: number) => {
          const totalScenes = this.storyboard?.scenes.length || 1;
          const componentProgress = (completedScenes / totalScenes) * 20; // 20% of total progress
          this.updateState({
            progress: 70 + componentProgress,
            message: `Built ${completedScenes}/${totalScenes} components`
          });
        }
      );
      
      // 5. Calculate total duration
      const totalDuration = this.storyboard.scenes.reduce(
        (total, scene) => Math.max(total, scene.start + scene.duration),
        0
      );
      this.storyboard.durationInFrames = totalDuration;
      
      // 6. Finalize
      this.updateState({ 
        stage: 'complete', 
        progress: 100,
        message: 'Your video is ready to preview!',
        storyboard: this.storyboard
      });
      
      return this.storyboard;
    } catch (error) {
      console.error('Error in video generation:', error);
      this.updateState({ 
        stage: 'error', 
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error in video generation'
      });
      throw error;
    }
  }
  
  /**
   * Get the current generation state
   */
  public getState(): GenerationState {
    return this.generationState;
  }
  
  /**
   * Get the current storyboard (if available)
   */
  public getStoryboard(): Storyboard | null {
    return this.storyboard;
  }
} 