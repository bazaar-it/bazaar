// src/lib/services/codeGenerator.service.ts
import { openai } from "~/server/lib/openai";
import { type SceneLayout } from "~/lib/schemas/sceneLayout";

export interface CodeGeneratorInput {
  layoutJson: any;  // ✅ No schema - Layout LLM freedom
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
  private readonly DEBUG = process.env.NODE_ENV === 'development';
  private readonly model = "gpt-4.1";
  private readonly temperature = 0.4;

  async generateCode(input: CodeGeneratorInput): Promise<CodeGeneratorOutput> {
    const prompt = this.buildCodePrompt(input);
    
    this.DEBUG && console.log(`[CodeGenerator] 🎯 Starting code generation for: ${input.functionName}`);
    this.DEBUG && console.log(`[CodeGenerator] 📝 User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    this.DEBUG && console.log(`[CodeGenerator] 🎨 Scene type: ${input.layoutJson.sceneType || 'unknown'}`);
    this.DEBUG && console.log(`[CodeGenerator] 📊 Elements count: ${input.layoutJson.elements?.length || 0}`);
    
    // ✅ NEW: Log the received JSON for debugging
    if (this.DEBUG) {
      console.log(`\n[CodeGenerator] 📥 RECEIVED LAYOUT JSON:`);
      console.log('='.repeat(80));
      console.log(JSON.stringify(input.layoutJson, null, 2));
      console.log('='.repeat(80));
      console.log(`[CodeGenerator] 📏 JSON size: ${JSON.stringify(input.layoutJson).length} characters`);
      console.log(`[CodeGenerator] 🧠 Will combine this JSON with user prompt: "${input.userPrompt.substring(0, 50)}..."\n`);
    }
    
    try {
      this.DEBUG && console.log(`[CodeGenerator] 🚀 Calling OpenAI LLM...`);
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
      
      this.DEBUG && console.log(`[CodeGenerator] 📤 Raw LLM response length: ${rawOutput.length} chars`);
      
      // 🚨 CRITICAL FIX: Remove markdown code fences if present
      let cleanCode = rawOutput.trim();
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // 🚨 CRITICAL FIX: Ensure single export default only
      if (cleanCode.includes('export default function') && cleanCode.includes('function SingleSceneComposition')) {
        this.DEBUG && console.warn(`[CodeGenerator] ⚠️ Detected wrapper function pattern - extracting scene function only`);
        const sceneMatch = cleanCode.match(/const \{[^}]+\} = window\.Remotion;[\s\S]*?export default function \w+\(\)[^{]*\{[\s\S]*?\n\}/);
        if (sceneMatch) {
          cleanCode = sceneMatch[0];
        }
      }
      
      // Simplified validation - only 4 essential checks
      const validationResult = this.validateGeneratedCode(cleanCode, input.functionName);
      if (!validationResult.isValid) {
        this.DEBUG && console.error(`[CodeGenerator] ❌ Code validation failed:`, validationResult.errors);
        
        // No retry - go straight to fallback
        this.DEBUG && console.log(`[CodeGenerator] 🛡️ Using safe fallback code...`);
        return this.generateSafeFallbackCode(input);
      }
      
      this.DEBUG && console.log(`[CodeGenerator] ✅ Code validation passed`);
      this.DEBUG && console.log(`[CodeGenerator] ✅ Code generation successful for ${input.functionName}`);
      
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
      this.DEBUG && console.error("[CodeGenerator] Error:", error);
      
      // 🚨 ENHANCED FALLBACK: Always provide working code
      return this.generateSafeFallbackCode(input);
    }
  }
  
  private buildCodePrompt(input: CodeGeneratorInput) {
    const { layoutJson, userPrompt, functionName } = input;
    
    const system = `React/Remotion expert. Convert JSON guidance to high-quality code.

🚨 CRITICAL RULES:
- const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
- export default function ${functionName}()
- NO imports, NO markdown
- Quote ALL CSS values: fontSize: "4rem", fontWeight: "700"
- Use extrapolateLeft: "clamp", extrapolateRight: "clamp"
- Single transform per element (combine: translate(-50%, -50%) scale(1.2))
- Use standard CSS, avoid WebKit-only properties

ANIMATION PATTERN:
const opacity = interpolate(frame, [0, fps * 1], [0, 1], { 
  extrapolateLeft: "clamp", extrapolateRight: "clamp" 
});

User wants: "${userPrompt}"
Build exactly what they requested using the JSON below.`;

    const user = JSON.stringify(layoutJson, null, 2);
    
    return { system, user };
  }

  /**
   * Simplified validation - only 4 essential checks
   */
  private validateGeneratedCode(code: string, fn: string) {
    const errors: string[] = [];

    if (!code.includes(`export default function ${fn}`))
      errors.push('Missing export default');

    if (!code.includes('window.Remotion'))
      errors.push('Missing window.Remotion destructure');

    if (!code.includes('return'))
      errors.push('Missing return');

    if (code.trim().length < 50)
      errors.push('Code too short');

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 🚨 NEW: Generate safe fallback code that always works
   */
  private generateSafeFallbackCode(input: CodeGeneratorInput): CodeGeneratorOutput {
    this.DEBUG && console.log(`[CodeGenerator] 🛡️ Generating safe fallback for: ${input.functionName}`);
    
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