import { BaseMCPTool } from "~/tools/helpers/base";
import { creativeEditor } from "./edit_helpers/CreativeEditorNEW";
import { surgicalEditor } from "./edit_helpers/SurgicalEditorNEW";
import { errorFixer } from "./edit_helpers/ErrorFixerNEW";
import type { EditToolInput, EditToolOutput } from "~/tools/helpers/types";
import { editToolInputSchema } from "~/tools/helpers/types";

/**
 * EDIT Tool - Pure function that transforms scene content
 * NO DATABASE ACCESS - only transformation
 * Sprint 42: Refactored to pure function
 */
export class EditTool extends BaseMCPTool<EditToolInput, EditToolOutput> {
  name = "EDIT";
  description = "Transform existing scene content based on user prompt";
  inputSchema = editToolInputSchema;

  protected async execute(input: EditToolInput): Promise<EditToolOutput> {
    try {
      // Validate input
      if (!input.tsxCode) {  // ✓ Using correct field name
        throw new Error("No scene code provided");
      }

      let result: EditToolOutput;

      switch (input.editType) {
        case 'creative':
          result = await this.creativeEdit(input);
          break;
          
        case 'surgical':
          result = await this.surgicalEdit(input);
          break;
          
        case 'error-fix':
          result = await this.fixErrors(input);
          break;
          
        default:
          throw new Error(`Unknown edit type: ${input.editType}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        reasoning: `Edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as EditToolOutput;
    }
  }

  private async creativeEdit(input: EditToolInput): Promise<EditToolOutput> {
    const functionName = this.extractFunctionName(input.tsxCode);
    
    const result = await creativeEditor.executeEdit({
      userPrompt: input.userPrompt,
      tsxCode: input.tsxCode,           // ✓ Correct field name
      functionName: functionName,
      imageUrls: input.imageUrls,
      visionAnalysis: input.visionAnalysis,
    });

    return {
      success: true,
      tsxCode: result.code,              // ✓ Correct field name
      duration: result.duration,         // Only if changed
      props: result.props,
      reasoning: result.reasoning,
      chatResponse: `I've updated the scene: ${result.changes?.join(', ') || 'Made creative improvements'}`,
      changesApplied: result.changes,
    };
  }

  private async surgicalEdit(input: EditToolInput): Promise<EditToolOutput> {
    const functionName = this.extractFunctionName(input.tsxCode);
    
    const result = await surgicalEditor.executeEdit({
      userPrompt: input.userPrompt,
      tsxCode: input.tsxCode,           // ✓ Correct field name
      functionName: functionName,
      targetElement: this.extractTargetElement(input.userPrompt),
    });

    return {
      success: true,
      tsxCode: result.code,              // ✓ Correct field name
      reasoning: result.reasoning,
      chatResponse: `Made precise edit: ${result.changeDescription}`,
      changesApplied: [result.changeDescription],
    };
  }

  private async fixErrors(input: EditToolInput): Promise<EditToolOutput> {
    const result = await errorFixer.fixErrors({
      tsxCode: input.tsxCode,           // ✓ Correct field name
      errorDetails: input.errorDetails || 'Unknown error',
      userPrompt: input.userPrompt,
    });

    return {
      success: true,
      tsxCode: result.code,              // ✓ Correct field name
      reasoning: result.reasoning,
      chatResponse: `Fixed errors: ${result.fixesApplied?.join(', ') || 'Corrected issues'}`,
      changesApplied: result.fixesApplied,
    };
  }

  private extractFunctionName(tsxCode: string): string {
    const match = tsxCode.match(/function\s+(\w+)|const\s+(\w+)\s*=/);
    return match?.[1] || match?.[2] || 'Scene';
  }

  private extractTargetElement(prompt: string): string | undefined {
    // Simple extraction logic
    const match = prompt.match(/(?:the|change|update|edit)\s+(\w+)/i);
    return match?.[1];
  }
}

// Export singleton instance
export const editTool = new EditTool();
