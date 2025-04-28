// src/server/api/routers/project.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
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
        // Create a new project for the logged-in user
        const result = await ctx.db
          .insert(projects)
          .values({
            userId: ctx.session.user.id,
            title: "Untitled Video",
            props: DEFAULT_PROJECT_PROPS,
          })
          .returning({ id: projects.id });
          
        if (!result || result.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create project",
          });
        }
        
        const projectId = result[0]?.id;
        
        if (!projectId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to retrieve project ID",
          });
        }
        
        return { projectId };
      } catch (error) {
        console.error("Error creating project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        });
      }
    }),
}); 