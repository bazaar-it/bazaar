// src/server/services/scene/scene.service.ts
import { StandardSceneService } from '@/server/services/base/StandardSceneService';
import { StandardApiResponse, SceneOperationResponse, DeleteOperationResponse } from '@/lib/types/api/golden-rule-contracts';

// Add scene services
import { LayoutGenerator } from './add/LayoutGenerator';
import { CodeGenerator } from './add/CodeGenerator';
import { ImageToCodeGenerator } from './add/ImageToCodeGenerator';

// Edit scene services
import { SurgicalEditor } from './edit/SurgicalEditor';
import { CreativeEditor } from './edit/CreativeEditor';
import { ErrorFixer } from './edit/ErrorFixer';

// Delete scene service
import { SceneDeleter } from './delete/SceneDeleter';

// Database service
import { sceneRepositoryService } from '@/server/services/brain/sceneRepository.service';

/**
 * Scene Service - Coordinator for all scene operations
 * Provides simple 3-method interface while delegating to specialized services
 */
export class SceneService extends StandardSceneService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';
  
  // Services for adding scenes
  private readonly layoutGenerator = new LayoutGenerator();
  private readonly codeGenerator = new CodeGenerator();
  private readonly imageToCodeGenerator = new ImageToCodeGenerator();
  
  // Services for editing scenes
  private readonly surgicalEditor = new SurgicalEditor();
  private readonly creativeEditor = new CreativeEditor();
  private readonly errorFixer = new ErrorFixer();
  
  // Service for deleting scenes
  private readonly sceneDeleter = new SceneDeleter();

  /**
   * Add a new scene - routes to appropriate creation service
   */
  async addScene(input: {
    projectId: string;
    prompt: string;
    imageUrls?: string[];
    order?: number;
    previousSceneJson?: string;
    visionAnalysis?: any;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    try {
      if (this.DEBUG) {
        console.log('[SceneService] Adding scene:', {
          hasImages: !!input.imageUrls?.length,
          prompt: input.prompt.substring(0, 50) + '...'
        });
      }

      // Route to appropriate service
      if (input.imageUrls?.length) {
        // Direct image to code generation
        return await this.imageToCodeGenerator.generateFromImages(input);
      } else {
        // Two-step pipeline: layout then code
        const layoutResponse = await this.layoutGenerator.generateLayout(input);
        
        // Extract layout from response
        const layout = layoutResponse.data.scene.layoutJson 
          ? JSON.parse(layoutResponse.data.scene.layoutJson)
          : null;
        
        // Generate code from layout
        return await this.codeGenerator.generateFromLayout({
          ...input,
          layout,
          functionName: `Scene${(input.order || 0) + 1}_${this.generateId().substring(0, 8)}`
        });
      }
    } catch (error) {
      return this.errorResponse(error as Error, 'create');
    }
  }

  /**
   * Edit an existing scene - routes to appropriate edit service
   */
  async editScene(input: {
    sceneId: string;
    prompt?: string;
    editType?: 'surgical' | 'creative' | 'fix';
    imageUrls?: string[];
    duration?: number;
  }): Promise<StandardApiResponse<SceneOperationResponse>> {
    try {
      // Get existing scene
      const scene = await sceneRepositoryService.getSceneById(input.sceneId);
      if (!scene) {
        throw new Error(`Scene ${input.sceneId} not found`);
      }

      if (this.DEBUG) {
        console.log('[SceneService] Editing scene:', {
          sceneId: input.sceneId,
          editType: input.editType,
          hasDuration: !!input.duration,
          hasImages: !!input.imageUrls?.length
        });
      }

      // Duration-only edit (no AI needed)
      if (input.duration && !input.prompt && !input.imageUrls) {
        return await this.surgicalEditor.updateDuration(scene, input.duration);
      }

      // Must have either prompt or images
      if (!input.prompt && !input.imageUrls?.length) {
        throw new Error('Edit requires either prompt, imageUrls, or duration');
      }

      const editType = input.editType || 'surgical';

      // Route to appropriate editor - all editors can handle images
      switch (editType) {
        case 'surgical':
          return await this.surgicalEditor.edit({ 
            scene, 
            prompt: input.prompt || 'Apply changes based on image',
            imageUrls: input.imageUrls 
          });
        
        case 'creative':
          return await this.creativeEditor.edit({ 
            scene, 
            prompt: input.prompt || 'Enhance based on image',
            imageUrls: input.imageUrls 
          });
        
        case 'fix':
          return await this.errorFixer.fix({ 
            scene, 
            errorMessage: input.prompt || 'Fix any issues' 
          });
        
        default:
          throw new Error(`Unknown edit type: ${editType}`);
      }
    } catch (error) {
      return this.errorResponse(error as Error, 'update');
    }
  }

  /**
   * Delete a scene - delegates to delete service
   */
  async deleteScene(input: {
    sceneId: string;
  }): Promise<StandardApiResponse<DeleteOperationResponse>> {
    try {
      return await this.sceneDeleter.delete(input.sceneId);
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
          reasoning: `Error: ${(error as Error).message}`
        }
      };
    }
  }

  // Required by StandardSceneService
  async generateScene(input: any): Promise<StandardApiResponse<SceneOperationResponse>> {
    return this.addScene(input);
  }
}

// Export singleton instance
export const sceneService = new SceneService();