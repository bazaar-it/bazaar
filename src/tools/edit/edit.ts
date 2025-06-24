import { BaseMCPTool } from "~/tools/helpers/base";
import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { getSystemPrompt } from "~/config/prompts.config";
import type { EditToolInput, EditToolOutput } from "~/tools/helpers/types";
import { editToolInputSchema } from "~/tools/helpers/types";

/**
 * EDIT Tool - Pure function that transforms scene content
 * NO DATABASE ACCESS - only transformation
 * Sprint 42: Refactored to pure function
 */
export class EditTool extends BaseMCPTool<EditToolInput, EditToolOutput> {
  name = "EDIT";
  description = "Transform existing scene content based on user prompt";
  inputSchema = editToolInputSchema;

  protected async execute(input: EditToolInput): Promise<EditToolOutput> {
    try {
      // Validate input
      if (!input.tsxCode) {  // ✓ Using correct field name
        throw new Error("No scene code provided");
      }

      console.log('✏️ [EDIT TOOL] Executing edit:', {
        prompt: input.userPrompt,
        hasErrorDetails: !!input.errorDetails,
        codeLength: input.tsxCode.length
      });

      // Just edit the code - one unified approach
      console.log('✏️ [EDIT TOOL] Processing edit request');
      return await this.performEdit(input);
      
    } catch (error) {
      console.error('✏️ [EDIT TOOL] Error:', error);
      return {
        success: false,
        reasoning: `Edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as EditToolOutput;
    }
  }

  private async performEdit(input: EditToolInput): Promise<EditToolOutput> {
    try {
      const functionName = this.extractFunctionName(input.tsxCode);
      
      // Build context for the AI
      let context = `USER REQUEST: "${input.userPrompt}"`;
      
      if (input.errorDetails) {
        context += `\n\nERROR TO FIX:\n${input.errorDetails}`;
      }
      
      if (input.webContext) {
        context += `\n\nWEBSITE BRAND CONTEXT:
- URL: ${input.webContext.originalUrl}
- Title: ${input.webContext.pageData.title}
- Description: ${input.webContext.pageData.description || 'Not available'}
- Key headings: ${input.webContext.pageData.headings.slice(0, 5).join(', ')}

BRAND MATCHING INSTRUCTIONS:
- Use the website screenshots to match the brand's visual identity
- Extract and apply colors, fonts, and design patterns from the screenshots
- Maintain brand consistency in your edits`;
      }
      
      if (input.imageUrls?.length) {
        context += `\n\nIMAGE CONTEXT: User provided ${input.imageUrls.length} image(s)`;
      }
      
      if (input.videoUrls?.length) {
        context += `\n\nVIDEO CONTEXT: User provided ${input.videoUrls.length} video(s)`;
        context += `\nVIDEO URLS: ${input.videoUrls.map((url, i) => `\nVideo ${i + 1}: ${url}`).join('')}`;
      }
      
      if (input.visionAnalysis) {
        context += `\n\nVISION ANALYSIS:\n${JSON.stringify(input.visionAnalysis, null, 2)}`;
      }
      
      // Add reference scenes for style/color matching
      if (input.referenceScenes?.length) {
        context += `\n\nREFERENCE SCENES FOR STYLE/COLOR MATCHING:`;
        input.referenceScenes.forEach((scene) => {
          context += `\n\n${scene.name} (ID: ${scene.id}):\n\`\`\`tsx\n${scene.tsxCode}\n\`\`\``;
        });
        context += `\n\nIMPORTANT: Extract the specific colors, styles, animations, or patterns from the reference scenes that the user wants to apply. Be precise in matching the requested elements.`;
      }

      // Build message content based on available context
      let messageContent: any;
      
      // Prepare all available images (web screenshots + user images)
      const allImageUrls: string[] = [];
      if (input.webContext) {
        allImageUrls.push(input.webContext.screenshotUrls.desktop);
        allImageUrls.push(input.webContext.screenshotUrls.mobile);
      }
      if (input.imageUrls?.length) {
        allImageUrls.push(...input.imageUrls);
      }
      
      if (allImageUrls.length > 0) {
        // Build vision content array for image-based edits
        const contextInstructions = input.webContext 
          ? 'IMPORTANT: The first two images are website screenshots for brand matching. Use them to understand the brand\'s visual identity, colors, and design patterns. ' +
            (input.imageUrls?.length ? `The additional ${input.imageUrls.length} image(s) show specific content requirements. ` : '') +
            'Apply the brand style while incorporating any specific visual requirements from additional images.'
          : 'IMPORTANT: Look at the provided image(s) and recreate the visual elements from the image in the scene code. Match colors, layout, text, and visual hierarchy as closely as possible.';
        
        messageContent = [
          { 
            type: 'text', 
            text: `${context}

EXISTING CODE:
\`\`\`tsx
${input.tsxCode}
\`\`\`

${contextInstructions} Return the complete modified code.`
          }
        ];
        
        // Add all images (web screenshots first, then user images)
        for (const imageUrl of allImageUrls) {
          messageContent.push({
            type: 'image_url',
            image_url: { url: imageUrl }
          });
        }
      } else {
        // Text-only edit
        messageContent = `${context}

EXISTING CODE:
\`\`\`tsx
${input.tsxCode}
\`\`\`

Please edit the code according to the user request. Return the complete modified code.`;
      }

      console.log('🔍 [EDIT TOOL] Making edit with context:', {
        userPrompt: input.userPrompt,
        hasError: !!input.errorDetails,
        hasImages: !!input.imageUrls?.length,
        hasVideos: !!input.videoUrls?.length,
        hasWebContext: !!input.webContext,
        totalImages: allImageUrls.length,
        codeLength: input.tsxCode.length,
        codePreview: input.tsxCode.substring(0, 200),
        websiteUrl: input.webContext?.originalUrl
      });

      // Use the AI to edit the code
      const modelConfig = getModel('editScene');
      const systemPrompt = getSystemPrompt('CODE_EDITOR');
      
      const response = await AIClientService.generateResponse(
        modelConfig,
        [{ role: "user", content: messageContent }],
        { role: 'system', content: systemPrompt },
        { responseFormat: { type: "json_object" } }
      );

      const content = response?.content;
      if (!content) {
        throw new Error("No response from AI editor");
      }

      const parsed = this.extractJsonFromResponse(content);
      
      // Validate that we got valid code
      if (!parsed.code || typeof parsed.code !== 'string' || parsed.code.trim().length < 100) {
        throw new Error(`Invalid code returned`);
      }

      console.log('✅ [EDIT TOOL] Edit completed:', {
        originalLength: input.tsxCode.length,
        newLength: parsed.code.length,
        changed: parsed.code !== input.tsxCode
      });

      return {
        success: true,
        tsxCode: parsed.code,
        duration: parsed.newDurationFrames || undefined,
        reasoning: parsed.reasoning || `Applied edit: ${input.userPrompt}`,
        chatResponse: parsed.reasoning || `I've updated the scene as requested`,
        changesApplied: parsed.changes || [`Applied edit: ${input.userPrompt}`],
      };
      
    } catch (error) {
      console.error('[EDIT TOOL] Edit failed:', error);
      throw error;
    }
  }

  private extractFunctionName(tsxCode: string): string {
    const match = tsxCode.match(/function\s+(\w+)|const\s+(\w+)\s*=/);
    return match?.[1] || match?.[2] || 'Scene';
  }


  private extractJsonFromResponse(content: string): any {
    try {
      // Try direct JSON parse first
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch?.[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try to find JSON object in the content
      const objectMatch = content.match(/{[\s\S]*}/);
      if (objectMatch?.[0]) {
        return JSON.parse(objectMatch[0]);
      }
      
      throw new Error('Could not extract JSON from response');
    }
  }

}

// Export singleton instance
export const editTool = new EditTool();
