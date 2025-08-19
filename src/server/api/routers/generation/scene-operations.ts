import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, projects, messages } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { messageService } from "~/server/services/data/message.service";
import { orchestrator } from "~/brain/orchestratorNEW";
import type { BrainDecision } from "~/lib/types/ai/brain.types";
import { TOOL_OPERATION_MAP } from "~/lib/types/ai/brain.types";
import { executeToolFromDecision } from "./helpers";
import { UsageService } from "~/server/services/usage/usage.service";
import { createSceneFromPlanRouter } from "./create-scene-from-plan";
import { TRPCError } from "@trpc/server";

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
      videoUrls: z.array(z.string()).optional(),
      modelOverride: z.string().optional(), // Optional model ID for overriding default model
    }).optional(),
    assistantMessageId: z.string().optional(), // For updating existing message
    metadata: z.object({
      timezone: z.string().optional(),
    }).optional(),
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

      // 1.5. Check prompt usage limits
      // Get user timezone from input or default to UTC
      const userTimezone = input.metadata?.timezone || 'UTC';
      const usageCheck = await UsageService.checkPromptUsage(userId, userTimezone);
      if (!usageCheck.allowed) {
        // Throw TRPCError for proper error handling in the client
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: usageCheck.message || "Daily prompt limit reached",
          cause: {
            code: 'RATE_LIMITED',
            used: usageCheck.used,
            limit: usageCheck.limit
          }
        });
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

      // 4. User message is already created in SSE route, skip creating it here
      // This prevents duplicate messages and ensures correct sequence order

      // 5. Get decision from brain
      console.log(`[${response.getRequestId()}] Getting decision from brain...`);
      console.log(`[${response.getRequestId()}] User context:`, {
        hasImageUrls: !!userContext?.imageUrls?.length,
        hasVideoUrls: !!userContext?.videoUrls?.length,
        videoUrls: userContext?.videoUrls,
      });
      const orchestratorResponse = await orchestrator.processUserInput({
        prompt: userMessage,
        projectId,
        userId,
        storyboardSoFar: storyboardForBrain,
        chatHistory,
        userContext: {
          imageUrls: userContext?.imageUrls,
          videoUrls: userContext?.videoUrls,
          modelOverride: userContext?.modelOverride,
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

      // Handle clarification responses
      if (orchestratorResponse.needsClarification) {
        console.log(`[${response.getRequestId()}] Brain needs clarification:`, orchestratorResponse.chatResponse);
        
        // Update or create assistant's clarification message
        let assistantMessageId: string | undefined;
        
        if (input.assistantMessageId) {
          // Update existing message from SSE
          assistantMessageId = input.assistantMessageId;
          await db.update(messages)
            .set({
              content: orchestratorResponse.chatResponse || "Could you provide more details?",
              status: 'success', // Clarification is a successful response
              updatedAt: new Date(),
            })
            .where(eq(messages.id, input.assistantMessageId));
        } else {
          // Create new message if no SSE message exists (fallback)
          const newAssistantMessage = await messageService.createMessage({
            projectId,
            content: orchestratorResponse.chatResponse || "Could you provide more details?",
            role: "assistant",
            status: "success",
          });
          assistantMessageId = newAssistantMessage?.id;
        }
        
        // Return a clarification response without scene data
        return {
          ...response.success(null, 'clarification', 'message', []),
          context: {
            reasoning: orchestratorResponse.reasoning,
            chatResponse: orchestratorResponse.chatResponse,
            needsClarification: true,
          },
          assistantMessageId,
        } as any;
      }

      const decision: BrainDecision = {
        success: true,
        toolName: orchestratorResponse.result.toolName,
        toolContext: orchestratorResponse.result.toolContext,
        reasoning: orchestratorResponse.reasoning,
        chatResponse: orchestratorResponse.chatResponse,
      };

      // 6. ✅ IMMEDIATE DELIVERY: Update or create assistant's response and deliver to chat immediately
      let assistantMessageId: string | undefined;
      
      if (input.assistantMessageId) {
        // Update existing message from SSE
        assistantMessageId = input.assistantMessageId;
        await db.update(messages)
          .set({
            content: decision.chatResponse || "Processing your request...",
            status: 'success', // Mark as success immediately for user feedback delivery
            updatedAt: new Date(),
          })
          .where(eq(messages.id, input.assistantMessageId));
        console.log(`[${response.getRequestId()}] ✅ IMMEDIATE: Updated assistant message delivered to chat: ${assistantMessageId}`);
      } else if (decision.chatResponse) {
        // Create new message if no SSE message exists (fallback)
        const newAssistantMessage = await messageService.createMessage({
          projectId,
          content: decision.chatResponse,
          role: "assistant",
          status: "success", // Mark as success immediately for user feedback delivery
        });
        assistantMessageId = newAssistantMessage?.id;
        console.log(`[${response.getRequestId()}] ✅ IMMEDIATE: Created new assistant message delivered to chat: ${assistantMessageId}`);
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
        additionalMessageIds: toolResult.additionalMessageIds?.length || 0,
      });

      // ✅ LOG ADDITIONAL SCENE PLAN MESSAGE IDs for debugging
      if (toolResult.additionalMessageIds?.length) {
        console.log(`[${response.getRequestId()}] ✅ SCENE PLANNER: Created ${toolResult.additionalMessageIds.length} scene plan messages:`, toolResult.additionalMessageIds);
      }

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
      // ✅ SPECIAL CASE: Scene planner doesn't create scenes, only scene plan messages
      if (!toolResult.scene) {
        /* [SCENEPLANNER DISABLED] - All scenePlanner logic commented out
        if (decision.toolName === 'scenePlanner') {
          // Scene planner succeeded - increment usage
          await UsageService.incrementPromptUsage(userId);
          // ... (rest of scenePlanner logic)
          return successResponse;
        } else {
        */
          // Other tools should always return a scene
          return response.error(
            ErrorCode.INTERNAL_ERROR,
            "Tool execution succeeded but no scene was created",
            'scene.create',
            'scene'
          ) as any as SceneCreateResponse;
        // }
      }

      // Scene is already a proper SceneEntity from the database
      // Determine the correct operation based on the tool used
      // Map all operations to valid API response operations
      let operation: 'scene.create' | 'scene.update' | 'scene.delete' = 'scene.create';
      if (decision.toolName) {
        const toolOp = TOOL_OPERATION_MAP[decision.toolName];
        switch (toolOp) {
          case 'scene.create':
          // case 'multi-scene.create': // [DISABLED] Map multi-scene to regular scene.create
            operation = 'scene.create';
            break;
          case 'scene.update':
            operation = 'scene.update';
            break;
          case 'scene.delete':
            operation = 'scene.delete';
            break;
          default:
            operation = 'scene.create';
        }
      }
      
      // Increment usage on successful generation
      await UsageService.incrementPromptUsage(userId, userTimezone);
      
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
        assistantMessageId, // Include the assistant message ID
        // ✅ INCLUDE ADDITIONAL MESSAGE IDs FOR CLIENT SYNC
        additionalMessageIds: toolResult.additionalMessageIds || [],
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
 * SCENE DUPLICATION with Universal Response
 */
export const duplicateScene = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    sceneId: z.string(),
  }))
  .mutation(async ({ input, ctx }): Promise<SceneCreateResponse> => {
    const response = new ResponseBuilder();
    const { projectId, sceneId } = input;
    const userId = ctx.session.user.id;

    console.log(`[${response.getRequestId()}] Starting scene duplication`, { projectId, sceneId });

    try {
      // 1. Verify project ownership and get the scene to duplicate
      const originalScene = await db.query.scenes.findFirst({
        where: eq(scenes.id, sceneId),
        with: {
          project: true,
        },
      });

      if (!originalScene || originalScene.project.userId !== userId) {
        return response.error(
          ErrorCode.NOT_FOUND,
          "Scene not found or access denied",
          'scene.create',
          'scene'
        ) as any as SceneCreateResponse;
      }

      // 2. Get the highest order number to place the duplicate after the original
      const maxOrder = await db.query.scenes.findFirst({
        where: eq(scenes.projectId, projectId),
        orderBy: [desc(scenes.order)],
        columns: { order: true },
      });

      const nextOrder = (maxOrder?.order || 0) + 1;

      // 3. Create the duplicate scene
      const [duplicatedScene] = await db.insert(scenes).values({
        id: randomUUID(),
        projectId,
        name: `${originalScene.name} (Copy)`,
        description: originalScene.description,
        duration: originalScene.duration,
        order: nextOrder,
        tsxCode: originalScene.tsxCode,
        props: originalScene.props,
        status: originalScene.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      if (!duplicatedScene) {
        return response.error(
          ErrorCode.INTERNAL_ERROR,
          "Failed to create duplicate scene",
          'scene.create',
          'scene'
        ) as any as SceneCreateResponse;
      }

      console.log(`[${response.getRequestId()}] Scene duplicated successfully`, {
        originalId: sceneId,
        duplicateId: duplicatedScene.id,
        duplicateName: duplicatedScene.name,
      });

      // 4. Return success response
      return response.success(
        duplicatedScene,
        'scene.create',
        'scene',
        [duplicatedScene.id]
      ) as SceneCreateResponse;

    } catch (error) {
      console.error(`[${response.getRequestId()}] Scene duplication error:`, error);
      
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