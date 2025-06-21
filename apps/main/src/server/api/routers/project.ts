// src/server/api/routers/project.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects, patches, scenePlans } from "@bazaar/database";
import { eq, desc, like, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createDefaultProjectProps } from "~/lib/types/video/remotion-constants";
import { jsonPatchSchema } from "~/lib/types/shared/json-patch";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { generateNameFromPrompt } from "~/lib/utils/nameGenerator";
import { generateTitle } from "~/server/services/ai/titleGenerator.service";
import { executeWithRetry } from "@bazaar/database";

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
        // Generate title based on initialMessage if available
        console.log('[project.create] Mutation called. Input:', JSON.stringify(input));
        let title = "Untitled Video";
        
        if (input?.initialMessage) {
          try {
            // Use AI to generate a title from the initialMessage
            const result = await generateTitle({
              prompt: input.initialMessage,
              contextId: "project-create"
            });
            title = result.title || "Untitled Video";
          } catch (titleError) {
            console.error("Error generating AI title:", titleError);
            // Fall back to default naming scheme on error
          }
        }
        
        // If AI title generation failed or no initialMessage was provided,
        // use the existing incremental naming scheme
        if (title === "Untitled Video" || title === "New Project") {
          // Get a list of all "Untitled Video" projects with their numbers
          const userProjects = await executeWithRetry(() => ctx.db
            .select({ title: projects.title })
            .from(projects)
            .where(
              and(
                eq(projects.userId, ctx.session?.user?.id || 'system'),
                like(projects.title, 'Untitled Video%')
              )
            ));
          
          // Find the highest number used in "Untitled Video X" titles
          let highestNumber = 0;
          for (const project of userProjects) {
            const match = /^Untitled Video (\d+)$/.exec(project.title);
            if (match?.[1]) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > highestNumber) {
                highestNumber = num;
              }
            }
          }
          
          // Generate a unique title with the next available number
          const nextNumber = highestNumber + 1;
          title = userProjects.length === 0 ? "Untitled Video" : `Untitled Video ${nextNumber}`;
        }
        
        // Create a new project for the logged-in user with returning clause
        // Use executeWithRetry to handle potential database connection issues
        const inserted = await executeWithRetry(() => ctx.db
          .insert(projects)
          .values({
            userId: ctx.session?.user?.id || 'system',
            title,
            props: createDefaultProjectProps(),
          })
          .returning());

        const insertResult = inserted[0];
          
        if (!insertResult) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create project",
          });
        }

        // NO WELCOME MESSAGE CREATION - Let UI show the nice default instead

        // TODO: Initial message processing now handled via generation router
        // Legacy processUserMessageInProject removed during cleanup
        
        return { projectId: insertResult.id };

      } catch (error) {
        console.error("Error creating project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
          cause: error,
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
  /**
   * Fetches all scene plans for a given project.
   */
  listScenePlans: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // First, verify project ownership (similar to getById)
      const project = await ctx.db.query.projects.findFirst({
        columns: { id: true, userId: true },
        where: eq(projects.id, input.projectId),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      if (project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this project's scene plans.",
        });
      }

      // Fetch scene plans for the project, ordered by creation or a specific order if available
      const plans = await ctx.db.query.scenePlans.findMany({
        where: eq(scenePlans.projectId, input.projectId),
        orderBy: [desc(scenePlans.createdAt)], // Or any other relevant order
      });

      return plans;
    }),
    
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
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
        
        // Delete the project (this will cascade delete related data due to foreign key constraints)
        const deleted = await ctx.db
          .delete(projects)
          .where(eq(projects.id, input.id))
          .returning();
          
        if (!deleted[0]) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete project",
          });
        }
        
        return { 
          success: true, 
          deletedProject: deleted[0] 
        };
      } catch (error) {
        console.error("Error deleting project:", error);
        if (error instanceof TRPCError) {
          throw error; // Re-throw TRPC errors
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete project",
        });
      }
    }),
    
  // New procedure for generating AI titles
  generateAITitle: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      contextId: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        // Call the AI title generator service
        const result = await generateTitle({
          prompt: input.prompt,
          contextId: input.contextId || "api-call"
        });
        
        // Return the generated title
        return {
          title: result.title || generateNameFromPrompt(input.prompt),
          reasoning: result.reasoning
        };
      } catch (error) {
        console.error("Error generating AI project title:", error);
        // Fall back to the regex-based approach on error
        return {
          title: generateNameFromPrompt(input.prompt),
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }),
}); 