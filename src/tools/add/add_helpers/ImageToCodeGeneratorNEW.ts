import { codeGenerator } from "./CodeGeneratorNEW";
import type { ImageToCodeInput, CodeGenerationOutput } from "~/tools/helpers/types";

/**
 * Image-to-Code Generator Service
 * Handles direct image-to-code generation bypassing layout JSON
 */
export class ImageToCodeGeneratorService {
  /**
   * Generate React code directly from images
   */
  async generateCodeFromImage(input: ImageToCodeInput): Promise<CodeGenerationOutput> {
    try {
      const result = await codeGenerator.generateCodeFromImage(input);

      return {
        code: result.code,
        name: result.name,
        duration: result.duration,
        reasoning: result.reasoning,
        debug: result.debug,
      };
    } catch (error) {
      throw new Error(`Image-to-code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const imageToCodeGenerator = new ImageToCodeGeneratorService();
