// src/server/services/scene/delete/SceneDeleter.ts
import { StandardApiResponse, DeleteOperationResponse, Scene } from '~/lib/types/api/golden-rule-contracts';
import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Scene Deleter Service
 * Responsible for deleting scenes from the database
 * Simple service with no AI involvement
 */
export class SceneDeleter {
  
  /**
   * Delete a scene by ID
   */
  async delete(sceneId: string): Promise<StandardApiResponse<DeleteOperationResponse>> {
    try {
      // Get scene before deletion
      const [scene] = await db.select().from(scenes).where(eq(scenes.id, sceneId));
      
      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`);
      }
      
      // Delete from database
      await db.delete(scenes).where(eq(scenes.id, sceneId));
      
      // Return standardized response
      return {
        success: true,
        operation: 'delete',
        data: {
          deletedId: sceneId,
          deletedEntity: scene as Scene
        },
        metadata: {
          timestamp: Date.now(),
          affectedIds: [sceneId],
          reasoning: 'Scene deleted successfully',
          chatResponse: `Deleted ${scene.name} from the project`
        }
      };
    } catch (error) {
      return {
        success: false,
        operation: 'delete',
        data: {
          deletedId: sceneId,
          deletedEntity: {} as Scene
        },
        metadata: {
          timestamp: Date.now(),
          affectedIds: [],
          reasoning: `Failed to delete scene: ${(error as Error).message}`
        }
      };
    }
  }
}