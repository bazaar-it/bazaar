// src/lib/services/layoutGenerator.service.ts
import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getLayoutGeneratorModel } from "~/config/models.config";
import { getSystemPrompt } from "~/config/prompts.config";

export interface LayoutGeneratorInput {
  userPrompt: string;
  projectId: string;
  previousSceneJson?: string; // For style consistency
  isFirstScene?: boolean;
  visionAnalysis?: any; // 🚨 NEW: Vision analysis from analyzeImage tool
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
 * 🚨 NEW: Uses centralized model configuration system
 */
export class LayoutGeneratorService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  async generateLayout(input: LayoutGeneratorInput): Promise<LayoutGeneratorOutput> {
    // 🚨 NEW: Get model configuration from centralized system
    const modelConfig = getLayoutGeneratorModel();
    const prompt = this.buildLayoutPrompt(input);
    
    this.DEBUG && console.log(`[LayoutGenerator] 🎯 Starting layout generation`);
    this.DEBUG && console.log(`[LayoutGenerator] 🤖 Using model: ${modelConfig.provider}/${modelConfig.model}`);
    this.DEBUG && console.log(`[LayoutGenerator] 📝 User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    this.DEBUG && console.log(`[LayoutGenerator] 🆕 Is first scene: ${input.isFirstScene}`);
    this.DEBUG && console.log(`[LayoutGenerator] 🎨 Has previous scene JSON: ${input.previousSceneJson ? 'YES' : 'NO'}`);
    this.DEBUG && console.log(`[LayoutGenerator] 🖼️ Has vision analysis: ${input.visionAnalysis ? 'YES' : 'NO'}`);
    
    if (input.visionAnalysis && this.DEBUG) {
      console.log(`[LayoutGenerator] 🎨 Vision palette: ${input.visionAnalysis.palette?.join(', ') || 'None'}`);
      console.log(`[LayoutGenerator] 🎭 Vision mood: ${input.visionAnalysis.mood || 'None'}`);
      console.log(`[LayoutGenerator] ✍️ Vision typography: ${input.visionAnalysis.typography || 'None'}`);
    }
    
    try {
      this.DEBUG && console.log(`[LayoutGenerator] 🚀 Calling ${modelConfig.provider} LLM for JSON layout...`);
      
      // 🚨 NEW: Use centralized AI client instead of direct OpenAI calls
      const response = await AIClientService.generateResponse(
        modelConfig,
        [{ role: "user", content: prompt.user }],
        { role: "system", content: prompt.system },
        { responseFormat: { type: "json_object" } }
      );
      
      const rawOutput = response.content;
      if (!rawOutput) {
        throw new Error("No response from LayoutGenerator LLM");
      }
      
      this.DEBUG && console.log(`[LayoutGenerator] 📤 Raw LLM response length: ${rawOutput.length} chars`);
      
      // 🚨 NEW: Log model usage for debugging
      if (this.DEBUG) {
        AIClientService.logModelUsage(modelConfig, response.usage);
      }
      
      // ---------- Minimal JSON parsing - let code generator handle whatever we get ----------
      let parsed;
      try {
        // 🚨 FIX: Strip markdown code blocks if present
        let cleanedOutput = rawOutput;
        
        // Remove ```json or ``` wrapping if present
        if (cleanedOutput.startsWith('```')) {
          const lines = cleanedOutput.split('\n');
          if (lines[0].startsWith('```')) {
            lines.shift(); // Remove first ```json or ```
          }
          if (lines[lines.length - 1].startsWith('```')) {
            lines.pop(); // Remove last ```
          }
          cleanedOutput = lines.join('\n');
        }
        
        parsed = JSON.parse(cleanedOutput);
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
    const { userPrompt, previousSceneJson, isFirstScene, visionAnalysis } = input;
    
    // 🚨 NEW: Image-first approach - completely different prompts based on whether images are provided
    if (visionAnalysis && visionAnalysis.layoutJson) {
      // VISION-DRIVEN MODE: Image is the blueprint, user prompt only modifies
      return this.buildVisionDrivenPrompt(userPrompt, visionAnalysis);
    } else {
      // TEXT-DRIVEN MODE: Traditional prompt-based generation
      return this.buildTextDrivenPrompt(userPrompt, previousSceneJson, isFirstScene);
    }
  }

  private buildVisionDrivenPrompt(userPrompt: string, visionAnalysis: any) {
    const system = `🎯 VISION-DRIVEN MOTION GRAPHICS MODE

You are converting a PIXEL-PERFECT image analysis into motion graphics JSON.

CRITICAL APPROACH:
- The vision analysis is your BLUEPRINT - recreate it exactly
- User prompt only modifies specific aspects or adds animations
- Every visual detail from the image must be preserved
- Focus on motion graphics enhancement, not redesign

MOTION GRAPHICS ENHANCEMENT RULES:
1. ADD animations to existing elements (don't change their appearance)
2. ENHANCE with motion graphics effects (particles, glows, etc.)
3. CREATE animation sequences that bring the image to life
4. PRESERVE exact colors, positions, sizes from vision analysis
5. ADD motion graphics vocabulary (floating, pulsing, flowing)

JSON STRUCTURE for image recreation:
{
  "sceneType": "vision-recreation",
  "sourceImage": "1:1 recreation with motion graphics",
  "background": "EXACT recreation from vision analysis",
  "elements": "EXACT elements from vision + motion graphics animations",
  "motionEnhancements": "Additional particles, glows, motion effects",
  "animations": "Sophisticated motion graphics timing and effects",
  "fidelity": "pixel-perfect recreation with motion graphics life"
}

ANIMATION VOCABULARY FOR IMAGES:
- Floating elements: gentle drift, bounce, sway
- Text animations: typewriter, fade-in, scale-bounce
- Background effects: gradient rotation, particle systems
- Decorative elements: pulse, glow, morph, orbit
- Stagger patterns: sequential reveals, cascading effects`;

    const user = `🖼️ RECREATE THIS IMAGE EXACTLY WITH MOTION GRAPHICS

User modification request: "${userPrompt}"

📊 VISION ANALYSIS (YOUR BLUEPRINT):
${JSON.stringify(visionAnalysis.layoutJson, null, 2)}

🎨 EXACT SPECIFICATIONS:
- Colors: ${visionAnalysis.palette?.join(', ') || 'Use image colors'}
- Typography: ${JSON.stringify(visionAnalysis.typography) || 'Match image fonts'}
- Mood: ${visionAnalysis.mood || 'Match image style'}
- Motion Specs: ${JSON.stringify(visionAnalysis.motionGraphicsSpecs) || 'Add motion graphics'}

🚨 CRITICAL INSTRUCTIONS:

1. **START with the vision analysis layoutJson as your base**
2. **PRESERVE every visual detail** - colors, positions, sizes, text
3. **ADD motion graphics animations** that enhance the existing design
4. **ONLY modify** what the user specifically requests
5. **ENHANCE with motion graphics** - particles, glows, smooth animations

USER MODIFICATION ANALYSIS:
"${userPrompt}"

INTERPRETATION GUIDE:
- "make it animated" → Add smooth motion graphics to existing elements
- "change to squares" → Keep everything else, change shape type only
- "make it blue" → Keep layout, change color palette only  
- "add particles" → Keep everything, add particle system
- "make it faster" → Keep visuals, adjust animation timing

🎯 YOUR TASK:
Return JSON that recreates the image EXACTLY but brings it to life with motion graphics.
Every element from the vision analysis should be preserved and enhanced with animations.
The user prompt should only modify specific aspects, not redesign the entire layout.

Use the motion graphics vocabulary to add life while maintaining visual fidelity.`;

    return { system, user };
  }

  private buildTextDrivenPrompt(userPrompt: string, previousSceneJson?: string, isFirstScene?: boolean) {
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

    let user = `Create a motion graphics scene: "${userPrompt}"`;
    
    if (previousSceneJson && !isFirstScene) {
      user += `\n\nPREVIOUS SCENE CONTEXT (for visual consistency):
${previousSceneJson}

Maintain visual cohesion with the previous scene while creating something new.`;
    }
    
    return { system, user };
  }
}

// Export singleton instance
export const layoutGeneratorService = new LayoutGeneratorService(); 