// src/server/api/routers/customComponent.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { customComponentJobs, projects } from "~/server/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Custom Component Router
 * 
 * Handles operations related to custom Remotion components:
 * - Creating component generation jobs
 * - Checking job status
 * - Listing jobs by project
 */
export const customComponentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      effect: z.string().min(1, "Effect description is required"),
      tsxCode: z.string().min(1, "Component code is required"),
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

      // Create the job
      const [job] = await ctx.db.insert(customComponentJobs)
        .values({
          projectId: input.projectId,
          effect: input.effect, 
          tsxCode: input.tsxCode,
          status: "pending",
        })
        .returning();
      
      return job;
    }),
    
  getJobStatus: protectedProcedure
    .input(z.object({ 
      id: z.string().uuid() 
    }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.id),
      });
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom component job not found",
        });
      }
      
      // Verify the user has access to the project this job belongs to
      const project = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, job.projectId),
          eq(projects.userId, ctx.session.user.id)
        ),
      });

      if (!project) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this component job",
        });
      }
      
      return job;
    }),
    
  listByProject: protectedProcedure
    .input(z.object({ 
      projectId: z.string().uuid() 
    }))
    .query(async ({ ctx, input }) => {
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

      // Get all jobs for this project
      const userComponentJobs = await ctx.db
        .select()
        .from(customComponentJobs)
        .where(eq(customComponentJobs.projectId, input.projectId))
        .orderBy(desc(customComponentJobs.createdAt));
        
      return userComponentJobs;
    }),

  // List all custom components for the logged-in user across all projects
  listAllForUser: protectedProcedure
    .query(async ({ ctx }) => {
      // Get all jobs for all projects owned by this user
      const results = await ctx.db
        .select({
          // Select only the job fields we need to avoid ambiguity
          id: customComponentJobs.id,
          projectId: customComponentJobs.projectId,
          effect: customComponentJobs.effect,
          status: customComponentJobs.status,
          tsxCode: customComponentJobs.tsxCode,
          outputUrl: customComponentJobs.outputUrl,
          errorMessage: customComponentJobs.errorMessage,
          createdAt: customComponentJobs.createdAt,
          updatedAt: customComponentJobs.updatedAt,
          // Include project name for context
          projectName: projects.title
        })
        .from(customComponentJobs)
        .innerJoin(projects, eq(customComponentJobs.projectId, projects.id))
        .where(eq(projects.userId, ctx.session.user.id))
        .orderBy(desc(customComponentJobs.createdAt));
      
      return results;
    }),
});
