import { z } from "zod";
import { BaseMCPTool } from "./base";

const deleteSceneInputSchema = z.object({
  sceneId: z.string().describe("ID of scene to delete"),
  userPrompt: z.string().describe("User's delete request for context"),
  sessionId: z.string().describe("Project/session identifier"),
  userId: z.string().describe("User identifier"),
});

type DeleteSceneInput = z.infer<typeof deleteSceneInputSchema>;

interface DeleteSceneOutput {
  success: boolean;
  deletedSceneId: string;
  message: string;
}

export class DeleteSceneTool extends BaseMCPTool<DeleteSceneInput, DeleteSceneOutput> {
  name = "deleteScene";
  description = "Delete a scene by ID. Use when user explicitly requests scene removal.";
  inputSchema = deleteSceneInputSchema;
  
  protected async execute(input: DeleteSceneInput): Promise<DeleteSceneOutput> {
    // TODO PHASE2: Implement actual database deletion
    // For now, return success to indicate the tool was called correctly
    return {
      success: true,
      deletedSceneId: input.sceneId,
      message: `Scene ${input.sceneId} marked for deletion`,
    };
  }
}

export const deleteSceneTool = new DeleteSceneTool(); 