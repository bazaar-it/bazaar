import { BaseMCPTool } from "~/tools/helpers/base";
import { codeGenerator } from "~/tools/add/add_helpers/CodeGeneratorNEW";
import type { TypographyToolInput, TypographyToolOutput } from "~/tools/helpers/types";
import { typographyToolInputSchema } from "~/tools/helpers/types";

/**
 * Typography Tool - Now uses unified code processor
 * Simple and consistent with other tools
 */
export class TypographyTool extends BaseMCPTool<TypographyToolInput, TypographyToolOutput> {
  name = "TYPOGRAPHY";
  description = "Generate animated text scenes";
  inputSchema = typographyToolInputSchema;

  protected async execute(input: TypographyToolInput): Promise<TypographyToolOutput> {
    console.log('🎨 [TYPOGRAPHY TOOL - UNIFIED] Generating text scene:', input.userPrompt);
    
    try {
      // Generate unique function name
      const functionName = this.generateFunctionName();
      
      // Use unified processor for typography scenes
      const result = await codeGenerator.generateTypographyScene({
        userPrompt: input.userPrompt,
        functionName: functionName,
        projectFormat: input.projectFormat,
        previousSceneContext: input.previousSceneContext,
      });
      
      return {
        success: true,
        tsxCode: result.code,
        name: result.name,
        duration: result.duration,
        reasoning: result.reasoning,
        chatResponse: `✨ Created animated text scene: "${result.name}"`,
        scene: {
          tsxCode: result.code,
          name: result.name,
          duration: result.duration,
        },
      };

    } catch (error) {
      console.error('🚨 [TYPOGRAPHY TOOL] Error:', error);
      return {
        success: false,
        tsxCode: '',
        name: 'Failed Text Scene',
        duration: 180,
        error: error instanceof Error ? error.message : 'Typography generation failed',
        reasoning: 'Failed to generate text scene',
        chatResponse: '❌ Typography generation failed due to an unexpected error',
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

export const typographyTool = new TypographyTool(); 