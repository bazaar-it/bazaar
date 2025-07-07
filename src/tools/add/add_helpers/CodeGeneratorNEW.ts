import { AIClientService, type AIMessage } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { getParameterizedPrompt } from "~/config/prompts.config";
import { extractDurationFromCode, analyzeDuration } from "~/lib/utils/codeDurationExtractor";
import { getSmartTransitionContext } from "~/lib/utils/transitionContext";
import { TYPOGRAPHY_AGENT } from "~/config/prompts/active/typography-generator";
import { IMAGE_RECREATOR } from "~/config/prompts/active/image-recreator";
import type { CodeGenerationInput, CodeGenerationOutput, ImageToCodeInput } from "~/tools/helpers/types";

/**
 * Unified Code Processing Service - handles all code generation tools
 * Provides consistent response processing for: Code Generator, Typography, Image Recreator
 * Uses simple, proven approach from original CodeGeneratorService
 */
export class UnifiedCodeProcessor {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * UNIFIED: Process AI response with consistent logic for all tools
   * Uses the proven simple approach from CodeGeneratorService
   */
  private processAIResponse(rawOutput: string, toolName: string, userPrompt: string, functionName: string): {
    code: string;
    name: string;
    duration: number;
    reasoning: string;
  } {
    // Clean and process code (same logic as original CodeGeneratorService)
    let cleanCode = rawOutput.trim();
    cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
    
    // Ensure single export default only (original CodeGeneratorService logic)
    if (cleanCode.includes('export default function') && cleanCode.includes('function SingleSceneComposition')) {
      const sceneMatch = cleanCode.match(/const \{[^}]+\} = window\.Remotion;[\s\S]*?export default function \w+\(\)[^{]*\{[\s\S]*?\n\}/);
      if (sceneMatch) {
        cleanCode = sceneMatch[0];
      }
    }
    
    // Extract duration
    const durationAnalysis = analyzeDuration(cleanCode);
    
    // Generate name based on tool type
    const name = this.generateSceneName(toolName, userPrompt, cleanCode);
    
    return {
      code: cleanCode,
      name,
      duration: durationAnalysis.frames,
      reasoning: `Generated ${toolName.toLowerCase()} scene: "${name}" (${durationAnalysis.frames} frames)`,
    };
  }

  /**
   * UNIFIED: Generate scene name based on tool type
   */
  private generateSceneName(toolName: string, userPrompt: string, code: string): string {
    switch (toolName.toLowerCase()) {
      case 'typography':
        // Look for text-specific patterns
        const textMatch = userPrompt.match(/(?:says?|text|showing|displaying)\s+(.+?)(?:\s+with|\s+in|\s+on|\s+at|\s+for|$)/i);
        if (textMatch?.[1]) return `Text: ${textMatch[1].substring(0, 30)}`;
        
        const quotedMatch = userPrompt.match(/["'](.*?)["']/) || code.match(/["'](.*?)["']/);
        if (quotedMatch?.[1] && quotedMatch[1].length > 2) return `Text: ${quotedMatch[1].substring(0, 30)}`;
        
        return 'Animated Text';
        
      case 'image_recreator':
        // Look for recreation-specific patterns
        const recreateMatch = userPrompt.match(/recreate\s+(.+?)(?:\s+with|\s+as|\s+in|\s+for|$)/i);
        if (recreateMatch?.[1]) return `Recreated ${recreateMatch[1].substring(0, 30)}`;
        
        const imageMatch = userPrompt.match(/image\s+of\s+(.+?)(?:\s+with|\s+as|\s+in|\s+for|$)/i);
        if (imageMatch?.[1]) return `Image: ${imageMatch[1].substring(0, 30)}`;
        
        return 'Recreated Scene';
        
      default:
        return 'Scene'; // Simple display name for code generator
    }
  }

  /**
   * TYPOGRAPHY: Generate animated text scenes
   */
  async generateTypographyScene(input: {
    userPrompt: string;
    functionName: string;
    projectFormat?: {
      format: 'landscape' | 'portrait' | 'square';
      width: number;
      height: number;
    };
  }): Promise<CodeGenerationOutput> {
    console.log('🎨 [UNIFIED PROCESSOR] TYPOGRAPHY: Generating text scene');
    
    try {
      const response = await AIClientService.generateResponse(
        getModel('codeGenerator'),
        [
          { role: 'system', content: TYPOGRAPHY_AGENT.content },
          { role: 'user', content: input.userPrompt }
        ]
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from Typography LLM");
      }
      
      const result = this.processAIResponse(rawOutput, 'TYPOGRAPHY', input.userPrompt, input.functionName);
      
      return {
        ...result,
        debug: {
          method: 'typography',
          promptLength: input.userPrompt.length,
          responseLength: rawOutput.length,
        }
      };
      
    } catch (error) {
      console.error('[UNIFIED PROCESSOR] Typography generation failed:', error);
      throw error;
    }
  }

  /**
   * IMAGE RECREATOR: Generate scenes from images
   */
  async generateImageRecreationScene(input: {
    userPrompt: string;
    functionName: string;
    imageUrls: string[];
    projectFormat?: {
      format: 'landscape' | 'portrait' | 'square';
      width: number;
      height: number;
    };
  }): Promise<CodeGenerationOutput> {
    console.log('🖼️ [UNIFIED PROCESSOR] IMAGE RECREATOR: Generating recreation scene');
    
    try {
      // Build message content with text and images
      const messageContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
        { type: 'text', text: input.userPrompt }
      ];
      
      for (const url of input.imageUrls) {
        messageContent.push({ 
          type: 'image_url', 
          image_url: { url } 
        });
      }
      
      const response = await AIClientService.generateResponse(
        getModel('codeGenerator'),
        [{ role: 'user', content: messageContent }],
        { role: 'system', content: IMAGE_RECREATOR.content }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from Image Recreator LLM");
      }
      
      const result = this.processAIResponse(rawOutput, 'IMAGE_RECREATOR', input.userPrompt, input.functionName);
      
      return {
        ...result,
        debug: {
          method: 'imageRecreation',
          imageCount: input.imageUrls.length,
          promptLength: input.userPrompt.length,
          responseLength: rawOutput.length,
        }
      };
      
    } catch (error) {
      console.error('[UNIFIED PROCESSOR] Image recreation failed:', error);
      throw error;
    }
  }

  /**
   * Generate code directly from prompt (FASTEST PATH - no layout)
   */
  async generateCodeDirect(input: {
    userPrompt: string;
    functionName: string;
    projectId: string;
    projectFormat?: {
      format: 'landscape' | 'portrait' | 'square';
      width: number;
      height: number;
    };
  }): Promise<CodeGenerationOutput> {
    const config = getModel('codeGenerator');
    
    console.log('⚡ [CODE GENERATOR] DIRECT PATH: Generating code from prompt only');
    
    try {
      const systemPrompt = getParameterizedPrompt('CODE_GENERATOR', {
        FUNCTION_NAME: input.functionName,
        WIDTH: input.projectFormat?.width.toString() || '1920',
        HEIGHT: input.projectFormat?.height.toString() || '1080',
        FORMAT: input.projectFormat?.format?.toUpperCase() || 'LANDSCAPE'
      });
      
      const userPrompt = `USER REQUEST: "${input.userPrompt}"

FUNCTION NAME: ${input.functionName}`;

      const messages = [
        { role: 'user' as const, content: userPrompt }
      ];
      
      const response = await AIClientService.generateResponse(
        config,
        messages,
        { role: 'system', content: systemPrompt.content }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      // Clean and process code
      let cleanCode = rawOutput.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // Extract duration
      const durationAnalysis = analyzeDuration(cleanCode);
      
      return {
        code: cleanCode,
        name: "Scene", // Simple display name, UI will show position-based numbering
        duration: durationAnalysis.frames,
        reasoning: `Generated scene directly from prompt (${durationAnalysis.frames} frames)`,
        debug: {
          method: 'direct',
          promptLength: userPrompt.length,
          responseLength: rawOutput.length,
          durationAnalysis
        }
      };
    } catch (error) {
      console.error('[CODE GENERATOR] Direct path failed:', error);
      throw error;
    }
  }

  /**
   * Generate code using previous scene as reference (FAST PATH)
   */
  async generateCodeWithReference(input: {
    userPrompt: string;
    functionName: string;
    projectId: string;
    previousSceneCode: string;
    projectFormat?: {
      format: 'landscape' | 'portrait' | 'square';
      width: number;
      height: number;
    };
  }): Promise<CodeGenerationOutput> {
    const config = getModel('codeGenerator');
    
    console.log('🚀 [CODE GENERATOR] FAST PATH: Using previous scene as reference');
    
    try {
      const systemPrompt = getParameterizedPrompt('CODE_GENERATOR', {
        FUNCTION_NAME: input.functionName,
        WIDTH: input.projectFormat?.width.toString() || '1920',
        HEIGHT: input.projectFormat?.height.toString() || '1080',
        FORMAT: input.projectFormat?.format?.toUpperCase() || 'LANDSCAPE'
      });
      const transitionContext = getSmartTransitionContext(input.previousSceneCode);
      const userPrompt = `USER REQUEST: "${input.userPrompt}"

PREVIOUS SCENE REFERENCE:
\`\`\`tsx
${transitionContext}
\`\`\`

IMPORTANT INSTRUCTIONS:
1. Study the previous scene's visual style, colors, animation timing, and patterns
2. Create a NEW scene that maintains visual consistency
3. If previous elements exit in a direction, consider entering from the opposite
4. Match the pacing and energy of the previous scene
5. Use similar animation timing (if previous uses 8-12 frames, you should too)

FUNCTION NAME: ${input.functionName}`;

      const messages = [
        { role: 'user' as const, content: userPrompt }
      ];
      
      const response = await AIClientService.generateResponse(
        config,
        messages,
        { role: 'system', content: systemPrompt.content }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      // Clean and process code
      let cleanCode = rawOutput.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // Extract duration
      const durationAnalysis = analyzeDuration(cleanCode);
      
      return {
        code: cleanCode,
        name: "Scene", // Simple display name, UI will show position-based numbering
        duration: durationAnalysis.frames,
        reasoning: `Generated new scene using previous scene style (${durationAnalysis.frames} frames)`,
        debug: {
          method: 'withReference',
          promptLength: userPrompt.length,
          responseLength: rawOutput.length,
          durationAnalysis
        }
      };
    } catch (error) {
      console.error('[CODE GENERATOR] Fast path failed:', error);
      throw error;
    }
  }

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
        name: "Scene", // Simple display name, UI will show position-based numbering
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
        name: "Scene", // Simple display name, UI will show position-based numbering
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
      
      console.log('==================== codeGenerator reached:');
      console.log('==================== generateCodeFromImage reached:');
      
      // Get the IMAGE_CODE_GENERATOR prompt specifically for image-based generation
      const systemPrompt = getParameterizedPrompt('CODE_GENERATOR', {
        FUNCTION_NAME: input.functionName,
        WIDTH: input.projectFormat?.width.toString() || '1920',
        HEIGHT: input.projectFormat?.height.toString() || '1080',
        FORMAT: input.projectFormat?.format?.toUpperCase() || 'LANDSCAPE'
      });
      
      // Build user message for vision API - include the actual user prompt!
      const userPrompt = `USER REQUEST: "${input.userPrompt}"

IMPORTANT: Study the image to understand the visual style, colors, typography, and design elements. Then create MOTION GRAPHICS that showcase these elements one at a time in sequence.

DO NOT recreate the static layout exactly. Instead:
1. Identify the key elements (headline, subtext, buttons, icons, etc.)
2. Show each element individually in temporal sequence
3. Match the visual style (colors, fonts, spacing) but follow motion graphics principles
4. Use conditional rendering: {frame >= X && frame < Y && (element)}

ANIMATION REQUIREMENTS:
- First element: Choose from slide-in, fade+scale, or type-on
- Second element: MUST use a different animation than the first
- Status/alerts: Add continuous pulse or glow AFTER entrance
- Buttons/CTAs: Use directional entrance (slide up/down) with bounce
- Data/maps: Progressive reveal with path animations
- VARY YOUR ANIMATIONS - don't just spring scale everything

Transform the static design into sequential storytelling.`;
      
      // Use centralized vision API with proper message format
      const visionMessagesContent: AIMessage['content'] = [
        { type: 'text', text: userPrompt }
      ];

      for (const url of input.imageUrls) {
        visionMessagesContent.push({ 
          type: 'image_url', 
          image_url: { url } 
        });
      }

      const response = await AIClientService.generateResponse(
        config,
        [{ role: 'user', content: visionMessagesContent }],
        { role: 'system', content: systemPrompt.content }
      );

      // Clean up code
      let cleanCode = response?.content?.trim() || '';
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // Extract duration from image-generated code
      const durationAnalysis = analyzeDuration(cleanCode);
      
      return {
        code: cleanCode,
        name: "Scene", // Simple display name, UI will show position-based numbering
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
        name: "Scene", // Simple display name, UI will show position-based numbering
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
      WIDTH: input.projectFormat?.width.toString() || '1920',
      HEIGHT: input.projectFormat?.height.toString() || '1080',
      FORMAT: input.projectFormat?.format?.toUpperCase() || 'LANDSCAPE'
    });
    
    const user = JSON.stringify(layoutJson, null, 2);
    
    return { system: systemPrompt.content, user };
  }

  /**
   * Generate code for video-based scenes
   */
  async generateCodeWithVideos(input: {
    videoUrls: string[];
    userPrompt: string;
    functionName: string;
    projectFormat?: {
      format: 'landscape' | 'portrait' | 'square';
      width: number;
      height: number;
    };
  }): Promise<CodeGenerationOutput> {
    const config = getModel('codeGenerator');
    
    console.log('🎥 [CODE GENERATOR] Generating code with videos:', {
      videoCount: input.videoUrls.length,
      prompt: input.userPrompt.substring(0, 50) + '...'
    });
    
    try {
      const systemPrompt = getParameterizedPrompt('CODE_GENERATOR', {
        FUNCTION_NAME: input.functionName,
        WIDTH: input.projectFormat?.width.toString() || '1920',
        HEIGHT: input.projectFormat?.height.toString() || '1080',
        FORMAT: input.projectFormat?.format?.toUpperCase() || 'LANDSCAPE'
      });
      
      const userPrompt = `USER REQUEST: "${input.userPrompt}"

VIDEO URLS: ${input.videoUrls.map((url, i) => `
Video ${i + 1}: ${url}`).join('')}

FUNCTION NAME: ${input.functionName}

Generate MOTION GRAPHICS that incorporate the video(s) with sequential storytelling:
- Default: Use video as background with volume={0} unless user specifies otherwise (split-screen, side-by-side, etc.)
- If text/graphics are needed, they should appear ONE AT A TIME in sequence
- Follow temporal sequence: Title (0-60) → Description (60-120) → CTA (120-180)
- Each element should have its own time slot using conditional rendering
- Transform any requested overlays into sequential appearances
- NO static overlays - everything should animate in sequence
- Adapt video placement based on user request (background, split-screen, picture-in-picture, etc.)`;

      const messages = [
        { role: 'user' as const, content: userPrompt }
      ];
      
      const response = await AIClientService.generateResponse(
        config,
        messages,
        { role: 'system', content: systemPrompt.content }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      // Clean and process code
      let cleanCode = rawOutput.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // Extract duration
      const durationAnalysis = analyzeDuration(cleanCode);
      
      return {
        code: cleanCode,
        name: "Scene", 
        duration: durationAnalysis.frames,
        reasoning: `Generated scene with video content (${durationAnalysis.frames} frames)`,
        debug: {
          method: 'withVideos',
          videoCount: input.videoUrls.length,
          promptLength: userPrompt.length,
          responseLength: rawOutput.length,
          durationAnalysis
        }
      };
    } catch (error) {
      console.error('[CODE GENERATOR] Video generation failed:', error);
      throw error;
    }
  }

  // Removed buildImageToCodePrompt - now using centralized IMAGE_CODE_GENERATOR prompt
}

// Export singleton instance
export const codeGenerator = new UnifiedCodeProcessor();
