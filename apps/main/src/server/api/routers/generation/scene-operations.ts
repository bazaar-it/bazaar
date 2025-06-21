import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "@bazaar/database";
import { scenes, projects, messages } from "@bazaar/database";
import { eq, and, desc } from "drizzle-orm";
import { messageService } from "~/server/services/data/message.service";
import { orchestrator } from "~/brain/orchestratorNEW";
import type { BrainDecision } from "~/lib/types/ai/brain.types";
import { TOOL_OPERATION_MAP } from "~/lib/types/ai/brain.types";
import { executeToolFromDecision } from "./helpers";

// Import universal response types and helpers
import { ResponseBuilder, getErrorCode } from "~/lib/api/response-helpers";
import type { SceneCreateResponse, SceneDeleteResponse } from "~/lib/types/api/universal";
import { ErrorCode } from "~/lib/types/api/universal";

/**
 * UNIFIED SCENE GENERATION with Universal Response
 */
export const generateScene = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    userMessage: z.string(),
    userContext: z.object({
      imageUrls: z.array(z.string()).optional(),
    }).optional(),
    assistantMessageId: z.string().optional(), // For updating existing message
  }))
  .mutation(async ({ input, ctx }): Promise<SceneCreateResponse> => {
    const response = new ResponseBuilder();
    const { projectId, userMessage, userContext } = input;
    const userId = ctx.session.user.id;

    console.log(`[${response.getRequestId()}] Starting scene generation`, { projectId, userMessage });

    try {
      // 1. Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.userId, userId)
        ),
      });

      if (!project) {
        return response.error(
          ErrorCode.NOT_FOUND,
          "Project not found or access denied",
          'scene.create',
          'scene'
        ) as any as SceneCreateResponse;
      }

      // 2. Build storyboard context
      let storyboardForBrain: Array<{
        id: string;
        name: string;
        duration: number;
        order: number;
        tsxCode: string;
      }> = [];
      
      // Get existing scenes first
      const existingScenes = await db.query.scenes.findMany({
        where: eq(scenes.projectId, projectId),
        orderBy: [scenes.order],
      });
      
      if (project.isWelcome && existingScenes.length === 0) {
        // First real scene - clear welcome flag
        console.log(`[${response.getRequestId()}] First real scene - clearing welcome flag`);
        await db.update(projects)
          .set({ isWelcome: false })
          .where(eq(projects.id, projectId));
        
        storyboardForBrain = [];
      } else if (project.isWelcome && existingScenes.length > 0) {
        // Welcome project but has scenes already - just clear the flag
        console.log(`[${response.getRequestId()}] Welcome project with scenes - clearing flag only`);
        await db.update(projects)
          .set({ isWelcome: false })
          .where(eq(projects.id, projectId));
        
        storyboardForBrain = existingScenes.map(scene => ({
          id: scene.id,
          name: scene.name,
          duration: scene.duration,
          order: scene.order,
          tsxCode: scene.tsxCode,
        }));
      } else {
        // Normal project with scenes
        storyboardForBrain = existingScenes.map(scene => ({
          id: scene.id,
          name: scene.name,
          duration: scene.duration,
          order: scene.order,
          tsxCode: scene.tsxCode,
        }));
      }

      // 3. Get chat history
      const recentMessages = await db.query.messages.findMany({
        where: eq(messages.projectId, projectId),
        orderBy: [desc(messages.sequence)],
        limit: 10,
      });
      
      const chatHistory = recentMessages.reverse().map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 4. Store user message
      await messageService.createMessage({
        projectId,
        content: userMessage,
        role: "user",
        imageUrls: (userContext?.imageUrls as string[]) || [],
      });

      // 5. Get decision from brain
      console.log(`[${response.getRequestId()}] Getting decision from brain...`);
      const orchestratorResponse = await orchestrator.processUserInput({
        prompt: userMessage,
        projectId,
        userId,
        storyboardSoFar: storyboardForBrain,
        chatHistory,
        userContext: {
          imageUrls: userContext?.imageUrls,
        },
      });

      if (!orchestratorResponse.success || !orchestratorResponse.result) {
        return response.error(
          ErrorCode.AI_ERROR,
          orchestratorResponse.error || "Failed to get decision from brain",
          'scene.create',
          'scene'
        ) as any as SceneCreateResponse;
      }

      const decision: BrainDecision = {
        success: true,
        toolName: orchestratorResponse.result.toolName,
        toolContext: orchestratorResponse.result.toolContext,
        reasoning: orchestratorResponse.reasoning,
        chatResponse: orchestratorResponse.chatResponse,
      };

      // 6. Create assistant's response FIRST (before tool execution)
      // This ensures proper message ordering in the database
      let assistantMessageId: string | undefined;
      if (decision.chatResponse) {
        const newAssistantMessage = await messageService.createMessage({
          id: input.assistantMessageId, // Use the ID from SSE if provided
          projectId,
          content: decision.chatResponse,
          role: "assistant",
          status: "pending", // Start as pending, update to success after tool execution
        });
        assistantMessageId = newAssistantMessage?.id;
      }

      // 7. Execute the tool
      console.log(`[${response.getRequestId()}] Executing tool: ${decision.toolName}`);
      const toolResult = await executeToolFromDecision(
        decision,
        projectId,
        userId,
        storyboardForBrain,
        assistantMessageId // Pass the actual message ID for iteration tracking
      );
      
      console.log(`[${response.getRequestId()}] Tool execution result:`, {
        success: toolResult.success,
        hasScene: !!toolResult.scene,
        sceneId: toolResult.scene?.id,
        sceneName: toolResult.scene?.name,
      });

      // 8. Update assistant message status after execution
      if (assistantMessageId && toolResult.success) {
        await db.update(messages)
          .set({
            status: 'success',
            updatedAt: new Date(),
          })
          .where(eq(messages.id, assistantMessageId));
      }

      // 9. Return universal response
      if (!toolResult.scene) {
        return response.error(
          ErrorCode.INTERNAL_ERROR,
          "Tool execution succeeded but no scene was created",
          'scene.create',
          'scene'
        ) as any as SceneCreateResponse;
      }

      // Scene is already a proper SceneEntity from the database
      // Determine the correct operation based on the tool used
      const operation = decision.toolName ? TOOL_OPERATION_MAP[decision.toolName] : 'scene.create';
      
      const successResponse = response.success(
        toolResult.scene, 
        operation, 
        'scene', 
        [toolResult.scene.id]
      );
      
      // Add context to the response
      return {
        ...successResponse,
        context: {
          reasoning: decision.reasoning,
          chatResponse: decision.chatResponse,
        },
      } as SceneCreateResponse;

    } catch (error) {
      console.error(`[${response.getRequestId()}] Scene generation error:`, error);
      
      // If we have an assistant message that was pending, mark it as failed
      if (input.assistantMessageId) {
        try {
          await db.update(messages)
            .set({
              status: 'error',
              updatedAt: new Date(),
            })
            .where(eq(messages.id, input.assistantMessageId));
        } catch (updateError) {
          console.error(`[${response.getRequestId()}] Failed to update message status:`, updateError);
        }
      }
      
      const errorCode = getErrorCode(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return response.error(
        errorCode,
        errorMessage,
        'scene.create',
        'scene'
      ) as any as SceneCreateResponse;
    }
  });

/**
 * SCENE REMOVAL with Universal Response
 */
export const removeScene = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    sceneId: z.string(),
  }))
  .mutation(async ({ input, ctx }): Promise<SceneDeleteResponse> => {
    const response = new ResponseBuilder();
    const { projectId, sceneId } = input;
    const userId = ctx.session.user.id;

    console.log(`[${response.getRequestId()}] Starting scene removal`, { projectId, sceneId });

    try {
      // 1. Verify project ownership and scene existence
      const scene = await db.query.scenes.findFirst({
        where: eq(scenes.id, sceneId),
        with: {
          project: true,
        },
      });

      if (!scene || scene.project.userId !== userId) {
        return response.error(
          ErrorCode.NOT_FOUND,
          "Scene not found or access denied",
          'scene.delete',
          'scene'
        ) as any as SceneDeleteResponse;
      }

      // 2. Delete the scene
      await db.delete(scenes).where(eq(scenes.id, sceneId));

      console.log(`[${response.getRequestId()}] Scene deleted successfully`);

      // 3. Return success response
      return response.success(
        { deletedId: sceneId },
        'scene.delete',
        'scene',
        [sceneId]
      ) as SceneDeleteResponse;

    } catch (error) {
      console.error(`[${response.getRequestId()}] Scene removal error:`, error);
      
      const errorCode = getErrorCode(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return response.error(
        errorCode,
        errorMessage,
        'scene.delete',
        'scene'
      ) as any as SceneDeleteResponse;
    }
  });