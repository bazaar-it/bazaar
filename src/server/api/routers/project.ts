// src/server/api/routers/project.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects, patches } from "~/server/db/schema";
import { eq, desc, like, count, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { DEFAULT_PROJECT_PROPS } from "~/types/remotion-constants";
import { processUserMessageInProject } from "./chat";
import { jsonPatchSchema, type JsonPatch } from "~/types/json-patch";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";

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
    .input(z.object({
      initialMessage: z.string().min(1).max(2000).optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      try {
        // Get a list of all "Untitled Video" projects with their numbers
        const userProjects = await ctx.db
          .select({ title: projects.title })
          .from(projects)
          .where(
            and(
              eq(projects.userId, ctx.session.user.id),
              like(projects.title, 'Untitled Video%')
            )
          );
        
        // Find the highest number used in "Untitled Video X" titles
        let highestNumber = 0;
        for (const project of userProjects) {
          const match = project.title.match(/^Untitled Video (\d+)$/);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > highestNumber) {
              highestNumber = num;
            }
          }
        }
        
        // Generate a unique title with the next available number
        const nextNumber = highestNumber + 1;
        const title = userProjects.length === 0 ? "Untitled Video" : `Untitled Video ${nextNumber}`;
        
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

        // If initialMessage is provided, trigger LLM/assistant processing asynchronously
        if (input?.initialMessage && input.initialMessage.trim().length > 0) {
          // Fire-and-forget – attach a catch to avoid unhandled rejection noise
          processUserMessageInProject(ctx, insertResult.id, input.initialMessage)
            .catch((error: unknown) => {
              // Log but don't affect the response – project has already been created
              console.error(`Error processing initial message for project ${insertResult.id}:`, error);
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
        
        // Check if another project with this title already exists for this user
        const [existingProject] = await ctx.db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.userId, ctx.session.user.id),
              eq(projects.title, input.title),
              ne(projects.id, input.id) // Not the current project
            )
          );
        
        if (existingProject) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A project with this title already exists",
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
        if (error instanceof TRPCError) {
          throw error; // Re-throw TRPC errors
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to rename project",
        });
      }
    }),
  patch: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      patch: jsonPatchSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
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

        // Apply the JSON patch
        const patchOperations = input.patch as unknown as Operation[];
        const nextProps = applyPatch(structuredClone(project.props), patchOperations, true, false).newDocument;
        
        // Save the new props and the patch
        const updated = await ctx.db
          .update(projects)
          .set({ 
            props: nextProps,
            updatedAt: new Date()
          })
          .where(eq(projects.id, input.projectId))
          .returning();

        // Save the patch for history
        await ctx.db.insert(patches).values({
          projectId: input.projectId,
          patch: input.patch
        });
        
        return updated[0];
      } catch (error) {
        console.error("Error patching project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to patch project",
        });
      }
    }),
}); 