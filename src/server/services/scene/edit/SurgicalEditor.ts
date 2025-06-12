// src/server/services/scene/edit/SurgicalEditor.ts
import { BaseEditor } from './BaseEditor';
import { StandardApiResponse, SceneOperationResponse, Scene } from '@/lib/types/api/golden-rule-contracts';
import { analyzeDuration } from '@/lib/utils/codeDurationExtractor';
import { db } from '@/server/db';
import { scenes } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Surgical Editor Service
 * Responsible for making minimal, targeted changes to existing scenes
 * Uses low temperature for precise modifications
 * Supports both text and image-based edits
 */
export class SurgicalEditor extends BaseEditor {
  
  /**
   * Apply surgical edit to a scene (with or without images)
   */
  async edit(input: {
    scene: Scene;
    prompt: string;
    imageUrls?: string[];
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    // Get appropriate model and prompt
    const { model, prompt: systemPrompt } = this.getModelAndPrompt('surgical', !!input.imageUrls?.length);
    
    // Generate edit using AI
    const response = await this.makeAIRequest({
      model,
      systemPrompt,
      userPrompt: input.prompt,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          currentCode: input.scene.tsxCode,
          sceneName: input.scene.name,
          editRequest: input.prompt
        })
      }],
      imageUrls: input.imageUrls,
      editType: 'surgical'
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
      result.changes || ['Applied targeted changes'],
      result.preserved || ['Core structure', 'Animation timing', 'Overall design'],
      result.reasoning || 'Surgical edit applied successfully',
      input.imageUrls?.length 
        ? `Applied targeted changes to ${input.scene.name} based on image reference`
        : `Applied targeted changes to ${input.scene.name}`
    );
  }
  
  /**
   * Update only the duration of a scene (no AI needed)
   */
  async updateDuration(scene: Scene, duration: number): Promise<StandardApiResponse<SceneOperationResponse>> {
    const updatedScene = this.updateSceneEntity(scene, { duration });
    
    // Save to database
    await db.update(scenes)
      .set({ duration, updatedAt: new Date() })
      .where(eq(scenes.id, scene.id));
    
    return this.updateSceneResponse(
      updatedScene,
      [`Duration changed from ${scene.duration} to ${duration} frames`],
      ['All visual elements', 'Animation timing adjusted proportionally'],
      'Duration updated successfully',
      `Duration changed to ${duration} frames (${(duration / 30).toFixed(1)} seconds)`
    );
  }
  
  
  // Required by StandardSceneEditService
  async editScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    return this.edit(input);
  }
  
  // Required by StandardSceneService
  async generateScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    throw new Error('SurgicalEditor does not support scene generation');
  }
}