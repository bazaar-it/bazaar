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
    // 🚨 DEBUG: Check for mysterious "x" prefix
    if (rawOutput.trim().startsWith('x')) {
      console.error('🚨 [UNIFIED PROCESSOR] FOUND "x" PREFIX!', {
        toolName,
        userPrompt: userPrompt.substring(0, 100),
        rawOutputFirst50: rawOutput.substring(0, 50),
        functionName,
        timestamp: new Date().toISOString()
      });
    }
    
    // Clean and process code (same logic as original CodeGeneratorService)
    let cleanCode = rawOutput.trim();
    
    // 🚨 FIX: Remove mysterious "x" prefix if present
    if (cleanCode.startsWith('x\n') || cleanCode.startsWith('x ')) {
      console.warn('🚨 [UNIFIED PROCESSOR] Removing "x" prefix from generated code');
      cleanCode = cleanCode.substring(1).trim();
    }
    cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
    
    // 🚨 FIX: Replace incorrect currentFrame variable naming
    if (cleanCode.includes('const currentFrame = useCurrentFrame()')) {
      console.warn('🚨 [UNIFIED PROCESSOR] Fixing currentFrame naming issue');
      cleanCode = cleanCode.replace(/const currentFrame = useCurrentFrame\(\)/g, 'const frame = useCurrentFrame()');
      // Also replace any usage of currentFrame variable (but not in destructuring)
      cleanCode = cleanCode.replace(/(?<!\{[^}]*)(\bcurrentFrame\b)(?![^{]*\}\s*=\s*window\.Remotion)/g, 'frame');
    }
    
    // 🚨 FIX: If there's both frame and currentFrame declared, remove currentFrame
    if (cleanCode.includes('const frame = useCurrentFrame()') && cleanCode.includes('const currentFrame')) {
      console.warn('🚨 [UNIFIED PROCESSOR] Removing duplicate currentFrame declaration');
      // Remove any line that declares currentFrame
      cleanCode = cleanCode.replace(/^\s*const currentFrame\s*=.*$/gm, '');
    }
    
    // 🚨 FIX: If AI destructured currentFrame instead of useCurrentFrame
    if (cleanCode.match(/const\s*{[^}]*\bcurrentFrame\b[^}]*}\s*=\s*window\.Remotion/)) {
      console.warn('🚨 [UNIFIED PROCESSOR] Fixing incorrect destructuring of currentFrame');
      cleanCode = cleanCode.replace(/(const\s*{[^}]*)(\bcurrentFrame\b)([^}]*}\s*=\s*window\.Remotion)/g, '$1useCurrentFrame$3');
    }
    
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
    previousSceneContext?: {
      tsxCode: string;
      style?: string;
    };
  }): Promise<CodeGenerationOutput> {
    console.log('🎨 [UNIFIED PROCESSOR] TYPOGRAPHY: Generating text scene');
    
    try {
      // Prepare the messages with optional previous scene context
      // Replace placeholders in TYPOGRAPHY_AGENT content
      const typographyPrompt = TYPOGRAPHY_AGENT.content
        .replace(/{{WIDTH}}/g, input.projectFormat?.width.toString() || '1920')
        .replace(/{{HEIGHT}}/g, input.projectFormat?.height.toString() || '1080')
        .replace(/{{FORMAT}}/g, input.projectFormat?.format?.toUpperCase() || 'LANDSCAPE');
      
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system' as const, content: typographyPrompt }
      ];

      // Add previous scene context if available
      if (input.previousSceneContext?.tsxCode) {
        messages.push({
          role: 'user' as const,
          content: `Previous scene code for visual harmony reference:\n\`\`\`tsx\n${input.previousSceneContext.tsxCode}\n\`\`\`\n\nMaintain visual harmony with the established theme. Use similar colors, gradients, and fonts for consistency, but create unique text animations appropriate for the content.`
        });
        messages.push({
          role: 'assistant' as const,
          content: 'I understand. I will maintain visual harmony with the previous scene while creating unique text animations.'
        });
      }

      // Add the main user prompt
      messages.push({
        role: 'user' as const,
        content: input.userPrompt
      });

      const response = await AIClientService.generateResponse(
        getModel('codeGenerator'),
        messages
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
      // Build message content with text and images - include URLs in prompt text too!
      const imageUrlsList = input.imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n');
      const enhancedPrompt = `${input.userPrompt}

UPLOADED IMAGES TO USE:
${imageUrlsList}

CRITICAL: You MUST use these exact image URLs above in your generated code with the Remotion <Img> component.`;

      const messageContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
        { type: 'text', text: enhancedPrompt }
      ];
      
      // Filter out AVIF images and create user-friendly error
      const supportedImages = [];
      const avifImages = [];
      
      for (const url of input.imageUrls) {
        console.log('🖼️ [IMAGE RECREATOR] Adding image URL to message:', url);
        
        if (url.toLowerCase().includes('.avif')) {
          avifImages.push(url);
          console.warn('⚠️ [IMAGE RECREATOR] AVIF format not supported by AI service:', url);
        } else {
          supportedImages.push(url);
          messageContent.push({ 
            type: 'image_url', 
            image_url: { url } 
          });
        }
      }
      
      // If we have AVIF images, throw a user-friendly error
      if (avifImages.length > 0 && supportedImages.length === 0) {
        throw new Error(`AVIF image format is not supported. Please convert your images to JPEG or PNG format. Unsupported images: ${avifImages.length}`);
      }
      
      // If some images are AVIF but we have others, warn but continue
      if (avifImages.length > 0) {
        console.warn(`⚠️ [IMAGE RECREATOR] Skipped ${avifImages.length} AVIF images. Using ${supportedImages.length} supported images.`);
      }
      
      // Replace placeholders in IMAGE_RECREATOR content
      const imageRecreatorPrompt = IMAGE_RECREATOR.content
        .replace(/{{WIDTH}}/g, input.projectFormat?.width.toString() || '1920')
        .replace(/{{HEIGHT}}/g, input.projectFormat?.height.toString() || '1080')
        .replace(/{{FORMAT}}/g, input.projectFormat?.format?.toUpperCase() || 'LANDSCAPE');
      
      const response = await AIClientService.generateResponse(
        getModel('codeGenerator'),
        [{ role: 'user', content: messageContent }],
        { role: 'system', content: imageRecreatorPrompt }
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
    requestedDurationFrames?: number;
    projectFormat?: {
      format: 'landscape' | 'portrait' | 'square';
      width: number;
      height: number;
    };
    assetUrls?: string[];
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
      
      let userPrompt = `USER REQUEST: "${input.userPrompt}"

FUNCTION NAME: ${input.functionName}`;

      // Add persistent asset URLs if available
      if (input.assetUrls && input.assetUrls.length > 0) {
        userPrompt += `\n\nPROJECT ASSETS AVAILABLE:`;
        input.assetUrls.forEach(url => {
          userPrompt += `\n- ${url}`;
        });
        userPrompt += `\n\nThese are previously uploaded assets in this project. Use them when appropriate based on the user's request.`;
        userPrompt += `\nFor example: If user asks for "the logo" or "that image from before", use one of these assets.`;
      }

      // Add duration constraint if specified
      if (input.requestedDurationFrames) {
        userPrompt += `\n\n🚨 CRITICAL DURATION REQUIREMENT 🚨
The scene MUST be EXACTLY ${input.requestedDurationFrames} frames (${(input.requestedDurationFrames / 30).toFixed(1)} seconds).

This is NOT optional - the user explicitly requested this duration!
- Plan your animations to fit within ${input.requestedDurationFrames} frames
- Ensure all animations complete before frame ${input.requestedDurationFrames - 10}
- MANDATORY: Export exactly this duration: export const durationInFrames_${input.functionName.split('_').pop()} = ${input.requestedDurationFrames};

DO NOT use any other duration value!`;
      }

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
    requestedDurationFrames?: number;
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
      // Extract key style elements from previous scene
      const bgColorMatch = input.previousSceneCode.match(/backgroundColor:\s*["']([^"']+)["']/);
      const bgGradientMatch = input.previousSceneCode.match(/background:\s*["'](linear-gradient[^"']+)["']/);
      const primaryColorMatch = input.previousSceneCode.match(/color:\s*["']#([0-9a-fA-F]{6})["']/);
      const fontFamilyMatch = input.previousSceneCode.match(/fontFamily:\s*["']([^"']+)["']/);
      
      const styleContext = `
EXTRACTED STYLE FROM PREVIOUS SCENE:
- Background: ${bgColorMatch ? bgColorMatch[1] : (bgGradientMatch ? bgGradientMatch[1] : 'Not found')}
- Primary Text Color: ${primaryColorMatch ? '#' + primaryColorMatch[1] : 'Not found'}
- Font Family: ${fontFamilyMatch ? fontFamilyMatch[1] : 'Inter'}`;

      let userPrompt = `USER REQUEST: "${input.userPrompt}"

PREVIOUS SCENE REFERENCE:
\`\`\`tsx
${transitionContext}
\`\`\`

${styleContext}

CRITICAL STYLE CONSISTENCY REQUIREMENTS:
1. You MUST use the EXACT SAME background color/gradient as the previous scene
2. You MUST use the SAME font family and similar text colors
3. Study the previous scene's visual style, colors, animation timing, and patterns
4. Create a NEW scene that maintains PERFECT visual consistency
5. If the previous scene has a dark theme, your scene MUST also have a dark theme
6. If the previous scene has specific brand colors (like #007AFF), use them consistently
7. Match the pacing and energy of the previous scene
8. Use similar animation timing (if previous uses 8-12 frames, you should too)

FUNCTION NAME: ${input.functionName}`;

      // Add duration constraint if specified
      if (input.requestedDurationFrames) {
        userPrompt += `\n\nDURATION REQUIREMENT: The scene MUST be exactly ${input.requestedDurationFrames} frames (${(input.requestedDurationFrames / 30).toFixed(1)} seconds).`;
        userPrompt += `\nAdjust all animations to fit within this duration.`;
        userPrompt += `\nExport: export const durationInFrames_${input.functionName.split('_').pop()} = ${input.requestedDurationFrames};`;
      }

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
  async generateCodeFromImage(input: ImageToCodeInput & { assetUrls?: string[] }): Promise<CodeGenerationOutput> {
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
      
      // Build user message for vision API - include the actual user prompt AND image URLs!
      const imageUrlsList = input.imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n');
      
      const userPrompt = `USER REQUEST: "${input.userPrompt}"

UPLOADED IMAGES TO USE IN YOUR CODE:
${imageUrlsList}

CRITICAL: You MUST use these exact image URLs in your generated code with the Remotion <Img> component.
DO NOT generate placeholder URLs or use stock photos - use the URLs provided above.

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
