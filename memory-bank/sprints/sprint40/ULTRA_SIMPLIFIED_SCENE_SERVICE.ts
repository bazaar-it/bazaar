// Ultra-Simplified Scene Service Implementation
// This is the new proposed architecture - ONE service for ALL scene operations

import { StandardSceneService } from '@/server/services/base/StandardSceneService';
import { StandardApiResponse, SceneOperationResponse, DeleteOperationResponse } from '@/lib/types/api/golden-rule-contracts';
import { aiClient } from '@/server/services/ai/aiClient.service';
import { db } from '@/server/db';
import { scenes } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Model configuration for different operations
 * This allows us to use the right model for the right job
 */
const MODEL_CONFIG = {
  // Creation operations
  CREATE_FROM_PROMPT: {
    layoutModel: 'claude-3-5-sonnet-20241022',    // Creative layout generation
    codeModel: 'claude-3-5-sonnet-20241022',      // Creative code generation
    layoutPrompt: '@style-json-prompt.md',
    codePrompt: '@codegen-prompt.md'
  },
  CREATE_FROM_IMAGE: {
    model: 'gpt-4o',                               // Vision capabilities
    prompt: '@image-to-code-prompt.md'
  },
  
  // Edit operations
  SURGICAL_EDIT: {
    model: 'gpt-4o-mini',                          // Fast & cheap for targeted edits
    prompt: '@surgical-edit-prompt.md'
  },
  CREATIVE_EDIT: {
    model: 'claude-3-5-sonnet-20241022',          // Creative for rewrites
    prompt: '@creative-edit-prompt.md'
  },
  STRUCTURAL_EDIT: {
    model: 'gpt-4o-mini',                          // Fast for structure changes
    prompt: '@structural-edit-prompt.md'
  },
  EDIT_WITH_IMAGE: {
    model: 'gpt-4o',                               // Vision for image-based edits
    prompt: '@edit-with-image-prompt.md'
  }
};

/**
 * Ultra-Simplified Scene Service
 * Just 3 public methods: addScene, editScene, deleteScene
 * Automatically routes to the right operation based on inputs
 */
export class SceneService extends StandardSceneService {
  
  /**
   * Add a new scene - automatically detects if from prompt or image
   */
  async addScene(input: {
    projectId: string;
    prompt: string;
    imageUrls?: string[];
    order?: number;
    previousSceneJson?: string;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    try {
      // Auto-detect: Image-based or prompt-based creation
      if (input.imageUrls?.length) {
        return await this.createFromImage(input);
      } else {
        return await this.createFromPrompt(input);
      }
    } catch (error) {
      return this.errorResponse(error as Error, 'create');
    }
  }
  
  /**
   * Edit an existing scene - handles all edit types including duration
   */
  async editScene(input: {
    sceneId: string;
    prompt?: string;
    editType?: 'surgical' | 'creative' | 'structural';
    imageUrls?: string[];
    duration?: number;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    try {
      // Get existing scene
      const scene = await this.getSceneById(input.sceneId);
      if (!scene) {
        throw new Error(`Scene ${input.sceneId} not found`);
      }
      
      // Duration-only edit (no AI needed)
      if (input.duration && !input.prompt && !input.imageUrls) {
        return await this.updateDuration(scene, input.duration);
      }
      
      // Image-based edit
      if (input.imageUrls?.length) {
        return await this.editWithImage(scene, input);
      }
      
      // Text-based edit - route to appropriate method
      if (!input.prompt) {
        throw new Error('Edit requires either prompt, imageUrls, or duration');
      }
      
      const editType = input.editType || 'surgical'; // Default to surgical
      
      switch (editType) {
        case 'surgical':
          return await this.surgicalEdit(scene, input);
        case 'creative':
          return await this.creativeEdit(scene, input);
        case 'structural':
          return await this.structuralEdit(scene, input);
        default:
          throw new Error(`Unknown edit type: ${editType}`);
      }
    } catch (error) {
      return this.errorResponse(error as Error, 'update');
    }
  }
  
  /**
   * Delete a scene - simple and straightforward
   */
  async deleteScene(input: {
    sceneId: string;
  }): Promise<StandardApiResponse<DeleteOperationResponse>> {
    try {
      const scene = await this.getSceneById(input.sceneId);
      if (!scene) {
        throw new Error(`Scene ${input.sceneId} not found`);
      }
      
      // Delete from database
      await db.delete(scenes).where(eq(scenes.id, input.sceneId));
      
      return {
        success: true,
        operation: 'delete',
        data: {
          deletedId: input.sceneId,
          deletedEntity: scene
        },
        metadata: {
          timestamp: Date.now(),
          affectedIds: [input.sceneId],
          reasoning: 'Scene deleted successfully'
        }
      };
    } catch (error) {
      return {
        success: false,
        operation: 'delete',
        data: {
          deletedId: input.sceneId,
          deletedEntity: {} as any
        },
        metadata: {
          timestamp: Date.now(),
          affectedIds: [],
          reasoning: `Error: ${error.message}`
        }
      };
    }
  }
  
  // ============= PRIVATE IMPLEMENTATION METHODS =============
  
  /**
   * Create scene from text prompt using 2-step pipeline
   */
  private async createFromPrompt(input: {
    projectId: string;
    prompt: string;
    order?: number;
    previousSceneJson?: string;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const config = MODEL_CONFIG.CREATE_FROM_PROMPT;
    
    // Step 1: Generate layout JSON
    const layoutResponse = await aiClient.generateResponse({
      model: config.layoutModel,
      systemPrompt: this.loadPrompt(config.layoutPrompt),
      userPrompt: input.prompt,
      context: {
        previousSceneJson: input.previousSceneJson,
        isFirstScene: !input.previousSceneJson
      }
    });
    
    const layoutJson = JSON.parse(layoutResponse.content);
    
    // Step 2: Generate code from layout
    const codeResponse = await aiClient.generateResponse({
      model: config.codeModel,
      systemPrompt: this.loadPrompt(config.codePrompt),
      userPrompt: JSON.stringify(layoutJson),
      context: {
        originalPrompt: input.prompt,
        functionName: this.generateFunctionName(input.order || 0)
      }
    });
    
    // Extract code and metadata
    const { code, duration, reasoning } = this.parseCodeResponse(codeResponse.content);
    
    // Create scene entity
    const scene = this.createSceneEntity({
      projectId: input.projectId,
      order: input.order || 0,
      name: `Scene ${(input.order || 0) + 1}`,
      tsxCode: code,
      duration: duration,
      layoutJson: JSON.stringify(layoutJson)
    });
    
    // Save to database
    await db.insert(scenes).values(scene);
    
    return this.createSceneResponse(
      scene,
      reasoning,
      `Created scene from prompt using ${config.layoutModel}`
    );
  }
  
  /**
   * Create scene directly from images
   */
  private async createFromImage(input: {
    projectId: string;
    prompt: string;
    imageUrls: string[];
    order?: number;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const config = MODEL_CONFIG.CREATE_FROM_IMAGE;
    
    // Single call to vision model
    const response = await aiClient.generateVisionResponse({
      model: config.model,
      systemPrompt: this.loadPrompt(config.prompt),
      userPrompt: input.prompt,
      images: input.imageUrls
    });
    
    const { code, duration, reasoning } = this.parseCodeResponse(response.content);
    
    // Create scene entity
    const scene = this.createSceneEntity({
      projectId: input.projectId,
      order: input.order || 0,
      name: `Scene ${(input.order || 0) + 1}`,
      tsxCode: code,
      duration: duration,
      props: { imageUrls: input.imageUrls }
    });
    
    // Save to database
    await db.insert(scenes).values(scene);
    
    return this.createSceneResponse(
      scene,
      reasoning,
      `Created scene from ${input.imageUrls.length} image(s) using ${config.model}`
    );
  }
  
  /**
   * Surgical edit - targeted changes preserving structure
   */
  private async surgicalEdit(scene: any, input: {
    prompt: string;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const config = MODEL_CONFIG.SURGICAL_EDIT;
    
    const response = await aiClient.generateResponse({
      model: config.model,
      systemPrompt: this.loadPrompt(config.prompt),
      userPrompt: input.prompt,
      context: {
        currentCode: scene.tsxCode,
        sceneName: scene.name
      }
    });
    
    const { code, changes, preserved, reasoning } = this.parseEditResponse(response.content);
    
    // Update scene entity
    const updatedScene = this.updateSceneEntity(scene, {
      tsxCode: code
    });
    
    // Save to database
    await db.update(scenes)
      .set({ tsxCode: code, updatedAt: new Date() })
      .where(eq(scenes.id, scene.id));
    
    return this.updateSceneResponse(
      updatedScene,
      changes,
      preserved,
      reasoning,
      `Applied surgical edit using ${config.model}`
    );
  }
  
  /**
   * Creative edit - significant rewrites while keeping core concept
   */
  private async creativeEdit(scene: any, input: {
    prompt: string;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const config = MODEL_CONFIG.CREATIVE_EDIT;
    
    const response = await aiClient.generateResponse({
      model: config.model,
      systemPrompt: this.loadPrompt(config.prompt),
      userPrompt: input.prompt,
      context: {
        currentCode: scene.tsxCode,
        sceneName: scene.name,
        layoutJson: scene.layoutJson
      }
    });
    
    const { code, changes, reasoning } = this.parseEditResponse(response.content);
    
    // Update scene entity
    const updatedScene = this.updateSceneEntity(scene, {
      tsxCode: code
    });
    
    // Save to database
    await db.update(scenes)
      .set({ tsxCode: code, updatedAt: new Date() })
      .where(eq(scenes.id, scene.id));
    
    return this.updateSceneResponse(
      updatedScene,
      changes,
      [], // Creative edits don't preserve much
      reasoning,
      `Applied creative edit using ${config.model}`
    );
  }
  
  /**
   * Structural edit - change component structure/architecture
   */
  private async structuralEdit(scene: any, input: {
    prompt: string;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const config = MODEL_CONFIG.STRUCTURAL_EDIT;
    
    const response = await aiClient.generateResponse({
      model: config.model,
      systemPrompt: this.loadPrompt(config.prompt),
      userPrompt: input.prompt,
      context: {
        currentCode: scene.tsxCode,
        sceneName: scene.name
      }
    });
    
    const { code, changes, reasoning } = this.parseEditResponse(response.content);
    
    // Update scene entity
    const updatedScene = this.updateSceneEntity(scene, {
      tsxCode: code
    });
    
    // Save to database
    await db.update(scenes)
      .set({ tsxCode: code, updatedAt: new Date() })
      .where(eq(scenes.id, scene.id));
    
    return this.updateSceneResponse(
      updatedScene,
      changes,
      [],
      reasoning,
      `Applied structural edit using ${config.model}`
    );
  }
  
  /**
   * Edit with image reference
   */
  private async editWithImage(scene: any, input: {
    prompt?: string;
    imageUrls: string[];
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    const config = MODEL_CONFIG.EDIT_WITH_IMAGE;
    
    const response = await aiClient.generateVisionResponse({
      model: config.model,
      systemPrompt: this.loadPrompt(config.prompt),
      userPrompt: input.prompt || 'Update the scene based on these images',
      images: input.imageUrls,
      context: {
        currentCode: scene.tsxCode,
        sceneName: scene.name
      }
    });
    
    const { code, changes, reasoning } = this.parseEditResponse(response.content);
    
    // Update scene entity
    const updatedScene = this.updateSceneEntity(scene, {
      tsxCode: code,
      props: { ...scene.props, imageUrls: input.imageUrls }
    });
    
    // Save to database
    await db.update(scenes)
      .set({ 
        tsxCode: code, 
        props: updatedScene.props,
        updatedAt: new Date() 
      })
      .where(eq(scenes.id, scene.id));
    
    return this.updateSceneResponse(
      updatedScene,
      changes,
      [],
      reasoning,
      `Applied image-based edit using ${config.model}`
    );
  }
  
  /**
   * Simple duration update - no AI needed
   */
  private async updateDuration(scene: any, duration: number): Promise<StandardApiResponse<SceneOperationResponse>> {
    const updatedScene = this.updateSceneEntity(scene, { duration });
    
    // Save to database
    await db.update(scenes)
      .set({ duration, updatedAt: new Date() })
      .where(eq(scenes.id, scene.id));
    
    return this.updateSceneResponse(
      updatedScene,
      [`Duration changed from ${scene.duration} to ${duration} frames`],
      ['All other properties'],
      'Duration updated',
      `Duration changed to ${duration} frames`
    );
  }
  
  // ============= HELPER METHODS =============
  
  private async getSceneById(sceneId: string) {
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, sceneId));
    return scene;
  }
  
  private generateFunctionName(order: number): string {
    const uniqueId = crypto.randomUUID().replace(/-/g, '').substring(0, 8);
    return `Scene${order + 1}_${uniqueId}`;
  }
  
  private loadPrompt(promptFile: string): string {
    // In real implementation, load from file system
    // For now, return placeholder
    return `System prompt from ${promptFile}`;
  }
  
  private parseCodeResponse(response: string): {
    code: string;
    duration: number;
    reasoning: string;
  } {
    // Parse AI response to extract code, duration, and reasoning
    // Implementation depends on response format
    return {
      code: response,
      duration: 150, // Default
      reasoning: 'Generated successfully'
    };
  }
  
  private parseEditResponse(response: string): {
    code: string;
    changes: string[];
    preserved: string[];
    reasoning: string;
  } {
    // Parse AI response for edits
    return {
      code: response,
      changes: ['Applied requested changes'],
      preserved: ['Core structure'],
      reasoning: 'Edit applied successfully'
    };
  }
  
  // Required by StandardSceneService abstract class
  async generateScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    // This method exists for compatibility with StandardSceneService
    // In practice, use addScene() instead
    return this.addScene(input);
  }
}

// Export singleton instance
export const sceneService = new SceneService();