// src/server/api/routers/project.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects } from "~/server/db/schema";
import { eq, desc, like, count, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { DEFAULT_PROJECT_PROPS } from "~/types/remotion-constants";

export const projectRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id));

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

      return project;
    }),
    
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Fetch all projects for the current user, sorted by most recently updated
      const userProjects = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.userId, ctx.session.user.id))
        .orderBy(desc(projects.updatedAt));
        
      return userProjects;
    }),
    
  create: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // Find how many "Untitled Video" projects the user already has
        const countResults = await ctx.db
          .select({ count: count() })
          .from(projects)
          .where(
            and(
              eq(projects.userId, ctx.session.user.id),
              like(projects.title, 'Untitled Video%')
            )
          );
        
        // Generate a unique title
        let title = "Untitled Video";
        const projectCount = countResults[0]?.count ?? 0;
        if (projectCount > 0) {
          title = `Untitled Video ${projectCount + 1}`;
        }
        
        // Create a new project for the logged-in user with returning clause
        const inserted = await ctx.db
          .insert(projects)
          .values({
            userId: ctx.session.user.id,
            title,
            props: DEFAULT_PROJECT_PROPS,
          })
          .returning();

        const insertResult = inserted[0];
          
        if (!insertResult) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create project",
          });
        }
        
        return { projectId: insertResult.id };
      } catch (error) {
        console.error("Error creating project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        });
      }
    }),
    
  rename: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // First check if the project exists and belongs to the user
        const [project] = await ctx.db
          .select()
          .from(projects)
          .where(eq(projects.id, input.id));
        
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
        
        // Update the project title
        const updated = await ctx.db
          .update(projects)
          .set({ 
            title: input.title,
            updatedAt: new Date()
          })
          .where(eq(projects.id, input.id))
          .returning();
          
        return updated[0];
      } catch (error) {
        console.error("Error renaming project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to rename project",
        });
      }
    }),
}); 