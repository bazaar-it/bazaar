//src/server/api/routers/scenes.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eq, and } from "drizzle-orm";
import { scenes } from "~/server/db/schema";

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

      // Update scene code
      const updatedScenes = await ctx.db
        .update(scenes)
        .set({
          tsxCode: input.code,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, input.sceneId))
        .returning();

      console.log(`[scenes.updateSceneCode] ✅ Scene code updated successfully`);
      
      return {
        success: true,
        scene: updatedScenes[0]
      };
    }),
});
