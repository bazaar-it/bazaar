import type { StyleAgent } from './interfaces';
import type { VideoStyle } from '../types/storyboard';

/**
 * StyleAgent - Responsible for generating a consistent visual style for the video
 * 
 * Note: This agent now receives pre-generated styles from the orchestrator
 * which handles the tRPC calls to the server-side LLM services
 */
export class AIStyleAgent implements StyleAgent {
  /**
   * Generate a visual style based on the user prompt
   * This method now returns fallback style and expects the orchestrator
   * to provide the actual LLM-generated style
   */
  async generateStyle(userPrompt: string, additionalInstructions?: string): Promise<VideoStyle> {
    // Return fallback style - the orchestrator will replace this with LLM-generated one
    return this.getFallbackStyle();
  }
  
  /**
   * Get fallback style if AI generation fails
   */
  private getFallbackStyle(): VideoStyle {
    return {
      colorPalette: ['#3B82F6', '#8B5CF6', '#F59E0B', '#FFFFFF', '#1F2937'],
      fontPrimary: 'Inter',
      fontSecondary: 'Roboto',
      mood: 'modern',
      visualStyle: 'professional',
      pacing: 'medium'
    };
  }
} 