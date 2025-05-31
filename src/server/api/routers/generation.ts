// src/server/api/routers/generation.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { brainOrchestrator } from "~/server/services/brain/orchestrator";
import { codeValidationService } from "~/server/services/codeValidation.service";
import { db } from "~/server/db";
import { scenes, projects, messages } from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

export const generationRouter = createTRPCRouter({
  /**
   * UNIFIED MCP-ONLY SCENE GENERATION
   * Handles both new scene creation and scene editing through Brain LLM + MCP tools
   */
  generateScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userMessage: z.string(),
      sceneId: z.string().optional(), // If provided, this is an edit operation
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, userMessage, sceneId } = input;
      const userId = ctx.session.user.id;

      console.log(`[Generation] MCP-only generation started:`, {
        projectId,
        userId,
        operation: sceneId ? 'EDIT_SCENE' : 'NEW_SCENE',
        sceneId,
        messageLength: userMessage.length
      });

      try {
        // Verify project ownership
        const project = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, projectId),
            eq(projects.userId, userId)
          ),
        });

        if (!project) {
          throw new Error("Project not found or access denied");
        }

        // 🚨 CRITICAL FIX: Handle welcome scene logic
        let storyboardForBrain: Array<{
          id: string;
          name: string;
          duration: number;
          order: number;
          tsxCode: string;
        }> = [];
        
        if (project.isWelcome) {
          // This is the first real user prompt - clear welcome flag and provide empty storyboard
          console.log(`[Generation] First real scene - clearing welcome flag for project ${projectId}`);
          
          await db.update(projects)
            .set({ isWelcome: false })
            .where(eq(projects.id, projectId));
            
          // Delete welcome scene if it exists
          await db.delete(scenes).where(eq(scenes.projectId, projectId));
          
          // Provide empty storyboard to Brain LLM so it uses AddScene
          storyboardForBrain = [];
        } else {
          // Normal operation - get existing scenes for context
          const existingScenes = await db.query.scenes.findMany({
            where: eq(scenes.projectId, projectId),
            orderBy: [scenes.order],
          });
          
          storyboardForBrain = existingScenes.map(scene => ({
            id: scene.id,
            name: scene.name,
            duration: scene.duration,
            order: scene.order,
            tsxCode: scene.tsxCode,
          }));
        }

        // Get existing chat messages for context (last 10 messages)
        const recentMessages = await db.query.messages.findMany({
          where: eq(messages.projectId, projectId),
          orderBy: [desc(messages.createdAt)],
          limit: 10,
        });
        
        const chatHistory = recentMessages.reverse().map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Store user message in chat
        await db.insert(messages).values({
          projectId,
          content: userMessage,
          role: "user",
          createdAt: new Date(),
        });

        // Process user message through brain orchestrator
        const result = await brainOrchestrator.processUserInput({
          prompt: userMessage,
          projectId,
          userId,
          userContext: { sceneId },
          storyboardSoFar: storyboardForBrain,
          chatHistory: recentMessages.map(msg => ({ role: msg.role, content: msg.content })),
          // onProgress: progressCallback, // TODO: Implement progress callback
        });

        if (!result.success) {
          // Store error message in chat
          await db.insert(messages).values({
            projectId,
            content: result.error || "Sorry, I encountered an issue processing your request.",
            role: "assistant",
            createdAt: new Date(),
          });
          
          throw new Error(result.error || "Scene generation failed");
        }

        // Store assistant's response in chat
        if (result.chatResponse) {
          await db.insert(messages).values({
            projectId,
            content: result.chatResponse,
            role: "assistant",
            createdAt: new Date(),
          });
        }

        return {
          success: true,
          operation: result.toolUsed || 'unknown',
          scene: result.result,
          chatResponse: result.chatResponse,
          // editComplexity: result.editComplexity, // TODO: Add to OrchestrationOutput interface
          debug: result.debug,
        };

      } catch (error) {
        console.error("[Generation] MCP generation failed:", error);

        // Store error message in chat
        const errorMessage = `Oops! I'm in beta and something went wrong. Let me fix this for you... 🔧\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
        
        await db.insert(messages).values({
          projectId,
          content: errorMessage,
          role: "assistant",
          createdAt: new Date(),
        });

        // TODO: Add LLM-based error fixing here
        // This is where we'd call an error-fixing LLM that looks at the error and tries to fix it

        throw new Error(`Scene generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  /**
   * SCENE REMOVAL
   * Remove a scene from the project
   */
  removeScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, sceneId } = input;
      const userId = ctx.session.user.id;

      console.log(`[Generation] Scene removal started:`, { projectId, sceneId, userId });

      try {
        // Verify project ownership
        const project = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, projectId),
            eq(projects.userId, userId)
          ),
        });

        if (!project) {
          throw new Error("Project not found or access denied");
        }

        // Verify scene exists and belongs to project
        const scene = await db.query.scenes.findFirst({
          where: and(
            eq(scenes.id, sceneId),
            eq(scenes.projectId, projectId)
          ),
        });

        if (!scene) {
          throw new Error("Scene not found");
        }

        // Delete the scene
        await db.delete(scenes).where(
          and(
            eq(scenes.id, sceneId),
            eq(scenes.projectId, projectId)
          )
        );

        console.log(`[Generation] Scene removed successfully:`, { sceneId, sceneName: scene.name });

        return {
          success: true,
          removedSceneId: sceneId,
          removedSceneName: scene.name,
        };

      } catch (error) {
        console.error("[Generation] Scene removal failed:", error);
        throw new Error(`Scene removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  /**
   * GET CHAT MESSAGES
   * Retrieve chat history for a project
   */
  getChatMessages: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id;

      // Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.userId, userId)
        ),
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // Get chat messages
      const chatMessages = await db.query.messages.findMany({
        where: eq(messages.projectId, projectId),
        orderBy: [desc(messages.createdAt)],
        limit: 100,
      });

      return chatMessages.reverse(); // Return in chronological order
    }),

  /**
   * GET PROJECT SCENES
   * Retrieve all scenes for a project
   */
  getProjectScenes: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id;

      // Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.userId, userId)
        ),
      });

      if (!project) {
        throw new Error("Project not found or access denied");
      }

      // Get all scenes for the project
      const projectScenes = await db.query.scenes.findMany({
        where: eq(scenes.projectId, projectId),
        orderBy: [scenes.order],
      });

      return projectScenes;
    }),

  /**
   * SCENE ROLLBACK
   * Rollback to a previous version of a scene
   */
  sceneRollback: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
      versionNumber: z.number().optional(), // Optional: rollback to specific version, defaults to previous
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(`[sceneRollback] Rolling back scene ${input.sceneId} in project ${input.projectId}`);
        
        // Get scene versions from database (you'll need to add a scene_versions table)
        // For now, we'll implement a simple "undo last change" mechanism
        
        // Get the scene
        const currentScene = await db.query.scenes.findFirst({
          where: eq(scenes.id, input.sceneId)
        });
        
        if (!currentScene) {
          throw new Error("Scene not found");
        }
        
        // For MVP: Simple approach - regenerate scene with "fix the errors" instruction
        console.log(`[sceneRollback] Attempting to fix broken scene: ${currentScene.name}`);
        
        // Get the layout JSON to regenerate a safe version
        let layoutJson = currentScene.layoutJson as any;
        if (!layoutJson) {
          // If no layout JSON, create a simple fallback layout
          layoutJson = {
            sceneType: "simple",
            background: "#1e1b4b",
            elements: [
              {
                type: "title",
                id: "title1",
                text: currentScene.name || "Fixed Scene",
                fontSize: 48,
                fontWeight: "700",
                color: "#ffffff",
              }
            ],
            layout: {
              align: "center",
              direction: "column",
              gap: 16,
            },
            animations: {
              title1: {
                type: "fadeIn",
                duration: 60,
                delay: 0,
              }
            }
          };
        }
        
        // Use the code generator to create a safe version
        const { codeGeneratorService } = await import("~/lib/services/codeGenerator.service");
        
        const safeCode = await codeGeneratorService.generateCode({
          layoutJson,
          userPrompt: `Fix and simplify this scene: ${currentScene.name}. Make it safe and working.`,
          functionName: `Scene_${currentScene.id.replace(/-/g, '_').substring(0, 16)}`,
        });
        
        // Update the scene with the safe code
        const [updatedScene] = await db.update(scenes)
          .set({
            tsxCode: safeCode.code,
            updatedAt: new Date(),
          })
          .where(eq(scenes.id, input.sceneId))
          .returning();
        
        console.log(`[sceneRollback] Scene successfully fixed: ${updatedScene?.name}`);
        
        return {
          success: true,
          scene: {
            id: updatedScene?.id,
            name: updatedScene?.name,
            tsxCode: updatedScene?.tsxCode,
            duration: updatedScene?.duration,
          },
          message: "Scene has been fixed and should now work properly",
        };
        
      } catch (error) {
        console.error("[sceneRollback] Error:", error);
        throw new Error(`Failed to rollback scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  /**
   * DIRECT TEMPLATE ADDITION
   * Add template directly to database without LLM processing
   */
  addTemplate: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      templateId: z.string(),
      templateName: z.string(),
      templateCode: z.string(),
      templateDuration: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, templateId, templateName, templateCode, templateDuration } = input;
      const userId = ctx.session.user.id;

      console.log(`[Generation] Direct template addition:`, {
        projectId,
        templateId,
        templateName,
        templateDuration,
        userId
      });

      try {
        // Verify project ownership
        const project = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, projectId),
            eq(projects.userId, userId)
          ),
        });

        if (!project) {
          throw new Error("Project not found or access denied");
        }

        // Get next order for the scene
        const maxOrderResult = await db
          .select({ maxOrder: sql<number>`COALESCE(MAX("order"), -1)` })
          .from(scenes)
          .where(eq(scenes.projectId, projectId));

        const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
        
        // Create scene name with template info
        const sceneName = `${templateName} (Template)`;

        // Insert template scene directly into database
        const [newScene] = await db.insert(scenes)
          .values({
            projectId,
            name: sceneName,
            order: nextOrder,
            tsxCode: templateCode,
            duration: templateDuration,
            layoutJson: JSON.stringify({
              sceneType: "template",
              templateId: templateId,
              templateName: templateName
            }),
            props: {},
          })
          .returning();

        if (!newScene) {
          throw new Error("Failed to create template scene");
        }

        console.log(`[Generation] Template scene created successfully:`, {
          sceneId: newScene.id,
          name: newScene.name,
          order: newScene.order,
          duration: newScene.duration
        });

        return {
          success: true,
          message: `${templateName} added to your video!`,
          scene: {
            id: newScene.id,
            name: newScene.name,
            order: newScene.order,
            duration: newScene.duration,
            tsxCode: newScene.tsxCode
          }
        };

      } catch (error) {
        console.error(`[Generation] Template addition failed:`, error);
        throw new Error(`Failed to add template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
}); 