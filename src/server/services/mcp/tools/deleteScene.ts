// src/server/services/mcp/tools/deleteScene.ts
import { z } from "zod";
import { BaseMCPTool } from "~/server/services/mcp/tools/base";

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
      // This tool just provides the intent
      
      return {
        success: true,
        deletedSceneId: sceneId,
        deletedSceneName: displayName, // ✅ FIXED: Return display name
        reasoning: `Scene "${displayName}" marked for deletion`, // ✅ FIXED: Use display name
        chatResponse: undefined // Brain will generate this if needed
      };
    } catch (error) {
      console.error("[DeleteScene] Error:", error);
      
      return {
        success: false,
        deletedSceneId: sceneId,
        deletedSceneName: displayName, // ✅ FIXED: Return display name
        reasoning: "Failed to delete scene",
        chatResponse: undefined // Brain will handle error messaging
      };
    }
  }
}

export const deleteSceneTool = new DeleteSceneTool(); 