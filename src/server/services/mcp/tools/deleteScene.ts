// src/server/services/mcp/tools/deleteScene.ts
import { z } from "zod";
import { BaseMCPTool } from "~/server/services/mcp/tools/base";
import { conversationalResponseService } from "~/server/services/ai/conversationalResponse.service";

const deleteSceneInputSchema = z.object({
  sceneId: z.string().describe("ID of scene to delete"),
  sceneName: z.string().describe("Name of scene being deleted"),
  projectId: z.string().describe("Project ID containing the scene"),
  remainingScenes: z.array(z.object({
    id: z.string(),
    name: z.string()
  })).optional().describe("Scenes that will remain after deletion"),
});

type DeleteSceneInput = z.infer<typeof deleteSceneInputSchema>;

interface DeleteSceneOutput {
  success: boolean;
  deletedSceneId: string;
  deletedSceneName: string;
  reasoning: string;
  chatResponse?: string; // NEW: Conversational response for user
}

export class DeleteSceneTool extends BaseMCPTool<DeleteSceneInput, DeleteSceneOutput> {
  name = "deleteScene";
  description = "Delete a scene from the project. Use when user wants to remove or delete a specific scene.";
  inputSchema = deleteSceneInputSchema;
  
  protected async execute(input: DeleteSceneInput): Promise<DeleteSceneOutput> {
    const { sceneId, sceneName, projectId, remainingScenes } = input;

    // ✅ CONVERT: Technical name to user-friendly display name
    const displayName = sceneName.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || sceneName;

    try {
      // Note: Actual deletion logic would be handled by the orchestrator
      // This tool just provides the intent and conversational response
      
      // Generate conversational response for user
      const chatResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'deleteScene',
        userPrompt: `Delete scene: ${displayName}`, // ✅ FIXED: Use display name
        result: {
          deletedScene: displayName, // ✅ FIXED: Use display name
          remainingCount: remainingScenes?.length || 0
        },
        context: {
          sceneName: displayName, // ✅ FIXED: Use display name
          sceneCount: remainingScenes?.length || 0,
          availableScenes: remainingScenes || [],
          projectId
        }
      });

      return {
        success: true,
        deletedSceneId: sceneId,
        deletedSceneName: displayName, // ✅ FIXED: Return display name
        reasoning: `Scene "${displayName}" marked for deletion`, // ✅ FIXED: Use display name
        chatResponse // NEW: Include conversational response
      };
    } catch (error) {
      console.error("[DeleteScene] Error:", error);
      
      // Generate error response for user
      const errorResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'deleteScene',
        userPrompt: `Delete scene: ${displayName}`, // ✅ FIXED: Use display name
        result: { error: String(error) },
        context: {
          sceneName: displayName, // ✅ FIXED: Use display name
          sceneCount: remainingScenes?.length || 0,
          projectId
        }
      });

      return {
        success: false,
        deletedSceneId: sceneId,
        deletedSceneName: displayName, // ✅ FIXED: Return display name
        reasoning: "Failed to delete scene",
        chatResponse: errorResponse
      };
    }
  }
}

export const deleteSceneTool = new DeleteSceneTool(); 