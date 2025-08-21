import { AIClientService, type AIMessage } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { getParameterizedPrompt } from "~/config/prompts.config";
import { extractDurationFromCode, analyzeDuration } from "~/lib/utils/codeDurationExtractor";
import { getSmartTransitionContext } from "~/lib/utils/transitionContext";
import { TYPOGRAPHY_AGENT } from "~/config/prompts/active/typography-generator";
import { IMAGE_RECREATOR } from "~/config/prompts/active/image-recreator";
import type { CodeGenerationInput, CodeGenerationOutput, ImageToCodeInput } from "~/tools/helpers/types";
import { MediaValidation } from "./mediaValidation";
import { validateAndFixCode } from "~/lib/utils/codeValidator";

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
    
    // 🚨 FIX: Extract code from markdown code blocks if AI included extra text
    const codeBlockMatch = cleanCode.match(/```(?:javascript|tsx|ts|js)?\n([\s\S]*?)\n```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      console.warn('🚨 [UNIFIED PROCESSOR] Extracting code from markdown block, ignoring surrounding text');
      cleanCode = codeBlockMatch[1].trim();
    } else {
      // Fallback: just remove code fences if they exist
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
    }
    
    // 🚨 CRITICAL FIX: Remove mysterious "x" prefix bug - check multiple patterns
    // This bug causes "x is not defined" errors and is one of the most common failures
    const firstLine = cleanCode.split('\n')[0].trim();
    if (firstLine === 'x' || firstLine === 'x;' || firstLine === 'x ') {
      console.error('🚨🚨🚨 [UNIFIED PROCESSOR] DETECTED "X" BUG - Removing standalone "x" from first line');
      console.error('First line was:', firstLine);
      console.error('Full code preview:', cleanCode.substring(0, 100));
      
      // Remove the entire first line if it's just "x"
      const lines = cleanCode.split('\n');
      lines.shift(); // Remove first line
      cleanCode = lines.join('\n').trim();
      
      console.error('Fixed code preview:', cleanCode.substring(0, 100));
    } else if (cleanCode.match(/^x[\s;]/)) {
      // Also catch "x" followed by whitespace or semicolon at the very start
      console.error('🚨 [UNIFIED PROCESSOR] Removing "x" prefix pattern from generated code');
      cleanCode = cleanCode.replace(/^x[\s;]*\n?/, '').trim();
    }
    
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
    
    // 🚨 CRITICAL: Apply comprehensive validation and fixes
    console.log('[UNIFIED PROCESSOR] Applying validation pipeline...');
    const validationResult = validateAndFixCode(cleanCode);
    
    if (!validationResult.isValid && validationResult.fixedCode) {
      console.warn('[UNIFIED PROCESSOR] Code had issues, applying fixes:', validationResult.fixesApplied);
      cleanCode = validationResult.fixedCode;
    } else if (!validationResult.isValid) {
      console.error('[UNIFIED PROCESSOR] Code validation failed and could not be fixed:', validationResult.errors);
      // Continue with the code anyway - better to try than fail completely
    }
    
    if (validationResult.fixesApplied.length > 0) {
      console.log('[UNIFIED PROCESSOR] Applied fixes:', validationResult.fixesApplied.join(', '));
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
   * UNIFIED: Generate scene name based on tool type and content
   */
  private generateSceneName(toolName: string, userPrompt: string, code: string): string {
    // First, try to extract meaningful content from the prompt regardless of tool type
    
    // Check for quoted text which often indicates the main content
    const quotedMatch = userPrompt.match(/["']([^"']+)["']/);
    if (quotedMatch?.[1] && quotedMatch[1].length > 2 && quotedMatch[1].length < 50) {
      // Clean up and format the quoted text
      const cleanText = quotedMatch[1]
        .split(' ')
        .slice(0, 4)
        .map((word, i) => i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
        .join(' ');
      return cleanText.substring(0, 40);
    }
    
    // Look for specific content types
    const contentPatterns = [
      // Typography/Text patterns
      { pattern: /(?:text|title|heading|label)(?:\s+(?:that\s+)?(?:says?|showing|displaying|with))?\s*[:"]?\s*(.+?)(?:["\s]|$)/i, prefix: '' },
      { pattern: /(?:says?|showing|displaying)\s+(.+?)(?:\s+with|\s+in|\s+on|$)/i, prefix: '' },
      
      // Visual element patterns
      { pattern: /(?:create|make|add|generate|show|display|animate)\s+(?:a\s+|an\s+)?(.+?)(?:\s+with|\s+that|\s+which|$)/i, prefix: '' },
      { pattern: /(?:a|an|the)\s+(.+?)\s+(?:scene|animation|component|visual|effect|graphic)/i, prefix: '' },
      
      // Action-based patterns
      { pattern: /(?:introducing|presenting|showcasing|featuring|highlighting)\s+(.+?)(?:\s+with|$)/i, prefix: '' },
      
      // Specific UI components
      { pattern: /(dashboard|chart|graph|animation|particle|effect|transition|logo|button|card|slider|hero|banner|gallery|form|menu|modal|tooltip|badge|avatar|spinner|loader|progress|timeline|calendar|table|list|grid|countdown|testimonial|pricing|features?|cta|call.?to.?action)/i, prefix: '' }
    ];
    
    for (const { pattern, prefix } of contentPatterns) {
      const match = userPrompt.match(pattern);
      if (match?.[1]) {
        // Clean up the extracted text
        let cleanName = match[1]
          .replace(/[.,!?;:'"]+$/, '') // Remove trailing punctuation
          .replace(/^[.,!?;:'"]+/, '') // Remove leading punctuation
          .trim();
        
        // Skip if it's too short or generic
        if (cleanName.length < 3 || /^(a|an|the|this|that|some|any)$/i.test(cleanName)) {
          continue;
        }
        
        // Format the name nicely
        const words = cleanName.split(/\s+/).slice(0, 4);
        const formatted = words
          .map((word, i) => {
            // Capitalize first word and important words
            if (i === 0 || word.length > 3) {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word.toLowerCase();
          })
          .join(' ');
        
        const finalName = prefix ? `${prefix}${formatted}` : formatted;
        if (finalName.length > 2) {
          return finalName.substring(0, 40);
        }
      }
    }
    
    // Tool-specific fallbacks
    switch (toolName.toLowerCase()) {
      case 'typography':
        // Try to extract text from the generated code if prompt didn't help
        const codeTextMatch = code.match(/>([^<>{}\n]+)</);
        if (codeTextMatch?.[1] && codeTextMatch[1].length > 2 && codeTextMatch[1].length < 50) {
          const cleanText = codeTextMatch[1].trim().substring(0, 30);
          return cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
        }
        return 'Text Animation';
        
      case 'image_recreator':
        return 'Visual Scene';
        
      default:
        // Extract key action words as last resort
        const actionWords = userPrompt.match(/\b(intro|outro|transition|overlay|background|foreground|header|footer|section|segment|clip|sequence)\b/gi);
        if (actionWords && actionWords.length > 0) {
          const word = actionWords[0];
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() + ' Scene';
        }
        
        // Count the scene number if we can
        const sceneNumberMatch = userPrompt.match(/scene\s*(\d+)/i);
        if (sceneNumberMatch?.[1]) {
          return `Scene ${sceneNumberMatch[1]}`;
        }
        
        return 'Motion Scene'; // Better than just "New" or "Generated Scene"
    }
  }

  /**
   * Extract a meaningful scene name from the user prompt
   */
  private extractSceneNameFromPrompt(userPrompt: string): string {
    // Use the same logic as generateSceneName but without tool-specific handling
    return this.generateSceneName('default', userPrompt, '');
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
    projectId?: string;
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
        { role: 'system', content: imageRecreatorPrompt },
        { 
          fallbackToOpenAI: true, // Enable fallback for image recreation
          priority: 5 // Higher priority for image tasks
        }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from Image Recreator LLM");
      }
      
      let result = this.processAIResponse(rawOutput, 'IMAGE_RECREATOR', input.userPrompt, input.functionName);
      
      // Validate and fix any hallucinated URLs
      if (input.projectId) {
        const validation = await MediaValidation.validateAndFixCode(
          result.code,
          input.projectId,
          input.imageUrls
        );
        
        if (validation.wasFixed) {
          console.log('🔧 [IMAGE RECREATOR] Fixed hallucinated URLs:', validation.fixes);
          result.code = validation.code;
        }
      }
      
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
    isYouTubeAnalysis?: boolean;
  }): Promise<CodeGenerationOutput> {
    // Use Sonnet 4 with temperature 0 for YouTube reproduction
    const config = input.isYouTubeAnalysis 
      ? { provider: 'anthropic' as const, model: 'claude-sonnet-4-20250514', temperature: 0, maxTokens: 16000 }
      : getModel('codeGenerator');
    
    console.log('⚡ [CODE GENERATOR] DIRECT PATH: Generating code from prompt only');
    if (input.isYouTubeAnalysis) {
      console.log('🎥 [CODE GENERATOR] YouTube Reproduction Mode: Using Sonnet 4 with temperature 0');
    }
    
    try {
      let systemPrompt: { role: 'system'; content: string };
      let userPrompt: string;

      // YouTube reproduction uses description-based approach
      if (input.isYouTubeAnalysis) {
        // Import the description-to-code prompt
        const { DESCRIPTION_TO_CODE } = await import('~/config/prompts/active/description-to-code');
        
        // Use the description-to-code system prompt
        systemPrompt = {
          role: 'system' as const,
          content: DESCRIPTION_TO_CODE.content
        };
        
        // Pass the description as the user prompt
        userPrompt = `Create Remotion code for this video description:

${input.userPrompt}

SPECIFICATIONS:
- Total duration: ${input.requestedDurationFrames || 180} frames (${(input.requestedDurationFrames || 180) / 30} seconds)
- Canvas: ${input.projectFormat?.width || 1920}x${input.projectFormat?.height || 1080}
- Function name: ${input.functionName}

CRITICAL: Create all visuals with CSS and React components. NO stock photos or external URLs.

Output only code.`;
        
      } else {
        // Regular creative generation
        systemPrompt = getParameterizedPrompt('CODE_GENERATOR', {
          FUNCTION_NAME: input.functionName,
          WIDTH: input.projectFormat?.width.toString() || '1920',
          HEIGHT: input.projectFormat?.height.toString() || '1080',
          FORMAT: input.projectFormat?.format?.toUpperCase() || 'LANDSCAPE'
        });
        
        userPrompt = `USER REQUEST: "${input.userPrompt}"

FUNCTION NAME: ${input.functionName}`;
      }

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
        { role: 'system', content: systemPrompt.content },
        { 
          fallbackToOpenAI: true, // Enable fallback for code generation
          priority: 5
        }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      // Use the unified processAIResponse method for consistent code extraction
      const result = this.processAIResponse(rawOutput, 'CODE_GENERATOR', input.userPrompt, input.functionName);
      
      return {
        ...result,
        debug: {
          method: 'direct',
          promptLength: userPrompt.length,
          responseLength: rawOutput.length,
          durationAnalysis: analyzeDuration(result.code)
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
        { role: 'system', content: systemPrompt.content },
        { 
          fallbackToOpenAI: true, // Enable fallback for code generation
          priority: 5
        }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      // Use the unified processAIResponse method for consistent code extraction
      const result = this.processAIResponse(rawOutput, 'CODE_GENERATOR', input.userPrompt, input.functionName);
      
      return {
        ...result,
        reasoning: `Generated new scene using previous scene style (${result.duration} frames)`,
        debug: {
          method: 'withReference',
          promptLength: userPrompt.length,
          responseLength: rawOutput.length,
          durationAnalysis: analyzeDuration(result.code)
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
        name: this.extractSceneNameFromPrompt(input.userPrompt), // Extract meaningful name from prompt
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
        name: "Error Scene", // Error fallback name
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
      
      // Validate and fix any hallucinated URLs
      if (input.projectId) {
        const validation = await MediaValidation.validateAndFixCode(
          cleanCode,
          input.projectId,
          input.imageUrls
        );
        
        if (validation.wasFixed) {
          console.log('🔧 [IMAGE-TO-CODE] Fixed hallucinated URLs:', validation.fixes);
          cleanCode = validation.code;
        }
      }
      
      // Extract duration from image-generated code
      const durationAnalysis = analyzeDuration(cleanCode);
      
      return {
        code: cleanCode,
        name: this.extractSceneNameFromPrompt(input.userPrompt), // Extract meaningful name from prompt
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
        name: "Image Error", // Error fallback name
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
        { role: 'system', content: systemPrompt.content },
        { 
          fallbackToOpenAI: true, // Enable fallback for code generation
          priority: 5
        }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      // Use the unified processAIResponse method for consistent code extraction
      const result = this.processAIResponse(rawOutput, 'CODE_GENERATOR', input.userPrompt, input.functionName);
      
      return {
        ...result,
        reasoning: `Generated scene with video content (${result.duration} frames)`,
        debug: {
          method: 'withVideos',
          videoCount: input.videoUrls.length,
          promptLength: userPrompt.length,
          responseLength: rawOutput.length,
          durationAnalysis: analyzeDuration(result.code)
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
