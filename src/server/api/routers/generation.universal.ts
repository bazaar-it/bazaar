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
import { db } from "~/server/db";
import { scenes, projects, messages } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { BrainDecision } from "~/lib/types/api/brain-decision";
import type { AddToolInput, EditToolInput, DeleteToolInput, BaseToolOutput } from "~/tools/helpers/types";

// Import universal response types and helpers
import { ResponseBuilder, getErrorCode } from "~/lib/api/response-helpers";
import type { UniversalResponse, SceneCreateResponse, SceneDeleteResponse } from "~/lib/types/api/universal";
import { ErrorCode } from "~/lib/types/api/universal";
import type { SceneEntity } from "~/generated/entities";

// Helper function for tool execution (same as before)
async function executeToolFromDecision(
  decision: BrainDecision,
  projectId: string,
  userId: string,
  storyboard: any[]
): Promise<{ success: boolean; scene?: any }> {
  
  if (!decision.toolName || !decision.toolContext) {
    throw new Error("Invalid decision - missing tool name or context");
  }

  let toolInput: AddToolInput | EditToolInput | DeleteToolInput;
  let result: BaseToolOutput;

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
      if (!addResult.success) {
        throw new Error(addResult.error?.message || 'Add operation failed');
      }
      result = addResult.data!;
      break;

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
        existingCode: sceneToEdit.tsxCode, // This will be fixed in TICKET-003
        imageUrls: decision.toolContext.imageUrls,
        visionAnalysis: decision.toolContext.visionAnalysis,
      } as EditToolInput;
      
      const editResult = await editTool.run(toolInput);
      if (!editResult.success) {
        throw new Error(editResult.error?.message || 'Edit operation failed');
      }
      result = editResult.data!;
      break;

    case 'deleteScene':
      if (!decision.toolContext.targetSceneId) {
        throw new Error("No target scene ID for delete operation");
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        sceneId: decision.toolContext.targetSceneId,
      } as DeleteToolInput;
      
      const deleteResult = await deleteTool.run(toolInput);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || 'Delete operation failed');
      }
      result = deleteResult.data!;
      break;

    default:
      throw new Error(`Unknown tool: ${decision.toolName}`);
  }

  return {
    success: true,
    scene: result.scene
  };
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
          );
        }

        // 2. Build storyboard context
        let storyboardForBrain: Array<{
          id: string;
          name: string;
          duration: number;
          order: number;
          tsxCode: string;
        }> = [];
        
        if (project.isWelcome) {
          // First real scene - clear welcome flag
          await db.update(projects)
            .set({ isWelcome: false })
            .where(eq(projects.id, projectId));
            
          await db.delete(scenes).where(eq(scenes.projectId, projectId));
          storyboardForBrain = [];
        } else {
          // Get existing scenes
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

        // 3. Get chat history
        const recentMessages = await db.query.messages.findMany({
          where: eq(messages.projectId, projectId),
          orderBy: [desc(messages.createdAt)],
          limit: 10,
        });
        
        const chatHistory = recentMessages.reverse().map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // 4. Store user message
        await db.insert(messages).values({
          projectId,
          content: userMessage,
          role: "user",
          createdAt: new Date(),
          imageUrls: (userContext?.imageUrls as string[]) || [],
        });

        // 5. Get decision from brain
        console.log(`[${response.getRequestId()}] Getting decision from brain...`);
        const orchestratorResponse = await orchestrator.orchestrate({
          userPrompt: userMessage,
          projectContext: {
            projectId,
            storyboard: storyboardForBrain,
            chatHistory,
          },
          userContext: {
            imageUrls: userContext?.imageUrls,
          },
        });

        if (!orchestratorResponse.decision) {
          return response.error(
            ErrorCode.AI_ERROR,
            "Failed to get decision from brain",
            'scene.create',
            'scene'
          );
        }

        const decision = orchestratorResponse.decision;

        // 6. Execute the tool
        console.log(`[${response.getRequestId()}] Executing tool: ${decision.toolName}`);
        const toolResult = await executeToolFromDecision(
          decision,
          projectId,
          userId,
          storyboardForBrain
        );

        // 7. Store assistant's response AFTER execution
        if (orchestratorResponse.chatResponse && toolResult.success) {
          await db.insert(messages).values({
            projectId,
            content: orchestratorResponse.chatResponse,
            role: "assistant",
            createdAt: new Date(),
          });
        }

        // 8. Return universal response
        if (!toolResult.scene) {
          return response.error(
            ErrorCode.INTERNAL_ERROR,
            "Tool execution succeeded but no scene was created",
            'scene.create',
            'scene'
          );
        }

        const sceneEntity: SceneEntity = {
          id: toolResult.scene.id,
          projectId: toolResult.scene.projectId,
          name: toolResult.scene.name,
          tsxCode: toolResult.scene.tsxCode,
          duration: toolResult.scene.duration,
          order: toolResult.scene.order,
          props: toolResult.scene.props,
          layoutJson: toolResult.scene.layoutJson,
          publishedUrl: toolResult.scene.publishedUrl || null,
          publishedHash: toolResult.scene.publishedHash || null,
          publishedAt: toolResult.scene.publishedAt || null,
          createdAt: toolResult.scene.createdAt || new Date(),
          updatedAt: toolResult.scene.updatedAt || new Date(),
        };

        return response
          .success(sceneEntity, 'scene.create', 'scene', [sceneEntity.id])
          .withContext({
            reasoning: decision.reasoning,
            chatResponse: decision.chatResponse,
            suggestions: ['Edit the scene', 'Add another scene', 'Preview your video']
          });

      } catch (error) {
        console.error(`[${response.getRequestId()}] Generation error:`, error);
        
        const errorCode = getErrorCode(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Store error message in chat
        await db.insert(messages).values({
          projectId,
          content: `I encountered an error: ${errorMessage}`,
          role: "assistant",
          createdAt: new Date(),
        }).catch(e => console.error('Failed to save error message:', e));

        return response.error(
          errorCode,
          errorMessage,
          'scene.create',
          'scene',
          error
        );
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
          );
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
          );
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
        );
      }
    }),
});