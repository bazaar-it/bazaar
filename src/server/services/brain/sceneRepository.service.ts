// src/server/services/brain/sceneRepository.service.ts
import { db } from "~/server/db";
import { scenes, sceneIterations } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";
import type { 
  SceneData, 
  DatabaseOperationContext, 
  ModelUsageData
} from "~/lib/types/ai/brain.types";
import { analyzeDuration } from "~/lib/utils/codeDurationExtractor";

// =============================================================================
// SCENE REPOSITORY SERVICE - DRY Database Operations
// =============================================================================

export interface SceneOperationResult {
  success: boolean;
  sceneId?: string;
  error?: string;
  scene?: {
    id: string;
    name: string;
    tsxCode: string;
    duration: number;
    order: number;
  };
}

/**
 * Centralized service for all scene database operations
 * Eliminates code duplication from Brain Orchestrator
 */
export class SceneRepositoryService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * Create a new scene in the database
   */
  async createScene(
    sceneData: SceneData,
    context: DatabaseOperationContext,
    modelUsage: ModelUsageData
  ): Promise<SceneOperationResult> {
    // 🪵 Enhanced Logging
    //  // console.log(`SceneRepository: ➕ Creating scene "${sceneData.sceneName}" for project ${context.projectId}`);
    const startTime = Date.now();

    try {
      if (this.DEBUG) {
        // // console.log(`[SceneRepository] Creating scene: ${sceneData.sceneName}`);
      }

      // Calculate actual duration from code
      let actualDuration = 90; // Default fallback
      if (sceneData.sceneCode && sceneData.sceneCode.trim() !== "") {
        try {
          const analysis = analyzeDuration(sceneData.sceneCode);
          actualDuration = analysis.frames;
          // if (this.DEBUG) // console.log(`[SceneRepository] Analyzed duration for create: ${actualDuration} frames`);
        } catch (e) {
          // if (this.DEBUG) // console.warn(`[SceneRepository] analyzeDuration failed for new scene, using ${actualDuration}f fallback:`, e);
        }
      } else {
        // if (this.DEBUG) // console.warn(`[SceneRepository] No sceneCode for new scene, using ${actualDuration}f fallback.`);
      }

      // Get next order for the scene
      const maxOrderResult = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX("order"), -1)` })
        .from(scenes)
        .where(eq(scenes.projectId, context.projectId));

      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

      // Save scene to database
      const [newScene] = await db.insert(scenes)
        .values({
          projectId: context.projectId,
          name: sceneData.sceneName,
          order: nextOrder,
          tsxCode: sceneData.sceneCode,
          duration: actualDuration,
          layoutJson: sceneData.layoutJson,
          props: {}, // Empty props for now
        })
        .returning();

      if (this.DEBUG) {
        // console.log(`[SceneRepository] Scene created successfully: ${newScene?.id}`);
      }

      // Log scene iteration for tracking
      if (newScene?.id) {
        const processingTime = Date.now() - startTime;
        await this.logSceneIteration({
          sceneId: newScene.id,
          context,
          modelUsage: { ...modelUsage, generationTimeMs: processingTime },
          codeBefore: undefined,
          codeAfter: sceneData.sceneCode,
          changesApplied: undefined,
          changesPreserved: undefined,
        });
      }

      // 🪵 Enhanced Logging
      // console.log(`SceneRepository: ✅ Scene "${sceneData.sceneName}" created successfully with ID ${newScene?.id}`);

      return {
        success: true,
        sceneId: newScene?.id,
        scene: newScene ? {
          id: newScene.id,
          name: newScene.name,
          tsxCode: newScene.tsxCode,
          duration: newScene.duration,
          order: newScene.order,
        } : undefined,
      };

    } catch (dbError) {
      // 🪵 Enhanced Logging
      // console.error(`SceneRepository: ❌ Error creating scene "${sceneData.sceneName}" for project ${context.projectId}`, {
      // error: dbError instanceof Error ? dbError.message : String(dbError),
      //  stack: dbError instanceof Error ? dbError.stack : undefined,
      //});

      if (this.DEBUG) {
        // console.error(`[SceneRepository] Failed to create scene:`, dbError);
      }
      return {
        success: false,
        error: `Failed to create your scene. Please try again.`,
      };
    }
  }

  /**
   * Update an existing scene in the database
   */
  async updateScene(
    sceneData: SceneData,
    context: DatabaseOperationContext,
    modelUsage: ModelUsageData
  ): Promise<SceneOperationResult> {
    // 🪵 Enhanced Logging
    // console.log(`SceneRepository: ✏️ Updating scene "${sceneData.sceneName}" (${sceneData.sceneId}) for project ${context.projectId}`);
    const startTime = Date.now();

    if (!sceneData.sceneId) {
      return {
        success: false,
        error: 'Scene ID is required for updates',
      };
    }

    try {
      if (this.DEBUG) {
        // console.log(`[SceneRepository] Updating scene: ${sceneData.sceneName} (${sceneData.sceneId})`);
        if (sceneData.changes) {
          // console.log(`[SceneRepository] Applied changes: ${sceneData.changes.join(', ')}`);
        }
        if (sceneData.preserved) {
          // console.log(`[SceneRepository] Preserved: ${sceneData.preserved.join(', ')}`);
        }
      }

      // Get the current scene for "before" tracking
      const currentScene = await db.query.scenes.findFirst({
        where: eq(scenes.id, sceneData.sceneId),
      });

      // Calculate actual duration from code
      let actualDuration = currentScene?.duration || 90; // Default to current or fallback
      if (sceneData.sceneCode && sceneData.sceneCode.trim() !== "") {
        try {
          const analysis = analyzeDuration(sceneData.sceneCode);
          actualDuration = analysis.frames;
          // if (this.DEBUG) // console.log(`[SceneRepository] Analyzed duration for update: ${actualDuration} frames`);
        } catch (e) {
          // if (this.DEBUG) // console.warn(`[SceneRepository] analyzeDuration failed for update, using ${actualDuration}f fallback:`, e);
        }
      } else {
         // if (this.DEBUG) // console.warn(`[SceneRepository] No sceneCode for update, using ${actualDuration}f fallback.`);
      }

      // Prepare data for update, ensuring type safety and conditional inclusion of layoutJson
      const finalUpdateData: Partial<typeof scenes.$inferInsert> = {
        name: sceneData.sceneName,
        tsxCode: sceneData.sceneCode, // CRITICAL: Ensure tsxCode is updated
        duration: actualDuration,
        updatedAt: new Date(),
      };

      if (sceneData.layoutJson !== undefined) { // Only include layoutJson if it's actually provided
        finalUpdateData.layoutJson = sceneData.layoutJson;
      }

      if (this.DEBUG) {
        // console.log('[SceneRepository] ATTEMPTING TO SAVE TSX CODE (first 100 chars):', finalUpdateData.tsxCode?.substring(0, 100));
        // console.log('[SceneRepository] ATTEMPTING TO SAVE FULL finalUpdateData:', JSON.stringify(finalUpdateData, null, 2));
      }

      const [updatedScene] = await db.update(scenes)
        .set(finalUpdateData)
        .where(eq(scenes.id, sceneData.sceneId))
        .returning();

      if (this.DEBUG) {
        // console.log(`[SceneRepository] Scene updated successfully: ${updatedScene?.id}`);
        // console.log('[SceneRepository] RETURNED TSX CODE (first 100 chars):', updatedScene?.tsxCode?.substring(0, 100));
      }

      // Log scene iteration for tracking
      if (updatedScene?.id) {
        const processingTime = Date.now() - startTime;
        await this.logSceneIteration({
          sceneId: updatedScene.id,
          context,
          modelUsage: { ...modelUsage, generationTimeMs: processingTime },
          codeBefore: currentScene?.tsxCode,
          codeAfter: sceneData.sceneCode,
          changesApplied: sceneData.changes,
          changesPreserved: sceneData.preserved,
        });

        // Check for re-editing patterns (user dissatisfaction)
        await this.markReEditedScenes(sceneData.sceneId);
      }

      // 🪵 Enhanced Logging
      // console.log(`SceneRepository: ✅ Scene "${sceneData.sceneName}" updated successfully.`);

      return {
        success: true,
        sceneId: updatedScene?.id,
        scene: updatedScene ? {
          id: updatedScene.id,
          name: updatedScene.name,
          tsxCode: updatedScene.tsxCode,
          duration: updatedScene.duration,
          order: updatedScene.order,
        } : undefined,
      };

    } catch (dbError) {
      // 🪵 Enhanced Logging
      // console.error(`SceneRepository: ❌ Error updating scene "${sceneData.sceneName}" (${sceneData.sceneId})`, {
      //  error: dbError instanceof Error ? dbError.message : String(dbError),
      //  stack: dbError instanceof Error ? dbError.stack : undefined,
      //});

      if (this.DEBUG) {
        // console.error(`[SceneRepository] Failed to update scene:`, dbError);
      }
      return {
        success: false,
        error: `Failed to update your scene. Please try again.`,
      };
    }
  }

  /**
   * Delete a scene from the database
   */
  async deleteScene(
    sceneId: string,
    sceneName: string,
    context: DatabaseOperationContext,
    modelUsage: ModelUsageData
  ): Promise<SceneOperationResult> {
    // 🪵 Enhanced Logging
    // console.log(`SceneRepository: 🗑️ Deleting scene "${sceneName}" (${sceneId}) from project ${context.projectId}`);
    const startTime = Date.now();

    try {
      // Convert technical name to user-friendly display name
      const displayName = sceneName?.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || sceneName || sceneId;

      if (this.DEBUG) {
        // console.log(`[SceneRepository] Deleting scene: ${displayName} (${sceneId})`);
      }

      // Get the scene before deletion for tracking
      const sceneToDelete = await db.query.scenes.findFirst({
        where: eq(scenes.id, sceneId),
      });

      // Delete the scene from database
      const deletedScenes = await db.delete(scenes)
        .where(eq(scenes.id, sceneId))
        .returning();

      if (deletedScenes.length > 0) {
        if (this.DEBUG) {
          // console.log(`[SceneRepository] Scene deleted successfully: ${deletedScenes[0]?.name}`);
        }

        // Log scene iteration for tracking
        const processingTime = Date.now() - startTime;
        await this.logSceneIteration({
          sceneId: sceneId,
          context,
          modelUsage: { ...modelUsage, generationTimeMs: processingTime },
          codeBefore: sceneToDelete?.tsxCode,
          codeAfter: undefined,
          changesApplied: undefined,
          changesPreserved: undefined,
        });

        return {
          success: true,
          sceneId: deletedScenes[0]?.id,
          scene: deletedScenes[0] ? {
            id: deletedScenes[0].id,
            name: deletedScenes[0].name || 'Untitled Scene',
            tsxCode: deletedScenes[0].tsxCode || '',
            duration: deletedScenes[0].duration || 180,
            order: deletedScenes[0].order || 0,
          } : undefined,
        };
      } else {
        if (this.DEBUG) {
          // console.warn(`[SceneRepository] No scene found to delete with ID: ${sceneId}`);
        }
        return {
          success: false,
          error: `Scene not found: ${sceneId}`,
        };
      }

    } catch (dbError) {
      // 🪵 Enhanced Logging
      // console.error(`SceneRepository: ❌ Error deleting scene "${sceneName}" (${sceneId})`, {
      //  error: dbError instanceof Error ? dbError.message : String(dbError),
      //  stack: dbError instanceof Error ? dbError.stack : undefined,
      //});

      if (this.DEBUG) {
        // console.error(`[SceneRepository] Failed to delete scene:`, dbError);
      }
      return {
        success: false,
        error: `Failed to delete your scene. Please try again.`,
      };
    }
  }

  /**
   * Log scene iteration for data-driven improvement
   */
  private async logSceneIteration(input: {
    sceneId: string;
    context: DatabaseOperationContext;
    modelUsage: ModelUsageData;
    codeBefore?: string;
    codeAfter?: string;
    changesApplied?: string[];
    changesPreserved?: string[];
  }) {
    try {
      await db.insert(sceneIterations).values({
        sceneId: input.sceneId,
        projectId: input.context.projectId,
        operationType: input.context.operationType,
        editComplexity: input.context.editComplexity,
        userPrompt: input.context.userPrompt,
        brainReasoning: input.context.reasoning,
        toolReasoning: input.context.reasoning,
        codeBefore: input.codeBefore,
        codeAfter: input.codeAfter,
        changesApplied: input.changesApplied,
        changesPreserved: input.changesPreserved,
        generationTimeMs: input.modelUsage.generationTimeMs,
        modelUsed: input.modelUsage.model,
        temperature: input.modelUsage.temperature,
        tokensUsed: input.modelUsage.tokensUsed,
        sessionId: input.modelUsage.sessionId,
      });

      if (this.DEBUG) {
        // console.log(`[SceneIterationTracker] 📊 Logged ${input.context.operationType} operation:`, {
        //  sceneId: input.sceneId,
        //  complexity: input.context.editComplexity,
        //  timeMs: input.modelUsage.generationTimeMs,
        //  model: input.modelUsage.model,
        //  promptLength: input.context.userPrompt.length,
        //});
      }
    } catch (error) {
      if (this.DEBUG) {
        // console.error('[SceneIterationTracker] ❌ Failed to log iteration:', error);
      }
      // Don't throw - tracking failure shouldn't break the main operation
    }
  }

  /**
   * Background job to detect re-editing patterns (user dissatisfaction)
   */
  private async markReEditedScenes(sceneId: string) {
    try {
      // Check if this scene was edited within the last 5 minutes
      const recentEdits = await db
        .select()
        .from(sceneIterations)
        .where(
          sql`${sceneIterations.sceneId} = ${sceneId} 
              AND ${sceneIterations.operationType} = 'edit' 
              AND ${sceneIterations.createdAt} > NOW() - INTERVAL '5 minutes'`
        );

      if (recentEdits.length > 1) {
        // Mark all but the most recent as "user edited again"
        const editsToMark = recentEdits.slice(0, -1);
        for (const edit of editsToMark) {
          await db
            .update(sceneIterations)
            .set({ userEditedAgain: true })
            .where(eq(sceneIterations.id, edit.id));
        }

        if (this.DEBUG) {
          // console.log(`[SceneIterationTracker] 📈 Marked ${editsToMark.length} iterations as re-edited (user dissatisfaction signal)`);
        }
      }
    } catch (error) {
      if (this.DEBUG) {
        // console.error('[SceneIterationTracker] ❌ Failed to mark re-edited scenes:', error);
      }
    }
  }
}

// Export singleton instance
export const sceneRepositoryService = new SceneRepositoryService(); 