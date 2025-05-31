import { openai } from "~/server/lib/openai";

export interface DirectCodeEditInput {
  userPrompt: string;
  existingCode: string;
  existingName: string;
  chatHistory?: Array<{role: string, content: string}>;
  editComplexity?: 'surgical' | 'creative' | 'structural';
}

export interface DirectCodeEditOutput {
  code: string;
  changes: string[];
  preserved: string[];
  reasoning: string;
  newDurationFrames?: number;
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
  private readonly model = "gpt-4.1-mini";
  private readonly temperature = 0.25; // Low temperature for precise code editing

  async editCode(input: DirectCodeEditInput): Promise<DirectCodeEditOutput> {
    try {
      const complexity = input.editComplexity || 'surgical';
      console.log(`[DirectCodeEditor] Using ${complexity} editing approach`);
      
      // Route to different editing strategies based on complexity
      switch (complexity) {
        case 'surgical':
          return await this.surgicalEdit(input);
        case 'creative':
          return await this.creativeEdit(input);
        case 'structural':
          return await this.structuralEdit(input);
        default:
          return await this.surgicalEdit(input); // Fallback to surgical
      }
      
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
   * SURGICAL EDIT: Fast, precise, single-element changes
   */
  private async surgicalEdit(input: DirectCodeEditInput): Promise<DirectCodeEditOutput> {
    try {
      // Step 1: Analyze what needs to change
      const changeAnalysis = await this.analyzeRequestedChanges(input);
      
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
      console.error("[DirectCodeEditor] Surgical edit failed:", error);
      throw error; // Re-throw to be caught by main editCode method
    }
  }

  /**
   * CREATIVE EDIT: More flexible, multi-element changes
   */
  private async creativeEdit(input: DirectCodeEditInput): Promise<DirectCodeEditOutput> {
    try {
      console.log("[DirectCodeEditor] Creative edit - allowing holistic style changes");
      
      // Skip analysis phase - go directly to creative modification
      const prompt = `You are making CREATIVE improvements to existing React/Remotion code.

EXISTING CODE:
\`\`\`tsx
${input.existingCode}
\`\`\`

USER REQUEST: "${input.userPrompt}"

CREATIVE EDITING RULES:
🎨 CREATIVE FREEDOM ALLOWED:
- Update fonts, colors, spacing, shadows, gradients
- Improve visual design and aesthetics  
- Add modern effects and animations
- Enhance the overall look and feel
- Modify multiple elements if needed for cohesion

✅ PRESERVE CORE FUNCTIONALITY:
- Keep the same component structure
- Maintain existing content (text, data)
- Preserve animation timing patterns
- Keep the same Remotion imports and patterns

🚨 IMPORT RESTRICTIONS - NEVER VIOLATE:
- NEVER add external library imports
- ONLY use: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- Use ONLY basic HTML elements and Tailwind classes

RESPONSE FORMAT (JSON):
{
  "code": "Complete modified code with creative improvements",
  "changes": ["List of creative changes made"],
  "preserved": ["List of core functionality preserved"],
  "reasoning": "Explanation of creative improvements applied"
}

Apply creative improvements while preserving core functionality.`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: input.userPrompt }
        ],
        temperature: 0.4, // Higher temperature for more creativity
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No creative modification response from DirectCodeEditor");
      }

      const parsed = JSON.parse(content);
      
      // Validate that we got valid code
      if (!parsed.code || typeof parsed.code !== 'string' || parsed.code.trim().length < 100) {
        throw new Error(`Invalid creative code returned: ${parsed.code?.substring(0, 100)}`);
      }

      // Detect duration changes
      const newDurationFrames = await this.detectDurationChange(input.userPrompt, {
        targetElement: "multiple elements",
        requestedChange: input.userPrompt,
        preserveAnimations: [],
        preserveElements: [],
        modificationStrategy: "creative"
      });
      
      console.log(`[DirectCodeEditor] Creative edit completed:`, {
        changesCount: parsed.changes?.length || 0,
        preservedCount: parsed.preserved?.length || 0
      });
      
      return {
        code: parsed.code,
        changes: parsed.changes || [`Applied creative improvements: ${input.userPrompt}`],
        preserved: parsed.preserved || ["Core functionality"],
        reasoning: parsed.reasoning || "Applied creative modifications",
        newDurationFrames,
        debug: {
          changeAnalysis: { modificationStrategy: "creative" },
          modificationStrategy: "creative"
        }
      };
      
    } catch (error) {
      console.error("[DirectCodeEditor] Creative edit failed:", error);
      throw error;
    }
  }

  /**
   * STRUCTURAL EDIT: Large-scale, structural changes
   */
  private async structuralEdit(input: DirectCodeEditInput): Promise<DirectCodeEditOutput> {
    try {
      console.log("[DirectCodeEditor] Structural edit - allowing layout and element restructuring");
      
      const prompt = `You are making STRUCTURAL changes to React/Remotion code layout and element organization.

EXISTING CODE:
\`\`\`tsx
${input.existingCode}
\`\`\`

USER REQUEST: "${input.userPrompt}"

STRUCTURAL EDITING RULES:
🏗️ STRUCTURAL FREEDOM ALLOWED:
- Rearrange element positioning and layout
- Move elements up/down, left/right in the visual hierarchy
- Change flex/grid layouts and positioning
- Reorganize content structure and flow
- Coordinate animations between multiple elements
- Adjust timing and sequencing of animations

✅ STILL PRESERVE:
- All existing content (text, data, media)
- Core Remotion patterns and component structure
- Same imports and overall framework

🚨 COMPLEX CHANGES - USE MULTI-STEP APPROACH:
1. First, reorganize the layout structure
2. Then, adjust animations to fit new layout
3. Finally, ensure proper timing coordination

🚨 IMPORT RESTRICTIONS - NEVER VIOLATE:
- NEVER add external library imports
- ONLY use: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- Use ONLY basic HTML elements and Tailwind classes

RESPONSE FORMAT (JSON):
{
  "code": "Complete restructured code with layout changes",
  "changes": ["List of structural changes made"],
  "preserved": ["List of content and functionality preserved"],
  "reasoning": "Explanation of structural modifications applied"
}

Apply structural modifications while preserving all content.`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: input.userPrompt }
        ],
        temperature: 0.3, // Medium temperature for structural precision
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No structural modification response from DirectCodeEditor");
      }

      const parsed = JSON.parse(content);
      
      // Validate that we got valid code
      if (!parsed.code || typeof parsed.code !== 'string' || parsed.code.trim().length < 100) {
        throw new Error(`Invalid structural code returned: ${parsed.code?.substring(0, 100)}`);
      }

      // Detect duration changes
      const newDurationFrames = await this.detectDurationChange(input.userPrompt, {
        targetElement: "layout structure",
        requestedChange: input.userPrompt,
        preserveAnimations: [],
        preserveElements: [],
        modificationStrategy: "structural"
      });
      
      console.log(`[DirectCodeEditor] Structural edit completed:`, {
        changesCount: parsed.changes?.length || 0,
        preservedCount: parsed.preserved?.length || 0
      });
      
      return {
        code: parsed.code,
        changes: parsed.changes || [`Applied structural changes: ${input.userPrompt}`],
        preserved: parsed.preserved || ["All content and core functionality"],
        reasoning: parsed.reasoning || "Applied structural modifications to layout",
        newDurationFrames,
        debug: {
          changeAnalysis: { modificationStrategy: "structural" },
          modificationStrategy: "structural"
        }
      };
      
    } catch (error) {
      console.error("[DirectCodeEditor] Structural edit failed:", error);
      throw error;
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

  private async detectDurationChange(userPrompt: string, changeAnalysis: ChangeAnalysis): Promise<number | undefined> {
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
  "reasoning": "explanation of why this is/isn't a duration change"
}

If the user is only changing animation timing (without changing total scene length), return isDurationChange: false.
If the user wants to change the total scene duration, calculate the new duration in seconds.`;

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1, // Very low temperature for precise analysis
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return undefined;

      const parsed = JSON.parse(content);
      
      console.log(`[DirectCodeEditor] Duration analysis:`, {
        isDurationChange: parsed.isDurationChange,
        newDurationSeconds: parsed.newDurationSeconds,
        reasoning: parsed.reasoning
      });

      if (parsed.isDurationChange && typeof parsed.newDurationSeconds === 'number') {
        const newDurationFrames = Math.round(parsed.newDurationSeconds * 30); // Convert to frames at 30fps
        console.log(`[DirectCodeEditor] Detected duration change: ${parsed.newDurationSeconds}s = ${newDurationFrames} frames`);
        return newDurationFrames;
      }

      return undefined;
    } catch (error) {
      console.error('[DirectCodeEditor] Duration detection failed:', error);
      return undefined;
    }
  }
}

// Export singleton instance
export const directCodeEditorService = new DirectCodeEditorService(); 