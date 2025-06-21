/**
 * Generation Router with Universal Response Format
 * TICKET-002 Implementation
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { orchestrator } from "~/brain/orchestratorNEW";
import { addTool } from "~/tools/add/add";
import { editTool } from "~/tools/edit/edit";
import { deleteTool } from "~/tools/delete/delete";
import { trimTool } from "~/tools/trim/trim";
import { db } from "@bazaar/database";
import { scenes, projects, messages, sceneIterations } from "@bazaar/database";
import { eq, and, desc, inArray } from "drizzle-orm";
import { messageService } from "~/server/services/data/message.service";
import type { BrainDecision } from "~/lib/types/ai/brain.types";
import { TOOL_OPERATION_MAP } from "~/lib/types/ai/brain.types";
import type { AddToolInput, EditToolInput, DeleteToolInput, TrimToolInput } from "~/tools/helpers/types";

// Import universal response types and helpers
import { ResponseBuilder, getErrorCode } from "~/lib/api/response-helpers";
import type { SceneCreateResponse, SceneDeleteResponse } from "~/lib/types/api/universal";
import { ErrorCode } from "~/lib/types/api/universal";
import type { SceneEntity } from "~/generated/entities";

// Helper function for tool execution and database save
async function executeToolFromDecision(
  decision: BrainDecision,
  projectId: string,
  userId: string,
  storyboard: any[],
  messageId?: string
): Promise<{ success: boolean; scene?: SceneEntity }> {
  const startTime = Date.now(); // Track generation time
  
  if (!decision.toolName || !decision.toolContext) {
    throw new Error("Invalid decision - missing tool name or context");
  }

  let toolInput: AddToolInput | EditToolInput | DeleteToolInput | TrimToolInput;

  // Prepare tool input based on tool type
  switch (decision.toolName) {
    case 'addScene':
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        sceneNumber: storyboard.length + 1,
        storyboardSoFar: storyboard,
        imageUrls: decision.toolContext.imageUrls,
        visionAnalysis: decision.toolContext.visionAnalysis,
      } as AddToolInput;
      
      const addResult = await addTool.run(toolInput);
      console.log('📥 [ROUTER] Received from ADD tool:', {
        success: addResult.success,
        hasData: !!addResult.data,
        dataKeys: addResult.data ? Object.keys(addResult.data) : [],
        name: addResult.data?.name,
        codeLength: addResult.data?.tsxCode?.length,
      });
      
      if (!addResult.success || !addResult.data) {
        throw new Error(addResult.error?.message || 'Add operation failed');
      }
      
      // Trust the duration from the ADD tool - it already analyzes the code
      let addFinalDuration = addResult.data.duration || 150;
      
      // Save to database
      console.log('💾 [ROUTER] Saving to database:', {
        projectId,
        name: addResult.data.name,
        order: storyboard.length,
        duration: addFinalDuration,
      });
      
      const [newScene] = await db.insert(scenes).values({
        projectId,
        name: addResult.data.name,
        tsxCode: addResult.data.tsxCode,
        duration: addFinalDuration || 150,
        order: storyboard.length,
        props: addResult.data.props || {},
        layoutJson: addResult.data.layoutJson || null,
      }).returning();
      
      if (!newScene) {
        throw new Error('Failed to save scene to database');
      }
      
      console.log('✅ [ROUTER] Scene saved to database:', {
        id: newScene.id,
        name: newScene.name,
        duration: newScene.duration,
        order: newScene.order,
      });
      
      // Track this iteration if we have a messageId
      if (messageId) {
        const endTime = Date.now();
        const generationTimeMs = endTime - startTime;
        
        // Create scene iteration record
        await db.insert(sceneIterations).values({
          sceneId: newScene.id,
          projectId,
          operationType: 'create',
          userPrompt: decision.toolContext.userPrompt,
          brainReasoning: decision.reasoning,
          codeAfter: newScene.tsxCode,
          generationTimeMs,
          modelUsed: null, // Set to null for now
          temperature: null,
          userEditedAgain: false,
          messageId,
        });
        
        console.log('📊 [ROUTER] Created scene iteration record:', {
          sceneId: newScene.id,
          operationType: 'create',
          generationTimeMs,
        });
      }
      
      return {
        success: true,
        scene: newScene as any  // Cast to any to avoid props type issue
      };

    case 'editScene':
      if (!decision.toolContext.targetSceneId) {
        throw new Error("No target scene ID for edit operation");
      }
      
      const sceneToEdit = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId),
      });
      
      if (!sceneToEdit) {
        throw new Error("Scene not found for editing");
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        sceneId: decision.toolContext.targetSceneId,
        tsxCode: sceneToEdit.tsxCode, // ✓ Fixed: Using correct field name
        currentDuration: sceneToEdit.duration,
        imageUrls: decision.toolContext.imageUrls,
        visionAnalysis: decision.toolContext.visionAnalysis,
        errorDetails: decision.toolContext.errorDetails,
      } as EditToolInput;
      
      const editResult = await editTool.run(toolInput as EditToolInput);
      console.log('📥 [ROUTER] Received from EDIT tool:', {
        success: editResult.success,
        hasData: !!editResult.data,
        dataKeys: editResult.data ? Object.keys(editResult.data) : [],
        error: editResult.error,
      });
      
      if (!editResult.success || !editResult.data || !editResult.data.tsxCode) {
        const errorMessage = typeof editResult.error === 'string' 
          ? editResult.error 
          : editResult.error?.message || 'Edit operation failed - no code returned';
        throw new Error(errorMessage);
      }
      
      // Use duration from edit result if provided, otherwise keep existing
      let editFinalDuration = editResult.data.duration;
      
      // Update database
      console.log('💾 [ROUTER] Updating scene in database:', {
        sceneId: decision.toolContext.targetSceneId,
        codeChanged: editResult.data.tsxCode !== sceneToEdit.tsxCode,
        durationChanged: editFinalDuration && editFinalDuration !== sceneToEdit.duration,
      });
      
      const [updatedScene] = await db.update(scenes)
        .set({
          tsxCode: editResult.data.tsxCode,
          duration: editFinalDuration || sceneToEdit.duration,
          props: editResult.data.props || sceneToEdit.props,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, decision.toolContext.targetSceneId))
        .returning();
      
      if (!updatedScene) {
        throw new Error('Failed to update scene in database');
      }
      
      // Track this iteration if we have a messageId
      if (messageId) {
        const endTime = Date.now();
        const generationTimeMs = endTime - startTime;
        
        // Create scene iteration record
        await db.insert(sceneIterations).values({
          sceneId: decision.toolContext.targetSceneId,
          projectId,
          operationType: 'edit',
          userPrompt: decision.toolContext.userPrompt,
          brainReasoning: decision.reasoning,
          codeBefore: sceneToEdit.tsxCode,
          codeAfter: editResult.data.tsxCode,
          generationTimeMs,
          modelUsed: null, // Set to null for now
          temperature: null,
          userEditedAgain: false,
          messageId,
        });
        
        console.log('📊 [ROUTER] Created scene iteration record:', {
          sceneId: decision.toolContext.targetSceneId,
          operationType: 'edit',
          generationTimeMs,
        });
      }
      
      return {
        success: true,
        scene: updatedScene as any  // Cast to any to avoid props type issue
      };

    case 'trimScene':
      if (!decision.toolContext.targetSceneId) {
        throw new Error("No target scene ID for trim operation");
      }
      
      const sceneToTrim = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId),
      });
      
      if (!sceneToTrim) {
        throw new Error("Scene not found for trimming");
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        sceneId: decision.toolContext.targetSceneId,
        currentDuration: sceneToTrim.duration,
        newDuration: decision.toolContext.targetDuration, // Use brain-calculated duration
      } as TrimToolInput;
      
      const trimResult = await trimTool.run(toolInput as TrimToolInput);
      console.log('📥 [ROUTER] Received from TRIM tool:', {
        success: trimResult.success,
        hasData: !!trimResult.data,
        newDuration: trimResult.data?.duration,
        trimmedFrames: trimResult.data?.trimmedFrames,
      });
      
      if (!trimResult.success || !trimResult.data || !trimResult.data.duration) {
        throw new Error(trimResult.error?.message || 'Trim operation failed');
      }
      
      // Update only the duration in database
      console.log('💾 [ROUTER] Updating scene duration in database:', {
        sceneId: decision.toolContext.targetSceneId,
        oldDuration: sceneToTrim.duration,
        newDuration: trimResult.data.duration,
      });
      
      const [trimmedScene] = await db.update(scenes)
        .set({
          duration: trimResult.data.duration,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, decision.toolContext.targetSceneId))
        .returning();
      
      if (!trimmedScene) {
        throw new Error('Failed to update scene duration in database');
      }
      
      return {
        success: true,
        scene: trimmedScene as any
      };

    case 'deleteScene':
      if (!decision.toolContext.targetSceneId) {
        throw new Error("No target scene ID for delete operation");
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        sceneId: decision.toolContext.targetSceneId,
      } as DeleteToolInput;
      
      // For delete, get the scene first for the response
      const sceneToDelete = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId),
      });
      
      if (!sceneToDelete) {
        throw new Error("Scene not found for deletion");
      }
      
      const deleteResult = await deleteTool.run(toolInput as DeleteToolInput);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || 'Delete operation failed');
      }
      
      // Delete from database
      await db.delete(scenes).where(eq(scenes.id, decision.toolContext.targetSceneId));
      
      // Track this iteration if we have a messageId
      if (messageId) {
        const endTime = Date.now();
        const generationTimeMs = endTime - startTime;
        
        // Create scene iteration record
        await db.insert(sceneIterations).values({
          sceneId: decision.toolContext.targetSceneId,
          projectId,
          operationType: 'delete',
          userPrompt: decision.toolContext.userPrompt,
          brainReasoning: decision.reasoning,
          codeBefore: sceneToDelete.tsxCode,
          generationTimeMs,
          modelUsed: null, // Set to null for now
          temperature: null,
          userEditedAgain: false,
          messageId,
        });
        
        console.log('📊 [ROUTER] Created scene iteration record:', {
          sceneId: decision.toolContext.targetSceneId,
          operationType: 'delete',
          generationTimeMs,
        });
      }
      
      return {
        success: true,
        scene: sceneToDelete as any // Cast to any to avoid props type issue
      };

    default:
      throw new Error(`Unknown tool: ${decision.toolName}`);
  }
}

export const generationUniversalRouter = createTRPCRouter({
  /**
   * UNIFIED SCENE GENERATION with Universal Response
   */
  generateScene: protectedProcedure
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
            suggestions: ['Edit the scene', 'Add another scene', 'Preview your video']
          }
        };

      } catch (error) {
        console.error(`[${response.getRequestId()}] Generation error:`, error);
        
        const errorCode = getErrorCode(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Store error message in chat
        await messageService.createMessage({
          projectId,
          content: `I encountered an error: ${errorMessage}`,
          role: "assistant",
        }).catch(e => console.error('Failed to save error message:', e));

        return response.error(
          errorCode,
          errorMessage,
          'scene.create',
          'scene',
          error
        ) as unknown as SceneCreateResponse;
      }
    }),

  /**
   * SCENE REMOVAL with Universal Response
   */
  removeScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
    }))
    .mutation(async ({ input, ctx }): Promise<SceneDeleteResponse> => {
      const response = new ResponseBuilder();
      const { projectId, sceneId } = input;
      const userId = ctx.session.user.id;

      console.log(`[${response.getRequestId()}] Removing scene`, { projectId, sceneId });

      try {
        // Verify project ownership
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
            'scene.delete',
            'scene'
          ) as any as SceneDeleteResponse;
        }

        // Verify scene exists and belongs to project
        const scene = await db.query.scenes.findFirst({
          where: and(
            eq(scenes.id, sceneId),
            eq(scenes.projectId, projectId)
          ),
        });

        if (!scene) {
          return response.error(
            ErrorCode.NOT_FOUND,
            "Scene not found",
            'scene.delete',
            'scene'
          ) as any as SceneDeleteResponse;
        }

        // Delete the scene
        await db.delete(scenes).where(
          and(
            eq(scenes.id, sceneId),
            eq(scenes.projectId, projectId)
          )
        );

        return response.success(
          { deletedId: sceneId },
          'scene.delete',
          'scene',
          [sceneId]
        );

      } catch (error) {
        console.error(`[${response.getRequestId()}] Delete error:`, error);
        
        const errorCode = getErrorCode(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete scene';
        
        return response.error(
          errorCode,
          errorMessage,
          'scene.delete',
          'scene',
          error
        ) as any as SceneDeleteResponse;
      }
    }),

  /**
   * GET PROJECT SCENES
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

      // Get scenes
      const projectScenes = await db.query.scenes.findMany({
        where: eq(scenes.projectId, projectId),
        orderBy: [scenes.order],
      });

      return projectScenes;
    }),

  /**
   * GET ITERATIONS BY MESSAGE - Query all scene iterations linked to a message
   */
  getMessageIterations: protectedProcedure
    .input(z.object({
      messageId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { messageId } = input;
      
      // Get all iterations linked to this message
      const iterations = await db.query.sceneIterations.findMany({
        where: eq(sceneIterations.messageId, messageId),
        orderBy: [sceneIterations.createdAt],
      });
      
      // For each iteration, get the current scene info
      const iterationsWithScenes = await Promise.all(
        iterations.map(async (iteration) => {
          const scene = await db.query.scenes.findFirst({
            where: eq(scenes.id, iteration.sceneId),
          });
          
          return {
            ...iteration,
            currentSceneName: scene?.name || 'Deleted Scene',
            sceneExists: !!scene,
          };
        })
      );
      
      return iterationsWithScenes;
    }),

  /**
   * GET BATCH MESSAGE ITERATIONS - Efficiently check multiple messages for iterations
   */
  getBatchMessageIterations: protectedProcedure
    .input(z.object({
      messageIds: z.array(z.string()),
    }))
    .query(async ({ input, ctx }) => {
      const { messageIds } = input;
      
      if (messageIds.length === 0) {
        return {};
      }
      
      // Get all iterations for these messages in one query
      const iterations = await db.query.sceneIterations.findMany({
        where: inArray(sceneIterations.messageId, messageIds),
        orderBy: [sceneIterations.createdAt],
      });
      
      // Group by messageId for easy lookup
      const iterationsByMessage: Record<string, typeof iterations> = {};
      
      for (const iteration of iterations) {
        if (iteration.messageId) {
          if (!iterationsByMessage[iteration.messageId]) {
            iterationsByMessage[iteration.messageId] = [];
          }
          iterationsByMessage[iteration.messageId]!.push(iteration);
        }
      }
      
      return iterationsByMessage;
    }),

  /**
   * REVERT TO ITERATION - Restore a scene to a previous version
   */
  revertToIteration: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      iterationId: z.string(),
      messageId: z.string(), // For creating a new message about the revert
    }))
    .mutation(async ({ input, ctx }) => {
      const response = new ResponseBuilder();
      const { projectId, iterationId, messageId } = input;
      const userId = ctx.session.user.id;
      
      console.log(`[${response.getRequestId()}] Reverting to iteration`, { 
        iterationId, 
        messageId 
      });
      
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
            'scene.update',
            'scene'
          ) as any;
        }
        
        // 2. Get the iteration
        const iteration = await db.query.sceneIterations.findFirst({
          where: and(
            eq(sceneIterations.id, iterationId),
            eq(sceneIterations.projectId, projectId)
          ),
        });
        
        if (!iteration) {
          return response.error(
            ErrorCode.NOT_FOUND,
            "Iteration not found",
            'scene.update',
            'scene'
          ) as any;
        }
        
        // 3. Handle based on operation type
        let revertedScene;
        
        if (iteration.operationType === 'delete') {
          // Restore deleted scene
          if (!iteration.codeBefore) {
            throw new Error("Cannot restore deleted scene - no code history");
          }
          
          // Find the original order by looking at other scenes
          const allScenes = await db.query.scenes.findMany({
            where: eq(scenes.projectId, projectId),
            orderBy: [scenes.order],
          });
          
          // Insert at the end
          const maxOrder = allScenes.length;
          
          [revertedScene] = await db.insert(scenes).values({
            id: iteration.sceneId, // Restore with original ID
            projectId,
            name: `Restored Scene`,
            tsxCode: iteration.codeBefore,
            duration: 150, // Default duration
            order: maxOrder,
            props: {},
          }).returning();
          
        } else if (iteration.operationType === 'create') {
          // For create operations, use codeAfter (the created state)
          const scene = await db.query.scenes.findFirst({
            where: eq(scenes.id, iteration.sceneId),
          });
          
          if (!scene) {
            throw new Error("Scene not found");
          }
          
          [revertedScene] = await db.update(scenes)
            .set({
              tsxCode: iteration.codeAfter!,
              updatedAt: new Date(),
            })
            .where(eq(scenes.id, iteration.sceneId))
            .returning();
            
        } else {
          // For edit operations, revert to the state after this edit
          const scene = await db.query.scenes.findFirst({
            where: eq(scenes.id, iteration.sceneId),
          });
          
          if (!scene) {
            throw new Error("Scene not found");
          }
          
          const codeToRevertTo = iteration.codeAfter || iteration.codeBefore;
          if (!codeToRevertTo) {
            throw new Error("No code history available for this iteration");
          }
          
          [revertedScene] = await db.update(scenes)
            .set({
              tsxCode: codeToRevertTo,
              updatedAt: new Date(),
            })
            .where(eq(scenes.id, iteration.sceneId))
            .returning();
        }
        
        if (!revertedScene) {
          throw new Error("Failed to revert scene");
        }
        
        // 4. Create a new iteration to track the revert
        await db.insert(sceneIterations).values({
          sceneId: iteration.sceneId,
          projectId,
          operationType: 'edit',
          userPrompt: `Reverted to version from: "${iteration.userPrompt}"`,
          codeBefore: iteration.operationType === 'delete' ? null : revertedScene.tsxCode,
          codeAfter: iteration.codeAfter || iteration.codeBefore,
          generationTimeMs: 0,
          modelUsed: null,
          userEditedAgain: false,
          messageId: null, // This is a system operation, not linked to a new message
        });
        
        // 5. Create a message about the revert
        await messageService.createMessage({
          projectId,
          content: `Reverted scene to version from: "${iteration.userPrompt}"`,
          role: 'assistant',
          kind: 'message',
        });
        
        return response.success(
          revertedScene as any,
          iteration.operationType === 'delete' ? 'scene.create' : 'scene.update',
          'scene',
          [revertedScene.id]
        );
        
      } catch (error) {
        console.error(`[${response.getRequestId()}] Revert error:`, error);
        
        const errorCode = getErrorCode(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to revert';
        
        return response.error(
          errorCode,
          errorMessage,
          'scene.update',
          'scene',
          error
        ) as any;
      }
    }),

  /**
   * ADD TEMPLATE - Direct template addition without AI pipeline
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
      const response = new ResponseBuilder();
      const { projectId, templateId, templateName, templateCode, templateDuration } = input;
      const userId = ctx.session.user.id;

      console.log(`[${response.getRequestId()}] Adding template`, { projectId, templateId, templateName });

      try {
        // 1. Verify project ownership
        const project = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, projectId),
            eq(projects.userId, userId)
          ),
        });

        if (!project) {
          return {
            success: false,
            message: "Project not found or access denied",
          };
        }

        // 2. Get current scene count for order
        const existingScenes = await db.query.scenes.findMany({
          where: eq(scenes.projectId, projectId),
        });

        const sceneOrder = existingScenes.length;

        // 3. Generate a unique scene name
        const sceneName = `${templateName}-${Date.now().toString(36)}`;

        // 4. Save template as a new scene
        console.log(`[${response.getRequestId()}] Saving template to database`, {
          name: sceneName,
          order: sceneOrder,
          duration: templateDuration,
        });

        const [newScene] = await db.insert(scenes).values({
          projectId,
          name: sceneName,
          tsxCode: templateCode,
          duration: templateDuration,
          order: sceneOrder,
          props: {},
          layoutJson: null,
        }).returning();

        if (!newScene) {
          return {
            success: false,
            message: "Failed to save template to database",
          };
        }

        console.log(`[${response.getRequestId()}] Template saved successfully`, {
          sceneId: newScene.id,
          name: newScene.name,
        });

        // 5. Clear welcome flag if this is the first scene
        if (project.isWelcome && existingScenes.length === 0) {
          await db.update(projects)
            .set({ isWelcome: false })
            .where(eq(projects.id, projectId));
        }

        // 6. Add chat message for context
        await messageService.createMessage({
          projectId,
          content: `Added template: ${templateName}`,
          role: "assistant",
        });

        return {
          success: true,
          message: `Added ${templateName} template`,
          scene: newScene as any, // Cast to avoid props type issue
        };

      } catch (error) {
        console.error(`[${response.getRequestId()}] Template addition error:`, error);
        
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to add template',
        };
      }
    }),
});