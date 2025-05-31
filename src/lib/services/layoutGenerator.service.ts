// src/lib/services/layoutGenerator.service.ts
import { openai } from "~/server/lib/openai";

export interface LayoutGeneratorInput {
  userPrompt: string;
  projectId: string;
  previousSceneJson?: string; // For style consistency
  isFirstScene?: boolean;
}

export interface LayoutGeneratorOutput {
  layoutJson: any;  // ✅ No schema - accept any JSON structure
  reasoning: string;
  debug: {
    prompt?: { system: string; user: string };
    response?: string;
    parsed?: any;
    error?: string;
  };
}

/**
 * LayoutGenerator service - converts user prompts to structured JSON specifications
 * First step of the two-step pipeline: User Intent → JSON Spec → React Code
 */
export class LayoutGeneratorService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';
  private readonly model = "gpt-4.1-mini";
  private readonly temperature = 0.3; // Low temperature for consistent JSON structure

  async generateLayout(input: LayoutGeneratorInput): Promise<LayoutGeneratorOutput> {
    const prompt = this.buildLayoutPrompt(input);
    
    this.DEBUG && console.log(`[LayoutGenerator] 🎯 Starting layout generation`);
    this.DEBUG && console.log(`[LayoutGenerator] 📝 User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    this.DEBUG && console.log(`[LayoutGenerator] 🆕 Is first scene: ${input.isFirstScene}`);
    this.DEBUG && console.log(`[LayoutGenerator] 🎨 Has previous scene JSON: ${input.previousSceneJson ? 'YES' : 'NO'}`);
    
    try {
      this.DEBUG && console.log(`[LayoutGenerator] 🚀 Calling OpenAI LLM for JSON layout...`);
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
        response_format: { type: "json_object" },
      });
      
      const rawOutput = response.choices[0]?.message?.content;
      if (!rawOutput) {
        throw new Error("No response from LayoutGenerator LLM");
      }
      
      this.DEBUG && console.log(`[LayoutGenerator] 📤 Raw LLM response length: ${rawOutput.length} chars`);
      
      // ---------- Minimal JSON parsing - let code generator handle whatever we get ----------
      let parsed;
      try {
        parsed = JSON.parse(rawOutput);
      } catch (jsonError) {
        // If JSON parsing fails, create a basic fallback structure
        parsed = {
          sceneType: "simple",
          background: "#1e1b4b",
          elements: [{ type: "title", id: "title1", text: "Generated Content" }],
          layout: { align: "center" }
        };
        this.DEBUG && console.warn(`[LayoutGenerator] JSON parse failed, using fallback: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`);
      }
      
      const layoutJson = parsed; // ✅ No schema casting - accept any JSON
      
      this.DEBUG && console.log(`[LayoutGenerator] ✅ Layout generation successful`);
      this.DEBUG && console.log(`[LayoutGenerator] 🎨 Scene type: ${layoutJson.sceneType || 'unknown'}`);
      this.DEBUG && console.log(`[LayoutGenerator] 📊 Elements count: ${layoutJson.elements?.length || 0}`);
      
      // ✅ NEW: Log the complete generated JSON for debugging
      if (this.DEBUG) {
        console.log(`\n[LayoutGenerator] 🔍 FULL GENERATED JSON:`);
        console.log('='.repeat(80));
        console.log(JSON.stringify(layoutJson, null, 2));
        console.log('='.repeat(80));
        console.log(`[LayoutGenerator] 📏 JSON size: ${JSON.stringify(layoutJson).length} characters\n`);
      }
      
      return {
        layoutJson,
        reasoning: "Layout specification generated successfully",
        debug: {
          prompt,
          response: rawOutput,
          parsed,
        },
      };
    } catch (error) {
      this.DEBUG && console.error("[LayoutGenerator] Error:", error);
      
      // Fallback to simple layout (no schema)
      const fallbackLayout = {
        sceneType: "simple",
        background: "#1e1b4b",
        elements: [
          {
            type: "title",
            id: "title1",
            text: "Generated Content",
            fontSize: 48,
            fontWeight: "700",
            color: "#ffffff",
          }
        ],
        layout: {
          align: "center",
          direction: "column",
          gap: 16,
        },
        animations: {
          title1: {
            type: "fadeIn",
            duration: 60,
            delay: 0,
          }
        }
      };
      
      return {
        layoutJson: fallbackLayout,
        reasoning: "Used fallback layout due to generation error",
        debug: { error: String(error) }
      };
    }
  }
  
  private buildLayoutPrompt(input: LayoutGeneratorInput) {
    const { userPrompt, previousSceneJson, isFirstScene } = input;
    
    const system = `You are a motion graphics director who converts any user request into a complete JSON specification for professional-quality animations.

Your job: Take whatever the user describes and create JSON that captures EVERY detail needed for stunning motion graphics.

QUALITY STANDARD - Here's the level of detail expected:

EXAMPLE: User says "intro for my company"
{
  "sceneType": "company-intro",
  "background": {
    "type": "animated-gradient", 
    "colors": ["#0f0f23", "#1a1a3a"],
    "animation": {"type": "rotation", "duration": 180}
  },
  "elements": [
    {
      "id": "title",
      "type": "gradient-text",
      "content": {"text": "Welcome to [Company]"},
      "visual": {"fontSize": 64, "fontWeight": "700", "gradient": ["#fff", "#a855f7"]},
      "motion": {
        "entrance": {"type": "fade-scale", "delay": 0, "duration": 45, "scale": [0.8, 1]}
      }
    },
    {
      "id": "particles", 
      "type": "floating-particles",
      "properties": {"count": 20, "size": 4, "behavior": "gentle-drift"},
      "motion": {"staggerDelay": 6, "opacity": [0, 0.3]}
    }
  ],
  "timing": {
    "phases": [
      {"name": "title-entrance", "start": 0, "duration": 45},
      {"name": "ambient-motion", "start": 60, "duration": 120}
    ]
  }
}

MOTION GRAPHICS VOCABULARY:
- Visual effects: gradient-text, floating-particles, glow-effects, animated-lines
- Animation types: fade-scale, slide-in, typewriter, morph, bounce, pulse
- Backgrounds: animated-gradient, particle-field, blur-overlay, pattern-animation
- Timing: staggered, sequential, simultaneous, phase-based

JSON STRUCTURE (completely flexible):
{
  "sceneType": "any description that fits user request",
  "background": "any background system - color, gradient, particles, etc",
  "elements": [
    {
      "id": "unique_id",
      "type": "whatever element type fits the user's vision", 
      "content": "any content - text, data, images, etc",
      "visual": "all visual properties - fonts, colors, sizes, effects",
      "motion": "complete animation specification - timing, easing, effects"
    }
  ],
  "timing": "scene-level orchestration and flow"
}

CRITICAL PRINCIPLES:
1. CAPTURE the user's exact request - miss nothing they described
2. ENRICH with motion graphics detail - professional timing, visual effects, polish
3. BE SPECIFIC about all visual properties - exact values, not vague descriptions
4. BE COMPLETE about motion - precise frame-based timing, smooth animations
5. THINK MOTION GRAPHICS - particles, gradients, easing, layering, orchestration

Remember: Your JSON is the complete blueprint. Make it rich enough that the code generator can create professional-quality motion graphics.`;

    const user = `Create a motion graphics scene: "${userPrompt}"`;
    
    return { system, user };
  }
}

// Export singleton instance
export const layoutGeneratorService = new LayoutGeneratorService(); 