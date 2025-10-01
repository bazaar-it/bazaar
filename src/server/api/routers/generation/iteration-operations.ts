import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, projects, sceneIterations } from "~/server/db/schema";
import { env } from "~/env";
import { sceneCompiler } from "~/server/services/compilation/scene-compiler.service";
import { eq, and, inArray, sql, isNull } from "drizzle-orm";
import { messageService } from "~/server/services/data/message.service";
import { ResponseBuilder, getErrorCode } from "~/lib/api/response-helpers";
import { ErrorCode } from "~/lib/types/api/universal";

/**
 * GET ITERATIONS BY MESSAGE - Query all scene iterations linked to a message
 */
export const getMessageIterations = protectedProcedure
  .input(z.object({
    messageId: z.string(),
  }))
  .query(async ({ input, ctx }) => {
    const { messageId } = input;
    
    // Get all iterations linked to this message
    const iterations = await db.query.sceneIterations.findMany({
      where: eq(sceneIterations.messageId, messageId),
      orderBy: [sceneIterations.createdAt],
    });
    
    // For each iteration, get the current scene info
    const iterationsWithScenes = await Promise.all(
      iterations.map(async (iteration) => {
        const scene = await db.query.scenes.findFirst({
          where: and(eq(scenes.id, iteration.sceneId), isNull(scenes.deletedAt)),
        });
        
        return {
          ...iteration,
          currentSceneName: scene?.name || 'Deleted Scene',
          sceneExists: !!scene,
        };
      })
    );
    
    return iterationsWithScenes;
  });

/**
 * GET BATCH MESSAGE ITERATIONS - Efficiently check multiple messages for iterations
 */
export const getBatchMessageIterations = protectedProcedure
  .input(z.object({
    messageIds: z.array(z.string()),
  }))
  .query(async ({ input, ctx }) => {
    const { messageIds } = input;
    
    if (messageIds.length === 0) {
      return {};
    }
    
    // Get all iterations for these messages in one query
    const iterations = await db.query.sceneIterations.findMany({
      where: inArray(sceneIterations.messageId, messageIds),
      orderBy: [sceneIterations.createdAt],
    });
    
    // Group by messageId for easy lookup
    const iterationsByMessage: Record<string, typeof iterations> = {};
    
    for (const iteration of iterations) {
      if (iteration.messageId) {
        if (!iterationsByMessage[iteration.messageId]) {
          iterationsByMessage[iteration.messageId] = [];
        }
        iterationsByMessage[iteration.messageId]!.push(iteration);
      }
    }
    
    return iterationsByMessage;
  });

/**
 * REVERT TO ITERATION - Restore a scene to a previous version
 */
export const revertToIteration = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    iterationId: z.string(),
    messageId: z.string(), // For creating a new message about the revert
  }))
  .mutation(async ({ input, ctx }) => {
    const response = new ResponseBuilder();
    const { projectId, iterationId, messageId } = input;
    const userId = ctx.session.user.id;
    
    console.log(`[${response.getRequestId()}] Reverting to iteration`, { 
      iterationId, 
      messageId 
    });
    
    try {
      // 1. Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.userId, userId)
        ),
      });
      
      if (!project) {
        return response.error(
          ErrorCode.NOT_FOUND,
          "Project not found or access denied",
          'scene.update',
          'scene'
        ) as any;
      }
      
      // 2. Get the iteration
      const iteration = await db.query.sceneIterations.findFirst({
        where: and(
          eq(sceneIterations.id, iterationId),
          eq(sceneIterations.projectId, projectId)
        ),
      });
      
      if (!iteration) {
        return response.error(
          ErrorCode.NOT_FOUND,
          "Iteration not found",
          'scene.update',
          'scene'
        ) as any;
      }
      
      // 3. Handle based on operation type
      let revertedScene;
      
      if (iteration.operationType === 'delete') {
        // Restore deleted scene
        if (!iteration.codeBefore) {
          throw new Error("Cannot restore deleted scene - no code history");
        }
        
        // Find the original order by looking at other scenes
        const allScenes = await db.query.scenes.findMany({
          where: and(eq(scenes.projectId, projectId), isNull(scenes.deletedAt)),
          orderBy: [scenes.order],
        });
        
        // Insert at the end
        const maxOrder = allScenes.length;
        
        let compiledInsert = { jsCode: null as string | null, jsCompiledAt: null as Date | null };
        if (env.USE_SERVER_COMPILATION) {
          const res = await sceneCompiler.compileScene(iteration.codeBefore, { projectId, sceneId: iteration.sceneId });
          compiledInsert = { jsCode: res.jsCode, jsCompiledAt: res.compiledAt };
          console.log('[CompileMetrics] revert(delete) compiled=%s scene=%s', String(!!res.jsCode), iteration.sceneId);
        }
        [revertedScene] = await db.insert(scenes).values({
          id: iteration.sceneId, // Restore with original ID
          projectId,
          name: `Restored Scene`,
          tsxCode: iteration.codeBefore,
          jsCode: compiledInsert.jsCode,
          jsCompiledAt: compiledInsert.jsCompiledAt,
          duration: 150, // Default duration
          order: maxOrder,
          props: {},
        }).returning();
        
      } else if (iteration.operationType === 'create') {
        // For create operations, use codeAfter (the created state)
        const scene = await db.query.scenes.findFirst({
          where: and(eq(scenes.id, iteration.sceneId), isNull(scenes.deletedAt)),
        });
        
        if (!scene) {
          throw new Error("Scene not found");
        }
        
        let compiledCreate = { jsCode: null as string | null, jsCompiledAt: null as Date | null };
        if (env.USE_SERVER_COMPILATION) {
          const res = await sceneCompiler.compileScene(iteration.codeAfter!, { projectId, sceneId: iteration.sceneId });
          compiledCreate = { jsCode: res.jsCode, jsCompiledAt: res.compiledAt };
          console.log('[CompileMetrics] revert(create) compiled=%s scene=%s', String(!!res.jsCode), iteration.sceneId);
        }
        [revertedScene] = await db.update(scenes)
          .set({
            tsxCode: iteration.codeAfter!,
            jsCode: compiledCreate.jsCode,
            jsCompiledAt: compiledCreate.jsCompiledAt,
            updatedAt: new Date(),
            revision: sql`${scenes.revision} + 1`,
          })
          .where(and(eq(scenes.id, iteration.sceneId), isNull(scenes.deletedAt)))
          .returning();
          
      } else {
        // For edit operations, revert to the state after this edit
        const scene = await db.query.scenes.findFirst({
          where: and(eq(scenes.id, iteration.sceneId), isNull(scenes.deletedAt)),
        });
        
        if (!scene) {
          throw new Error("Scene not found");
        }
        
        const codeToRevertTo = iteration.codeAfter || iteration.codeBefore;
        if (!codeToRevertTo) {
          throw new Error("No code history available for this iteration");
        }
        
        let compiledEdit = { jsCode: null as string | null, jsCompiledAt: null as Date | null };
        if (env.USE_SERVER_COMPILATION) {
          const res = await sceneCompiler.compileScene(codeToRevertTo, { projectId, sceneId: iteration.sceneId });
          compiledEdit = { jsCode: res.jsCode, jsCompiledAt: res.compiledAt };
          console.log('[CompileMetrics] revert(edit) compiled=%s scene=%s', String(!!res.jsCode), iteration.sceneId);
        }
        [revertedScene] = await db.update(scenes)
          .set({
            tsxCode: codeToRevertTo,
            jsCode: compiledEdit.jsCode,
            jsCompiledAt: compiledEdit.jsCompiledAt,
            updatedAt: new Date(),
            revision: sql`${scenes.revision} + 1`,
          })
          .where(and(eq(scenes.id, iteration.sceneId), isNull(scenes.deletedAt)))
          .returning();
      }
      
      if (!revertedScene) {
        throw new Error("Failed to revert scene");
      }
      
      // 4. Create a new iteration to track the revert
      await db.insert(sceneIterations).values({
        sceneId: iteration.sceneId,
        projectId,
        operationType: 'edit',
        userPrompt: `Reverted to version from: "${iteration.userPrompt}"`,
        codeBefore: iteration.operationType === 'delete' ? null : revertedScene.tsxCode,
        codeAfter: iteration.codeAfter || iteration.codeBefore,
        generationTimeMs: 0,
        modelUsed: null,
        userEditedAgain: false,
        messageId: null, // This is a system operation, not linked to a new message
      });
      
      // 5. Create a message about the revert
      await messageService.createMessage({
        projectId,
        content: `Reverted scene to version from: "${iteration.userPrompt}"`,
        role: 'assistant',
        kind: 'message',
      });
      
      return response.success(
        revertedScene as any,
        iteration.operationType === 'delete' ? 'scene.create' : 'scene.update',
        'scene',
        [revertedScene.id]
      );
      
    } catch (error) {
      console.error(`[${response.getRequestId()}] Revert error:`, error);
      
      const errorCode = getErrorCode(error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to revert';
      
      return response.error(
        errorCode,
        errorMessage,
        'scene.update',
        'scene'
      ) as any;
    }
  });
