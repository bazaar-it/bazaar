/**
 * Generation Router with Server-Sent Events (SSE) Support
 * Alternative streaming implementation that works with HTTP
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
import type { BrainDecision } from "~/lib/types/ai/brain.types";
import type { AddToolInput, EditToolInput, DeleteToolInput, BaseToolOutput } from "~/tools/helpers/types";
import { ResponseBuilder, getErrorCode } from "~/lib/api/response-helpers";
import { ErrorCode } from "~/lib/types/api/universal";
import type { SceneEntity } from "~/generated/entities";

// SSE event types  
export type SSEEvent = 
  | { type: 'status'; data: { stage: string; message: string } }
  | { type: 'progress'; data: { percentage: number; stage: string } }
  | { type: 'brain_decision'; data: { toolName: string; reasoning: string } }
  | { type: 'scene_created'; data: { scene: SceneEntity } }
  | { type: 'error'; data: { error: string; code: ErrorCode } }
  | { type: 'complete'; data: { scene: SceneEntity; chatResponse?: string } };

// Progress callback type for tools
type ProgressCallback = (detail: string) => void;

// Enhanced tool execution with progress tracking
async function executeToolFromDecisionWithProgress(
  decision: BrainDecision,
  projectId: string,
  userId: string,
  storyboard: any[],
  onProgress?: ProgressCallback
): Promise<{ success: boolean; scene?: any }> {
  
  if (!decision.toolName || !decision.toolContext) {
    throw new Error("Invalid decision - missing tool name or context");
  }

  let toolInput: AddToolInput | EditToolInput | DeleteToolInput;
  let result: BaseToolOutput;

  switch (decision.toolName) {
    case 'addScene':
      onProgress?.('Preparing scene generation...');
      
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
      
      onProgress?.('Loading scene for editing...');
      
      const sceneToEdit = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId),
      });
      
      if (!sceneToEdit) {
        throw new Error("Scene not found for editing");
      }
      
      onProgress?.('Applying edits...');
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        sceneId: decision.toolContext.targetSceneId,
        tsxCode: sceneToEdit.tsxCode,
        currentDuration: sceneToEdit.duration,
        editType: 'creative',
        imageUrls: decision.toolContext.imageUrls,
        visionAnalysis: decision.toolContext.visionAnalysis,
        errorDetails: decision.toolContext.errorDetails,
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
      
      onProgress?.('Removing scene...');
      
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

export const generationSSERouter = createTRPCRouter({
  /**
   * Scene generation with progress tracking
   * Returns initial response immediately, progress updates via separate endpoint
   */
  generateSceneWithProgress: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userMessage: z.string(),
      userContext: z.object({
        imageUrls: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const response = new ResponseBuilder();
      const { projectId, userMessage, userContext } = input;
      const userId = ctx.session.user.id;
      const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store operation status in memory (in production, use Redis or similar)
      const operationStatus = {
        id: operationId,
        status: 'starting',
        progress: 0,
        stage: 'initialization',
        message: 'Starting scene generation...',
        events: [] as SSEEvent[],
      };

      // In production, store this in Redis or a similar service
      global.operationStatuses = global.operationStatuses || {};
      global.operationStatuses[operationId] = operationStatus;

      // Start async generation
      (async () => {
        const emitEvent = (event: SSEEvent) => {
          operationStatus.events.push(event);
          
          // Update operation status based on event
          switch (event.type) {
            case 'status':
              operationStatus.stage = event.data.stage;
              operationStatus.message = event.data.message;
              break;
            case 'progress':
              operationStatus.progress = event.data.percentage;
              operationStatus.stage = event.data.stage;
              break;
            case 'complete':
              operationStatus.status = 'completed';
              operationStatus.progress = 100;
              break;
            case 'error':
              operationStatus.status = 'error';
              break;
          }
        };

        try {
          emitEvent({ type: 'status', data: { stage: 'initialization', message: 'Starting scene generation...' } });
          emitEvent({ type: 'progress', data: { percentage: 5, stage: 'initialization' } });

          // 1. Verify project ownership
          emitEvent({ type: 'status', data: { stage: 'verification', message: 'Verifying project access...' } });
          const project = await db.query.projects.findFirst({
            where: and(
              eq(projects.id, projectId),
              eq(projects.userId, userId)
            ),
          });

          if (!project) {
            emitEvent({ type: 'error', data: { error: 'Project not found or access denied', code: ErrorCode.NOT_FOUND } });
            return;
          }
          emitEvent({ type: 'progress', data: { percentage: 10, stage: 'verification' } });

          // 2. Build storyboard context
          emitEvent({ type: 'status', data: { stage: 'context', message: 'Building project context...' } });
          let storyboardForBrain: Array<{
            id: string;
            name: string;
            duration: number;
            order: number;
            tsxCode: string;
          }> = [];
          
          if (project.isWelcome) {
            await db.update(projects)
              .set({ isWelcome: false })
              .where(eq(projects.id, projectId));
            await db.delete(scenes).where(eq(scenes.projectId, projectId));
            storyboardForBrain = [];
          } else {
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
          emitEvent({ type: 'progress', data: { percentage: 20, stage: 'context' } });

          // 3. Get chat history
          emitEvent({ type: 'status', data: { stage: 'history', message: 'Loading conversation history...' } });
          const recentMessages = await db.query.messages.findMany({
            where: eq(messages.projectId, projectId),
            orderBy: [desc(messages.createdAt)],
            limit: 10,
          });
          
          const chatHistory = recentMessages.reverse().map(msg => ({
            role: msg.role,
            content: msg.content
          }));
          emitEvent({ type: 'progress', data: { percentage: 25, stage: 'history' } });

          // 4. Store user message
          await db.insert(messages).values({
            projectId,
            content: userMessage,
            role: "user",
            createdAt: new Date(),
            imageUrls: (userContext?.imageUrls as string[]) || [],
          });
          emitEvent({ type: 'progress', data: { percentage: 30, stage: 'history' } });

          // 5. Get decision from brain
          emitEvent({ type: 'status', data: { stage: 'brain', message: 'Analyzing your request...' } });
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
            emitEvent({ type: 'error', data: { error: 'Failed to get decision from brain', code: ErrorCode.AI_ERROR } });
            return;
          }

          const decision = orchestratorResponse.decision;
          emitEvent({ type: 'brain_decision', data: { toolName: decision.toolName, reasoning: decision.reasoning } });
          emitEvent({ type: 'progress', data: { percentage: 50, stage: 'brain' } });

          // 6. Execute the tool with progress tracking
          emitEvent({ type: 'status', data: { stage: 'generation', message: `Executing ${decision.toolName}...` } });
          const toolResult = await executeToolFromDecisionWithProgress(
            decision,
            projectId,
            userId,
            storyboardForBrain,
            (detail) => emitEvent({ type: 'status', data: { stage: 'generation', message: detail } })
          );
          emitEvent({ type: 'progress', data: { percentage: 80, stage: 'generation' } });

          // 7. Store assistant's response
          if (orchestratorResponse.chatResponse && toolResult.success) {
            await db.insert(messages).values({
              projectId,
              content: orchestratorResponse.chatResponse,
              role: "assistant",
              createdAt: new Date(),
            });
          }
          emitEvent({ type: 'progress', data: { percentage: 90, stage: 'finalization' } });

          // 8. Return success
          if (!toolResult.scene) {
            emitEvent({ type: 'error', data: { error: 'Tool execution succeeded but no scene was created', code: ErrorCode.INTERNAL_ERROR } });
            return;
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

          emitEvent({ type: 'scene_created', data: { scene: sceneEntity } });
          emitEvent({ type: 'progress', data: { percentage: 100, stage: 'complete' } });
          emitEvent({ type: 'complete', data: { scene: sceneEntity, chatResponse: orchestratorResponse.chatResponse } });

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
          });
          
          emitEvent({ type: 'error', data: { error: errorMessage, code: errorCode } });
        }
      })();

      // Return operation ID immediately
      return {
        operationId,
        message: 'Generation started. Use the progress endpoint to track status.',
      };
    }),

  /**
   * Get operation progress
   * Client polls this endpoint to get updates
   */
  getOperationProgress: protectedProcedure
    .input(z.object({
      operationId: z.string(),
    }))
    .query(({ input }) => {
      const { operationId } = input;
      
      // In production, retrieve from Redis or similar
      const operationStatus = global.operationStatuses?.[operationId];
      
      if (!operationStatus) {
        return {
          status: 'not_found',
          error: 'Operation not found',
        };
      }
      
      return {
        id: operationStatus.id,
        status: operationStatus.status,
        progress: operationStatus.progress,
        stage: operationStatus.stage,
        message: operationStatus.message,
        events: operationStatus.events,
      };
    }),
});

// Global type declaration for operation statuses
declare global {
  var operationStatuses: Record<string, any> | undefined;
}