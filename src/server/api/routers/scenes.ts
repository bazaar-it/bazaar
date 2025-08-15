//src/server/api/routers/scenes.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eq, and } from "drizzle-orm";
import { scenes, sceneIterations, messages } from "~/server/db/schema";
import { messageService } from "~/server/services/data/message.service";
import { formatManualEditMessage } from "~/lib/utils/scene-message-formatter";

export const scenesRouter = createTRPCRouter({
  updateSceneCode: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
      code: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[scenes.updateSceneCode] Updating scene ${input.sceneId} in project ${input.projectId}`);
      
      // Verify project ownership
      const existingScene = await ctx.db.query.scenes.findFirst({
        where: and(
          eq(scenes.id, input.sceneId),
          eq(scenes.projectId, input.projectId)
        ),
        with: {
          project: true
        }
      });

      if (!existingScene) {
        throw new Error("Scene not found");
      }

      if (existingScene.project.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized: You don't own this project");
      }

      // Store the "before" code for tracking changes
      const codeBefore = existingScene.tsxCode;

      // Update scene code
      const updatedScenes = await ctx.db
        .update(scenes)
        .set({
          tsxCode: input.code,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, input.sceneId))
        .returning();

      // Track manual edit in scene iterations for version control
      await ctx.db.insert(sceneIterations).values({
        sceneId: input.sceneId,
        projectId: input.projectId,
        operationType: 'edit',
        editComplexity: 'manual', // Mark as manual edit
        userPrompt: 'Manual code edit via Code Editor',
        codeBefore: codeBefore,
        codeAfter: input.code,
        generationTimeMs: 0, // Instant for manual edits
        modelUsed: null,
        temperature: null,
        userEditedAgain: false,
        changeSource: 'user', // Mark as user-initiated change
      });

      console.log(`[scenes.updateSceneCode] ✅ Scene code updated and tracked in iterations`);
      
      return {
        success: true,
        scene: updatedScenes[0]
      };
    }),

  updateSceneDuration: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
      duration: z.number().min(30), // Minimum 1 second (30 frames at 30fps)
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[scenes.updateSceneDuration] Updating scene ${input.sceneId} duration to ${input.duration} frames`);
      
      // Verify project ownership
      const existingScene = await ctx.db.query.scenes.findFirst({
        where: and(
          eq(scenes.id, input.sceneId),
          eq(scenes.projectId, input.projectId)
        ),
        with: {
          project: true
        }
      });

      if (!existingScene) {
        throw new Error("Scene not found");
      }

      if (existingScene.project.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized: You don't own this project");
      }

      // Update scene duration
      const updatedScenes = await ctx.db
        .update(scenes)
        .set({
          duration: input.duration,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, input.sceneId))
        .returning();

      // Track duration change in iterations
      await ctx.db.insert(sceneIterations).values({
        sceneId: input.sceneId,
        projectId: input.projectId,
        operationType: 'edit',
        editComplexity: 'duration', // Duration-only change
        userPrompt: `Duration changed from ${existingScene.duration} to ${input.duration} frames`,
        codeBefore: existingScene.tsxCode,
        codeAfter: existingScene.tsxCode, // Code doesn't change
        generationTimeMs: 0,
        modelUsed: null,
        temperature: null,
        userEditedAgain: false,
        changeSource: 'user', // User-initiated change
      });

      console.log(`[scenes.updateSceneDuration] ✅ Scene duration updated and tracked`);
      
      return {
        success: true,
        scene: updatedScenes[0]
      };
    }),
});
