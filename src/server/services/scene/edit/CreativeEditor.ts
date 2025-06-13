// src/server/services/scene/edit/CreativeEditor.ts
import { BaseEditor } from './BaseEditor';
import { StandardApiResponse, SceneOperationResponse, Scene } from '~/lib/types/api/golden-rule-contracts';
import { analyzeDuration } from '~/lib/utils/codeDurationExtractor';
import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Creative Editor Service
 * Responsible for creative rewrites and enhancements to existing scenes
 * Uses higher temperature for more creative output
 * Supports both text and image-based edits
 */
export class CreativeEditor extends BaseEditor {
  
  /**
   * Apply creative edit to a scene (with or without images)
   */
  async edit(input: {
    scene: Scene;
    prompt: string;
    imageUrls?: string[];
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    // Get appropriate model and prompt
    const { model, prompt: systemPrompt } = this.getModelAndPrompt('creative', !!input.imageUrls?.length);
    
    // Generate creative edit using AI
    const response = await this.makeAIRequest({
      model,
      systemPrompt,
      userPrompt: input.prompt,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          currentCode: input.scene.tsxCode,
          sceneName: input.scene.name,
          layoutJson: input.scene.layoutJson,
          editRequest: input.prompt
        })
      }],
      imageUrls: input.imageUrls,
      editType: 'creative'
    });
    
    // Parse response
    const result = this.parseEditResponse(response.content);
    
    // Check if duration changed
    const newDuration = analyzeDuration(result.tsxCode).frames;
    
    // Update scene entity
    const updatedScene = this.updateSceneEntity(input.scene, {
      tsxCode: result.tsxCode,
      duration: newDuration || input.scene.duration
    });
    
    // Save to database
    await db.update(scenes)
      .set({ 
        tsxCode: updatedScene.tsxCode,
        duration: updatedScene.duration,
        updatedAt: new Date() 
      })
      .where(eq(scenes.id, input.scene.id));
    
    return this.updateSceneResponse(
      updatedScene,
      result.changes || ['Applied creative enhancements', 'Improved visual design', 'Enhanced animations'],
      [], // Creative edits typically don't preserve much
      result.reasoning || 'Creative transformation applied successfully',
      input.imageUrls?.length
        ? `Creatively enhanced ${input.scene.name} based on image inspiration`
        : `Creatively enhanced ${input.scene.name}`
    );
  }
  
  
  // Required by StandardSceneEditService
  async editScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    return this.edit(input);
  }
  
  // Required by StandardSceneService
  async generateScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    throw new Error('CreativeEditor does not support scene generation');
  }
}