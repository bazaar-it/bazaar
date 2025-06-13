import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getLayoutGeneratorModel } from "~/config/models.config";
import { getSystemPrompt } from "~/config/prompts.config";
import type { LayoutGenerationInput, LayoutGenerationOutput } from "~/tools/helpers/types";

/**
 * Layout Generator Service - converts user prompts to structured JSON specifications
 * First step of the two-step pipeline: User Intent → JSON Spec → React Code
 */
export class LayoutGeneratorService {
  private readonly DEBUG = process.env.NODE_ENV === 'development';

  /**
   * Generate layout JSON from user prompt and context
   */
  async generateLayout(input: LayoutGenerationInput): Promise<LayoutGenerationOutput> {
    const modelConfig = getLayoutGeneratorModel();
    const prompt = this.buildLayoutPrompt(input);
    
    try {
      const response = await AIClientService.generateResponse(
        modelConfig,
        [{ role: "user", content: prompt.user }],
        { role: "system", content: prompt.system },
        { responseFormat: { type: "json_object" } }
      );
      
      const rawOutput = response?.content;
      if (!rawOutput) {
        throw new Error("No response from LayoutGenerator LLM");
      }
      
      // Parse JSON with fallback
      let parsed;
      try {
        let cleanedOutput = rawOutput;
        
        // Remove markdown code blocks if present
        if (cleanedOutput.startsWith('```')) {
          const lines = cleanedOutput.split('\n');
          if (lines[0]?.startsWith('```')) {
            lines.shift();
          }
          if (lines[lines.length - 1]?.startsWith('```')) {
            lines.pop();
          }
          cleanedOutput = lines.join('\n');
        }
        
        parsed = JSON.parse(cleanedOutput);
      } catch (jsonError) {
        // Fallback layout structure
        parsed = {
          sceneType: "simple",
          background: "#1e1b4b",
          elements: [{ type: "title", id: "title1", text: "Generated Content" }],
          layout: { align: "center" }
        };
        console.warn(`[LayoutGenerator] JSON parse failed, using fallback: ${jsonError instanceof Error ? jsonError.message : 'Unknown parse error'}`);
      }
      
      return {
        layoutJson: parsed,
        reasoning: "Layout specification generated successfully",
        debug: {
          prompt,
          response: rawOutput,
          parsed,
        },
      };
    } catch (error) {
      console.error("[LayoutGenerator] Error:", error);
      
      // Fallback layout
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

  /**
   * Generate layout from image analysis
   */
  async generateLayoutFromImage(input: {
    imageUrls: string[];
    userPrompt: string;
    projectId: string;
    visionAnalysis?: any;
  }): Promise<LayoutGenerationOutput> {
    return await this.generateLayout({
      userPrompt: input.userPrompt,
      projectId: input.projectId,
      visionAnalysis: input.visionAnalysis,
    });
  }

  private buildLayoutPrompt(input: LayoutGenerationInput) {
    const { userPrompt, previousSceneJson, visionAnalysis } = input;
    
    // Vision-driven mode if vision analysis is provided
    if (visionAnalysis && visionAnalysis.layoutJson) {
      return this.buildVisionDrivenPrompt(userPrompt, visionAnalysis);
    } else {
      return this.buildTextDrivenPrompt(userPrompt, previousSceneJson);
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
}`;

    const user = `🖼️ RECREATE THIS IMAGE EXACTLY WITH MOTION GRAPHICS

User modification request: "${userPrompt}"

📊 VISION ANALYSIS (YOUR BLUEPRINT):
${JSON.stringify(visionAnalysis.layoutJson, null, 2)}

🎨 EXACT SPECIFICATIONS:
- Colors: ${visionAnalysis.palette?.join(', ') || 'Use image colors'}
- Typography: ${JSON.stringify(visionAnalysis.typography) || 'Match image fonts'}
- Mood: ${visionAnalysis.mood || 'Match image style'}

🚨 CRITICAL INSTRUCTIONS:
1. START with the vision analysis layoutJson as your base
2. PRESERVE every visual detail - colors, positions, sizes, text
3. ADD motion graphics animations that enhance the existing design
4. ONLY modify what the user specifically requests
5. ENHANCE with motion graphics - particles, glows, smooth animations

Return JSON that recreates the image EXACTLY but brings it to life with motion graphics.`;

    return { system, user };
  }

  private buildTextDrivenPrompt(userPrompt: string, previousSceneJson?: string) {
    const system = `You are a motion graphics director who converts any user request into a complete JSON specification for professional-quality animations.

Your job: Take whatever the user describes and create JSON that captures EVERY detail needed for stunning motion graphics.

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
5. THINK MOTION GRAPHICS - particles, gradients, easing, layering, orchestration`;

    let user = `Create a motion graphics scene: "${userPrompt}"`;
    
    if (previousSceneJson) {
      user += `\n\nPREVIOUS SCENE CONTEXT (for visual consistency):
${previousSceneJson}

Maintain visual cohesion with the previous scene while creating something new.`;
    }
    
    return { system, user };
  }
}

// Export singleton instance
export const layoutGenerator = new LayoutGeneratorService();
