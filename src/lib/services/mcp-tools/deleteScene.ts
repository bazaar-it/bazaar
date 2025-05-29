import { z } from "zod";
import { BaseMCPTool } from "./base";
import { conversationalResponseService } from "~/server/services/conversationalResponse.service";

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

    try {
      // Note: Actual deletion logic would be handled by the orchestrator
      // This tool just provides the intent and conversational response
      
      // Generate conversational response for user
      const chatResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'deleteScene',
        userPrompt: `Delete scene: ${sceneName}`,
        result: {
          deletedScene: sceneName,
          remainingCount: remainingScenes?.length || 0
        },
        context: {
          sceneName,
          sceneCount: remainingScenes?.length || 0,
          availableScenes: remainingScenes || [],
          projectId
        }
      });

      return {
        success: true,
        deletedSceneId: sceneId,
        deletedSceneName: sceneName,
        reasoning: `Scene "${sceneName}" marked for deletion`,
        chatResponse // NEW: Include conversational response
      };
    } catch (error) {
      console.error("[DeleteScene] Error:", error);
      
      // Generate error response for user
      const errorResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'deleteScene',
        userPrompt: `Delete scene: ${sceneName}`,
        result: { error: String(error) },
        context: {
          sceneName,
          sceneCount: remainingScenes?.length || 0,
          projectId
        }
      });

      return {
        success: false,
        deletedSceneId: sceneId,
        deletedSceneName: sceneName,
        reasoning: "Failed to delete scene",
        chatResponse: errorResponse
      };
    }
  }
}

export const deleteSceneTool = new DeleteSceneTool(); 