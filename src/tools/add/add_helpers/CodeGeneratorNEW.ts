import { AIClientService, type AIMessage } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { getParameterizedPrompt } from "~/config/prompts.config";
import { extractDurationFromCode, analyzeDuration } from "~/lib/utils/codeDurationExtractor";
import type { CodeGenerationInput, CodeGenerationOutput, ImageToCodeInput } from "~/tools/helpers/types";

/**
 * Code Generator Service - converts JSON specifications to React/Remotion code
 * Second step of the two-step pipeline: JSON Spec → React Code
 */
export class CodeGeneratorService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * Generate React code from layout JSON
   */
  async generateCode(input: CodeGenerationInput): Promise<CodeGenerationOutput> {
    const config = getModel('codeGenerator');
    const prompt = this.buildCodePrompt(input);

    console.log('==================== codeGenerator reached:');
    console.log('==================== generateCode reached:');
    
    try {
      const messages = [
        { role: 'user' as const, content: prompt.user }
      ];
      
      const response = await AIClientService.generateResponse(
        config,
        messages,
        { role: 'system', content: prompt.system }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      // Remove markdown code fences if present
      let cleanCode = rawOutput.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // Ensure single export default only
      if (cleanCode.includes('export default function') && cleanCode.includes('function SingleSceneComposition')) {
        const sceneMatch = cleanCode.match(/const \{[^}]+\} = window\.Remotion;[\s\S]*?export default function \w+\(\)[^{]*\{[\s\S]*?\n\}/);
        if (sceneMatch) {
          cleanCode = sceneMatch[0];
        }
      }
      
      // Extract actual duration from generated code
      const durationAnalysis = analyzeDuration(cleanCode);
      
      return {
        code: cleanCode,
        name: input.functionName,
        duration: durationAnalysis.frames,
        reasoning: `Code generated with ${durationAnalysis.frames} frames duration (${durationAnalysis.confidence} confidence from ${durationAnalysis.source})`,
        debug: {
          prompt,
          response: rawOutput,
          parsed: { 
            code: cleanCode, 
            validated: false,
            durationAnalysis 
          },
        },
      };
    } catch (error) {
      // Return error code that auto-fix can work with
      const errorCode = `const { AbsoluteFill } = window.Remotion;
// CodeGenerator error: ${error instanceof Error ? error.message : 'Unknown error'}
// Layout JSON was: ${JSON.stringify(input.layoutJson, null, 2)}
// User wanted: ${input.userPrompt}

export default function ${input.functionName}() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#ff0000" }}>
      <div>CodeGenerator Error - Auto Fix Available</div>
    </AbsoluteFill>
  );
}`;

      const fallbackDuration = extractDurationFromCode(errorCode);
      
      return {
        code: errorCode,
        name: input.functionName,
        duration: fallbackDuration,
        reasoning: "CodeGenerator encountered an error - auto-fix can restore from layout JSON",
        debug: { 
          error: `${error instanceof Error ? error.message : 'Unknown error'}. Fallback duration: ${fallbackDuration} frames. Layout: ${JSON.stringify(input.layoutJson, null, 2)}. User prompt: ${input.userPrompt}`
        }
      };
    }
  }

  /**
   * Generate code directly from images
   */
  async generateCodeFromImage(input: ImageToCodeInput): Promise<CodeGenerationOutput> {
    try {
      const config = getModel('codeGenerator');
      const prompt = this.buildImageToCodePrompt(input.userPrompt, input.functionName, input.visionAnalysis);
      
      console.log('==================== codeGenerator reached:');
      console.log('==================== generateCodeFromImage reached:');
      // Use centralized vision API
      const visionMessagesContent: AIMessage['content'] = [
        { type: 'text', text: prompt }
      ];

      for (const url of input.imageUrls) {
        visionMessagesContent.push({ 
          type: 'image_url', 
          image_url: { url } 
        });
      }

      const response = await AIClientService.generateVisionResponse(
        config,
        visionMessagesContent
      );

      // Clean up code
      let cleanCode = response?.content?.trim() || '';
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // Extract duration from image-generated code
      const durationAnalysis = analyzeDuration(cleanCode);
      
      return {
        code: cleanCode,
        name: input.functionName,
        duration: durationAnalysis.frames,
        reasoning: `Generated motion graphics directly from image analysis with ${durationAnalysis.frames} frames duration`,
        debug: {
          prompt: { system: 'Vision-based generation', user: `${input.imageUrls.length} images provided` },
          response: response?.content || '',
          parsed: { code: cleanCode, imageCount: input.imageUrls.length, durationAnalysis },
        },
      };
    } catch (error) {
      const errorCode = `const { AbsoluteFill } = window.Remotion;
// Image-to-code generation error: ${error instanceof Error ? error.message : 'Unknown error'}
// User wanted: ${input.userPrompt}
// Images provided: ${input.imageUrls.length}

export default function ${input.functionName}() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#ffffff", fontSize: "2rem", textAlign: "center" }}>
        <div>Image Analysis Error</div>
        <div style={{ fontSize: "1rem", opacity: 0.7, marginTop: "1rem" }}>Auto-fix available</div>
      </div>
    </AbsoluteFill>
  );
}`;

      const fallbackDuration = extractDurationFromCode(errorCode);
      
      return {
        code: errorCode,
        name: input.functionName,
        duration: fallbackDuration,
        reasoning: "Image-to-code generation failed - auto-fix available",
        debug: { 
          error: `${error instanceof Error ? error.message : 'Unknown error'}. Fallback duration: ${fallbackDuration} frames. Images: ${input.imageUrls.length}. User prompt: ${input.userPrompt}`
        }
      };
    }
  }

  private buildCodePrompt(input: CodeGenerationInput): { system: string; user: string } {
    const { layoutJson, userPrompt, functionName } = input;

    console.log('==================== codeGenerator reached:');
    console.log('==================== buildCodePrompt reached:');
    
    const systemPrompt = getParameterizedPrompt('CODE_GENERATOR', {
      FUNCTION_NAME: functionName,
      USER_PROMPT: userPrompt,
    });
    
    const user = JSON.stringify(layoutJson, null, 2);
    
    return { system: systemPrompt.content, user };
  }

  private buildImageToCodePrompt(userPrompt: string, functionName: string, visionAnalysis?: any): string {
    return `Generate React/Remotion motion graphics code directly from the provided images.

Function name: ${functionName}
User request: "${userPrompt}"
${visionAnalysis ? `Vision analysis: ${JSON.stringify(visionAnalysis, null, 2)}` : ''}

Create professional motion graphics code that brings the images to life with smooth animations.
Use React/Remotion components and ensure the code is complete and executable.`;
  }
}

// Export singleton instance
export const codeGenerator = new CodeGeneratorService();
