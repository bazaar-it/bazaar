// src/server/api/routers/project.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects, patches, scenePlans, scenes, messages, assets, personalizationTargets } from "~/server/db/schema";
import { eq, desc, like, and, ne, isNull, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createDefaultProjectProps } from "~/lib/types/video/remotion-constants";
import { jsonPatchSchema } from "~/lib/types/shared/json-patch";
import * as jsonPatch from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { generateNameFromPrompt } from "~/lib/utils/nameGenerator";
import { generateTitle } from "~/server/services/ai/titleGenerator.service";
import { executeWithRetry } from "~/server/db";
import { assetContext } from "~/server/services/context/assetContextService";
import type { AssetContext as AssetContextType } from "~/lib/types/asset-context";
import { tokenizeSceneWithLLM } from "~/server/services/automation/sceneTokenizer.service";
import { editSceneForBrandWithLLM } from "~/server/services/automation/sceneBrandEditor.service";
import type { BrandTheme, BrandSceneVariant, BrandSceneStatusEntry } from "~/lib/theme/brandTheme";
import { DEFAULT_BRAND_THEME, ensureBrandThemeCopy } from "~/lib/theme/brandTheme";
import { compileSceneToJS } from "~/server/utils/compile-scene";

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

      // Ensure the user has access to this project (admins can access any project)
      if (project.userId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this project",
        });
      }

      return project;
    }),
    
  // NEW: Consolidated query for full project data
  getFullProject: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      include: z.array(z.enum(['scenes', 'messages'])).optional().default(['scenes', 'messages']),
    }))
    .query(async ({ ctx, input }) => {
      // Fetch project with all related data in parallel
      const [projectData, projectScenes, projectMessages] = await Promise.all([
        // Get project (includes audio in the props)
        ctx.db
          .select()
          .from(projects)
          .where(eq(projects.id, input.id))
          .then(rows => rows[0]),
        
        // Get scenes if requested
        input.include.includes('scenes') 
          ? ctx.db
              .select()
              .from(scenes)
              .where(eq(scenes.projectId, input.id))
              .orderBy(scenes.order)
          : Promise.resolve([]),
        
        // Get messages if requested
        input.include.includes('messages')
          ? ctx.db
              .select()
              .from(messages)
              .where(eq(messages.projectId, input.id))
              .orderBy(messages.createdAt)
          : Promise.resolve([]),
      ]);

      if (!projectData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Ensure the user has access to this project
      // Exception: system-changelog projects are public (viewable by anyone)
      if (
        projectData.userId !== ctx.session.user.id &&
        projectData.userId !== 'system-changelog' &&
        !ctx.session.user.isAdmin
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this project",
        });
      }

      return {
        project: projectData,
        scenes: projectScenes,
        messages: projectMessages,
        audio: projectData.audio, // Audio is stored in the project itself
      };
    }),
    
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Fetch all projects for the current user
      // First sort by favorite status (favorites first), then by most recently updated
      const userProjects = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.userId, ctx.session.user.id))
        .orderBy(
          desc(projects.isFavorite), // Favorites first (true = 1, false = 0)
          desc(projects.updatedAt)   // Then by most recent
        );
        
      return userProjects;
    }),

  // Return only the most recently updated project ID for the current user
  getLatestId: protectedProcedure
    .query(async ({ ctx }) => {
      const [row] = await ctx.db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, ctx.session.user.id))
        .orderBy(desc(projects.updatedAt))
        .limit(1);
      return row?.id ?? null;
    }),

  // Delete all empty projects (zero scenes) for current user
  pruneEmpty: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const rows = await ctx.db
          .select({ id: projects.id, c: sql<number>`count(${scenes.id})` })
          .from(projects)
          .leftJoin(scenes, eq(scenes.projectId, projects.id))
          .where(eq(projects.userId, ctx.session.user.id))
          .groupBy(projects.id);

        const emptyIds = rows.filter((r) => Number(r.c) === 0).map((r) => r.id);
        if (emptyIds.length === 0) return { deleted: 0 };

        const del = await ctx.db
          .delete(projects)
          .where(inArray(projects.id, emptyIds))
          .returning({ id: projects.id });

        return { deleted: del.length };
      } catch (error) {
        console.error('[project.pruneEmpty] Error:', error);
        return { deleted: 0 };
      }
    }),
    
  create: protectedProcedure
    .input(z.object({
      initialMessage: z.string().min(1).max(2000).optional(),
      format: z.enum(['landscape', 'portrait', 'square']).optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      try {
        // Generate title based on initialMessage if available
        console.log('[project.create] Mutation called. Input:', JSON.stringify(input));
        let title = "Untitled Video";
        
        // Helper function to check if a title exists for this user
        const titleExists = async (titleToCheck: string): Promise<boolean> => {
          const existingTitles = await executeWithRetry(() => ctx.db
            .select({ title: projects.title })
            .from(projects)
            .where(
              and(
                eq(projects.userId, ctx.session?.user?.id || 'system'),
                eq(projects.title, titleToCheck)
              )
            ));
          return existingTitles.length > 0;
        };

        // Helper function to ensure "Untitled Video" titles are unique with numbering
        const ensureUntitledVideoUnique = async (): Promise<string> => {
          const existingTitles = await executeWithRetry(() => ctx.db
            .select({ title: projects.title })
            .from(projects)
            .where(
              and(
                eq(projects.userId, ctx.session?.user?.id || 'system'),
                like(projects.title, 'Untitled Video%')
              )
            ));
          
          const existingTitleSet = new Set(existingTitles.map(p => p.title));
          
          if (!existingTitleSet.has("Untitled Video")) {
            return "Untitled Video";
          }
          
          // Find the highest number used in "Untitled Video X" format
          let highestNumber = 0;
          const titlePattern = /^Untitled Video (\d+)$/;
          
          for (const title of existingTitleSet) {
            const match = titlePattern.exec(title);
            if (match?.[1]) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > highestNumber) {
                highestNumber = num;
              }
            }
          }
          
          return `Untitled Video ${highestNumber + 1}`;
        };

        if (input?.initialMessage) {
          try {
            // Use AI to generate 5 title alternatives
            const result = await generateTitle({
              prompt: input.initialMessage,
              contextId: "project-create"
            });
            
            // Try each AI-generated title until we find one that doesn't exist
            for (const candidateTitle of result.titles) {
              if (!(await titleExists(candidateTitle))) {
                title = candidateTitle;
                break;
              }
            }
            
            // If all AI titles exist, fall back to numbered Untitled Video
            if (title === "Untitled Video") {
              title = await ensureUntitledVideoUnique();
            }
          } catch (titleError) {
            console.error("Error generating AI title:", titleError);
            // Fall back to numbered Untitled Video scheme on error
            title = await ensureUntitledVideoUnique();
          }
        } else {
          // No initial message provided, use numbered Untitled Video
          title = await ensureUntitledVideoUnique();
        }
        
        // Create a new project for the logged-in user with returning clause
        // Use executeWithRetry to handle potential database connection issues
        const inserted = await executeWithRetry(() => ctx.db
          .insert(projects)
          .values({
            userId: ctx.session?.user?.id || 'system',
            title,
            props: createDefaultProjectProps(input?.format || 'landscape'),
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
        const nextProps = jsonPatch.applyPatch(structuredClone(project.props), patchOperations, true, false).newDocument;
        
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
        
        // Return the first generated title
        return {
          title: result.titles?.[0] || generateNameFromPrompt(input.prompt),
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

  updateAudio: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      audio: z.object({
        url: z.string(),
        name: z.string(),
        duration: z.number(),
        startTime: z.number(),
        endTime: z.number(),
        timelineOffsetSec: z.number().optional(),
        volume: z.number(),
        fadeInDuration: z.number().optional(),
        fadeOutDuration: z.number().optional(),
        playbackRate: z.number().optional(),
      }).nullable(),
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

        // Update the audio field with timestamp
        const updated = await ctx.db
          .update(projects)
          .set({
            audio: input.audio,
            audioUpdatedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(projects.id, input.projectId))
          .returning();
          
        const result = updated[0];
        if (!result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update project audio",
          });
        }
        console.log(`[Project] Updated audio for project ${input.projectId}:`, input.audio);
        return { 
          success: true, 
          audio: result.audio,
          audioUpdatedAt: result.audioUpdatedAt?.getTime() || Date.now()
        };
      } catch (error) {
        console.error("Error updating project audio:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project audio",
        });
      }
    }),
  
  // Toggle favorite status for a project
  toggleFavorite: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if project exists and user has access
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

        if (project.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }

        // Toggle the favorite status
        const updated = await ctx.db
          .update(projects)
          .set({
            isFavorite: !project.isFavorite,
            updatedAt: new Date()
          })
          .where(eq(projects.id, input.projectId))
          .returning();

        const result = updated[0];
        if (!result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to toggle favorite status",
          });
        }
        console.log(`[Project] Toggled favorite for project ${input.projectId}: ${result.isFavorite}`);
        return { success: true, isFavorite: result.isFavorite };
      } catch (error) {
        console.error("Error toggling favorite:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to toggle favorite status",
        });
      }
    }),
  
  // List uploaded assets for a project
  getUploads: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      const ctx: AssetContextType = await assetContext.getProjectAssets(input.projectId);
      return ctx;
    }),

  // List uploaded assets for the current user across all projects
  getUserUploads: protectedProcedure
    .query(async ({ ctx }) => {
      const res = await assetContext.getUserAssets(ctx.session.user.id);
      return res;
    }),

  linkAssetToProject: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      assetId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
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
          message: "You don't have access to this project",
        });
      }

      const asset = await ctx.db.query.assets.findFirst({
        columns: { id: true, userId: true },
        where: eq(assets.id, input.assetId),
      });

      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      if (asset.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't own this asset",
        });
      }

      await assetContext.linkAssetToProject(input.projectId, input.assetId);

      return { success: true };
    }),

  // Rename an asset
  renameAsset: protectedProcedure
    .input(z.object({
      assetId: z.string(),
      newName: z.string().min(1).max(255)
    }))
    .mutation(async ({ ctx, input }) => {
      // Update the asset's custom name
      const [updated] = await ctx.db
        .update(assets)
        .set({ 
          customName: input.newName,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(assets.id, input.assetId),
            eq(assets.userId, ctx.session.user.id)
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found or you don't have permission to rename it"
        });
      }

      return { success: true, asset: updated };
    }),

  // Delete an asset (soft delete)
  softDeleteAsset: protectedProcedure
    .input(z.object({
      assetId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete the asset by setting deletedAt
      const [deleted] = await ctx.db
        .update(assets)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(assets.id, input.assetId),
            eq(assets.userId, ctx.session.user.id),
            isNull(assets.deletedAt)
          )
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found or you don't have permission to delete it"
        });
      }

      return { success: true, assetId: input.assetId };
    }),

  tokenizeScenes: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        sceneIds: z.array(z.string().uuid()).optional(),
        dryRun: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      if (project.userId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this project" });
      }

      const sceneFilter = input.sceneIds && input.sceneIds.length > 0
        ? (sceneId: string) => input.sceneIds!.includes(sceneId)
        : () => true;

      const projectScenes = await ctx.db
        .select({
          id: scenes.id,
          tsxCode: scenes.tsxCode,
          name: scenes.name,
          order: scenes.order,
          duration: scenes.duration,
        })
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(scenes.order);

      const scenesToProcess = projectScenes.filter((scene) => sceneFilter(scene.id));

      if (scenesToProcess.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No scenes found to tokenize" });
      }

      const results: Array<{
        sceneId: string;
        name: string;
        changed: boolean;
        summary?: string;
        error?: string;
      }> = [];

      for (const scene of scenesToProcess) {
        try {
          const llmResult = await tokenizeSceneWithLLM({
            sceneName: scene.name,
            code: scene.tsxCode,
            projectTitle: project.title,
            order: scene.order,
          });

          const newCode = llmResult.code.trim();
          const originalNormalized = scene.tsxCode.trim();
          const changed = newCode !== originalNormalized;
          const compiledNeedsReturnFix = !scene.jsCode || !/\breturn\s+[A-Za-z_$][\w$]*\s*;\s*$/.test(scene.jsCode.trim());
          const didUpdate = changed || compiledNeedsReturnFix;

          if (!input.dryRun && didUpdate) {
            const compilation = compileSceneToJS(newCode);
            if (!compilation.success || !compilation.jsCode) {
              throw new Error(compilation.error || 'Compilation failed');
            }

            await ctx.db
              .update(scenes)
              .set({
                tsxCode: newCode,
                jsCode: compilation.jsCode,
                jsCompiledAt: compilation.compiledAt ?? new Date(),
                compilationError: null,
                compilationVersion: 1,
                updatedAt: new Date(),
              })
              .where(eq(scenes.id, scene.id));
          }

          results.push({
            sceneId: scene.id,
            name: scene.name,
            changed: didUpdate,
            summary: llmResult.summary,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          results.push({
            sceneId: scene.id,
            name: scene.name,
            changed: false,
            error: message,
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to tokenize scene "${scene.name}": ${message}`,
          });
        }
      }

      return {
        projectId: input.projectId,
        total: scenesToProcess.length,
        updated: results.filter((r) => r.changed).length,
        dryRun: !!input.dryRun,
        results,
      };
    }),

  applyBrandToScenes: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        targetId: z.string().uuid(),
        sceneIds: z.array(z.string().uuid()).optional(),
        dryRun: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      if (project.userId !== ctx.session.user.id && !ctx.session.user.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this project" });
      }

      const target = await ctx.db.query.personalizationTargets.findFirst({
        where: and(
          eq(personalizationTargets.id, input.targetId),
          eq(personalizationTargets.projectId, input.projectId),
        ),
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Personalization target not found" });
      }

      if (!target.brandTheme) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Target does not have a prepared brand theme",
        });
      }

      const brandTheme = (target.brandTheme as BrandTheme | null) ?? DEFAULT_BRAND_THEME;
      const sanitizedBrandTheme: BrandTheme = {
        ...DEFAULT_BRAND_THEME,
        ...brandTheme,
        colors: {
          ...DEFAULT_BRAND_THEME.colors,
          ...(brandTheme.colors ?? {}),
        },
        fonts: {
          ...DEFAULT_BRAND_THEME.fonts,
          ...(brandTheme.fonts ?? {}),
        },
        assets: {
          ...DEFAULT_BRAND_THEME.assets,
          ...(brandTheme.assets ?? {}),
        },
        iconography: brandTheme.iconography ?? DEFAULT_BRAND_THEME.iconography,
        backgroundEffects: brandTheme.backgroundEffects ?? DEFAULT_BRAND_THEME.backgroundEffects,
        motion: brandTheme.motion ?? DEFAULT_BRAND_THEME.motion,
        copy: ensureBrandThemeCopy(brandTheme.copy ?? {}),
        variants: brandTheme.variants ?? {},
      };
      const variantMap: Record<string, BrandSceneVariant> = {
        ...(sanitizedBrandTheme.variants ?? {}),
      };

      const sceneFilter = input.sceneIds && input.sceneIds.length > 0
        ? (sceneId: string) => input.sceneIds!.includes(sceneId)
        : () => true;

      const projectScenes = await ctx.db
        .select({
          id: scenes.id,
          tsxCode: scenes.tsxCode,
          name: scenes.name,
          order: scenes.order,
          duration: scenes.duration,
        })
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(scenes.order);

      const scenesToProcess = projectScenes.filter((scene) => sceneFilter(scene.id));

      if (scenesToProcess.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No scenes found to edit" });
      }

      const results: Array<{
        sceneId: string;
        name: string;
        changed: boolean;
        summary?: string;
        error?: string;
      }> = [];

      const variantUpdates: Record<string, {
        tsxCode: string;
        jsCode?: string;
        summary?: string;
        updatedAt: string;
      }> = {};

      const sceneStatuses: Record<string, BrandSceneStatusEntry> = {
        ...(sanitizedBrandTheme.meta?.sceneStatuses ?? {}),
      };
      const preparedAt = new Date().toISOString();
      sanitizedBrandTheme.meta = {
        ...(sanitizedBrandTheme.meta ?? {}),
        sceneStatuses,
        lastPreparedAt: preparedAt,
      };

      const brandMetadata = {
        targetId: target.id,
        companyName: target.companyName,
        websiteUrl: target.websiteUrl,
        notes: target.notes,
      };

      const persistTheme = async () => {
        await ctx.db
          .update(personalizationTargets)
          .set({
            brandTheme: {
              ...sanitizedBrandTheme,
              variants: variantMap,
              meta: sanitizedBrandTheme.meta,
            },
            updatedAt: new Date(),
          })
          .where(eq(personalizationTargets.id, target.id));
      };

      for (const scene of scenesToProcess) {
        try {
          if (!input.dryRun) {
            sceneStatuses[scene.id] = {
              status: 'in_progress',
              updatedAt: new Date().toISOString(),
            };
            sanitizedBrandTheme.meta = {
              ...(sanitizedBrandTheme.meta ?? {}),
              sceneStatuses,
              lastPreparedAt: preparedAt,
            };
            await persistTheme();
          }

          const llmResult = await editSceneForBrandWithLLM({
            sceneName: scene.name,
            code: scene.tsxCode,
            projectTitle: project.title,
            order: scene.order,
            brandTheme: sanitizedBrandTheme,
            brandMetadata,
          });

          const newCode = llmResult.code.trim();
          const originalNormalized = scene.tsxCode.trim();
          const changed = newCode !== originalNormalized;

          if (changed) {
            const compilation = compileSceneToJS(newCode);
            if (!compilation.success || !compilation.jsCode) {
              throw new Error(compilation.error || 'Compilation failed');
            }

            const variantRecord: BrandSceneVariant = {
              tsxCode: newCode,
              jsCode: compilation.jsCode,
              summary: llmResult.summary,
              updatedAt: new Date().toISOString(),
            };

            variantUpdates[scene.id] = variantRecord;
            variantMap[scene.id] = variantRecord;
          }

          sceneStatuses[scene.id] = {
            status: 'completed',
            summary: llmResult.summary,
            updatedAt: new Date().toISOString(),
          };
          sanitizedBrandTheme.meta = {
            ...(sanitizedBrandTheme.meta ?? {}),
            sceneStatuses,
            lastPreparedAt: preparedAt,
          };

          if (!input.dryRun) {
            await persistTheme();
          }

          results.push({
            sceneId: scene.id,
            name: scene.name,
            changed,
            summary: llmResult.summary,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          sceneStatuses[scene.id] = {
            status: 'failed',
            message,
            updatedAt: new Date().toISOString(),
          };
          sanitizedBrandTheme.meta = {
            ...(sanitizedBrandTheme.meta ?? {}),
            sceneStatuses,
            lastPreparedAt: preparedAt,
          };

          if (!input.dryRun) {
            await persistTheme();
          }

          results.push({
            sceneId: scene.id,
            name: scene.name,
            changed: false,
            error: message,
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to edit scene "${scene.name}" for brand: ${message}`,
          });
        }
      }

      if (!input.dryRun) {
        sanitizedBrandTheme.meta = {
          ...(sanitizedBrandTheme.meta ?? {}),
          sceneStatuses,
          lastPreparedAt: preparedAt,
        };
        await persistTheme();
      }

      return {
        projectId: input.projectId,
        targetId: target.id,
        total: scenesToProcess.length,
        updated: results.filter((r) => r.changed).length,
        dryRun: !!input.dryRun,
        results,
        variants: variantMap,
        meta: sanitizedBrandTheme.meta,
      };
    }),
});
