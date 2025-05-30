// src/app/projects/[id]/generate/agents/codeGenerator.ts
import type { CodeGenerator } from './interfaces';
import type { Storyboard } from '../types/storyboard';

/**
 * CodeGenerator - Responsible for generating Remotion components for each scene
 * 
 * Note: This agent now receives pre-generated code from the orchestrator
 * which handles the tRPC calls to the server-side LLM services
 */
export class AICodeGenerator implements CodeGenerator {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * Generate Remotion components for all scenes in the storyboard
   * This method now returns fallback success and expects the orchestrator
   * to provide the actual LLM-generated component code
   */
  async generateSceneComponents(
    storyboard: Storyboard, 
    progressCallback: (completedScenes: number) => void
  ): Promise<boolean> {
    try {
      const scenes = storyboard.scenes || [];
      
      // Simulate progress for each scene
      for (let i = 0; i < scenes.length; i++) {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Report progress
        progressCallback(i + 1);
      }
      
      return true;
    } catch (error) {
      if (this.DEBUG) console.error('Error generating scene components:', error);
      return false;
    }
  }
  
  /**
   * Generate a fallback component for a scene
   */
  private generateFallbackComponent(sceneName: string, template: string): string {
    return `import { useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion';

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