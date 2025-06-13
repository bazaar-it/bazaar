import { BaseMCPTool } from "~/tools/helpers/base";
import { db } from "~/server/db";
import { scenes } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { DeleteToolInput, DeleteToolOutput } from "~/tools/helpers/types";
import { deleteToolInputSchema } from "~/tools/helpers/types";

/**
 * DELETE Tool - Removes scenes from projects
 * Includes confirmation and cleanup functionality
 */
export class DeleteTool extends BaseMCPTool<DeleteToolInput, DeleteToolOutput> {
  name = "DELETE";
  description = "Delete scenes from motion graphics projects with confirmation";
  inputSchema = deleteToolInputSchema;

  protected async execute(input: DeleteToolInput): Promise<DeleteToolOutput> {
    try {
      // Get scene details before deletion
      console.log('==================== deleteTool reached:');
      const scene = await this.getSceneById(input.sceneId);
      if (!scene) {
        throw new Error(`Scene with ID ${input.sceneId} not found`);
      }

      // Require confirmation for deletion
      if (!input.confirmDeletion) {
        return {
          success: false,
          reasoning: `Deletion requires confirmation. Scene "${scene.name}" will be permanently removed.`,
          debug: {
            sceneId: input.sceneId,
            sceneName: scene.name,
            requiresConfirmation: true,
          },
        };
      }

      // Perform deletion
      await this.deleteSceneFromDatabase(input.sceneId);

      // Get remaining scene count
      const remainingCount = await this.getRemainingSceneCount(input.projectId);

      return {
        success: true,
        deletedSceneId: input.sceneId,
        deletedSceneName: scene.name,
        remainingSceneCount: remainingCount,
        reasoning: `Scene "${scene.name}" has been successfully deleted. ${remainingCount} scenes remaining.`,
        debug: {
          deletedScene: {
            id: scene.id,
            name: scene.name,
            duration: scene.duration,
          },
          remainingSceneCount: remainingCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        reasoning: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          sceneId: input.sceneId,
          error: String(error),
        },
      };
    }
  }

  /**
   * Get scene by ID
   */
  private async getSceneById(sceneId: string) {
    const [scene] = await db.query.scenes.findMany({
      where: eq(scenes.id, sceneId),
      limit: 1,
    });
    return scene;
  }

  /**
   * Delete scene from database
   */
  private async deleteSceneFromDatabase(sceneId: string) {
    await db.delete(scenes).where(eq(scenes.id, sceneId));
  }

  /**
   * Get remaining scene count for project
   */
  private async getRemainingSceneCount(projectId: string): Promise<number> {
    const remainingScenes = await db.query.scenes.findMany({
      where: eq(scenes.projectId, projectId),
    });
    return remainingScenes.length;
  }
}

// Export singleton instance
export const deleteTool = new DeleteTool();
