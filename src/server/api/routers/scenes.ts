//src/server/api/routers/scenes.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eq, and } from "drizzle-orm";
import { scenes, sceneIterations, messages } from "~/server/db/schema";
import { messageService } from "~/server/services/data/message.service";
import { formatManualEditMessage } from "~/lib/utils/scene-message-formatter";

export const scenesRouter = createTRPCRouter({
  reorderScenes: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneIds: z.array(z.string()), // Array of scene IDs in new order
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[scenes.reorderScenes] Reordering scenes for project ${input.projectId}`);
      
      // Verify project ownership
      const projectScenes = await ctx.db.query.scenes.findMany({
        where: eq(scenes.projectId, input.projectId),
        with: {
          project: true
        }
      });

      if (!projectScenes.length) {
        throw new Error("No scenes found for this project");
      }

      const project = projectScenes[0]?.project;
      if (!project || project.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized: You don't own this project");
      }

      // Verify all scene IDs belong to this project
      const existingSceneIds = new Set(projectScenes.map(s => s.id));
      const allScenesValid = input.sceneIds.every(id => existingSceneIds.has(id));
      
      if (!allScenesValid) {
        throw new Error("Invalid scene IDs provided");
      }

      // Update the order field for each scene
      const updatePromises = input.sceneIds.map((sceneId, index) => 
        ctx.db
          .update(scenes)
          .set({
            order: index,
            updatedAt: new Date(),
          })
          .where(eq(scenes.id, sceneId))
      );

      await Promise.all(updatePromises);

      console.log(`[scenes.reorderScenes] ✅ Successfully reordered ${input.sceneIds.length} scenes`);
      
      // Create a message in chat for the reorder action
      const message = await messageService.createMessage({
        projectId: input.projectId,
        content: `Reordered scenes in timeline`,
        role: 'assistant',
        kind: 'message',
        status: 'success'
      });
      
      return {
        success: true,
        message: 'Scenes reordered successfully'
      };
    }),

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

      // Create a descriptive message for the manual edit
      const sceneName = existingScene.name || `Scene ${existingScene.order + 1}`;
      const editMessage = formatManualEditMessage('code', sceneName);
      
      // Create message in chat
      const message = await messageService.createMessage({
        projectId: input.projectId,
        content: editMessage,
        role: 'assistant',
        kind: 'message',
        status: 'success'
      });

      // Track manual edit in scene iterations for version control, linked to the message
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
        messageId: message?.id, // Link to the message for restore functionality
      });

      console.log(`[scenes.updateSceneCode] ✅ Scene code updated, message created, and tracked in iterations`);
      
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

      // Create a descriptive message for the duration change
      const sceneName = existingScene.name || `Scene ${existingScene.order + 1}`;
      const durationMessage = formatManualEditMessage('duration', sceneName, {
        previousDuration: existingScene.duration,
        newDuration: input.duration
      });
      
      // Create message in chat
      const message = await messageService.createMessage({
        projectId: input.projectId,
        content: durationMessage,
        role: 'assistant',
        kind: 'message',
        status: 'success'
      });

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
        messageId: message?.id, // Link to the message for restore functionality
      });

      console.log(`[scenes.updateSceneDuration] ✅ Scene duration updated, message created, and tracked`);
      
      return {
        success: true,
        scene: updatedScenes[0]
      };
    }),
});
