// src/server/services/scene/edit/ErrorFixer.ts
import { StandardSceneEditService } from '~/server/services/base/StandardSceneService';
import { StandardApiResponse, SceneOperationResponse, Scene } from '~/lib/types/api/golden-rule-contracts';
import { AIClientService } from '~/server/services/ai/aiClient.service';
import { getModel } from '~/config/models.config';
import { getSystemPrompt } from '~/config/prompts.config';
import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Error Fixer Service
 * Responsible for fixing syntax errors, runtime issues, and broken scenes
 * Uses specialized prompt and low temperature for precise fixes
 */
export class ErrorFixer extends StandardSceneEditService {
  private aiClient: AIClientService;
  
  constructor() {
    super();
    this.aiClient = new AIClientService();
  }
  
  /**
   * Fix errors in a broken scene
   */
  async fix(input: {
    scene: Scene;
    errorMessage: string;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    // Get model and prompt configuration
    const model = getModel('fixBrokenScene');
    const systemPrompt = getSystemPrompt('FIX_BROKEN_SCENE');
    
    // Generate fix using AI with specialized prompt
    const response = await this.aiClient.generateResponse({
      model: model.model,
      temperature: model.temperature || 0.2, // Very low temperature for precise fixes
      maxTokens: model.maxTokens,
      systemPrompt: systemPrompt,
      userPrompt: input.errorMessage,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          brokenCode: input.scene.tsxCode,
          errorMessage: input.errorMessage,
          sceneName: input.scene.name
        })
      }]
    });
    
    // Parse the specific fix response format
    let result;
    try {
      const parsed = JSON.parse(response.content);
      result = {
        tsxCode: parsed.fixedCode,
        changes: parsed.changesApplied || ['Fixed the reported error'],
        reasoning: parsed.reasoning || 'Applied minimal fix for the error'
      };
    } catch (e) {
      // Fallback to standard parsing if not in expected format
      result = this.parseEditResponse(response.content);
    }
    
    // Update scene entity (duration shouldn't change for fixes)
    const updatedScene = this.updateSceneEntity(input.scene, {
      tsxCode: result.tsxCode
    });
    
    // Save to database
    await db.update(scenes)
      .set({ 
        tsxCode: updatedScene.tsxCode,
        updatedAt: new Date() 
      })
      .where(eq(scenes.id, input.scene.id));
    
    return this.updateSceneResponse(
      updatedScene,
      result.changes || ['Fixed the error'],
      ['All functionality preserved', 'Only error was corrected', 'Original design intact'],
      result.reasoning || 'Error fixed successfully',
      `Fixed error in ${input.scene.name}`
    );
  }
  
  /**
   * Parse edit response from AI
   */
  private parseEditResponse(response: string): {
    tsxCode: string;
    changes?: string[];
    reasoning?: string;
  } {
    try {
      // Extract code if in markdown block
      const codeMatch = response.match(/```(?:typescript|tsx|javascript|jsx)?\s*([\s\S]*?)\s*```/);
      const tsxCode = codeMatch ? codeMatch[1].trim() : response.trim();
      
      return { tsxCode };
    } catch (error) {
      console.error('Failed to parse fix response:', error);
      return { tsxCode: response };
    }
  }
  
  // Required by StandardSceneEditService
  async editScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    return this.fix(input);
  }
  
  // Required by StandardSceneService
  async generateScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    throw new Error('ErrorFixer does not support scene generation');
  }
}