// src/server/services/scene/add/LayoutGenerator.ts
import { StandardSceneService } from '@/server/services/base/StandardSceneService';
import { StandardApiResponse, SceneOperationResponse } from '@/lib/types/api/golden-rule-contracts';
import { aiClient } from '@/server/services/ai/aiClient.service';
import { getModel } from '@/config/models.config';
import { getPrompt } from '@/config/prompts.config';

/**
 * Layout Generator Service
 * Responsible for converting user prompts to structured JSON layouts
 * This is step 1 of the 2-step scene creation pipeline
 */
export class LayoutGenerator extends StandardSceneService {
  
  /**
   * Generate a JSON layout from user prompt
   * Returns a Scene with layoutJson populated
   */
  async generateLayout(input: {
    projectId: string;
    prompt: string;
    order?: number;
    previousSceneJson?: string;
    visionAnalysis?: any;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const order = input.order || 0;
    const displayName = `Scene ${order + 1}`;
    
    // Get model and prompt configuration
    const model = getModel('layoutGenerator');
    const systemPrompt = getPrompt('layout-generator');
    
    // Generate layout using AI
    const response = await aiClient.generateResponse({
      model: model.model,
      temperature: model.temperature,
      systemPrompt: systemPrompt,
      userPrompt: input.prompt,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          userPrompt: input.prompt,
          previousSceneJson: input.previousSceneJson,
          isFirstScene: !input.previousSceneJson,
          visionAnalysis: input.visionAnalysis
        })
      }]
    });
    
    // Parse JSON response
    const layoutJson = this.parseJsonResponse(response.content);
    
    // Create scene entity with layout only (no code yet)
    const scene = this.createSceneEntity({
      projectId: input.projectId,
      order,
      name: displayName,
      tsxCode: '', // Will be filled by CodeGenerator
      duration: 150, // Default, will be updated by CodeGenerator
      layoutJson: JSON.stringify(layoutJson)
    });
    
    return this.createSceneResponse(
      scene,
      `Generated ${layoutJson.sceneType || 'custom'} layout`,
      `Created layout for ${displayName}`
    );
  }
  
  /**
   * Parse JSON from AI response
   */
  private parseJsonResponse(response: string): any {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      // Try direct parse
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      // Return a basic layout as fallback
      return {
        sceneType: 'simple',
        elements: [],
        background: '#000000'
      };
    }
  }
  
  // Required by StandardSceneService
  async generateScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    return this.generateLayout(input);
  }
}