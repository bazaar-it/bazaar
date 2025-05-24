// src/server/api/routers/video.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects, patches, customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { inputPropsSchema } from "~/types/input-props";

/**
 * Handle a JSON patch operation for video properties
 * This is the server-side handler for the optimistic updates made in the client
 */
async function handlePatch(
  projectId: string,
  operations: Operation[],
  db: any,
  userId: string
) {
  // Original code used transactions, but Neon HTTP driver doesn't support them
  // We'll use a regular query instead, with careful ordering
  try {
    // 1. Get the current project (no lock with HTTP driver)
    const projectRows = await db
      .select({ props: projects.props, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId));
    
    if (projectRows.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }
    
    const project = projectRows[0];
    
    // 2. Verify ownership
    if (project.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to modify this project",
      });
    }
    
    // 3. Apply the patch to create new props
    const { newDocument } = applyPatch(
      project.props, 
      operations,
      /* validate */ true,
      /* mutate */ false
    );
    
    // 4. Validate that the new document still conforms to our schema
    try {
      inputPropsSchema.parse(newDocument);
    } catch (error) {
      console.error("Invalid patch result:", error);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Patch would result in invalid project structure",
      });
    }
    
    // 5. Update the project with the new props
    await db
      .update(projects)
      .set({ 
        props: newDocument,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));
    
    // 6. Store the patch for history (optional)
    try {
      await db
        .insert(patches)
        .values({
          projectId,
          userId,
          patch: operations,
          appliedAt: new Date(),
        });
    } catch (error) {
      // Don't fail if history recording fails
      console.warn("Failed to record patch history:", error);
    }
    
    return { ok: true, props: newDocument };
  } catch (error) {
    console.error("Error applying patch:", error);
    throw error;
  }
}

export const videoRouter = createTRPCRouter({
  // Apply a JSON patch to update video properties
  applyPatch: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        patch: z.array(z.any()), // We validate this in the handler
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await handlePatch(
        input.projectId,
        input.patch as Operation[],
        ctx.db,
        ctx.session.user.id
      );
    }),
    
  // Insert a custom component into the video
  insertComponent: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        componentId: z.string(),
        componentName: z.string(),
        insertPosition: z.number().int().min(0).optional(), // Default to end of video
        duration: z.number().int().min(30).optional(), // Made optional to allow using metadata duration
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId, componentId, componentName } = input;
      
      // 1. Get the current project
      const projectRows = await ctx.db
        .select({ props: projects.props, userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, projectId));
      
      if (projectRows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      
      const project = projectRows[0];
      if (!project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve project data",
        });
      }
      
      // 2. Verify ownership
      if (project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this project",
        });
      }
      
      // 3. Check if there's a duration in the component's metadata
      let duration = input.duration ?? 180; // Default 6 seconds (180 frames at 30fps)
      
      try {
        // Get the component job to check for metadata
        const componentJob = await ctx.db.query.customComponentJobs.findFirst({
          where: eq(customComponentJobs.id, componentId),
          columns: { metadata: true }
        });
        
        if (componentJob?.metadata) {
          // If metadata has durationInFrames, use that value
          const metadata = componentJob.metadata as Record<string, any>;
          if (metadata.durationInFrames && typeof metadata.durationInFrames === 'number') {
            duration = metadata.durationInFrames;
            console.log(`Using component metadata duration: ${duration} frames`);
          }
        }
      } catch (err) {
        // If we can't get the metadata, just use the default or provided duration
        console.warn(`Couldn't fetch component metadata for duration: ${err}`);
      }
      
      // 4. Create the patch
      const newSceneId = crypto.randomUUID();
      const insertPosition = input.insertPosition ?? project.props.meta.duration;
      
      // Patch to insert the component
      const patch: Operation[] = [
        {
          op: "add",
          path: `/scenes/-`,
          value: {
            id: newSceneId,
            type: "custom",
            start: insertPosition,
            duration: duration,
            data: {
              componentId: componentId,
              name: componentName,
            }
          }
        },
        {
          op: "replace",
          path: "/meta/duration",
          value: Math.max(project.props.meta.duration, insertPosition + duration)
        }
      ];
      
      // 5. Apply and validate the patch
      const result = await handlePatch(
        projectId,
        patch,
        ctx.db,
        ctx.session.user.id
      );
      
      return {
        success: true,
        sceneId: newSceneId,
        patch,
        newDuration: Math.max(project.props.meta.duration, insertPosition + duration)
      };
    }),
});
