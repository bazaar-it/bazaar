import { BaseMCPTool } from "~/tools/helpers/base";
import { codeGenerator } from "./add_helpers/CodeGeneratorNEW";
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
    console.log('\n🔨 [ADD TOOL - PURE FUNCTION] === EXECUTING ===');
    console.log('🔨 [ADD TOOL] Input:', {
      prompt: input.userPrompt.substring(0, 50) + '...',
      hasImages: !!input.imageUrls?.length,
      sceneNumber: input.sceneNumber,
      hasPreviousScene: !!input.previousSceneContext
    });
    console.log('🔨 [ADD TOOL] NOTE: This is a PURE FUNCTION - no database access!');
    
    try {
      // Handle image-based scene creation
      if (input.imageUrls && input.imageUrls.length > 0) {
        console.log('🔨 [ADD TOOL] Using image-based generation for', input.imageUrls.length, 'images');
        return await this.generateFromImages(input);
      }
      
      // Handle text-based scene creation
      console.log('🔨 [ADD TOOL] Using text-based generation');
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
    
    // If we have a previous scene with code, use it as reference
    if (input.previousSceneContext?.tsxCode) {
      console.log('🔨 [ADD TOOL] Previous scene detected - using code reference');
      
      // Generate code directly using previous scene as reference
      const codeResult = await codeGenerator.generateCodeWithReference({
        userPrompt: input.userPrompt,
        functionName: functionName,
        projectId: input.projectId,
        previousSceneCode: input.previousSceneContext.tsxCode,
      });
      
      const result = {
        success: true,
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
        reasoning: `Generated new scene based on previous scene: ${codeResult.reasoning}`,
        chatResponse: `I've created a new scene based on the previous scene style`,
        scene: {
          tsxCode: codeResult.code,
          name: codeResult.name,
          duration: codeResult.duration,
        },
        debug: {
          usedPreviousScene: true,
          codeGeneration: codeResult.debug,
        },
      };
      
      console.log('✅ [ADD TOOL] Finished with reference - returning result:', {
        name: result.name,
        duration: result.duration,
        codeLength: result.tsxCode.length,
        firstLine: result.tsxCode.split('\n')[0]
      });
      
      return result;
    }
    
    // DIRECT CODE GENERATION - Skip layout entirely!
    console.log('⚡ [ADD TOOL] Using DIRECT code generation - no layout step!');
    
    const codeResult = await codeGenerator.generateCodeDirect({
      userPrompt: input.userPrompt,
      functionName: functionName,
      projectId: input.projectId,
    });

    // Return generated content - NO DATABASE!
    const result = {
      success: true,
      tsxCode: codeResult.code,         // ✓ Correct field name
      name: codeResult.name,
      duration: codeResult.duration,    // In frames
      reasoning: `Generated ${codeResult.name}: ${codeResult.reasoning}`,
      chatResponse: `I've created ${codeResult.name}`,
      scene: {
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
      },
      debug: {
        method: 'direct',
        codeGeneration: codeResult.debug,
      },
    };
    
    console.log('✅ [ADD TOOL] Finished direct generation - returning result:', {
      name: result.name,
      duration: result.duration,
      codeLength: result.tsxCode.length,
      firstLine: result.tsxCode.split('\n')[0]
    });
    
    return result;
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
    const codeResult = await codeGenerator.generateCodeFromImage({
      imageUrls: input.imageUrls,
      userPrompt: input.userPrompt,
      functionName: functionName,
      visionAnalysis: input.visionAnalysis,
    });

    // Return generated content - NO DATABASE!
    const result = {
      success: true,
      tsxCode: codeResult.code,         // ✓ Correct field name
      name: codeResult.name,
      duration: codeResult.duration,    // In frames
      reasoning: `Generated from ${input.imageUrls.length} image(s): ${codeResult.reasoning}`,
      chatResponse: `I've created ${codeResult.name} based on your image(s)`,
      scene: {
        tsxCode: codeResult.code,
        name: codeResult.name,
        duration: codeResult.duration,
      },
      debug: {
        imageGeneration: codeResult.debug,
      },
    };
    
    console.log('✅ [ADD TOOL] Finished image generation - returning result:', {
      name: result.name,
      duration: result.duration,
      codeLength: result.tsxCode.length,
      imageCount: input.imageUrls.length
    });
    
    return result;
  }

  /**
   * Generate unique component name using a stable ID
   * This prevents naming collisions when scenes are deleted/reordered
   */
  private generateFunctionName(projectId: string, sceneNumber?: number): string {
    // Generate a unique 8-character ID for this scene
    // This ensures component names never collide, even after deletions
    const uniqueId = this.generateUniqueId();
    return `Scene_${uniqueId}`;
  }

  /**
   * Generate a unique 8-character ID
   */
  private generateUniqueId(): string {
    // Use timestamp + random for uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return (timestamp + random).substring(0, 8);
  }
}

// Export singleton instance
export const addTool = new AddTool();
