// src/app/projects/[id]/generate/agents/promptOrchestrator.ts
import { AISceneAgent, AIStyleAgent, AIAssetAgent, AICodeGenerator } from './index';
import type { Storyboard, GenerationState } from '../types/storyboard';

export interface GenerationCallbacks {
  onStateChange: (state: GenerationState) => void;
  onStoryboardUpdate: (storyboard: Storyboard) => void;
  onComponentGenerated: (sceneId: string, code: string) => void;
}

export class PromptOrchestrator {
  private sceneAgent: AISceneAgent;
  private styleAgent: AIStyleAgent;
  private assetAgent: AIAssetAgent;
  private codeGenerator: AICodeGenerator;
  
  constructor() {
    this.sceneAgent = new AISceneAgent();
    this.styleAgent = new AIStyleAgent();
    this.assetAgent = new AIAssetAgent();
    this.codeGenerator = new AICodeGenerator();
  }
  
  /**
   * Generate a storyboard with fallback data
   * The React component will replace this with actual LLM-generated data
   */
  async generateFallbackStoryboard(
    userPrompt: string,
    callbacks: GenerationCallbacks,
    maxScenes = 5
  ): Promise<Storyboard> {
    const storyboard: Storyboard = {
      id: `storyboard-${Date.now()}`,
      title: 'Generated Video',
      fps: 30,
      width: 1280,
      height: 720,
      duration: 0,
      scenes: [],
      assets: [],
      style: undefined,
      metadata: {
        prompt: userPrompt,
        generatedAt: new Date().toISOString()
      }
    };
    
    try {
      // Stage 1: Scene Planning (fallback)
      callbacks.onStateChange({
        stage: 'planning',
        progress: 10,
        message: 'Planning video scenes...',
        storyboard
      });
      
      const scenes = await this.sceneAgent.planScenes(userPrompt, undefined, maxScenes);
      storyboard.scenes = scenes;
      storyboard.duration = scenes.reduce((total: number, scene: any) => total + scene.duration, 0);
      
      callbacks.onStoryboardUpdate(storyboard);
      
      // Stage 2: Style Generation (fallback)
      callbacks.onStateChange({
        stage: 'styling',
        progress: 30,
        message: 'Generating visual style...',
        storyboard
      });
      
      const style = await this.styleAgent.generateStyle(userPrompt);
      storyboard.style = style;
      callbacks.onStoryboardUpdate(storyboard);
      
      // Stage 3: Asset Identification (fallback)
      callbacks.onStateChange({
        stage: 'assets',
        progress: 50,
        message: 'Identifying required assets...',
        storyboard
      });
      
      const assets = await this.assetAgent.identifyAssets(storyboard);
      storyboard.assets = assets;
      callbacks.onStoryboardUpdate(storyboard);
      
      // Stage 4: Component Generation (fallback)
      callbacks.onStateChange({
        stage: 'components',
        progress: 70,
        message: 'Generating component code...',
        storyboard
      });
      
      // Generate fallback code for each scene
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene) continue;
        
        const fallbackCode = this.generateFallbackComponent(scene.name, scene.template || 'ContentScene');
        callbacks.onComponentGenerated(scene.id || `scene-${i}`, fallbackCode);
        
        // Update progress
        const progress = 70 + (i + 1) / scenes.length * 20;
        callbacks.onStateChange({
          stage: 'components',
          progress,
          message: `Generated component for ${scene.name}...`,
          storyboard
        });
      }
      
      // Stage 5: Complete
      callbacks.onStateChange({
        stage: 'complete',
        progress: 100,
        message: 'Video generation complete!',
        storyboard
      });
      
      return storyboard;
      
    } catch (error) {
      console.error('Error in video generation:', error);
      
      callbacks.onStateChange({
        stage: 'error',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        storyboard,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return storyboard;
    }
  }
  
  /**
   * Generate a fallback component for a scene using Sprint 25/26 ESM patterns
   */
  private generateFallbackComponent(sceneName: string, template: string): string {
    return `const { useCurrentFrame, useVideoConfig, AbsoluteFill } = window.Remotion;

export default function ${template}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#1F2937',
      fontFamily: 'Inter'
    }}>
      <h1 style={{ fontSize: 48 }}>
        ${sceneName}
      </h1>
    </AbsoluteFill>
  );
}`;
  }
} 