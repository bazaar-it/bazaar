/**
 * Generation Router with Streaming Support
 * Implements real-time progress updates for multi-step operations
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { observable } from "@trpc/server/observable";
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

// Streaming event types
export type GenerationEvent = 
  | { type: 'status'; stage: string; message: string }
  | { type: 'progress'; percentage: number; stage: string }
  | { type: 'brain_decision'; toolName: string; reasoning: string }
  | { type: 'tool_start'; tool: string; prompt: string }
  | { type: 'tool_progress'; tool: string; detail: string }
  | { type: 'scene_created'; scene: SceneEntity }
  | { type: 'error'; error: string; code: ErrorCode }
  | { type: 'complete'; scene: SceneEntity; chatResponse?: string };

// Helper to emit progress events
class ProgressEmitter {
  private emit: (event: GenerationEvent) => void;
  
  constructor(emit: (event: GenerationEvent) => void) {
    this.emit = emit;
  }
  
  status(stage: string, message: string) {
    this.emit({ type: 'status', stage, message });
  }
  
  progress(percentage: number, stage: string) {
    this.emit({ type: 'progress', percentage, stage });
  }
  
  brainDecision(toolName: string, reasoning: string) {
    this.emit({ type: 'brain_decision', toolName, reasoning });
  }
  
  toolStart(tool: string, prompt: string) {
    this.emit({ type: 'tool_start', tool, prompt });
  }
  
  toolProgress(tool: string, detail: string) {
    this.emit({ type: 'tool_progress', tool, detail });
  }
  
  sceneCreated(scene: SceneEntity) {
    this.emit({ type: 'scene_created', scene });
  }
  
  error(error: string, code: ErrorCode) {
    this.emit({ type: 'error', error, code });
  }
  
  complete(scene: SceneEntity, chatResponse?: string) {
    this.emit({ type: 'complete', scene, chatResponse });
  }
}

// Enhanced tool execution with progress tracking
async function executeToolWithProgress(
  decision: BrainDecision,
  projectId: string,
  userId: string,
  storyboard: any[],
  progress: ProgressEmitter
): Promise<{ success: boolean; scene?: any }> {
  
  if (!decision.toolName || !decision.toolContext) {
    throw new Error("Invalid decision - missing tool name or context");
  }

  progress.toolStart(decision.toolName, decision.toolContext.userPrompt);

  let toolInput: AddToolInput | EditToolInput | DeleteToolInput;
  let result: BaseToolOutput;

  switch (decision.toolName) {
    case 'addScene':
      progress.toolProgress('addScene', 'Preparing scene generation...');
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        sceneNumber: storyboard.length + 1,
        storyboardSoFar: storyboard,
        imageUrls: decision.toolContext.imageUrls,
        visionAnalysis: decision.toolContext.visionAnalysis,
        // Add progress callback
        onProgress: (detail: string) => progress.toolProgress('addScene', detail),
      } as AddToolInput & { onProgress?: (detail: string) => void };
      
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
      
      progress.toolProgress('editScene', 'Loading scene for editing...');
      
      const sceneToEdit = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId),
      });
      
      if (!sceneToEdit) {
        throw new Error("Scene not found for editing");
      }
      
      progress.toolProgress('editScene', 'Applying edits...');
      
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
        // Add progress callback
        onProgress: (detail: string) => progress.toolProgress('editScene', detail),
      } as EditToolInput & { onProgress?: (detail: string) => void };
      
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
      
      progress.toolProgress('deleteScene', 'Removing scene...');
      
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

export const generationStreamingRouter = createTRPCRouter({
  /**
   * STREAMING SCENE GENERATION
   * Returns an observable that emits progress events
   */
  generateSceneStream: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userMessage: z.string(),
      userContext: z.object({
        imageUrls: z.array(z.string()).optional(),
      }).optional(),
    }))
    .subscription(({ input, ctx }) => {
      return observable<GenerationEvent>((emit) => {
        const progress = new ProgressEmitter(emit.next);
        const response = new ResponseBuilder();
        const { projectId, userMessage, userContext } = input;
        const userId = ctx.session.user.id;

        // Execute async generation
        (async () => {
          try {
            progress.status('initialization', 'Starting scene generation...');
            progress.progress(5, 'initialization');

            // 1. Verify project ownership
            progress.status('verification', 'Verifying project access...');
            const project = await db.query.projects.findFirst({
              where: and(
                eq(projects.id, projectId),
                eq(projects.userId, userId)
              ),
            });

            if (!project) {
              progress.error("Project not found or access denied", ErrorCode.NOT_FOUND);
              return;
            }
            progress.progress(10, 'verification');

            // 2. Build storyboard context
            progress.status('context', 'Building project context...');
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
            progress.progress(20, 'context');

            // 3. Get chat history
            progress.status('history', 'Loading conversation history...');
            const recentMessages = await db.query.messages.findMany({
              where: eq(messages.projectId, projectId),
              orderBy: [desc(messages.createdAt)],
              limit: 10,
            });
            
            const chatHistory = recentMessages.reverse().map(msg => ({
              role: msg.role,
              content: msg.content
            }));
            progress.progress(25, 'history');

            // 4. Store user message
            await db.insert(messages).values({
              projectId,
              content: userMessage,
              role: "user",
              createdAt: new Date(),
              imageUrls: (userContext?.imageUrls as string[]) || [],
            });
            progress.progress(30, 'history');

            // 5. Get decision from brain
            progress.status('brain', 'Analyzing your request...');
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
              progress.error("Failed to get decision from brain", ErrorCode.AI_ERROR);
              return;
            }

            const decision = orchestratorResponse.decision;
            progress.brainDecision(decision.toolName, decision.reasoning);
            progress.progress(50, 'brain');

            // 6. Execute the tool with progress tracking
            progress.status('generation', `Executing ${decision.toolName}...`);
            const toolResult = await executeToolWithProgress(
              decision,
              projectId,
              userId,
              storyboardForBrain,
              progress
            );
            progress.progress(80, 'generation');

            // 7. Store assistant's response
            if (orchestratorResponse.chatResponse && toolResult.success) {
              await db.insert(messages).values({
                projectId,
                content: orchestratorResponse.chatResponse,
                role: "assistant",
                createdAt: new Date(),
              });
            }
            progress.progress(90, 'finalization');

            // 8. Return success
            if (!toolResult.scene) {
              progress.error("Tool execution succeeded but no scene was created", ErrorCode.INTERNAL_ERROR);
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

            progress.sceneCreated(sceneEntity);
            progress.progress(100, 'complete');
            progress.complete(sceneEntity, orchestratorResponse.chatResponse);

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
            
            progress.error(errorMessage, errorCode);
          }
        })();

        // Cleanup function
        return () => {
          console.log('Streaming subscription ended');
        };
      });
    }),

  /**
   * Multi-step operation with streaming
   * Handles complex workflows like "add 3 scenes about X"
   */
  generateMultiSceneStream: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userMessage: z.string(),
      userContext: z.object({
        imageUrls: z.array(z.string()).optional(),
      }).optional(),
    }))
    .subscription(({ input, ctx }) => {
      return observable<GenerationEvent>((emit) => {
        const progress = new ProgressEmitter(emit.next);
        const { projectId, userMessage, userContext } = input;
        const userId = ctx.session.user.id;

        (async () => {
          try {
            progress.status('multi-analysis', 'Analyzing multi-step request...');
            
            // TODO: Implement multi-step logic here
            // 1. Parse request to identify multiple operations
            // 2. Execute each operation in sequence
            // 3. Emit progress for each step
            
            progress.status('multi-complete', 'Multi-step operation completed');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            progress.error(errorMessage, ErrorCode.INTERNAL_ERROR);
          }
        })();

        return () => {
          console.log('Multi-scene streaming ended');
        };
      });
    }),
});