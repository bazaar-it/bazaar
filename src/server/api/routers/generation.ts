/**
 * Generation Router - Sprint 41 Architecture
 * Brain decides, Generation executes
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

// Helper function for tool execution
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
        throw new Error("Edit operation requires targetSceneId");
      }
      
      const sceneToEdit = storyboard.find(s => s.id === decision.toolContext!.targetSceneId);
      if (!sceneToEdit) {
        throw new Error("Scene not found for editing");
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
        sceneId: decision.toolContext.targetSceneId,
        existingCode: sceneToEdit.tsxCode,
        editType: decision.toolContext.editComplexity || 'creative',
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
        throw new Error("Delete operation requires targetSceneId");
      }
      
      toolInput = {
        userPrompt: decision.toolContext.userPrompt,
        projectId,
        userId,
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

  if (!result.success) {
    throw new Error(result.error || "Tool execution failed");
  }

  // Handle database operations based on tool type
  if (decision.toolName === 'deleteScene') {
    // Delete handled by tool
    return { success: true };
  }

  // For add/edit operations, we need to save/update the scene
  if (result.tsxCode) {
    const sceneData = {
      name: result.name || `Scene ${storyboard.length + 1}`,
      tsxCode: result.tsxCode, // Direct field, no transformation!
      duration: result.duration || 150,
      projectId,
    };

    if (decision.toolName.includes('edit')) {
      // Update existing scene
      await db.update(scenes)
        .set({
          ...sceneData,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, decision.toolContext.targetSceneId!));
        
      const updatedScene = await db.query.scenes.findFirst({
        where: eq(scenes.id, decision.toolContext.targetSceneId!)
      });
      
      return { success: true, scene: updatedScene };
    } else {
      // Create new scene
      const [newScene] = await db.insert(scenes)
        .values({
          ...sceneData,
          order: storyboard.length,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
        
      return { success: true, scene: newScene };
    }
  }

  return { success: true };
}

export const generationRouter = createTRPCRouter({
  /**
   * UNIFIED SCENE GENERATION - Sprint 41 Architecture
   * 1. Brain makes decision
   * 2. Generation executes tool
   * 3. Updates database
   * 4. Returns response for optimistic UI
   */
  generateScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      userMessage: z.string(),
      sceneId: z.string().optional(),
      userContext: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, userMessage, sceneId, userContext } = input;
      const userId = ctx.session.user.id;

      console.log("[Generation] Starting request:", {
        projectId,
        userId,
        sceneId: sceneId || "N/A",
        hasUserContext: !!userContext,
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
          throw new Error("Project not found or access denied");
        }

        // 2. Handle welcome scene logic
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

        // 5. Get decision from brain (NOT execution)
        console.log("[Generation] Getting decision from brain...");
        const orchestratorResponse = await orchestrator.processUserInput({
          prompt: userMessage,
          projectId,
          userId,
          userContext: { 
            ...(userContext || {}), 
            sceneId 
          },
          storyboardSoFar: storyboardForBrain,
          chatHistory,
        });

        console.log("[Generation] Brain decision:", {
          success: orchestratorResponse.success,
          toolUsed: orchestratorResponse.toolUsed,
          reasoning: orchestratorResponse.reasoning,
        });

        if (!orchestratorResponse.success) {
          // Store error message
          await db.insert(messages).values({
            projectId,
            content: orchestratorResponse.error || "Sorry, I couldn't understand your request.",
            role: "assistant",
            createdAt: new Date(),
          });
          
          throw new Error(orchestratorResponse.error || "Decision failed");
        }

        // 6. Execute the tool based on decision
        console.log("[Generation] Executing tool:", orchestratorResponse.result?.toolName);
        
        // Convert orchestrator response to BrainDecision format for tool execution
        const decision: BrainDecision = {
          success: true,
          toolName: orchestratorResponse.result?.toolName as any,
          toolContext: orchestratorResponse.result?.toolContext,
          workflow: orchestratorResponse.result?.workflow,
          reasoning: orchestratorResponse.reasoning,
          chatResponse: orchestratorResponse.chatResponse,
        };
        
        const toolResult = await executeToolFromDecision(decision, projectId, userId, storyboardForBrain);

        console.log("[Generation] Tool execution complete:", {
          success: toolResult.success,
          hasScene: !!toolResult.scene,
        });

        // 7. Store assistant's response AFTER execution
        if (orchestratorResponse.chatResponse && toolResult.success) {
          await db.insert(messages).values({
            projectId,
            content: orchestratorResponse.chatResponse,
            role: "assistant",
            createdAt: new Date(),
          });
        }

        // 8. Transform tool output to API response
        const response = {
          success: true,
          operation: decision.toolName || 'unknown',
          scene: toolResult.scene ? {
            scene: {
              id: toolResult.scene.id,
              projectId: toolResult.scene.projectId,
              name: toolResult.scene.name,
              tsxCode: toolResult.scene.tsxCode, // Using correct field name!
              duration: toolResult.scene.duration,
              order: toolResult.scene.order,
              props: toolResult.scene.props,
              layoutJson: toolResult.scene.layoutJson,
            }
          } : null,
          chatResponse: decision.chatResponse,
          debug: decision.debug,
        };

        return response;

      } catch (error) {
        console.error("[Generation] Error:", error);
        
        const errorMessage = `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        
        await db.insert(messages).values({
          projectId,
          content: errorMessage,
          role: "assistant",
          createdAt: new Date(),
        });

        throw new Error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

        return {
          success: true,
          removedSceneId: sceneId,
          removedSceneName: scene.name,
        };

      } catch (error) {
        throw new Error(`Scene removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  /**
   * Get project scenes
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

      // Get scenes
      const projectScenes = await db.query.scenes.findMany({
        where: eq(scenes.projectId, projectId),
        orderBy: [scenes.order],
      });

      return projectScenes;
    }),
});