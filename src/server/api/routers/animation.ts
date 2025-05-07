import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { animationDesignBriefs } from "~/server/db/schema";
import { generateAnimationDesignBrief, type AnimationBriefGenerationParams } from "~/server/services/animationDesigner.service";
import { eq, and } from "drizzle-orm";

/**
 * Router for handling animation design briefs
 */
export const animationRouter = createTRPCRouter({
  /**
   * Generate an animation design brief for a scene
   */
  generateDesignBrief: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        sceneId: z.string().uuid(),
        scenePurpose: z.string().min(3),
        sceneElementsDescription: z.string().min(3),
        desiredDurationInFrames: z.number().int().positive(),
        dimensions: z.object({
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        }),
        currentVideoContext: z.string().optional(),
        targetAudience: z.string().optional(),
        brandGuidelines: z.string().optional(),
        componentJobId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if project exists and user has access to it
        // We could add this check here

        // Check if a brief already exists for this scene
        const existingBrief = await db.query.animationDesignBriefs.findFirst({
          where: and(
            eq(animationDesignBriefs.projectId, input.projectId),
            eq(animationDesignBriefs.sceneId, input.sceneId),
            eq(animationDesignBriefs.status, "complete")
          ),
        });

        if (existingBrief) {
          // Brief already exists, return it
          return {
            briefId: existingBrief.id,
            brief: existingBrief.designBrief,
            status: existingBrief.status,
            isExisting: true,
          };
        }

        // Generate a new brief
        const params: AnimationBriefGenerationParams = {
          projectId: input.projectId,
          sceneId: input.sceneId,
          scenePurpose: input.scenePurpose,
          sceneElementsDescription: input.sceneElementsDescription,
          desiredDurationInFrames: input.desiredDurationInFrames,
          dimensions: input.dimensions,
          currentVideoContext: input.currentVideoContext,
          targetAudience: input.targetAudience,
          brandGuidelines: input.brandGuidelines,
          componentJobId: input.componentJobId,
        };

        const { brief, briefId } = await generateAnimationDesignBrief(params);

        return {
          briefId,
          brief,
          status: "complete",
          isExisting: false,
        };
      } catch (error: any) {
        console.error("Error generating design brief:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate animation design brief: ${error.message}`,
        });
      }
    }),

  /**
   * Get an animation design brief by ID
   */
  getDesignBrief: protectedProcedure
    .input(z.object({ briefId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const brief = await db.query.animationDesignBriefs.findFirst({
        where: eq(animationDesignBriefs.id, input.briefId),
      });

      if (!brief) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Animation design brief not found",
        });
      }

      return brief;
    }),

  /**
   * List all animation design briefs for a project
   */
  listDesignBriefs: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const briefs = await db.query.animationDesignBriefs.findMany({
        where: eq(animationDesignBriefs.projectId, input.projectId),
        orderBy: (briefs, { desc }) => [desc(briefs.createdAt)],
      });

      return briefs;
    }),

  /**
   * Get the animation design brief for a specific scene
   */
  getSceneDesignBrief: protectedProcedure
    .input(z.object({ 
      projectId: z.string().uuid(),
      sceneId: z.string().uuid() 
    }))
    .query(async ({ ctx, input }) => {
      const brief = await db.query.animationDesignBriefs.findFirst({
        where: and(
          eq(animationDesignBriefs.projectId, input.projectId),
          eq(animationDesignBriefs.sceneId, input.sceneId)
        ),
        orderBy: (briefs, { desc }) => [desc(briefs.createdAt)],
      });

      if (!brief) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Animation design brief not found for this scene",
        });
      }

      return brief;
    }),
}); 