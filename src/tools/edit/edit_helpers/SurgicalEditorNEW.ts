import { AIClientService } from "~/server/services/ai/aiClient.service";
import { resolveDirectCodeEditorModel } from "~/config/models.config";
import { getSystemPrompt } from "~/config/prompts.config";
import type { CodeGenerationOutput, SurgicalEditInput } from "~/tools/helpers/types";

interface ChangeAnalysis {
  targetElement: string;
  targetText?: string;
  requestedChange: string;
  preserveAnimations: string[];
  preserveElements: string[];
  modificationStrategy: string;
}

/**
 * Surgical Editor - Performs precise, targeted edits to existing code
 * Makes minimal changes while preserving all existing functionality
 */
export class SurgicalEditor {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * Execute surgical editing with unified approach (single LLM call)
   */
  async executeEdit(input: SurgicalEditInput): Promise<CodeGenerationOutput> {
    try {
      console.log('==================== surgicalEditor reached:');
      const functionName = this.extractFunctionName(input.tsxCode);
      
      if (this.DEBUG) {
        console.log(`[SurgicalEditor] Starting surgical edit for: ${functionName}`);
      }

      const result = await this.surgicalEditUnified({
        userPrompt: input.userPrompt,
        existingCode: input.tsxCode,  // ✓ Using correct field name
        existingName: functionName,
        editComplexity: 'surgical',
      });

      const validation = this.validateCode(result.code);
      if (!validation.isValid) {
        throw new Error(`Surgical edit validation failed: ${validation.error}`);
      }

      return {
        code: result.code,
        name: functionName,
        duration: result.newDurationFrames || 180,
        reasoning: `Surgical edit applied: ${result.reasoning}`,
        debug: {
          editType: 'surgical',
          originalCode: input.existingCode,
          changes: result.changes,
          preserved: result.preserved,
          ...result.debug,
        },
      };
    } catch (error) {
      const functionName = this.extractFunctionName(input.existingCode);
      
      return {
        code: input.existingCode,
        name: functionName,
        duration: 180,
        reasoning: `Surgical edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        debug: { 
          error: String(error),
          editType: 'surgical',
          originalCode: input.existingCode,
        },
      };
    }
  }

  /**
   * Surgical Edit Unified: Single-call approach for precise changes
   * Combines analysis, modification, and duration detection in one LLM call
   */
  private async surgicalEditUnified(input: {
    userPrompt: string;
    existingCode: string;
    existingName: string;
    editComplexity?: 'surgical' | 'creative' | 'structural';
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
      console.log('==================== surgicalEditUnified reached:');
      if (this.DEBUG) {
        console.log("[SurgicalEditor] Unified surgical edit - single LLM call");
      }
      
      const modelConfig = resolveDirectCodeEditorModel('surgical');
      const systemPrompt = getSystemPrompt('DIRECT_CODE_EDITOR_SURGICAL_UNIFIED');
      
      const userMessage = `EXISTING CODE:
\`\`\`tsx
${input.existingCode}
\`\`\`

USER REQUEST: "${input.userPrompt}"`;

      const response = await AIClientService.generateResponse(
        modelConfig,
        [{ role: "user", content: userMessage }],
        systemPrompt,
        { responseFormat: { type: "json_object" } }
      );

      const content = response?.content;
      if (!content) {
        throw new Error("No response from unified surgical editor");
      }

      const parsed = this.extractJsonFromResponse(content);
      
      // Validate that we got valid code
      if (!parsed.code || typeof parsed.code !== 'string' || parsed.code.trim().length < 100) {
        throw new Error(`Invalid code returned: ${parsed.code?.substring(0, 100)}`);
      }

      if (this.DEBUG) {
        console.log(`[SurgicalEditor] Unified surgical edit completed:`, {
          changes: parsed.changes?.length || 0,
          preserved: parsed.preserved?.length || 0,
          reasoning: parsed.reasoning
        });
      }

      return {
        code: parsed.code,
        changes: parsed.changes || [`Applied surgical edit: ${input.userPrompt}`],
        preserved: parsed.preserved || ["All existing animations and structure"],
        reasoning: parsed.reasoning || "Applied precise surgical modifications",
        newDurationFrames: parsed.newDurationFrames,
        debug: {
          changeAnalysis: { modificationStrategy: "unified-surgical" },
          modificationStrategy: "unified-surgical"
        }
      };
      
    } catch (error) {
      console.error("[SurgicalEditor] Unified surgical edit failed:", error);
      throw error;
    }
  }

  /**
   * Legacy surgical edit with separate analysis and modification steps
   * Kept for reference but unified approach is preferred
   */
  private async surgicalEditLegacy(input: {
    userPrompt: string;
    existingCode: string;
    existingName: string;
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
      // Step 1: Analyze what needs to change
      const changeAnalysis = await this.analyzeRequestedChanges({
        userPrompt: input.userPrompt,
        existingCode: input.existingCode,
        existingName: input.existingName,
      });
      
      // Step 2: Apply targeted modifications
      const modifiedCode = await this.applyTargetedChanges(input.existingCode, changeAnalysis);
      
      // Step 3: Detect duration changes using LLM reasoning
      const newDurationFrames = await this.detectDurationChange(input.userPrompt, changeAnalysis);
      
      return {
        code: modifiedCode.code,
        changes: modifiedCode.changes,
        preserved: modifiedCode.preserved,
        reasoning: `Applied surgical edit: ${changeAnalysis.requestedChange} to ${changeAnalysis.targetElement}`,
        newDurationFrames,
        debug: {
          changeAnalysis,
          modificationStrategy: changeAnalysis.modificationStrategy
        }
      };
    } catch (error) {
      console.error("[SurgicalEditor] Legacy surgical edit failed:", error);
      throw error;
    }
  }

  /**
   * Analyze what the user wants to change and create a modification plan
   */
  private async analyzeRequestedChanges(input: {
    userPrompt: string;
    existingCode: string;
    existingName: string;
  }): Promise<ChangeAnalysis> {
    const modelConfig = resolveDirectCodeEditorModel('surgical');
    
    const prompt = `You are a code editor analyzing what changes to make to existing React/Remotion code.

EXISTING CODE:
\`\`\`tsx
${input.existingCode}
\`\`\`

USER REQUEST: "${input.userPrompt}"

CRITICAL: You must preserve ALL existing functionality and animations.
Only modify what the user specifically requested.

ANALYSIS REQUIRED:
1. What specific element(s) need to change?
2. What exact modification is requested?
3. What must be preserved exactly as-is?
4. How to make minimal, targeted changes?

RESPONSE FORMAT (JSON):
{
  "targetElement": "subtitle|title|button|background|animation|etc",
  "targetText": "Specific text content to modify (if text change)",
  "requestedChange": "Brief description of what to change",
  "preserveAnimations": ["array", "of", "animation", "variables", "to", "keep"],
  "preserveElements": ["array", "of", "elements", "to", "keep", "unchanged"],
  "modificationStrategy": "How to implement the change while preserving everything else"
}

Be very specific about what to preserve vs what to change.`;

    const response = await AIClientService.generateResponse(
      modelConfig,
      [{ role: "user", content: input.userPrompt }],
      { role: "system", content: prompt },
      { responseFormat: { type: "json_object" } }
    );

    const content = response?.content;
    if (!content) {
      throw new Error("No analysis response from SurgicalEditor");
    }

    const parsed = this.extractJsonFromResponse(content);
    
    if (this.DEBUG) {
      console.log(`[SurgicalEditor] Change analysis:`, {
        target: parsed.targetElement,
        change: parsed.requestedChange,
        preserve: parsed.preserveElements?.length || 0
      });
    }
    
    return {
      targetElement: parsed.targetElement || "unknown",
      targetText: parsed.targetText,
      requestedChange: parsed.requestedChange || "modify scene",
      preserveAnimations: parsed.preserveAnimations || [],
      preserveElements: parsed.preserveElements || [],
      modificationStrategy: parsed.modificationStrategy || "Make minimal changes"
    };
  }

  /**
   * Apply targeted modifications to the existing code
   */
  private async applyTargetedChanges(
    existingCode: string, 
    changeAnalysis: ChangeAnalysis
  ): Promise<{
    code: string;
    changes: string[];
    preserved: string[];
  }> {
    const modelConfig = resolveDirectCodeEditorModel('surgical');
    
    const prompt = `You are a surgical code editor. Make ONLY the requested change while preserving everything else.

EXISTING WORKING CODE:
\`\`\`tsx
${existingCode}
\`\`\`

MODIFICATION REQUIRED:
- Target: ${changeAnalysis.targetElement}
- Change: ${changeAnalysis.requestedChange}
- Strategy: ${changeAnalysis.modificationStrategy}
- PRESERVE: ${changeAnalysis.preserveElements.join(', ')}
- PRESERVE ANIMATIONS: ${changeAnalysis.preserveAnimations.join(', ')}

🚨 CRITICAL IMPORT RESTRICTIONS - NEVER VIOLATE:
1. NEVER add external library imports (NO @mui/material, react-typical, etc.)
2. NEVER import React or Remotion modules
3. ONLY use: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
4. Use ONLY basic HTML elements: <div>, <h1>, <input>, <button>, <span>, etc.
5. Use ONLY Tailwind classes for styling
6. For typewriter effects: Use interpolate() with string slicing, NOT external libraries
7. For modern UI: Use Tailwind classes and inline styles, NOT external component libraries

✅ ALLOWED PATTERNS:
- Basic HTML elements with Tailwind classes
- Inline styles with CSS properties
- Remotion animations using interpolate() and spring()
- Manual typewriter effect with frame-based text slicing

❌ FORBIDDEN PATTERNS:
- import { TextField } from '@mui/material';
- import Typical from 'react-typical';
- import any external library
- <TextField>, <Typical>, or any non-HTML components

CRITICAL RULES:
1. Make MINIMAL changes - only what's requested
2. Keep ALL existing animations and functionality exactly as-is
3. Preserve the exact same component structure
4. Don't change variable names, function names, or imports
5. Only add/modify the specific feature requested
6. Use the same coding patterns and style as the existing code
7. Ensure the function name stays exactly the same
8. NEVER add external library imports - use only HTML + Tailwind + Remotion

RESPONSE FORMAT (JSON):
{
  "code": "Complete modified code with ONLY the requested change",
  "changes": ["List of specific changes made"],
  "preserved": ["List of key things that were preserved"]
}

Return the complete working code with only the requested modification applied.`;

    const response = await AIClientService.generateResponse(
      modelConfig,
      [{ role: "user", content: `Apply this change: ${changeAnalysis.requestedChange}` }],
      { role: "system", content: prompt },
      { responseFormat: { type: "json_object" } }
    );

    const content = response?.content;
    if (!content) {
      throw new Error("No modification response from SurgicalEditor");
    }

    const parsed = this.extractJsonFromResponse(content);
    
    // Validate that we got valid code
    if (!parsed.code || typeof parsed.code !== 'string' || parsed.code.trim().length < 100) {
      throw new Error(`Invalid code returned: ${parsed.code?.substring(0, 100)}`);
    }
    
    if (this.DEBUG) {
      console.log(`[SurgicalEditor] Applied changes:`, {
        changesCount: parsed.changes?.length || 0,
        preservedCount: parsed.preserved?.length || 0
      });
    }
    
    return {
      code: parsed.code,
      changes: parsed.changes || [`Applied ${changeAnalysis.requestedChange}`],
      preserved: parsed.preserved || ["Existing functionality"]
    };
  }

  /**
   * Detect if the user request involves changing the total scene duration
   */
  private async detectDurationChange(userPrompt: string, changeAnalysis: ChangeAnalysis): Promise<number | undefined> {
    const modelConfig = resolveDirectCodeEditorModel('surgical');
    
    const prompt = `Analyze if this user request involves changing the TOTAL SCENE DURATION:

USER REQUEST: "${userPrompt}"
CHANGE ANALYSIS: "${changeAnalysis.requestedChange}"

DURATION CHANGE PATTERNS TO DETECT:
- "keep the first X seconds" = duration becomes X seconds
- "trim to X seconds" = duration becomes X seconds  
- "make it X seconds" = duration becomes X seconds
- "delete the last X seconds" = reduce duration by X seconds
- "cut it to X seconds" = duration becomes X seconds
- Speed changes that also mention specific time durations

RESPONSE FORMAT (JSON):
{
  "isDurationChange": boolean,
  "newDurationSeconds": number or null,
  "reasoning": "Explanation of duration analysis"
}

If no duration change is detected, return isDurationChange: false.`;

    try {
      const response = await AIClientService.generateResponse(
        modelConfig,
        [{ role: "user", content: userPrompt }],
        { role: "system", content: prompt },
        { responseFormat: { type: "json_object" } }
      );

      const content = response?.content;
      if (!content) {
        return undefined;
      }

      const parsed = this.extractJsonFromResponse(content);
      
      if (parsed.isDurationChange && parsed.newDurationSeconds) {
        const newFrames = Math.round(parsed.newDurationSeconds * 30); // Convert to frames (30fps)
        if (this.DEBUG) {
          console.log(`[SurgicalEditor] Duration change detected: ${parsed.newDurationSeconds}s = ${newFrames} frames`);
        }
        return newFrames;
      }
      
      return undefined;
    } catch (error) {
      console.warn("[SurgicalEditor] Duration analysis failed:", error);
      return undefined;
    }
  }

  /**
   * Extract function name from existing code
   */
  private extractFunctionName(code: string): string {
    const match = code.match(/export\s+default\s+function\s+(\w+)/);
    return match?.[1] || 'EditedScene';
  }

  /**
   * Validate that the edited code is syntactically correct
   */
  private validateCode(code: string): { isValid: boolean; error?: string } {
    try {
      // Basic validation - check for required Remotion imports and export
      if (!code.includes('export default function')) {
        return { isValid: false, error: 'Missing export default function' };
      }
      
      if (!code.includes('Remotion') && !code.includes('AbsoluteFill')) {
        return { isValid: false, error: 'Missing Remotion imports' };
      }

      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Helper method to safely extract JSON from markdown-wrapped responses
   */
  private extractJsonFromResponse(content: string): any {
    if (!content || typeof content !== 'string') {
      throw new Error('Empty or invalid response content');
    }

    const cleaned = content.trim();

    if (cleaned.startsWith('```')) {
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
          console.error("[SurgicalEditor] Failed to parse extracted JSON:", jsonString.substring(0, 200));
          throw new Error(`Invalid JSON in markdown block: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
        }
      }
    }

    try {
      return JSON.parse(cleaned);
    } catch (jsonError) {
      console.error("[SurgicalEditor] Failed to parse JSON:", cleaned.substring(0, 200));
      throw new Error(`Response is not valid JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const surgicalEditor = new SurgicalEditor();
