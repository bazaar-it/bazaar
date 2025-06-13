import { BaseMCPTool } from "~/tools/helpers/base";
import { creativeEditor } from "./edit_helpers/CreativeEditorNEW";
import { BaseEditor } from "./edit_helpers/BaseEditorNEW";
import { surgicalEditor } from "./edit_helpers/SurgicalEditorNEW";
import { db } from "~/server/db";
import { scenes } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { EditToolInput, EditToolOutput } from "~/tools/helpers/types";
import { editToolInputSchema } from "~/tools/helpers/types";

/**
 * EDIT Tool - Modifies existing scenes based on user requests
 * Supports creative, surgical, and error-fix editing modes
 */
export class EditTool extends BaseMCPTool<EditToolInput, EditToolOutput> {
  name = "EDIT";
  description = "Edit existing motion graphics scenes with creative, surgical, or error-fix modifications";
  inputSchema = editToolInputSchema;

  protected async execute(input: EditToolInput): Promise<EditToolOutput> {
    try {
      // Route to appropriate editor based on edit type
      console.log('==================== editTool reached:');
      let result;
      
      
      switch (input.editType) {
        case 'creative':
          result = await creativeEditor.executeEdit({
            userPrompt: input.userPrompt,
            existingCode: input.existingCode,
            functionName: this.extractFunctionName(input.existingCode),
            imageUrls: input.imageUrls,
            visionAnalysis: input.visionAnalysis,
          });
          break;
          
        case 'surgical':
          result = await surgicalEditor.executeEdit({
            userPrompt: input.userPrompt,
            existingCode: input.existingCode,
            functionName: this.extractFunctionName(input.existingCode),
          });
          break;
          
        case 'error-fix':
          // For error fixes, we can use surgical editor as it handles precise modifications
          result = await surgicalEditor.executeEdit({
            userPrompt: input.userPrompt || 'Fix errors in this code',
            existingCode: input.existingCode,
            functionName: this.extractFunctionName(input.existingCode),
          });
          break;
          
        default:
          throw new Error(`Unknown edit type: ${input.editType}`);
      }

      // Update scene in database
      await this.updateSceneInDatabase(input.sceneId, {
        tsxCode: result.code,
        name: result.name,
        duration: result.duration,
      });

      return {
        success: true,
        tsxCode: result.code,
        name: result.name,
        duration: result.duration,
        originalCode: input.existingCode,
        editType: input.editType,
        reasoning: result.reasoning,
        debug: result.debug,
      };
    } catch (error) {
      return {
        success: false,
        tsxCode: input.existingCode, // Return original code on error
        name: this.extractFunctionName(input.existingCode),
        duration: 180,
        reasoning: `Edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract function name from existing code
   */
  private extractFunctionName(code: string): string {
    const match = code.match(/export default function (\w+)/);
    return match?.[1] || 'UnknownScene';
  }

  /**
   * Update scene in database
   */
  private async updateSceneInDatabase(sceneId: string, updates: {
    tsxCode: string;
    name: string;
    duration: number;
  }) {
    await db.update(scenes)
      .set({
        tsxCode: updates.tsxCode,
        name: updates.name,
        duration: updates.duration,
        updatedAt: new Date(),
      })
      .where(eq(scenes.id, sceneId));
  }
}

// Export singleton instance
export const editTool = new EditTool();
