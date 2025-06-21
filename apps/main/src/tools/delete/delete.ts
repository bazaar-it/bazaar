import { BaseMCPTool } from "~/tools/helpers/base";
import type { DeleteToolInput, DeleteToolOutput } from "~/tools/helpers/types";
import { deleteToolInputSchema } from "~/tools/helpers/types";

/**
 * DELETE Tool - Pure function that validates deletion
 * NO DATABASE ACCESS - only returns deletion confirmation
 * Sprint 42: Refactored to pure function
 */
export class DeleteTool extends BaseMCPTool<DeleteToolInput, DeleteToolOutput> {
  name = "DELETE";
  description = "Validate scene deletion request";
  inputSchema = deleteToolInputSchema;

  protected async execute(input: DeleteToolInput): Promise<DeleteToolOutput> {
    try {
      // Validate deletion request
      if (!input.sceneId) {
        throw new Error("No scene ID provided for deletion");
      }

      if (!input.confirmDeletion) {
        return {
          success: false,
          reasoning: "Deletion not confirmed by user",
          chatResponse: "Please confirm you want to delete this scene",
        } as DeleteToolOutput;
      }

      // Return deletion confirmation - NO DATABASE!
      return {
        success: true,
        deletedSceneId: input.sceneId,
        reasoning: `Scene ${input.sceneId} marked for deletion`,
        chatResponse: "I'll remove that scene for you",
      };
    } catch (error) {
      return {
        success: false,
        reasoning: `Delete validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as DeleteToolOutput;
    }
  }
}

// Export singleton instance
export const deleteTool = new DeleteTool();
