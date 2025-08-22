import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, projects, messages } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
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
import { formatSceneOperationMessage } from "~/lib/utils/scene-message-formatter";

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
      audioUrls: z.array(z.string()).optional(),
      modelOverride: z.string().optional(), // Optional model ID for overriding default model
      useGitHub: z.boolean().optional(), // Explicit GitHub component search mode
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

      // 4.5 Check for GitHub connection
      let githubAccessToken: string | undefined;
      let githubConnected = false;
      
      try {
        const { githubConnections } = await import("~/server/db/schema/github-connections");
        const { eq, and } = await import("drizzle-orm");
        
        const connections = await ctx.db
          .select()
          .from(githubConnections)
          .where(and(
            eq(githubConnections.userId, userId),
            eq(githubConnections.isActive, true)
          ));
        
        if (connections[0]) {
          githubConnected = true;
          githubAccessToken = connections[0].accessToken;
          console.log(`[${response.getRequestId()}] User has GitHub connection`);
        }
      } catch (error) {
        console.error('Failed to check GitHub connection:', error);
      }
      
      // 4.6 Check for Figma component request and fetch data
      let figmaComponentData: any = null;
      const figmaMatch = userMessage.match(/Figma design "([^"]+)" \(ID: ([^)]+)\)/i);
      
      if (figmaMatch) {
        const [, componentName, fullId] = figmaMatch;
        console.log(`🎨 [${response.getRequestId()}] Detected Figma component request:`, { componentName, fullId });
        
        // Parse the fullId (format: fileKey:nodeId where nodeId can have colons)
        // Split only on the first colon to separate fileKey from nodeId
        if (fullId) {
          const colonIndex = fullId.indexOf(':');
          const fileKey = colonIndex > -1 ? fullId.substring(0, colonIndex) : null;
          const nodeId = colonIndex > -1 ? fullId.substring(colonIndex + 1) : fullId;
        
        if (fileKey && nodeId) {
          try {
            // Import Figma import router
            const { figmaImportRouter } = await import('~/server/api/routers/figma-import.router');
            
            // Create a caller for the router
            const caller = figmaImportRouter.createCaller({
              session: ctx.session,
              db: ctx.db,
              headers: ctx.headers,
            });
            
            // Fetch the component data
            const componentResult = await caller.fetchComponentData({
              fileKey,
              nodeId,
              componentName,
            });
            
            if (componentResult.success && componentResult.designData) {
              figmaComponentData = componentResult.designData;
              console.log(`🎨 [${response.getRequestId()}] Fetched Figma component data:`, {
                type: figmaComponentData.type,
                hasChildren: figmaComponentData.children?.length > 0,
                colors: figmaComponentData.colors?.length || 0,
                texts: figmaComponentData.texts?.length || 0,
                hasRemotionCode: !!componentResult.remotionCode,
              });
              
              // NEW: Include the converted Remotion code in the Figma data
              if (componentResult.remotionCode) {
                figmaComponentData.remotionCode = componentResult.remotionCode;
              }
              
              // Create enhanced prompt with Figma data context
              const enhancedMessage = `${userMessage}\n\n[FIGMA COMPONENT DATA]\nType: ${figmaComponentData.type}\nColors: ${JSON.stringify(figmaComponentData.colors)}\nTexts: ${JSON.stringify(figmaComponentData.texts)}\nLayout: ${JSON.stringify(figmaComponentData.layout)}\nBounds: ${JSON.stringify(figmaComponentData.bounds)}\nChildren: ${figmaComponentData.children?.length || 0} elements`;
            }
            } catch (error) {
              console.error(`🎨 [${response.getRequestId()}] Failed to fetch Figma component:`, error);
              // Continue without Figma data - will use generic generation
            }
          }
        }
      }

      // 5. Get decision from brain
      console.log(`[${response.getRequestId()}] Getting decision from brain...`);
      console.log(`[${response.getRequestId()}] User context:`, {
        hasImageUrls: !!userContext?.imageUrls?.length,
        hasVideoUrls: !!userContext?.videoUrls?.length,
        videoUrls: userContext?.videoUrls,
        githubConnected,
      });
      // Use enhanced message if we have Figma data, otherwise original message
      const finalPrompt = figmaComponentData ? 
        `${userMessage}\n\n[FIGMA COMPONENT DATA]\nType: ${figmaComponentData.type}\nColors: ${JSON.stringify(figmaComponentData.colors)}\nTexts: ${JSON.stringify(figmaComponentData.texts)}\nLayout: ${JSON.stringify(figmaComponentData.layout)}\nBounds: ${JSON.stringify(figmaComponentData.bounds)}\nChildren: ${figmaComponentData.children?.length || 0} elements` : 
        userMessage;
        
      const orchestratorResponse = await orchestrator.processUserInput({
        prompt: finalPrompt,
        projectId,
        userId,
        storyboardSoFar: storyboardForBrain,
        chatHistory,
        userContext: {
          imageUrls: userContext?.imageUrls,
          videoUrls: userContext?.videoUrls,
          audioUrls: userContext?.audioUrls,
          modelOverride: userContext?.modelOverride,
          useGitHub: userContext?.useGitHub, // Pass the explicit GitHub flag
          githubConnected,
          githubAccessToken,
          userId,
          figmaComponentData, // Pass the Figma component data
        },
      });

      // Handle clarification responses FIRST (before checking for result)
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

      // Now check for errors (after clarification check)
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

      // 8. Update assistant message with better description after execution
      if (assistantMessageId && toolResult.success && toolResult.scene) {
        // Generate a better message based on what actually happened
        const operationType = decision.toolName === 'editScene' ? 'edit' : 
                             decision.toolName === 'deleteScene' ? 'delete' :
                             decision.toolName === 'trimScene' ? 'trim' : 'create';
        
        // Get previous duration for trim operations
        let previousDuration: number | undefined;
        if (operationType === 'trim' && decision.toolContext?.targetSceneId) {
          const prevScene = storyboardForBrain.find(s => s.id === decision.toolContext?.targetSceneId);
          previousDuration = prevScene?.duration;
        }
        
        const betterMessage = formatSceneOperationMessage(
          operationType,
          toolResult.scene,
          {
            userPrompt: decision.toolContext?.userPrompt,
            scenesCreated: toolResult.scenes?.length,
            previousDuration,
            newDuration: operationType === 'trim' ? toolResult.scene.duration : undefined
          }
        );
        
        await db.update(messages)
          .set({
            content: betterMessage,
            status: 'success',
            updatedAt: new Date(),
          })
          .where(eq(messages.id, assistantMessageId));
      } else if (assistantMessageId && toolResult.success) {
        // Just update status if no scene (e.g., audio tool)
        await db.update(messages)
          .set({
            status: 'success',
            updatedAt: new Date(),
          })
          .where(eq(messages.id, assistantMessageId));
      }

      // 9. Return universal response
      // ✅ SPECIAL CASE: Scene planner doesn't create scenes, only scene plan messages
      // Also handle websiteToVideo which returns multiple scenes
      if (!toolResult.scene && !toolResult.scenes) {
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
      
      // Handle websiteToVideo which returns multiple scenes
      if (decision.toolName === 'websiteToVideo' && toolResult.scenes) {
        // Increment usage for successful generation
        await UsageService.incrementPromptUsage(userId);
        
        // Return the first scene as the primary response, but all scenes are already saved
        const primaryScene = toolResult.scenes[0];
        const successResponse = response.success(
          primaryScene,
          'scene.create',
          'scene'
        ) as any as SceneCreateResponse;
        
        // Add metadata about all scenes created
        successResponse.data.additionalScenes = toolResult.scenes.length - 1;
        successResponse.data.allSceneIds = toolResult.scenes.map((s: any) => s.id);
        
        return successResponse;
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

/**
 * UPDATE SCENE NAME
 * Updates the name of a specific scene
 */
export const updateSceneName = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    sceneId: z.string(),
    name: z.string().min(1).max(100),
  }))
  .mutation(async ({ input, ctx }) => {
    const { projectId, sceneId, name } = input;
    const userId = ctx.session.user.id;

    console.log(`[updateSceneName] Starting scene name update`, { projectId, sceneId, name });

    try {
      // 1. Verify project ownership and scene existence
      const scene = await db.query.scenes.findFirst({
        where: eq(scenes.id, sceneId),
        with: {
          project: true,
        },
      });

      if (!scene || scene.project.userId !== userId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: "Scene not found or access denied",
        });
      }

      // 2. Update the scene name
      const updatedScene = await db.update(scenes)
        .set({
          name: name.trim(),
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, sceneId))
        .returning();

      console.log(`[updateSceneName] Scene name updated successfully`);

      // 3. Return updated scene
      return {
        success: true,
        scene: updatedScene[0],
      };

    } catch (error) {
      console.error(`[updateSceneName] Scene name update error:`, error);
      throw error;
    }
  });