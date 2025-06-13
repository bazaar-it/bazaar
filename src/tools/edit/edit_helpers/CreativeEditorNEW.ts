import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel, resolveDirectCodeEditorModel } from "~/config/models.config";
import { getSystemPrompt } from "~/config/prompts.config";
import { BaseEditor } from "./BaseEditorNEW";
import type { CreativeEditInput, CodeGenerationOutput } from "~/tools/helpers/types";

/**
 * Creative Editor - Handles major creative changes to scenes
 * Uses direct code editing for comprehensive modifications
 */
export class CreativeEditor extends BaseEditor {
  /**
   * Execute creative editing of scene code
   */
  async executeEdit(input: CreativeEditInput): Promise<CodeGenerationOutput> {
    try {
      console.log('==================== creativeEditor reached:');
      const functionName = this.extractFunctionName(input.existingCode);
      
      if (this.DEBUG) {
        console.log(`[CreativeEditor] Starting creative edit for: ${functionName}`);
        console.log(`[CreativeEditor] User request: "${input.userPrompt.substring(0, 100)}..."`);
      }

      // Use unified creative editing approach
      const result = await this.creativeEditUnified({
        userPrompt: input.userPrompt,
        existingCode: input.existingCode,
        existingName: functionName,
        editComplexity: 'creative',
        visionAnalysis: input.visionAnalysis,
      });

      // Validate the edited code
      const validation = this.validateCode(result.code);
      if (!validation.isValid) {
        throw new Error(`Creative edit validation failed: ${validation.error}`);
      }

      if (this.DEBUG) {
        console.log(`[CreativeEditor] Creative edit completed for: ${functionName}`);
        console.log(`[CreativeEditor] Changes applied: ${result.changes.join(', ')}`);
      }

      return {
        code: result.code,
        name: functionName,
        duration: result.newDurationFrames || 180,
        reasoning: `Creative edit applied: ${result.reasoning}`,
        debug: {
          editType: 'creative',
          originalCode: input.existingCode,
          changes: result.changes,
          preserved: result.preserved,
          ...result.debug,
        },
      };
    } catch (error) {
      if (this.DEBUG) {
        console.error("[CreativeEditor] Error:", error);
      }
      
      // Return original code on error
      const functionName = this.extractFunctionName(input.existingCode);
      
      return {
        code: input.existingCode,
        name: functionName,
        duration: 180, // Default duration
        reasoning: `Creative edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        debug: { 
          error: String(error),
          editType: 'creative',
          originalCode: input.existingCode,
        },
      };
    }
  }

  /**
   * Execute creative editing with image reference
   * Uses vision analysis passed through the regular edit method
   */
  async executeEditWithImage(input: CreativeEditInput): Promise<CodeGenerationOutput> {
    // For image-guided editing, we pass the vision analysis through the regular edit method
    return await this.executeEdit({
      ...input,
      visionAnalysis: input.visionAnalysis,
    });
  }

  /**
   * Creative Edit Unified: Single-call approach for creative improvements
   * Combines analysis, modification, and duration detection in one LLM call
   */
  private async creativeEditUnified(input: {
    userPrompt: string;
    existingCode: string;
    existingName: string;
    editComplexity?: 'surgical' | 'creative' | 'structural';
    visionAnalysis?: any;
  }): Promise<{
    code: string;
    changes: string[];
    preserved: string[];
    reasoning: string;
    newDurationFrames?: number;
    debug: {
      changeAnalysis: any;
      modificationStrategy: string;
    };
  }> {
    try {
      console.log("[CreativeEditor] Unified creative edit - single LLM call");
      
      const modelConfig = resolveDirectCodeEditorModel('creative');
      
      const visionContext = this.buildVisionContextString(input.visionAnalysis);

      const systemPrompt = getSystemPrompt('DIRECT_CODE_EDITOR_CREATIVE_UNIFIED');
      
      const userMessage = `EXISTING CODE:
\`\`\`tsx
${input.existingCode}
\`\`\`

USER REQUEST: "${input.userPrompt}"${visionContext}`;

      const response = await AIClientService.generateResponse(
        modelConfig,
        [{ role: "user", content: userMessage }],
        systemPrompt,
        { responseFormat: { type: "json_object" } }
      );

      const content = response?.content;
      if (!content) {
        throw new Error("No response from unified creative editor");
      }

      const parsed = this.extractJsonFromResponse(content);
      
      // Validate that we got valid code
      if (!parsed.code || typeof parsed.code !== 'string' || parsed.code.trim().length < 100) {
        throw new Error(`Invalid code returned: ${parsed.code?.substring(0, 100)}`);
      }

      console.log(`[CreativeEditor] Unified creative edit completed:`, {
        changes: parsed.changes?.length || 0,
        preserved: parsed.preserved?.length || 0,
        reasoning: parsed.reasoning
      });

      return {
        code: parsed.code,
        changes: parsed.changes || [`Applied creative improvements: ${input.userPrompt}`],
        preserved: parsed.preserved || ["Core functionality and content"],
        reasoning: parsed.reasoning || "Applied creative design enhancements",
        newDurationFrames: parsed.newDurationFrames,
        debug: {
          changeAnalysis: { modificationStrategy: "unified-creative" },
          modificationStrategy: "unified-creative"
        }
      };
      
    } catch (error) {
      console.error("[CreativeEditor] Unified creative edit failed:", error);
      throw error;
    }
  }

  /**
   * Helper method to safely extract JSON from markdown-wrapped responses
   */
  private extractJsonFromResponse(content: string): any {
    if (!content || typeof content !== 'string') {
      throw new Error('Empty or invalid response content');
    }

    // Remove any leading/trailing whitespace
    const cleaned = content.trim();

    // Check if response is wrapped in markdown code blocks
    if (cleaned.startsWith('```')) {
      // Extract JSON from markdown code blocks
      const lines = cleaned.split('\n');
      const startIndex = lines.findIndex(line => line.includes('```json') || line === '```');
      const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('```'));
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonLines = lines.slice(startIndex + 1, endIndex);
        const jsonString = jsonLines.join('\n').trim();
        
        if (!jsonString) {
          throw new Error('Empty JSON content in markdown block');
        }
        
        try {
          return JSON.parse(jsonString);
        } catch (jsonError) {
          console.error("[CreativeEditor] Failed to parse extracted JSON:", jsonString.substring(0, 200));
          throw new Error(`Invalid JSON in markdown block: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
        }
      }
    }

    // Try parsing as direct JSON
    try {
      return JSON.parse(cleaned);
    } catch (jsonError) {
      console.error("[CreativeEditor] Failed to parse JSON:", cleaned.substring(0, 200));
      throw new Error(`Response is not valid JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }
  }

  /**
   * Build vision context string for prompts
   */
  private buildVisionContextString(visionAnalysis?: any): string {
    if (!visionAnalysis) {
      return "";
    }

    return `\n\nVISION ANALYSIS CONTEXT:
- Palette: ${visionAnalysis.palette?.join(', ') || 'N/A'}
- Mood: ${visionAnalysis.mood || 'N/A'}
- Typography: ${JSON.stringify(visionAnalysis.typography) || 'N/A'}
- Layout highlights: ${visionAnalysis.layoutJson ? Object.keys(visionAnalysis.layoutJson).slice(0, 3).join(', ') : 'N/A'}

Use this vision analysis to guide your creative modifications.`;
  }
}

// Export singleton instance
export const creativeEditor = new CreativeEditor();
