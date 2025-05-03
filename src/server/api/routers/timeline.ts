//src/server/api/routers/timeline.ts
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { projects } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { InputProps } from "~/types/input-props";
import { type SceneType } from "~/types/remotion-constants";

/**
 * Timeline Router
 * 
 * Handles operations related to the video timeline:
 * - Adding scenes
 * - Inserting custom components
 */
export const timelineRouter = createTRPCRouter({
  addCustomComponent: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      componentId: z.string().uuid(),
      componentName: z.string(),
      startFrame: z.number().optional(),
      duration: z.number().min(1).default(60),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the user has access to this project
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.session.user.id)
        ),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have access to it",
        });
      }

      // Get the current props to determine where to place the new component
      const projectProps = project.props;
      
      // Add a new scene with the custom component
      const newScene = {
        id: uuidv4(),
        type: "custom" as SceneType,  // Explicitly cast as SceneType
        start: input.startFrame ?? projectProps.meta.duration,  // Default to end of timeline
        duration: input.duration,
        data: {
          componentId: input.componentId,
          name: input.componentName
        }
      };

      // Update the project's scenes array
      const updatedScenes = [...projectProps.scenes, newScene];
      
      // Update the duration if needed
      const scenesEndFrame = Math.max(
        ...updatedScenes.map(scene => scene.start + scene.duration)
      );
      const updatedDuration = Math.max(projectProps.meta.duration, scenesEndFrame);
      
      // Create updated props with the new scene
      const updatedProps = {
        ...projectProps,
        meta: {
          ...projectProps.meta,
          duration: updatedDuration
        },
        scenes: updatedScenes
      };
      
      // Update the project in the database
      await ctx.db.update(projects)
        .set({ props: updatedProps })
        .where(eq(projects.id, input.projectId));
        
      return { 
        success: true,
        componentId: newScene.id,
        updatedProps
      };
    }),
});
