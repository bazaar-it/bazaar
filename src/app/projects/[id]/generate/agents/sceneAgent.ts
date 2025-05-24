// src/app/projects/[id]/generate/agents/sceneAgent.ts
import type { SceneAgent } from './interfaces';
import type { Scene } from '../types/storyboard';

/**
 * SceneAgent - Responsible for planning the scenes that make up a video
 * based on user prompt and additional instructions
 * 
 * Note: This agent now receives pre-planned scenes from the orchestrator
 * which handles the tRPC calls to the server-side LLM services
 */
export class AISceneAgent implements SceneAgent {
  /**
   * Plan a sequence of scenes based on the user prompt
   * This method now returns fallback scenes and expects the orchestrator
   * to provide the actual LLM-generated scenes
   */
  async planScenes(
    userPrompt: string, 
    additionalInstructions?: string,
    maxScenes = 5
  ): Promise<Scene[]> {
    // Return fallback scenes - the orchestrator will replace these with LLM-generated ones
    return this.getFallbackScenes(userPrompt, maxScenes);
  }
  
  /**
   * Get fallback scenes if AI planning fails
   * Now generates animation-focused props based on user intent
   */
  private getFallbackScenes(userPrompt: string, maxScenes: number): Scene[] {
    // Parse user intent for animation vs text focus
    const isAnimationFocused = /\b(animat|move|expand|explode|bubble|rotate|slide|bounce|fade)\b/i.test(userPrompt);
    
    // Create a basic 3-scene structure: title, content, outro
    const count = Math.min(maxScenes, 3);
    
    const scenes: Scene[] = [];
    
    // Always include a title scene
    scenes.push({
      id: 'scene-001-title',
      name: 'Title',
      template: 'TitleScene',
      start: 0,
      duration: 45, // Shorter duration for better UX
      props: {
        // Always include text for title scenes
        title: 'Video Title',
        text: userPrompt.slice(0, 50),
        animationType: 'fade',
        primaryColor: '#ffffff',
        timing: 'medium'
      },
      metadata: {
        description: 'Title scene with fade animation',
        prompt: userPrompt,
        visualConcept: 'Title fades in with smooth animation',
        version: 2
      }
    });
    
    // Add content scene(s) if we have room
    if (count > 1) {
      scenes.push({
        id: 'scene-002-content',
        name: 'Content',
        template: 'ContentScene',
        start: 45,
        duration: 45,
        props: isAnimationFocused ? {
          // Animation-focused content
          animationType: 'expand',
          primaryColor: '#3B82F6',
          secondaryColor: '#8B5CF6',
          scale: 2.0,
          timing: 'medium'
        } : {
          // Text-focused content
          title: 'Main Content',
          text: 'Content based on your prompt will appear here.',
          animationType: 'slide',
          direction: 'left',
          timing: 'medium'
        },
        metadata: {
          description: isAnimationFocused ? 'Animated content scene' : 'Text content scene',
          prompt: userPrompt,
          visualConcept: isAnimationFocused ? 'Visual animation based on user prompt' : 'Text content with slide animation',
          version: 2
        }
      });
    }
    
    // Add an outro if we have room
    if (count > 2) {
      scenes.push({
        id: 'scene-003-conclusion',
        name: 'Conclusion',
        template: 'OutroScene',
        start: 90,
        duration: 45,
        props: {
          title: 'Thank You',
          text: 'Thanks for watching!',
          animationType: 'fade',
          primaryColor: '#ffffff',
          timing: 'slow'
        },
        metadata: {
          description: 'Conclusion scene with fade animation',
          prompt: userPrompt,
          visualConcept: 'Thank you message with gentle fade',
          version: 2
        }
      });
    }
    
    return scenes;
  }
} 