// src/server/services/generation/codeGenerator.service.ts
import { type SceneLayout } from "~/lib/types/video/sceneLayout";
import { AIClientService, type AIMessage } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { getParameterizedPrompt } from "~/config/prompts.config";
import { extractDurationFromCode, analyzeDuration } from "~/lib/utils/codeDurationExtractor";

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
  visionAnalysis?: any;
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
      
      // NEW: Extract actual duration from generated code instead of hardcoding 180
      const durationAnalysis = analyzeDuration(cleanCode);
      
      this.DEBUG && console.log(`[CodeGenerator] Code generation completed for ${input.functionName}`);
      this.DEBUG && console.log(`[CodeGenerator] Extracted duration: ${durationAnalysis.frames} frames (${durationAnalysis.seconds}s) - confidence: ${durationAnalysis.confidence} from ${durationAnalysis.source}`);
      this.DEBUG && console.log(`[CodeGenerator] If code has issues, auto-fix will handle it (better than fallback)`);
      
      return {
        code: cleanCode,
        name: input.functionName,
        duration: durationAnalysis.frames,
        reasoning: `Code generated with ${durationAnalysis.frames} frames duration (${durationAnalysis.confidence} confidence from ${durationAnalysis.source}) - auto-fix will handle any formatting issues`,
        debug: {
          prompt,
          response: rawOutput,
          parsed: { 
            code: cleanCode, 
            validated: false, // Mark as not validated since we skip validation
            durationAnalysis 
          },
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

      // Even for error cases, try to extract a reasonable duration
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
    const { imageUrls, userPrompt, functionName, visionAnalysis } = input;
    
    this.DEBUG && console.log(`[CodeGenerator] Direct image-to-code generation for: ${functionName}`);
    this.DEBUG && console.log(`[CodeGenerator] Processing ${imageUrls.length} image(s)`);
    this.DEBUG && console.log(`[CodeGenerator] User context: "${userPrompt.substring(0, 100)}..."`);
    if (visionAnalysis && this.DEBUG) {
      console.log(`[CodeGenerator] Using pre-computed vision analysis:`, {
        palette: visionAnalysis.palette?.join(', '),
        mood: visionAnalysis.mood,
        typography: visionAnalysis.typography,
        layoutHighlights: visionAnalysis.layoutJson ? Object.keys(visionAnalysis.layoutJson).slice(0,3).join(', ') : 'N/A',
      });
    }
    
    try {
      // 🚨 NEW: Use centralized vision API instead of direct OpenAI calls
      const config = getModel('codeGenerator');
      const prompt = this.buildImageToCodePrompt(userPrompt, functionName, visionAnalysis);
      
      this.DEBUG && console.log(`[CodeGenerator] Using centralized vision API with ${config.provider}/${config.model}`);
      
      // Use centralized vision API
      // prompt is a string from this.buildImageToCodePrompt
      const userMessageContentString = prompt;

      const visionMessagesContent: AIMessage['content'] = [
        { type: 'text', text: userMessageContentString }
      ];

      for (const url of imageUrls) {
        visionMessagesContent.push({ type: 'image_url', image_url: { url } });
      }

      // AIClientService.generateVisionResponse expects the content array directly.
      // A system prompt string can be passed as the third argument if needed.
      const response = await AIClientService.generateVisionResponse(
        config,
        visionMessagesContent // Pass the array of content blocks directly
        // systemPrompt?: string, // Optional: Add if a separate system prompt is required
      );

      this.DEBUG && console.log(`[CodeGenerator] Vision response length: ${response.content.length} chars`);
      // Log model usage if available and needed, e.g., response.usage
      if (this.DEBUG && response.usage) {
        console.log('[CodeGenerator] Vision Model Usage:', response.usage);
      }
      
      // Clean up code (remove markdown fences)
      let cleanCode = response.content.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // Extract actual duration from image-generated code
      const durationAnalysis = analyzeDuration(cleanCode);
      
      this.DEBUG && console.log(`[CodeGenerator] Direct image-to-code completed for ${functionName}`);
      this.DEBUG && console.log(`[CodeGenerator] Image-generated duration: ${durationAnalysis.frames} frames (${durationAnalysis.seconds}s) - confidence: ${durationAnalysis.confidence}`);
      
      return {
        code: cleanCode,
        name: functionName,
        duration: durationAnalysis.frames,
        reasoning: `Generated motion graphics directly from image analysis with ${durationAnalysis.frames} frames duration (${durationAnalysis.confidence} confidence)`,
        debug: {
          prompt: { system: 'Vision-based generation', user: `${imageUrls.length} images provided` },
          response: response.content,
          parsed: { code: cleanCode, imageCount: imageUrls.length, durationAnalysis },
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

      const fallbackDuration = extractDurationFromCode(errorCode);
      
      return {
        code: errorCode,
        name: functionName,
        duration: fallbackDuration,
        reasoning: "Image-to-code generation failed - auto-fix available",
        debug: { 
          error: `${error instanceof Error ? error.message : 'Unknown error'}. Fallback duration: ${fallbackDuration} frames. Images: ${imageUrls.length}. User prompt: ${userPrompt}`
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
      
      // Extract duration from edited code
      const durationAnalysis = analyzeDuration(cleanCode);
      
      this.DEBUG && console.log(`[CodeGenerator] Image-guided editing completed for ${functionName}`);
      this.DEBUG && console.log(`[CodeGenerator] Edited code duration: ${durationAnalysis.frames} frames (${durationAnalysis.seconds}s) - confidence: ${durationAnalysis.confidence}`);
      
      return {
        code: cleanCode,
        name: functionName,
        duration: durationAnalysis.frames,
        reasoning: `Modified existing code based on image reference styling with ${durationAnalysis.frames} frames duration (${durationAnalysis.confidence} confidence)`,
        debug: {
          prompt: { system: 'Image-guided editing', user: `Edit with ${imageUrls.length} images` },
          response: response.content,
          parsed: { code: cleanCode, editType: "image-guided", durationAnalysis },
        },
      };
    } catch (error) {
      this.DEBUG && console.error("[CodeGenerator] Image-guided edit error:", error);
      
      // Return original code on error with its actual duration
      const originalDuration = extractDurationFromCode(existingCode);
      
      return {
        code: existingCode,
        name: functionName,
        duration: originalDuration,
        reasoning: "Image-guided edit failed - returned original code",
        debug: { 
          error: `${error instanceof Error ? error.message : 'Unknown error'}. Original duration: ${originalDuration} frames. Images: ${imageUrls.length}. User prompt: ${userPrompt}`
        }
      };
    }
  }

  /**
   * NEW: Build prompt for direct image-to-motion-graphics generation
   */
  private buildImageToCodePrompt(userPrompt: string, functionName: string, visionAnalysis?: any): string {
    let augmentedUserPrompt = userPrompt;

    if (visionAnalysis) {
      let analysisContext = "\n\nPre-computed Image Analysis Context:\n";
      if (visionAnalysis.palette && visionAnalysis.palette.length > 0) {
        analysisContext += `- Dominant Colors: ${visionAnalysis.palette.join(", ")}\n`;
      }
      if (visionAnalysis.mood) {
        analysisContext += `- Overall Mood/Style: ${visionAnalysis.mood}\n`;
      }
      if (visionAnalysis.typography) {
        analysisContext += `- Suggested Typography: ${visionAnalysis.typography}\n`;
      }
      if (visionAnalysis.layoutJson && typeof visionAnalysis.layoutJson === 'object') {
        // Add some high-level layout info if available, keep it concise
        const layoutSummary = Object.entries(visionAnalysis.layoutJson)
          .slice(0, 3) // Limit to first 3 high-level keys for brevity
          .map(([key, value]) => `${key}: ${typeof value === 'string' ? value.substring(0,30) : JSON.stringify(value).substring(0,30)}...`)
          .join("; ");
        if (layoutSummary) {
          analysisContext += `- Key Layout Elements: ${layoutSummary}\n`;
        }
      }
      if (visionAnalysis.imageDescription) {
        analysisContext += `- Image Description: ${visionAnalysis.imageDescription}\n`;
      }
      augmentedUserPrompt += analysisContext;
    }

    const promptConfig = getParameterizedPrompt('IMAGE_TO_CODE', {
      FUNCTION_NAME: functionName,
      USER_PROMPT: augmentedUserPrompt,
    });
    return promptConfig.content;
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