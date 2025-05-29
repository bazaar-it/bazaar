// src/server/api/routers/generation.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { brainOrchestrator } from "~/server/services/brain/orchestrator";
import { db } from "~/server/db";
import { scenes, projects, messages } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

        // Use Brain Orchestrator with MCP tools to process the request
        const result = await brainOrchestrator.processUserInput({
          prompt: userMessage,
          projectId,
          userId,
          userContext: sceneId ? { sceneId } : {},
          storyboardSoFar: storyboardForBrain,
          chatHistory, // Add chat history for edit context
        });

        console.log(`[Generation] Brain orchestrator result:`, {
          success: result.success,
          toolUsed: result.toolUsed,
          hasResponse: !!result.chatResponse
        });

        // Store assistant response in chat if available
        if (result.chatResponse) {
          await db.insert(messages).values({
            projectId,
            content: result.chatResponse,
            role: "assistant",
            createdAt: new Date(),
          });
        }

        // Return the result for the frontend
        return {
          success: result.success,
          operation: result.toolUsed || 'unknown',
          scene: result.result?.scene || null,
          chatResponse: result.chatResponse,
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
}); 