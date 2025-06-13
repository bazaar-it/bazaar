import { BaseMCPTool } from "~/tools/helpers/base";
import { layoutGenerator } from "./add_helpers/layoutGeneratorNEW";
import { codeGenerator } from "./add_helpers/CodeGeneratorNEW";
import { imageToCodeGenerator } from "./add_helpers/ImageToCodeGeneratorNEW";
import type { AddToolInput, AddToolOutput } from "~/tools/helpers/types";
import { addToolInputSchema } from "~/tools/helpers/types";

/**
 * ADD Tool - Pure function that generates scene content
 * NO DATABASE ACCESS - only generation
 * Sprint 42: Refactored to pure function
 */
export class AddTool extends BaseMCPTool<AddToolInput, AddToolOutput> {
  name = "ADD";
  description = "Generate new motion graphics scene content";
  inputSchema = addToolInputSchema;

  protected async execute(input: AddToolInput): Promise<AddToolOutput> {
    try {
      // Handle image-based scene creation
      if (input.imageUrls && input.imageUrls.length > 0) {
        return await this.generateFromImages(input);
      }
      
      // Handle text-based scene creation
      return await this.generateFromText(input);
    } catch (error) {
      return {
        success: false,
        reasoning: `Failed to generate scene: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as AddToolOutput;
    }
  }

  /**
   * Generate scene from text prompt
   * PURE FUNCTION - no side effects
   */
  private async generateFromText(input: AddToolInput): Promise<AddToolOutput> {
    // Generate function name (deterministic based on input)
    const functionName = this.generateFunctionName(input.projectId, input.sceneNumber);
    
    // Step 1: Generate layout JSON
    const layoutResult = await layoutGenerator.generateLayout({
      userPrompt: input.userPrompt,
      projectId: input.projectId,
      previousSceneJson: input.previousSceneContext?.style,
      visionAnalysis: input.visionAnalysis,
    });

    // Step 2: Generate React code from layout
    const codeResult = await codeGenerator.generateCode({
      userPrompt: input.userPrompt,
      layoutJson: layoutResult.layoutJson,
      functionName: functionName,
      projectId: input.projectId,
    });

    // Return generated content - NO DATABASE!
    return {
      success: true,
      tsxCode: codeResult.code,         // ✓ Correct field name
      name: codeResult.name,
      duration: codeResult.duration,    // In frames
      layoutJson: JSON.stringify(layoutResult.layoutJson),
      props: codeResult.props,
      reasoning: `Generated ${codeResult.name}: ${codeResult.reasoning}`,
      chatResponse: `I've created ${codeResult.name} with ${codeResult.elements?.length || 0} elements`,
      debug: {
        layoutGeneration: layoutResult.debug,
        codeGeneration: codeResult.debug,
      },
    };
  }

  /**
   * Generate scene from images
   * PURE FUNCTION - no side effects
   */
  private async generateFromImages(input: AddToolInput): Promise<AddToolOutput> {
    if (!input.imageUrls || input.imageUrls.length === 0) {
      throw new Error("No images provided");
    }

    const functionName = this.generateFunctionName(input.projectId, input.sceneNumber);

    // Generate code directly from images
    const codeResult = await imageToCodeGenerator.generateCodeFromImage({
      imageUrls: input.imageUrls,
      userPrompt: input.userPrompt,
      functionName: functionName,
      visionAnalysis: input.visionAnalysis,
    });

    // Return generated content - NO DATABASE!
    return {
      success: true,
      tsxCode: codeResult.code,         // ✓ Correct field name
      name: codeResult.name,
      duration: codeResult.duration,    // In frames
      reasoning: `Generated from ${input.imageUrls.length} image(s): ${codeResult.reasoning}`,
      chatResponse: `I've created ${codeResult.name} based on your image(s)`,
      debug: {
        imageGeneration: codeResult.debug,
      },
    };
  }

  /**
   * Generate deterministic function name
   */
  private generateFunctionName(projectId: string, sceneNumber?: number): string {
    // Use projectId hash for consistency
    const projectHash = projectId.slice(-6);
    const sceneNum = sceneNumber || 1;
    return `Scene${sceneNum}_${projectHash}`;
  }
}

// Export singleton instance
export const addTool = new AddTool();
