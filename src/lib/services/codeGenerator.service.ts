import { openai } from "~/server/lib/openai";
import { type SceneLayout } from "~/lib/schemas/sceneLayout";

export interface CodeGeneratorInput {
  layoutJson: SceneLayout;
  userPrompt: string; // For context
  functionName: string;
}

export interface CodeGeneratorOutput {
  code: string;
  name: string;
  duration: number;
  reasoning: string;
  debug: {
    prompt?: { system: string; user: string };
    response?: string;
    parsed?: any;
    error?: string;
  };
}

/**
 * CodeGenerator service - converts JSON specifications to React/Remotion code
 * Second step of the two-step pipeline: JSON Spec → React Code
 */
export class CodeGeneratorService {
  private readonly model = "gpt-4.1";
  private readonly temperature = 0.5; // Low temperature for consistent code generation

  async generateCode(input: CodeGeneratorInput): Promise<CodeGeneratorOutput> {
    const prompt = this.buildCodePrompt(input);
    
    console.log(`[CodeGenerator] 🎯 Starting code generation for: ${input.functionName}`);
    console.log(`[CodeGenerator] 📝 User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    console.log(`[CodeGenerator] 🎨 Scene type: ${input.layoutJson.sceneType || 'unknown'}`);
    console.log(`[CodeGenerator] 📊 Elements count: ${input.layoutJson.elements?.length || 0}`);
    
    try {
      console.log(`[CodeGenerator] 🚀 Calling OpenAI LLM...`);
      const response = await openai.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        messages: [
          {
            role: "system",
            content: prompt.system,
          },
          {
            role: "user", 
            content: prompt.user,
          },
        ],
      });
      
      const rawOutput = response.choices[0]?.message?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      console.log(`[CodeGenerator] 📤 Raw LLM response length: ${rawOutput.length} chars`);
      
      // 🚨 CRITICAL FIX: Remove markdown code fences if present
      let cleanCode = rawOutput.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // 🚨 CRITICAL FIX: Ensure single export default only
      if (cleanCode.includes('export default function') && cleanCode.includes('function SingleSceneComposition')) {
        console.warn(`[CodeGenerator] ⚠️ Detected wrapper function pattern - extracting scene function only`);
        const sceneMatch = cleanCode.match(/const \{[^}]+\} = window\.Remotion;[\s\S]*?export default function \w+\(\)[^{]*\{[\s\S]*?\n\}/);
        if (sceneMatch) {
          cleanCode = sceneMatch[0];
        }
      }
      
      // 🚨 NEW: Comprehensive Code Validation
      const validationResult = this.validateGeneratedCode(cleanCode, input.functionName);
      if (!validationResult.isValid) {
        console.error(`[CodeGenerator] ❌ Code validation failed:`, validationResult.errors);
        
        // 🚨 RETRY MECHANISM: Try generating again with explicit instructions
        if (validationResult.canRetry) {
          console.log(`[CodeGenerator] 🔄 Retrying with validation feedback...`);
          return await this.retryWithValidationFeedback(input, validationResult.errors);
        }
        
        // 🚨 FALLBACK: Generate safe fallback code
        console.log(`[CodeGenerator] 🛡️ Using safe fallback code...`);
        return this.generateSafeFallbackCode(input);
      }
      
      console.log(`[CodeGenerator] ✅ Code validation passed`);
      console.log(`[CodeGenerator] ✅ Code generation successful for ${input.functionName}`);
      
      return {
        code: cleanCode,
        name: input.functionName,
        duration: 180,
        reasoning: "Code generated and validated successfully",
        debug: {
          prompt,
          response: rawOutput,
          parsed: { code: cleanCode, validated: true },
        },
      };
    } catch (error) {
      console.error("[CodeGenerator] Error:", error);
      
      // 🚨 ENHANCED FALLBACK: Always provide working code
      return this.generateSafeFallbackCode(input);
    }
  }
  
  private buildCodePrompt(input: CodeGeneratorInput) {
    const { layoutJson, userPrompt, functionName } = input;
    
    // ADAPTED proven codegen-prompt.md for OUR system requirements
    const system = `You are a React motion code generator that converts a structured JSON layout description into a working React component using Remotion and inline styling with Tailwind classes.

🚨 CRITICAL ESM REQUIREMENTS (for our component loading system):
- MUST use: const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- NEVER use: import React from 'react' or import { ... } from 'remotion'
- NEVER import any external libraries (NO @mui/material, react-typical, etc.)
- Use ONLY basic HTML elements: <div>, <h1>, <input>, <button>, <span>, etc.
- For typewriter effects: Use interpolate() with string slicing, NOT external libraries

🚨 CRITICAL EXPORT REQUIREMENTS:
- ONLY ONE export default statement allowed
- Export the function with exact name: ${functionName}
- NEVER add additional export statements or wrapper functions

🚨 CRITICAL ANIMATION REQUIREMENTS:
- ALWAYS destructure fps from useVideoConfig: const { fps, durationInFrames } = useVideoConfig();
- ALWAYS pass fps to spring(): spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 100 } })
- Calculate timing in frames: fps * seconds (e.g., fps * 1.5 = 1.5 seconds)
- Use interpolate() with extrapolateLeft/Right: "clamp" for smooth transitions

🚨 CRITICAL STYLING REQUIREMENTS:
- fontWeight MUST be a string: fontWeight: "700", NOT fontWeight: 700
- fontSize MUST be a string with units: fontSize: "72px", NOT fontSize: 72
- All numeric CSS properties need units or quotes

The JSON input includes:
- \`sceneType\`: (e.g., "hero")
- \`background\`: CSS string for background
- \`layout\`: flexbox layout details such as \`align\`, \`gap\`, \`direction\`
- \`elements\`: an ordered array of content blocks like \`title\`, \`subtitle\`, \`glow\`, \`button\`
- \`animations\`: keyed by \`id\`, describing animation type, delay, and optional spring config

Styling requirements:
- Use Tailwind classes for rapid styling (bg-blue-500, text-white, flex, etc.)
- Use smooth colors. Background might be a gradient.
- Use Flowbite-style Tailwind utility classes for professional UI patterns
- For buttons: use classes like "text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"
- For cards: use classes like "max-w-sm bg-white border border-gray-200 rounded-lg shadow"
- Combine Tailwind with inline styles for animations and dynamic values
- If \`glow\` is present, apply \`textShadow\` and \`filter: brightness(...)\` animations

Render logic:
- Use \`useCurrentFrame()\`, \`spring()\`, and \`interpolate()\` from window.Remotion
- Respect text sizes, font weights, and colors from JSON
- Use \`spring()\` for animated entrance effects like fade-in or translateY
- Use \`Math.sin(frame * frequency)\` for pulsing elements
- Use \`AbsoluteFill\` from Remotion as the root wrapper
- Structure the scene based on the order of \`elements\`

REQUIRED STRUCTURE - stick to it, but be creative inside the boundaries:

const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;

export default function ${functionName}() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Animation calculations using fps
  const titleOpacity = interpolate(frame, [0, fps * 1.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  return (
    <AbsoluteFill className="bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
      {/* Your content with Tailwind classes and Flowbite-style utilities */}
      <button className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5">
        Click me
      </button>
    </AbsoluteFill>
  );
}

You only output complete and ready-to-render JavaScript/TypeScript code. Do not return JSON or explain anything. Do not include markdown code fences or backticks.`;

    const user = JSON.stringify(layoutJson, null, 2);

    return { system, user };
  }

  /**
   * 🚨 FIXED: Simple pattern validation instead of broken Function() constructor
   */
  private validateGeneratedCode(code: string, functionName: string): {
    isValid: boolean;
    errors: string[];
    canRetry: boolean;
  } {
    const errors: string[] = [];
    let canRetry = true;

    // ✅ SIMPLE: Basic required patterns validation only
    if (!code.includes(`export default function ${functionName}`)) {
      errors.push(`Missing export default function ${functionName}`);
      canRetry = true;
    }

    if (!code.includes('AbsoluteFill')) {
      errors.push('Missing AbsoluteFill component');
      canRetry = true;
    }

    if (!code.includes('return')) {
      errors.push('Missing return statement');
      canRetry = true;
    }

    // ✅ SIMPLE: Basic brace matching (but not strict - JSX can have complex nesting)
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    const braceDifference = Math.abs(openBraces - closeBraces);
    
    // Only flag as error if there's a significant brace mismatch (more than 2)
    // JSX can have temporary imbalances that are valid
    if (braceDifference > 2) {
      errors.push(`Possible unmatched braces: ${openBraces} open, ${closeBraces} close`);
      canRetry = true;
    }

    // ✅ SIMPLE: Check for completely empty or truncated code
    if (code.trim().length < 50) {
      errors.push('Generated code is too short or empty');
      canRetry = true;
    }

    // ✅ SIMPLE: Check for obvious syntax errors in strings
    const singleQuotes = (code.match(/'/g) || []).length;
    const doubleQuotes = (code.match(/"/g) || []).length;
    const backticks = (code.match(/`/g) || []).length;
    
    if (singleQuotes % 2 !== 0) {
      errors.push('Unmatched single quotes');
      canRetry = true;
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push('Unmatched double quotes');
      canRetry = true;
    }
    if (backticks % 2 !== 0) {
      errors.push('Unmatched backticks');
      canRetry = true;
    }

    // ✅ SAFETY: Check for dangerous patterns
    if (code.includes('function.constructor') || code.includes('eval(')) {
      errors.push('Potentially dangerous code patterns detected');
      canRetry = false; // Don't retry dangerous code
    }

    console.log(`[CodeGenerator] 🔍 Pattern validation for ${functionName}:`);
    console.log(`[CodeGenerator] - Export function: ${code.includes(`export default function ${functionName}`) ? '✅' : '❌'}`);
    console.log(`[CodeGenerator] - AbsoluteFill: ${code.includes('AbsoluteFill') ? '✅' : '❌'}`);
    console.log(`[CodeGenerator] - Return statement: ${code.includes('return') ? '✅' : '❌'}`);
    console.log(`[CodeGenerator] - Code length: ${code.trim().length} chars`);
    console.log(`[CodeGenerator] - Braces: ${openBraces} open, ${closeBraces} close (diff: ${braceDifference})`);
    
    if (errors.length === 0) {
      console.log(`[CodeGenerator] ✅ Pattern validation passed - code looks valid`);
    } else {
      console.log(`[CodeGenerator] ❌ Pattern validation failed:`, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      canRetry
    };
  }

  /**
   * 🚨 NEW: Retry mechanism with validation feedback
   */
  private async retryWithValidationFeedback(input: CodeGeneratorInput, validationErrors: string[]): Promise<CodeGeneratorOutput> {
    console.log(`[CodeGenerator] 🔄 Retrying with validation feedback for: ${input.functionName}`);
    
    const enhancedPrompt = this.buildCodePrompt(input);
    const validationFeedback = `
CRITICAL: The previous code generation failed validation with these errors:
${validationErrors.map(error => `- ${error}`).join('\n')}

Please fix these issues and ensure:
1. All braces {} are properly matched
2. All string literals are properly closed
3. The function has a complete return statement
4. No incomplete or dangling code
5. Proper export default function ${input.functionName}() structure
`;

    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        temperature: 0.2, // Lower temperature for retry
        messages: [
          {
            role: "system",
            content: enhancedPrompt.system + '\n\n' + validationFeedback,
          },
          {
            role: "user", 
            content: enhancedPrompt.user,
          },
        ],
      });
      
      const rawOutput = response.choices[0]?.message?.content;
      if (!rawOutput) {
        throw new Error("No response from retry attempt");
      }
      
      let cleanCode = rawOutput.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // Validate the retry attempt
      const retryValidation = this.validateGeneratedCode(cleanCode, input.functionName);
      if (retryValidation.isValid) {
        console.log(`[CodeGenerator] ✅ Retry successful!`);
        return {
          code: cleanCode,
          name: input.functionName,
          duration: 180,
          reasoning: "Code generated successfully after retry with validation feedback",
          debug: {
            prompt: enhancedPrompt,
            response: rawOutput,
            parsed: { code: cleanCode, retried: true, originalErrors: validationErrors },
          },
        };
      } else {
        console.warn(`[CodeGenerator] ⚠️ Retry still has errors:`, retryValidation.errors);
        throw new Error(`Retry failed: ${retryValidation.errors.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`[CodeGenerator] ❌ Retry failed:`, error);
      return this.generateSafeFallbackCode(input);
    }
  }

  /**
   * 🚨 NEW: Generate safe fallback code that always works
   */
  private generateSafeFallbackCode(input: CodeGeneratorInput): CodeGeneratorOutput {
    console.log(`[CodeGenerator] 🛡️ Generating safe fallback for: ${input.functionName}`);
    
    const fallbackCode = `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function ${input.functionName}() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Safe fade-in animation
  const opacity = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  // Safe scale animation
  const scale = interpolate(frame, [0, fps * 1.5], [0.9, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      opacity: opacity,
      transform: \`scale(\${scale})\`
    }}>
      <div style={{
        textAlign: "center",
        maxWidth: "80%",
        padding: "2rem"
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "700",
          color: "white",
          margin: "0 0 1rem 0",
          textShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>
          Scene Generated
        </h1>
        <p style={{
          fontSize: "1.2rem",
          color: "rgba(255,255,255,0.9)",
          margin: "0",
          lineHeight: "1.6"
        }}>
          This scene was safely generated as a fallback. You can edit it to customize the content.
        </p>
      </div>
    </AbsoluteFill>
  );
}`;

    return {
      code: fallbackCode,
      name: input.functionName,
      duration: 180,
      reasoning: "Generated safe fallback code due to validation errors",
      debug: { 
        error: "Validation failed, used safe fallback"
      }
    };
  }
}

// Export singleton instance
export const codeGeneratorService = new CodeGeneratorService(); 