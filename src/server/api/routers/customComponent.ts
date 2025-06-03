// src/server/api/routers/customComponent.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { customComponentJobs, projects } from "~/server/db/schema";
import { and, eq, desc, ne, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { preprocessTsx } from "~/server/utils/tsxPreprocessor";

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
          status: "queued_for_generation",
        })
        .returning();

      if (!job) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create component job",
        });
      }

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
          message: "Component not found",
        });
      }
      
      if (component.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to rename this component",
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
          message: "Component not found",
        });
      }
      
      if (component.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this component",
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
          message: "Component job not found",
        });
      }
      
      return { 
        status: job.status, 
        outputUrl: job.outputUrl,
        errorMessage: job.errorMessage
      };
    }),
    
  listByProject: protectedProcedure
    .input(z.object({ 
      projectId: z.string().uuid() 
    }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to this project
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

  listAllForUser: protectedProcedure
    .input(z.object({
      successfulOnly: z.boolean().optional().default(false)
    }))
    .query(async ({ ctx, input }) => {
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
            eq(customComponentJobs.status, "complete"),
            // Use IS NOT NULL syntax for checking non-null outputUrl
            isNotNull(customComponentJobs.outputUrl)
          ));
      }
      
      const results = await query.orderBy(desc(customComponentJobs.createdAt));
      
      return results;
    }),

  getComponentJob: protectedProcedure
    .input(z.object({
      jobId: z.string().uuid() 
    }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.jobId),
        with: { project: true },
      });
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component job not found",
        });
      }
      
      if (job.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view this component job",
        });
      }
      
      return job;
    }),

  retryComponentBuild: protectedProcedure
    .input(z.object({
      componentId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the component job
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.componentId),
        with: { project: true }
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found",
        });
      }
      
      if (component.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to retry this component build",
        });
      }
      
      if (component.status === "pending" || component.status === "building") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Component build is already in progress",
        });
      }
      
      if (!component.tsxCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Component code is missing, cannot retry build",
        });
      }
      
      // Reset the status to pending to trigger a rebuild
      const result = preprocessTsx(component.tsxCode, component.effect);
      
      // Update the component with the fixed code and reset status to pending
      const [updated] = await ctx.db.update(customComponentJobs)
        .set({ 
          tsxCode: result.code,
          status: "pending", // Reset to pending so the build process will pick it up
          retryCount: component.retryCount + 1,
          errorMessage: null,
          updatedAt: new Date()
        })
        .where(eq(customComponentJobs.id, input.componentId))
        .returning();
      
      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retry component build",
        });
      }
      
      return updated;
    }),

  getComponentCode: protectedProcedure
    .input(z.object({
      componentId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.componentId)
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found",
        });
      }

      return {
        tsxCode: component.tsxCode
      };
    }),

  getFixableComponents: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid()
    }))
    .query(async ({ ctx, input }) => {
      // Verify user access to project
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

      // Get failed components that might be fixable
      const fixableComponents = await ctx.db.query.customComponentJobs.findMany({
        where: and(
          eq(customComponentJobs.projectId, input.projectId),
          eq(customComponentJobs.status, "failed"),  // Currently focusing on failed components
          isNotNull(customComponentJobs.tsxCode)     // Must have code to fix
        ),
        orderBy: desc(customComponentJobs.createdAt),
      });
      
      return fixableComponents;
    }),

  applySyntaxFix: protectedProcedure
    .input(z.object({
      componentId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.componentId),
        with: { project: true }
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found",
        });
      }
      
      if (component.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this component",
        });
      }
      
      if (!component.tsxCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Component code is missing, cannot apply syntax fix",
        });
      }
      
      // Apply the syntax fix and return the result for preview
      const result = preprocessTsx(component.tsxCode, component.effect || "Component");
      
      return {
        originalCode: component.tsxCode,
        fixedCode: result.code,
        issues: result.issues,
        fixed: result.fixed
      };
    }),

  confirmSyntaxFix: protectedProcedure
    .input(z.object({
      componentId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.componentId),
        with: { project: true }
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Component not found",
        });
      }
      
      if (component.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this component",
        });
      }
      
      if (!component.tsxCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Component code is missing, cannot confirm syntax fix",
        });
      }
      
      // Apply the syntax fix
      const result = preprocessTsx(component.tsxCode, component.effect || "Component");
      
      if (!result.fixed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fixes were applied to the component",
        });
      }
      
      // Update the component with the fixed code
      await ctx.db.update(customComponentJobs)
        .set({
          tsxCode: result.code,
          updatedAt: new Date(),
          status: "pending", // Reset status to pending to trigger rebuild
          errorMessage: null, // Clear any previous error message
        })
        .where(eq(customComponentJobs.id, input.componentId));
      
      return {
        success: true,
        message: "Syntax fix confirmed and code updated",
      };
    }),

  resetStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      newStatus: z.enum(["pending", "building", "complete", "error", "ready"])
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
          message: "Component not found",
        });
      }
      
      if (component.project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to reset this component's status",
        });
      }
      
      // Update the component status
      const [updated] = await ctx.db.update(customComponentJobs)
        .set({ 
          status: input.newStatus,
          updatedAt: new Date(),
          // If resetting to pending, clear the outputUrl and errorMessage
          ...(input.newStatus === "pending" ? { 
            outputUrl: null,
            errorMessage: null 
          } : {})
        })
        .where(eq(customComponentJobs.id, input.id))
        .returning();
      
      return updated;
    }),

  // Get all components for a specific task (used by A2A test dashboard)
  getComponentsForTask: publicProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Query components associated with this task
        const components = await ctx.db.query.customComponentJobs.findMany({
          where: eq(customComponentJobs.taskId, input.taskId),
          orderBy: [desc(customComponentJobs.createdAt)],
        });

        // Return the components with formatted fields
        return components.map(component => ({
          id: component.id,
          effect: component.effect || "Unknown effect",
          tsxCode: component.tsxCode || "",
          status: component.status,
          outputUrl: component.outputUrl,
          errorMessage: component.errorMessage,
          createdAt: component.createdAt
        }));
      } catch (error) {
        console.error("Failed to fetch components for task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch components for task: ${String(error)}`,
        });
      }
    }),
});