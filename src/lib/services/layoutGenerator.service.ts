import { openai } from "~/server/lib/openai";
import { type SceneLayout } from "~/lib/schemas/sceneLayout";

export interface LayoutGeneratorInput {
  userPrompt: string;
  projectId: string;
  previousSceneJson?: string; // For style consistency
  isFirstScene?: boolean;
}

export interface LayoutGeneratorOutput {
  layoutJson: SceneLayout;
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
  private readonly model = "gpt-4.1-mini";
  private readonly temperature = 0.3; // Low temperature for consistent JSON structure

  async generateLayout(input: LayoutGeneratorInput): Promise<LayoutGeneratorOutput> {
    const prompt = this.buildLayoutPrompt(input);
    
    console.log(`[LayoutGenerator] 🎯 Starting layout generation`);
    console.log(`[LayoutGenerator] 📝 User prompt: "${input.userPrompt.substring(0, 100)}${input.userPrompt.length > 100 ? '...' : ''}"`);
    console.log(`[LayoutGenerator] 🆕 Is first scene: ${input.isFirstScene}`);
    console.log(`[LayoutGenerator] 🎨 Has previous scene JSON: ${input.previousSceneJson ? 'YES' : 'NO'}`);
    // console.log(`[LayoutGenerator] 🎛️ Model: ${this.model}, Temperature: ${this.temperature}`);
    
    try {
      console.log(`[LayoutGenerator] 🚀 Calling OpenAI LLM for JSON layout...`);
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
      
      console.log(`[LayoutGenerator] 📤 Raw LLM response length: ${rawOutput.length} chars`);
      console.log(`[LayoutGenerator] 📤 Raw LLM response preview: ${rawOutput.substring(0, 200)}...`);
      
      // Add safeguard for non-JSON responses
      if (!rawOutput.trim().startsWith('{')) {
        throw new Error(`LayoutGenerator returned non-JSON response: ${rawOutput.substring(0, 100)}...`);
      }
      
      const parsed = JSON.parse(rawOutput);
      
      // Skip schema validation - just use the parsed JSON directly
      // The CodeGenerator can handle whatever JSON the LLM produces
      const layoutJson = parsed as SceneLayout;
      
      console.log(`[LayoutGenerator] ✅ Layout generation successful`);
      console.log(`[LayoutGenerator] 🎨 Scene type: ${layoutJson.sceneType || 'unknown'}`);
      console.log(`[LayoutGenerator] 📊 Elements count: ${layoutJson.elements?.length || 0}`);
      console.log(`[LayoutGenerator] 🎭 Animations count: ${layoutJson.animations ? Object.keys(layoutJson.animations).length : 0}`);
      console.log(`[LayoutGenerator] 🎨 Background: ${layoutJson.background}`);
      
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
      console.error("[LayoutGenerator] Error:", error);
      
      // Fallback to simple layout
      const fallbackLayout: SceneLayout = {
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
    
    // USE EXACT @style-json-prompt.md content
    const system = `You are a scene layout generator for animated UI videos. Your job is to convert a user's description of a visual scene (such as a hero section) into a structured JSON object that defines all the necessary elements for rendering that scene in a motion graphics video.

You do not return code. You only return structured JSON. Your output is consumed by another AI model that transforms the JSON into animated React components using Remotion.

Each scene must contain these top-level keys:
- \`sceneType\`: The type of scene (e.g., "hero", "feature", "pricing").
- \`background\`: A hex, CSS color string, or gradient value.
- \`elements\`: An array of objects describing every visual element in order (titles, subtitles, buttons, icons, images).
- \`layout\`: An object describing layout and alignment preferences (e.g., flex direction, spacing).
- \`animations\`: Defines animation styles for each element by ID (optional spring configs, delays, types).

Each element inside \`elements\` must include:
- \`type\`: e.g., "title", "subtitle", "button"
- \`id\`: a unique string ID (e.g., "title1", "cta1")
- \`text\`: The text content
- \`fontSize\`: A pixel value (e.g., 72)
- \`fontWeight\`: One of: 400, 500, 600, 700
- \`color\`: A hex or named color
- \`glow\`: Optional object defining glow effect: \`{ color, intensity, spread }\`
- \`style\`: Any extra styles like padding, margin, textAlign

Animations can include:
- \`type\`: "spring", "fadeIn", "pulse", "interpolate"
- \`delay\`: Number of frames to delay
- \`duration\`: Number of frames
- \`config\`: Optional spring config: \`{ damping, stiffness }\`

IMPORTANT: Always use string values for fontWeight (e.g., "700" not 700). Do not include image or icon elements.

Only return a JSON object. Do not explain anything.

Your goal is to capture:
- What components exist
- How they look
- How they move
- In what order they appear`;

    // Simple context addition
    const user = `"${userPrompt}"`;

    return { system, user };
  }
}

// Export singleton instance
export const layoutGeneratorService = new LayoutGeneratorService(); 