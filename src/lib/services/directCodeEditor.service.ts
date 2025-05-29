import { openai } from "~/server/lib/openai";

export interface DirectCodeEditInput {
  userPrompt: string;
  existingCode: string;
  existingName: string;
  chatHistory?: Array<{role: string, content: string}>;
}

export interface DirectCodeEditOutput {
  code: string;
  changes: string[];
  preserved: string[];
  reasoning: string;
  debug: {
    changeAnalysis: any;
    modificationStrategy: string;
  };
}

interface ChangeAnalysis {
  targetElement: string;
  targetText?: string;
  requestedChange: string;
  preserveAnimations: string[];
  preserveElements: string[];
  modificationStrategy: string;
}

/**
 * DirectCodeEditor service - performs surgical edits to existing React/Remotion code
 * Instead of regenerating everything, this makes targeted changes while preserving functionality
 */
export class DirectCodeEditorService {
  private readonly model = "gpt-4o";
  private readonly temperature = 0.1; // Low temperature for precise code editing

  async editCode(input: DirectCodeEditInput): Promise<DirectCodeEditOutput> {
    try {
      // Step 1: Analyze what needs to change
      const changeAnalysis = await this.analyzeRequestedChanges(input);
      
      // Step 2: Apply targeted modifications
      const modifiedCode = await this.applyTargetedChanges(input.existingCode, changeAnalysis);
      
      return {
        code: modifiedCode.code,
        changes: modifiedCode.changes,
        preserved: modifiedCode.preserved,
        reasoning: `Applied targeted edit: ${changeAnalysis.requestedChange} to ${changeAnalysis.targetElement}`,
        debug: {
          changeAnalysis,
          modificationStrategy: changeAnalysis.modificationStrategy
        }
      };
      
    } catch (error) {
      console.error("[DirectCodeEditor] Error:", error);
      
      // Fallback: return original code
      return {
        code: input.existingCode,
        changes: [],
        preserved: ["Everything (edit failed)"],
        reasoning: "Edit failed - returned original code",
        debug: {
          changeAnalysis: null,
          modificationStrategy: "Fallback due to error"
        }
      };
    }
  }

  /**
   * Analyze what the user wants to change and create a modification plan
   */
  private async analyzeRequestedChanges(input: DirectCodeEditInput): Promise<ChangeAnalysis> {
    const chatContext = input.chatHistory && input.chatHistory.length > 0
      ? `\nCHAT HISTORY (for context):\n${input.chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : "";

    const prompt = `You are a code editor analyzing what changes to make to existing React/Remotion code.

EXISTING CODE:
\`\`\`tsx
${input.existingCode}
\`\`\`

USER REQUEST: "${input.userPrompt}"${chatContext}

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

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: input.userPrompt }
      ],
      temperature: this.temperature,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No analysis response from DirectCodeEditor");
    }

    const parsed = JSON.parse(content);
    
    console.log(`[DirectCodeEditor] Change analysis:`, {
      target: parsed.targetElement,
      change: parsed.requestedChange,
      preserve: parsed.preserveElements?.length || 0
    });
    
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

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Apply this change: ${changeAnalysis.requestedChange}` }
      ],
      temperature: this.temperature,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No modification response from DirectCodeEditor");
    }

    const parsed = JSON.parse(content);
    
    // Validate that we got valid code
    if (!parsed.code || typeof parsed.code !== 'string' || parsed.code.trim().length < 100) {
      throw new Error(`Invalid code returned: ${parsed.code?.substring(0, 100)}`);
    }
    
    console.log(`[DirectCodeEditor] Applied changes:`, {
      changesCount: parsed.changes?.length || 0,
      preservedCount: parsed.preserved?.length || 0
    });
    
    return {
      code: parsed.code,
      changes: parsed.changes || [`Applied ${changeAnalysis.requestedChange}`],
      preserved: parsed.preserved || ["Existing functionality"]
    };
  }
}

// Export singleton instance
export const directCodeEditorService = new DirectCodeEditorService(); 