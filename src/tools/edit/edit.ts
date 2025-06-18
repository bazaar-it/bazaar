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
      
      if (input.imageUrls?.length) {
        context += `\n\nIMAGE CONTEXT: User provided ${input.imageUrls.length} image(s)`;
      }
      
      if (input.visionAnalysis) {
        context += `\n\nVISION ANALYSIS:\n${JSON.stringify(input.visionAnalysis, null, 2)}`;
      }

      // Build message content based on whether we have images
      let messageContent: any;
      
      if (input.imageUrls?.length) {
        // Build vision content array for image-based edits
        messageContent = [
          { 
            type: 'text', 
            text: `${context}

EXISTING CODE:
\`\`\`tsx
${input.tsxCode}
\`\`\`

IMPORTANT: Look at the provided image(s) and recreate the visual elements from the image in the scene code. Match colors, layout, text, and visual hierarchy as closely as possible. Return the complete modified code.`
          }
        ];
        
        // Add each image
        for (const imageUrl of input.imageUrls) {
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
        codeLength: input.tsxCode.length,
        codePreview: input.tsxCode.substring(0, 200)
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
