import { z } from "zod";
import { BaseMCPTool } from "./base";
import { openai } from "~/server/lib/openai";
import { conversationalResponseService } from "~/server/services/conversationalResponse.service";
import { transform } from "sucrase";

const fixBrokenSceneInputSchema = z.object({
  brokenCode: z.string().describe("The broken scene code that needs fixing"),
  errorMessage: z.string().describe("The error message from the crash"),
  sceneId: z.string().describe("ID of the scene to fix"),
  sceneName: z.string().describe("Name of the broken scene"),
  projectId: z.string().describe("Project ID containing the broken scene"),
});

type FixBrokenSceneInput = z.infer<typeof fixBrokenSceneInputSchema>;

interface FixBrokenSceneOutput {
  fixedCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  changesApplied: string[];
  chatResponse?: string;
  debug?: any;
}

export class FixBrokenSceneTool extends BaseMCPTool<FixBrokenSceneInput, FixBrokenSceneOutput> {
  name = "fixBrokenScene";
  description = "Automatically analyze and fix broken scene code. Use when a scene has crashed and needs repair.";
  inputSchema = fixBrokenSceneInputSchema;
  
  protected async execute(input: FixBrokenSceneInput): Promise<FixBrokenSceneOutput> {
    const { brokenCode, errorMessage, sceneId, sceneName, projectId } = input;

    // ✅ CONVERT: Technical name to user-friendly display name
    const displayName = sceneName.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || sceneName;

    try {
      console.log(`[FixBrokenScene] 🔧 Starting auto-fix for "${displayName}": ${errorMessage}`);
      
      // STEP 1: Analyze the error and generate fix
      const fixResult = await this.generateFixedCode(brokenCode, errorMessage);
      
      // STEP 2: Validate the fix works
      const validationResult = await this.validateFixedCode(fixResult.fixedCode);
      
      if (!validationResult.isValid) {
        // If our fix doesn't work, try a fallback approach
        console.warn(`[FixBrokenScene] First fix attempt failed, trying fallback...`);
        const fallbackResult = await this.generateFallbackFix(brokenCode, sceneName);
        
        const chatResponse = await conversationalResponseService.generateContextualResponse({
          operation: 'fixBrokenScene',
          userPrompt: `Auto-fix ${displayName}`,
          result: {
            sceneName: displayName,
            fixMethod: 'fallback',
            originalError: errorMessage,
            changesApplied: fallbackResult.changesApplied
          },
          context: {
            sceneName: displayName,
            projectId
          }
        });

        return {
          fixedCode: fallbackResult.fixedCode,
          sceneName: displayName,
          duration: 180,
          reasoning: "Used safe fallback fix due to complex error",
          changesApplied: fallbackResult.changesApplied,
          chatResponse,
          debug: { method: 'fallback', originalError: errorMessage }
        };
      }

      // SUCCESS: Generate conversational response
      const chatResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'fixBrokenScene',
        userPrompt: `Auto-fix ${displayName}`,
        result: {
          sceneName: displayName,
          fixMethod: 'smart',
          originalError: errorMessage,
          changesApplied: fixResult.changesApplied
        },
        context: {
          sceneName: displayName,
          projectId
        }
      });

      console.log(`[FixBrokenScene] ✅ Successfully fixed "${displayName}"`);

      return {
        fixedCode: fixResult.fixedCode,
        sceneName: displayName,
        duration: 180,
        reasoning: fixResult.reasoning,
        changesApplied: fixResult.changesApplied,
        chatResponse,
        debug: { method: 'smart', originalError: errorMessage }
      };
      
    } catch (error) {
      console.error("[FixBrokenScene] Auto-fix failed:", error);
      
      // Generate error response for user
      const errorResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'fixBrokenScene',
        userPrompt: `Auto-fix ${displayName}`,
        result: { error: String(error) },
        context: {
          sceneName: displayName,
          projectId
        }
      });

      // Return a basic working scene as last resort
      const emergencyFix = this.generateEmergencyFix(sceneName);

      return {
        fixedCode: emergencyFix,
        sceneName: displayName,
        duration: 180,
        reasoning: "Auto-fix encountered issues, provided emergency replacement",
        changesApplied: ["Emergency replacement scene generated"],
        chatResponse: errorResponse,
        debug: { error: String(error) }
      };
    }
  }

  /**
   * Use GPT-4.1 to intelligently analyze and fix the broken code
   */
  private async generateFixedCode(brokenCode: string, errorMessage: string) {
    const fixPrompt = this.buildFixPrompt(brokenCode, errorMessage);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2, // Low temperature for precise fixes
      messages: [
        { role: "system", content: fixPrompt.system },
        { role: "user", content: fixPrompt.user }
      ],
      response_format: { type: "json_object" }
    });

    const rawOutput = response.choices[0]?.message?.content;
    if (!rawOutput) {
      throw new Error("No response from fix LLM");
    }

    const parsed = JSON.parse(rawOutput);
    
    return {
      fixedCode: parsed.fixedCode,
      reasoning: parsed.reasoning,
      changesApplied: parsed.changesApplied || []
    };
  }

  /**
   * Build the prompt for the fix LLM
   */
  private buildFixPrompt(brokenCode: string, errorMessage: string) {
    const system = `You are a Remotion code doctor. Fix broken scene code with minimal changes.

🚨 CRITICAL RULES (same as CodeGenerator):
- const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- export default function [FUNCTION_NAME]() 
- NO imports, NO markdown, NO extra exports
- Quote ALL CSS values: fontSize: "4rem", fontWeight: "700"
- Use extrapolateLeft: "clamp", extrapolateRight: "clamp"
- Single transform per element

COMMON FIXES:
1. Interpolation errors: inputRange must be strictly increasing [0, 30, 60] not [60, 30, 0]
2. Multiple exports: Only ONE export default function
3. Import statements: Remove all imports, use window.Remotion destructuring
4. Missing destructuring: Must have const { ... } = window.Remotion;
5. Quote CSS values: fontWeight: "700" not fontWeight: 700
6. Transform syntax: transform: \`scale(\${value})\` not transform: "scale(" + value + ")"
7. Undefined variables: Check all variables are defined
8. Division by zero: Add safety checks for mathematical operations

RESPONSE FORMAT (JSON):
{
  "fixedCode": "// Complete fixed code here",
  "reasoning": "Brief explanation of what was wrong and how it was fixed",
  "changesApplied": ["List of specific changes made"]
}

Fix the code below:`;

    const user = `BROKEN CODE:
${brokenCode}

ERROR MESSAGE:
${errorMessage}

Fix this code with minimal changes. Preserve the original intent and animations.`;

    return { system, user };
  }

  /**
   * Validate that the fixed code actually compiles
   */
  private async validateFixedCode(fixedCode: string) {
    try {
      // Test compilation with Sucrase (same as CodeGenerator)
      const testCode = `
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

${fixedCode}
`;

      transform(testCode, {
        transforms: ['typescript', 'jsx'],
        jsxRuntime: 'classic',
        production: false,
      });

      // Basic validation (same as CodeGenerator)
      const errors: string[] = [];
      
      if (!fixedCode.includes('export default function'))
        errors.push('Missing export default');
      
      if (!fixedCode.includes('window.Remotion'))
        errors.push('Missing window.Remotion destructure');
      
      if (!fixedCode.includes('return'))
        errors.push('Missing return');
      
      if (fixedCode.trim().length < 50)
        errors.push('Code too short');

      return { isValid: errors.length === 0, errors };
      
    } catch (error) {
      return { isValid: false, errors: [`Compilation failed: ${error}`] };
    }
  }

  /**
   * Generate a safe fallback fix when smart fixing fails
   */
  private async generateFallbackFix(brokenCode: string, sceneName: string) {
    // Extract any text content from the broken code for preservation
    const textMatches = brokenCode.match(/"([^"]+)"/g) || [];
    const extractedText = textMatches
      .map(match => match.replace(/"/g, ''))
      .filter(text => text.length > 2 && text.length < 50)
      .slice(0, 3); // Max 3 text elements

    const displayText = extractedText.length > 0 ? extractedText[0] : "Fixed Scene";

    const fallbackCode = `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function ${sceneName.replace(/\s+/g, '')}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif",
      opacity: opacity
    }}>
      <div style={{
        textAlign: "center",
        color: "white",
        padding: "2rem"
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "700",
          margin: "0 0 1rem 0",
          textShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>
          ${displayText}
        </h1>
        <p style={{
          fontSize: "1.2rem",
          opacity: "0.9",
          margin: "0"
        }}>
          Scene automatically repaired
        </p>
      </div>
    </AbsoluteFill>
  );
}`;

    return {
      fixedCode: fallbackCode,
      changesApplied: [
        "Replaced with safe fallback scene",
        `Preserved text: "${displayText}"`,
        "Added safe animations and styling"
      ]
    };
  }

  /**
   * Emergency fix for when everything else fails
   */
  private generateEmergencyFix(sceneName: string): string {
    return `const { AbsoluteFill } = window.Remotion;

export default function ${sceneName.replace(/\s+/g, '')}() {
  return (
    <AbsoluteFill style={{
      backgroundColor: "#f3f4f6",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        textAlign: "center",
        padding: "2rem",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{
          color: "#374151",
          margin: "0 0 1rem 0",
          fontSize: "2rem"
        }}>
          Scene Restored
        </h2>
        <p style={{
          color: "#6b7280",
          margin: "0"
        }}>
          This scene was automatically repaired
        </p>
      </div>
    </AbsoluteFill>
  );
}`;
  }
}

export const fixBrokenSceneTool = new FixBrokenSceneTool(); 