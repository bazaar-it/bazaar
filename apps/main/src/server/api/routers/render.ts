import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects } from "@bazaar/database";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const renderRouter = createTRPCRouter({
  // Basic start procedure to initiate rendering
  start: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First check if the project exists and belongs to the user
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));
      
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      
      // Ensure the user has access to this project
      if (project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this project",
        });
      }
      
      // For now, just return success - this will be replaced with actual Remotion Lambda rendering logic
      return {
        success: true,
        message: "Render started successfully",
        // This would include the job ID, status URL, etc. once implemented
      };
    }),
}); 