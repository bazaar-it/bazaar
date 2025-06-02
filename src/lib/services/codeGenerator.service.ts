// src/lib/services/codeGenerator.service.ts
import { type SceneLayout } from "~/lib/schemas/sceneLayout";
import { AIClientService } from "~/lib/services/aiClient.service";
import { getModel } from "~/config/models.config";
import { getParameterizedPrompt } from "~/config/prompts.config";

export interface CodeGeneratorInput {
  layoutJson: any;  // No schema - Layout LLM freedom
  userPrompt: string; // For context
  functionName: string;
}

export interface CodeGeneratorOutput {
  code: string;
  name: string;
  duration: number;
  reasoning: string;
  debug: {
    prompt?: { system: string; user: string };
    response?: string;
    parsed?: any;
    error?: string;
  };
}

export interface CodeGeneratorFromImageInput {
  imageUrls: string[];
  userPrompt: string;
  functionName: string;
}

export interface CodeGeneratorEditWithImageInput {
  imageUrls: string[];
  existingCode: string;
  userPrompt: string;
  functionName: string;
}

/**
 * CodeGenerator service - converts JSON specifications to React/Remotion code
 * Second step of the two-step pipeline: JSON Spec → React Code
 * 
 * NEW APPROACH: No validation or fallbacks - let auto-fix handle broken code
 * This preserves the good Layout JSON data for fixBrokenScene tool to work with
 * 
 * NEW: Direct image-to-code generation bypassing JSON intermediary
 */
export class CodeGeneratorService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  async generateCode(input: CodeGeneratorInput): Promise<CodeGeneratorOutput> {
    const config = getModel('codeGenerator');
    const prompt = this.buildCodePrompt(input);
    
    this.DEBUG && console.log(`[CodeGenerator] Starting code generation for: ${input.functionName}`);
    this.DEBUG && console.log(`[CodeGenerator] User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    this.DEBUG && console.log(`[CodeGenerator] Scene type: ${input.layoutJson.sceneType || 'unknown'}`);
    this.DEBUG && console.log(`[CodeGenerator] Elements count: ${input.layoutJson.elements?.length || 0}`);
    this.DEBUG && console.log(`[CodeGenerator] Using model: ${config.provider}/${config.model}`);
    
    // NEW: Log the received JSON for debugging
    if (this.DEBUG) {
      console.log(`\n[CodeGenerator] RECEIVED LAYOUT JSON:`);
      console.log('='.repeat(80));
      console.log(JSON.stringify(input.layoutJson, null, 2));
      console.log('='.repeat(80));
      console.log(`[CodeGenerator] JSON size: ${JSON.stringify(input.layoutJson).length} characters`);
      console.log(`[CodeGenerator] Will combine this JSON with user prompt: "${input.userPrompt.substring(0, 50)}..."\n`);
    }
    
    try {
      this.DEBUG && console.log(`[CodeGenerator] Calling ${config.provider} LLM...`);
      
      const messages = [
        { role: 'user' as const, content: prompt.user }
      ];
      
      const response = await AIClientService.generateResponse(
        config,
        messages,
        { role: 'system', content: prompt.system }
      );
      
      const rawOutput = response.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      this.DEBUG && console.log(`[CodeGenerator] Raw LLM response length: ${rawOutput.length} chars`);
      
      // CRITICAL FIX: Remove markdown code fences if present
      let cleanCode = rawOutput.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // CRITICAL FIX: Ensure single export default only
      if (cleanCode.includes('export default function') && cleanCode.includes('function SingleSceneComposition')) {
        this.DEBUG && console.warn(`[CodeGenerator] Detected wrapper function pattern - extracting scene function only`);
        const sceneMatch = cleanCode.match(/const \{[^}]+\} = window\.Remotion;[\s\S]*?export default function \w+\(\)[^{]*\{[\s\S]*?\n\}/);
        if (sceneMatch) {
          cleanCode = sceneMatch[0];
        }
      }
      
      // NEW APPROACH: Always return the generated code, let auto-fix handle any issues
      this.DEBUG && console.log(`[CodeGenerator] Code generation completed for ${input.functionName}`);
      this.DEBUG && console.log(`[CodeGenerator] If code has issues, auto-fix will handle it (better than fallback)`);
      
      return {
        code: cleanCode,
        name: input.functionName,
        duration: 180,
        reasoning: "Code generated - auto-fix will handle any formatting issues",
        debug: {
          prompt,
          response: rawOutput,
          parsed: { code: cleanCode, validated: false }, // Mark as not validated since we skip validation
        },
      };
    } catch (error) {
      this.DEBUG && console.error("[CodeGenerator] Error:", error);
      
      // NEW: Even on error, return something that auto-fix can work with
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

      return {
        code: errorCode,
        name: input.functionName,
        duration: 180,
        reasoning: "CodeGenerator encountered an error - auto-fix can restore from layout JSON",
        debug: { 
          error: `${error instanceof Error ? error.message : 'Unknown error'}. Layout: ${JSON.stringify(input.layoutJson, null, 2)}. User prompt: ${input.userPrompt}`
        }
      };
    }
  }
  
  private buildCodePrompt(input: CodeGeneratorInput): { system: string; user: string } {
    const { layoutJson, userPrompt, functionName } = input;
    
    const systemPrompt = getParameterizedPrompt('CODE_GENERATOR', {
      FUNCTION_NAME: functionName,
      USER_PROMPT: userPrompt,
    });
    
    const user = JSON.stringify(layoutJson, null, 2);
    
    return { system: systemPrompt.content, user };
  }

  /**
   * NEW: Generate motion graphics code directly from images
   * Bypasses JSON intermediary for pure image-to-animation creation
   */
  async generateCodeFromImage(input: CodeGeneratorFromImageInput): Promise<CodeGeneratorOutput> {
    const { imageUrls, userPrompt, functionName } = input;
    
    this.DEBUG && console.log(`[CodeGenerator] Direct image-to-code generation for: ${functionName}`);
    this.DEBUG && console.log(`[CodeGenerator] Processing ${imageUrls.length} image(s)`);
    this.DEBUG && console.log(`[CodeGenerator] User context: "${userPrompt.substring(0, 100)}..."`);
    
    try {
      // 🚨 NEW: Use centralized vision API instead of direct OpenAI calls
      const config = getModel('codeGenerator');
      const prompt = this.buildImageToCodePrompt(userPrompt, functionName);
      
      this.DEBUG && console.log(`[CodeGenerator] Using centralized vision API with ${config.provider}/${config.model}`);
      
      // Use centralized vision API
      const response = await AIClientService.generateCodeFromImages(
        config,
        imageUrls,
        prompt,
        undefined // No separate system prompt for vision
      );
      
      this.DEBUG && console.log(`[CodeGenerator] Vision response length: ${response.content.length} chars`);
      
      // 🚨 NEW: Log model usage for debugging
      if (this.DEBUG) {
        AIClientService.logModelUsage(config, response.usage);
      }
      
      // Clean up code (remove markdown fences)
      let cleanCode = response.content.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      this.DEBUG && console.log(`[CodeGenerator] Direct image-to-code completed for ${functionName}`);
      
      return {
        code: cleanCode,
        name: functionName,
        duration: 180,
        reasoning: "Generated motion graphics directly from image analysis",
        debug: {
          prompt: { system: 'Vision-based generation', user: `${imageUrls.length} images provided` },
          response: response.content,
          parsed: { code: cleanCode, imageCount: imageUrls.length },
        },
      };
    } catch (error) {
      this.DEBUG && console.error("[CodeGenerator] Image-to-code error:", error);
      
      const errorCode = `const { AbsoluteFill } = window.Remotion;
// Image-to-code generation error: ${error instanceof Error ? error.message : 'Unknown error'}
// User wanted: ${userPrompt}
// Images provided: ${imageUrls.length}

export default function ${functionName}() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#ffffff", fontSize: "2rem", textAlign: "center" }}>
        <div>Image Analysis Error</div>
        <div style={{ fontSize: "1rem", opacity: 0.7, marginTop: "1rem" }}>Auto-fix available</div>
      </div>
    </AbsoluteFill>
  );
}`;

      return {
        code: errorCode,
        name: functionName,
        duration: 180,
        reasoning: "Image-to-code generation failed - auto-fix available",
        debug: { 
          error: `${error instanceof Error ? error.message : 'Unknown error'}. Images: ${imageUrls.length}. User prompt: ${userPrompt}`
        }
      };
    }
  }

  /**
   * NEW: Edit existing scene code using image reference for styling
   * For "make the chat panel look more like this" type requests
   */
  async editCodeWithImage(input: CodeGeneratorEditWithImageInput): Promise<CodeGeneratorOutput> {
    const { imageUrls, userPrompt, functionName, existingCode } = input;
    
    this.DEBUG && console.log(`[CodeGenerator] Image-guided code editing for: ${functionName}`);
    this.DEBUG && console.log(`[CodeGenerator] Using ${imageUrls.length} reference image(s)`);
    this.DEBUG && console.log(`[CodeGenerator] Edit request: "${userPrompt.substring(0, 100)}..."`);
    
    try {
      // 🚨 NEW: Use centralized vision API instead of direct OpenAI calls
      const config = getModel('codeGenerator');
      const prompt = this.buildImageGuidedEditPrompt(userPrompt, functionName, existingCode);
      
      this.DEBUG && console.log(`[CodeGenerator] Using centralized vision API for editing with ${config.provider}/${config.model}`);
      
      // Use centralized vision API
      const response = await AIClientService.generateCodeFromImages(
        config,
        imageUrls,
        prompt,
        undefined // No separate system prompt for vision
      );
      
      this.DEBUG && console.log(`[CodeGenerator] Vision edit response length: ${response.content.length} chars`);
      
      // 🚨 NEW: Log model usage for debugging
      if (this.DEBUG) {
        AIClientService.logModelUsage(config, response.usage);
      }
      
      // Clean up code
      let cleanCode = response.content.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      this.DEBUG && console.log(`[CodeGenerator] Image-guided editing completed for ${functionName}`);
      
      return {
        code: cleanCode,
        name: functionName,
        duration: 180,
        reasoning: "Modified existing code based on image reference styling",
        debug: {
          prompt: { system: 'Image-guided editing', user: `Edit with ${imageUrls.length} images` },
          response: response.content,
          parsed: { code: cleanCode, editType: "image-guided" },
        },
      };
    } catch (error) {
      this.DEBUG && console.error("[CodeGenerator] Image-guided edit error:", error);
      
      // Return original code on error
      return {
        code: existingCode,
        name: functionName,
        duration: 180,
        reasoning: "Image-guided edit failed - returned original code",
        debug: { 
          error: `${error instanceof Error ? error.message : 'Unknown error'}. Images: ${imageUrls.length}. User prompt: ${userPrompt}`
        }
      };
    }
  }

  /**
   * NEW: Build prompt for direct image-to-motion-graphics generation
   */
  private buildImageToCodePrompt(userPrompt: string, functionName: string): string {
    const prompt = getParameterizedPrompt('IMAGE_TO_CODE', {
      FUNCTION_NAME: functionName,
      USER_PROMPT: userPrompt,
    });
    return prompt.content;
  }

  /**
   * NEW: Build prompt for image-guided code editing
   */
  private buildImageGuidedEditPrompt(userPrompt: string, functionName: string, existingCode: string): string {
    const prompt = getParameterizedPrompt('IMAGE_GUIDED_EDIT', {
      FUNCTION_NAME: functionName,
      USER_PROMPT: userPrompt,
      EXISTING_CODE: existingCode,
    });
    return prompt.content;
  }
}

// Export singleton instance
export const codeGeneratorService = new CodeGeneratorService(); 