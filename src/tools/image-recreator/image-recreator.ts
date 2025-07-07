import { BaseMCPTool } from "~/tools/helpers/base";
import { codeGenerator } from "~/tools/add/add_helpers/CodeGeneratorNEW";
import type { ImageRecreatorToolInput, ImageRecreatorToolOutput } from "~/tools/helpers/types";
import { imageRecreatorToolInputSchema } from "~/tools/helpers/types";

/**
 * Image Recreator Tool - Now uses unified code processor
 * Simple and consistent with other tools
 */
export class ImageRecreatorTool extends BaseMCPTool<ImageRecreatorToolInput, ImageRecreatorToolOutput> {
  name = "IMAGE_RECREATOR";
  description = "Recreate images as motion graphics scenes";
  inputSchema = imageRecreatorToolInputSchema;

  protected async execute(input: ImageRecreatorToolInput): Promise<ImageRecreatorToolOutput> {
    console.log('🖼️ [IMAGE RECREATOR - UNIFIED] Recreating image as motion graphics');
    
    if (!input.imageUrls || input.imageUrls.length === 0) {
      return {
        success: false,
        tsxCode: '',
        name: 'Failed Image Recreation',
        duration: 180,
        error: 'No images provided',
        reasoning: 'Image recreation requires at least one image'
      };
    }
    
    try {
      // Generate unique function name
      const functionName = this.generateFunctionName();
      
      // Use unified processor for image recreation scenes
      const result = await codeGenerator.generateImageRecreationScene({
        userPrompt: input.userPrompt,
        functionName: functionName,
        imageUrls: input.imageUrls,
        projectFormat: input.projectFormat,
      });
      
      return {
        success: true,
        tsxCode: result.code,
        name: result.name,
        duration: result.duration,
        reasoning: result.reasoning,
        chatResponse: `🎨 Created image recreation: "${result.name}"`,
        scene: {
          tsxCode: result.code,
          name: result.name,
          duration: result.duration,
        },
      };

    } catch (error) {
      console.error('🚨 [IMAGE RECREATOR] Error:', error);
      return {
        success: false,
        tsxCode: '',
        name: 'Failed Image Recreation',
        duration: 180,
        error: error instanceof Error ? error.message : 'Image recreation failed',
        reasoning: 'Failed to generate image recreation',
        chatResponse: '❌ Image recreation failed due to an unexpected error',
      };
    }
  }

  /**
   * Generate unique component name using a stable ID
   */
  private generateFunctionName(): string {
    const uniqueId = this.generateUniqueId();
    return `Scene_${uniqueId}`;
  }

  /**
   * Generate a unique 8-character ID
   */
  private generateUniqueId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return (timestamp + random).substring(0, 8);
  }
}

export const imageRecreatorTool = new ImageRecreatorTool(); 