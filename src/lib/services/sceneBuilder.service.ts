import { openai } from "~/server/lib/openai";
import { SceneSpec, enhanceSceneSpec, type SceneSpec as SceneSpecType } from "~/lib/types/storyboard";

export interface SceneBuilderInput {
  userMessage: string;
  userContext: Record<string, unknown>;
  storyboardSoFar: SceneSpecType[];
  projectId: string;
  userId: string;
}

export interface SceneBuilderOutput {
  sceneSpec: SceneSpecType;
  reasoning: string;
}

/**
 * SceneBuilder service - converts user intent into structured SceneSpec JSON
 * Uses GPT-4o for high-quality creative scene planning
 */
export class SceneBuilderService {
  private readonly model = "gpt-4o";
  private readonly temperature = 0.3; // Balanced creativity vs consistency
  
  async buildScene(input: SceneBuilderInput): Promise<SceneBuilderOutput> {
    const prompt = this.buildScenePrompt(input);
    
    try {
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
        throw new Error("No response from SceneBuilder LLM");
      }
      
      // Add safeguard for non-JSON responses
      if (!rawOutput.trim().startsWith('{')) {
        throw new Error(`SceneBuilder returned non-JSON response: ${rawOutput.substring(0, 100)}...`);
      }
      
      const parsed = JSON.parse(rawOutput);
      
      // Validate and enhance the SceneSpec
      const sceneSpec = SceneSpec.parse(parsed.sceneSpec);
      const enhancedSpec = enhanceSceneSpec(sceneSpec);
      
      return {
        sceneSpec: enhancedSpec,
        reasoning: parsed.reasoning || "Scene generated successfully",
      };
    } catch (error) {
      console.error("[SceneBuilder] Error:", error);
      throw new Error(`SceneBuilder failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private buildScenePrompt(input: SceneBuilderInput) {
    const { userMessage, userContext, storyboardSoFar } = input;
    
    const system = `You are an expert Remotion scene planner. Your job is to convert user requests into structured SceneSpec JSON.

CRITICAL: You MUST respond with valid JSON in this exact format:
{
  "sceneSpec": { /* SceneSpec object */ },
  "reasoning": "Brief explanation of design decisions"
}

SCENESPEC SCHEMA:
A SceneSpec has 4 core elements:
1. components: UI elements (Flowbite, HTML, custom)
2. style: Visual design (colors, typography, background)  
3. text: Content with semantic slots
4. motion: Animations with timing

COMPONENT LIBRARIES:
- "flowbite": Buttons, inputs, modals, cards (use Flowbite React props)
- "html": Basic HTML elements (div, input, button, etc.)
- "custom": Special elements (MouseCursor, Camera, etc.)
- "bazaar": Custom Bazaar components

LAYOUT COORDINATES:
- Use relative coordinates (0-1) for x, y, width, height
- x: 0.5 = center horizontally, y: 0.5 = center vertically
- zIndex for layering (higher = front)

MOTION FUNCTIONS (core set):
Entrance: fadeIn, fadeInUp, slideInLeft, slideInRight, scaleIn, bounceIn
Exit: fadeOut, slideOutLeft, slideOutRight, scaleOut  
Continuous: pulse, bounce, shake, rotate, float
Camera: zoomIn, zoomOut, panLeft, panRight
Custom: use "custom" with params.type (e.g., {type: "typewriter"})

TIMING RULES:
- duration: primary timing control (seconds)
- delay: when to start (seconds)
- iterations: number or "infinite" for loops
- Auto-compute scene duration from longest motion + 1s buffer
- Frame ranges computed automatically from duration + fps

DESIGN PRINCIPLES:
- Use Tailwind classes for styling
- Relative positioning for responsive design
- Semantic text slots (headline, caption, cta)
- Smooth animation timing with proper delays
- Consider visual hierarchy and user flow

EXAMPLE SCENE STRUCTURE:
{
  "components": [
    {
      "lib": "html",
      "name": "TextInput", 
      "id": "main-input",
      "layout": { "x": 0.5, "y": 0.4, "width": 0.4, "height": 0.08 },
      "props": { "placeholder": "Enter text..." }
    }
  ],
  "style": {
    "palette": ["#000000", "#ffffff", "#8b5cf6"],
    "classes": ["bg-black", "text-white", "font-inter"],
    "background": { "type": "solid", "value": "#000000" }
  },
  "text": [
    {
      "slot": "typewriter",
      "content": "Your text here",
      "animation": { "reveal": "typewriter", "speed": 15 }
    }
  ],
  "motion": [
    {
      "target": "main-input",
      "fn": "fadeIn", 
      "duration": 0.8,
      "delay": 0
    }
  ]
}`;

    const contextInfo = Object.keys(userContext).length > 0 
      ? `\nUSER CONTEXT: ${JSON.stringify(userContext, null, 2)}`
      : "";
      
    const storyboardInfo = storyboardSoFar.length > 0
      ? `\nEXISTING SCENES: ${storyboardSoFar.length} scenes already created`
      : "\nFIRST SCENE: This is the first scene in the project";

    const user = `USER REQUEST: "${userMessage}"${contextInfo}${storyboardInfo}

Create a SceneSpec that fulfills this request. Focus on:
1. Accurate component selection and positioning
2. Appropriate animations with good timing
3. Visual design that matches the request
4. Semantic text organization

Respond with valid JSON only.`;

    return { system, user };
  }
}

// Export singleton instance
export const sceneBuilderService = new SceneBuilderService(); 