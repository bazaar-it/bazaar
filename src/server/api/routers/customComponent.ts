// src/server/api/routers/customComponent.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { customComponentJobs, projects } from "~/server/db/schema";
import { and, eq, desc, ne, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Custom Component Router
 * 
 * Handles operations related to custom Remotion components:
 * - Creating component generation jobs
 * - Checking job status
 * - Listing jobs by project
 * - Renaming components
 * - Deleting components
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
    
  rename: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      effect: z.string().min(1, "Component name is required")
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the component
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.id),
        with: { project: true }
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found"
        });
      }
      
      // Verify user owns the project
      if (component.project?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this component"
        });
      }
      
      // Update the component name
      const [updated] = await ctx.db.update(customComponentJobs)
        .set({ 
          effect: input.effect,
          updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, input.id))
        .returning();
      
      return updated;
    }),
    
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the component
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.id),
        with: { project: true }
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found"
        });
      }
      
      // Verify user owns the project
      if (component.project?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this component"
        });
      }
      
      // Delete the component
      const [deleted] = await ctx.db.delete(customComponentJobs)
        .where(eq(customComponentJobs.id, input.id))
        .returning();
      
      return deleted;
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
    .input(z.object({
      // Optional flag to filter by successful components only
      successfulOnly: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      // Query for all projects owned by this user
      let query = ctx.db
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
        .where(eq(projects.userId, ctx.session.user.id));
      
      // If we only want successful components, add additional filters
      if (input.successfulOnly) {
        // A successful component must:
        // 1. Have status="success"
        // 2. Have a non-null outputUrl (indicating it was uploaded to R2)
        // We need to modify our base where condition
        query = ctx.db
          .select({
            id: customComponentJobs.id,
            projectId: customComponentJobs.projectId,
            effect: customComponentJobs.effect,
            status: customComponentJobs.status,
            tsxCode: customComponentJobs.tsxCode,
            outputUrl: customComponentJobs.outputUrl,
            errorMessage: customComponentJobs.errorMessage,
            createdAt: customComponentJobs.createdAt,
            updatedAt: customComponentJobs.updatedAt,
            projectName: projects.title
          })
          .from(customComponentJobs)
          .innerJoin(projects, eq(customComponentJobs.projectId, projects.id))
          .where(and(
            eq(projects.userId, ctx.session.user.id),
            eq(customComponentJobs.status, "success"),
            // Use IS NOT NULL syntax for checking non-null outputUrl
            isNotNull(customComponentJobs.outputUrl)
          ));
      }
      
      // Execute the query with ordering
      const results = await query.orderBy(desc(customComponentJobs.createdAt));
      
      return results;
    }),
});
