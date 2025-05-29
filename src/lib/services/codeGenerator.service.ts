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
  private readonly temperature = 0.4; // Low temperature for consistent code generation

  async generateCode(input: CodeGeneratorInput): Promise<CodeGeneratorOutput> {
    const prompt = this.buildCodePrompt(input);
    
    console.log(`[CodeGenerator] 🎯 Starting code generation for: ${input.functionName}`);
    console.log(`[CodeGenerator] 📝 User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    console.log(`[CodeGenerator] 🎨 Scene type: ${input.layoutJson.sceneType || 'unknown'}`);
    console.log(`[CodeGenerator] 📊 Elements count: ${input.layoutJson.elements?.length || 0}`);
    // console.log(`[CodeGenerator] 🎛️ Model: ${this.model}, Temperature: ${this.temperature}`);
    
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
        // NO response_format - expecting direct code output like the proven prompt
      });
      
      const rawOutput = response.choices[0]?.message?.content;
      if (!rawOutput) {
        throw new Error("No response from CodeGenerator LLM");
      }
      
      console.log(`[CodeGenerator] 📤 Raw LLM response length: ${rawOutput.length} chars`);
      console.log(`[CodeGenerator] 📤 Raw LLM response preview: ${rawOutput.substring(0, 300)}...`);
      
      // 🚨 CRITICAL FIX: Remove markdown code fences if present
      let cleanCode = rawOutput.trim();
      
      // Remove markdown code fences (```javascript, ```tsx, etc.)
      cleanCode = cleanCode.replace(/^```(?:javascript|tsx|ts|js)?\n?/i, '').replace(/\n?```$/i, '');
      
      // 🚨 CRITICAL FIX: Ensure single export default only
      if (cleanCode.includes('export default function') && cleanCode.includes('function SingleSceneComposition')) {
        console.warn(`[CodeGenerator] ⚠️ Detected wrapper function pattern - extracting scene function only`);
        // Extract just the scene function - match everything from const to the scene function export
        const sceneMatch = cleanCode.match(/const \{[^}]+\} = window\.Remotion;[\s\S]*?export default function \w+\(\)[^{]*\{[\s\S]*?\n\}/);
        if (sceneMatch) {
          cleanCode = sceneMatch[0];
        }
      }
      
      // 🚨 ADDITIONAL FIX: If there are TWO functions, keep only the scene function
      const functionMatches = cleanCode.match(/function (\w+)\(/g);
      if (functionMatches && functionMatches.length > 1) {
        console.warn(`[CodeGenerator] ⚠️ Multiple functions detected: ${functionMatches.join(', ')}`);
        
        // Find the scene function (should match our functionName)
        const sceneFunctionRegex = new RegExp(`function ${input.functionName}\\([^)]*\\)[^{]*\\{[\\s\\S]*?\\n\\}`, 'g');
        const sceneFunctionMatch = cleanCode.match(sceneFunctionRegex);
        
        if (sceneFunctionMatch) {
          // Rebuild with just the scene function
          const windowRemotionLine = cleanCode.match(/const \{[^}]+\} = window\.Remotion;/);
          if (windowRemotionLine) {
            cleanCode = `${windowRemotionLine[0]}\n\n${sceneFunctionMatch[0].replace(/^function/, 'export default function')}`;
          }
        }
      }
      
      // 🚨 ENSURE proper export default format
      if (!cleanCode.includes(`export default function ${input.functionName}`)) {
        // Try to fix it by replacing the function declaration
        cleanCode = cleanCode.replace(
          new RegExp(`function ${input.functionName}\\(`),
          `export default function ${input.functionName}(`
        );
      }
      
      console.log(`[CodeGenerator] 🧹 Cleaned code length: ${cleanCode.length} chars`);
      console.log(`[CodeGenerator] 🧹 Cleaned code preview: ${cleanCode.substring(0, 300)}...`);
      
      // Validate it looks like React code
      if (!cleanCode.includes('export default function') || !cleanCode.includes('AbsoluteFill')) {
        throw new Error(`Generated code doesn't look like valid React component. Preview: ${cleanCode.substring(0, 200)}...`);
      }
      
      // Ensure it has the right function name
      if (!cleanCode.includes(`function ${input.functionName}`)) {
        console.warn(`[CodeGenerator] ⚠️ Function name mismatch - expected ${input.functionName}`);
      }
      
      console.log(`[CodeGenerator] ✅ Code generation successful for ${input.functionName}`);
      console.log(`[CodeGenerator] 📊 Generated code validation: export=${cleanCode.includes('export default')}, AbsoluteFill=${cleanCode.includes('AbsoluteFill')}, fps=${cleanCode.includes('fps')}`);
      
      return {
        code: cleanCode,
        name: input.functionName,
        duration: 180, // Default duration
        reasoning: "Code generated using proven codegen-prompt.md with markdown cleanup",
        debug: {
          prompt,
          response: rawOutput,
          parsed: { code: cleanCode, cleaned: true },
        },
      };
    } catch (error) {
      console.error("[CodeGenerator] Error:", error);
      
      // Fallback to sophisticated code with proper animations
      const fallbackCode = `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function ${input.functionName}() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Staggered entrance animations
  const titleStart = 0;
  const titleDuration = fps * 1.5;
  const subtitleStart = fps * 0.8;
  const subtitleDuration = fps * 2;
  
  // Background gradient animation
  const gradientRotation = interpolate(frame, [0, durationInFrames], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  // Title animations
  const titleOpacity = interpolate(frame, [titleStart, titleStart + titleDuration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleScale = interpolate(frame, [titleStart, titleStart + titleDuration], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  // Subtitle animations
  const subtitleOpacity = interpolate(frame, [subtitleStart, subtitleStart + subtitleDuration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleTranslateY = interpolate(frame, [subtitleStart, subtitleStart + subtitleDuration], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  return (
    <AbsoluteFill style={{
      background: \`linear-gradient(\${gradientRotation}deg, ${input.layoutJson.background}, #1a1a3a, ${input.layoutJson.background})\`,
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Main content */}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        ${input.layoutJson.elements.map((el, i) => {
          const isTitle = el.type === 'title' || i === 0;
          const isSubtitle = el.type === 'subtitle' || i === 1;
          
          if (isTitle) {
            return `<h1 style={{
              fontSize: "4rem",
              fontWeight: "700",
              color: "${el.color}",
              margin: "0 0 1rem 0",
              opacity: titleOpacity,
              transform: \`scale(\${titleScale})\`,
              background: \`linear-gradient(45deg, ${el.color}, #a855f7, #3b82f6)\`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              ${el.text}
            </h1>`;
          } else if (isSubtitle) {
            return `<p style={{
              fontSize: "1.5rem",
              color: "${el.color}",
              opacity: subtitleOpacity * 0.8,
              transform: \`translateY(\${subtitleTranslateY}px)\`,
              margin: "0",
              maxWidth: "600px",
              lineHeight: "1.6"
            }}>
              ${el.text}
            </p>`;
          } else {
            return `<div style={{
              fontSize: "${el.fontSize}px",
              fontWeight: "${el.fontWeight}",
              color: "${el.color}",
              textAlign: "center",
              margin: "10px 0",
              opacity: interpolate(frame, [fps * ${i * 0.5}, fps * ${i * 0.5 + 1}], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            }}>
              ${el.text}
            </div>`;
          }
        }).join('')}
      </div>
    </AbsoluteFill>
  );
}`;
      
      return {
        code: fallbackCode,
        name: "Fallback Scene",
        duration: 180,
        reasoning: "Used fallback code due to generation error",
        debug: { error: String(error) }
      };
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
}

// Export singleton instance
export const codeGeneratorService = new CodeGeneratorService(); 