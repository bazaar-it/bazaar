import { z } from "zod";
import { BaseMCPTool } from "./base";
import { sceneBuilderService } from "../sceneBuilder.service";
import { openai } from "~/server/lib/openai";

const addSceneInputSchema = z.object({
  userPrompt: z.string().describe("User's description of what they want in the scene"),
  projectId: z.string().describe("Project ID to add the scene to"),
  sceneNumber: z.number().optional().describe("Optional scene number/position"),
  storyboardSoFar: z.array(z.any()).optional().describe("Existing scenes for context"),
});

type AddSceneInput = z.infer<typeof addSceneInputSchema>;

interface AddSceneOutput {
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  brainContext?: any;
  debug?: any;
}

export class AddSceneTool extends BaseMCPTool<AddSceneInput, AddSceneOutput> {
  name = "addScene";
  description = "Generate a new video scene with React/Remotion code based on user description. Uses Brain analysis for strategic code generation.";
  inputSchema = addSceneInputSchema;
  
  protected async execute(input: AddSceneInput): Promise<AddSceneOutput> {
    const { userPrompt, projectId, sceneNumber, storyboardSoFar } = input;
    
    try {
      // STEP 1: Generate enriched context using Brain analysis
      const brainContext = await this.generateBrainContext({
        userPrompt,
        storyboardSoFar: storyboardSoFar || []
      });
      
      // STEP 2: Generate React/Remotion code with enriched context
      const result = await sceneBuilderService.generateDirectCode({
        userPrompt,
        projectId,
        sceneNumber,
        brainContext
      });
      
      return {
        sceneCode: result.code,
        sceneName: result.name,
        duration: result.duration,
        reasoning: result.reasoning,
        brainContext,
        debug: result.debug
      };
    } catch (error) {
      return {
        sceneCode: "",
        sceneName: "",
        duration: 0,
        reasoning: "Failed to generate scene code",
        debug: { error: String(error) }
      };
    }
  }
  
  /**
   * Generate enriched Brain context for strategic code generation
   */
  private async generateBrainContext(input: {
    userPrompt: string;
    storyboardSoFar: any[];
  }): Promise<{
    userIntent: string;
    technicalRecommendations: string[];
    uiLibraryGuidance: string;
    animationStrategy: string;
    previousContext?: string;
    focusAreas: string[];
  }> {
    const contextPrompt = `You are an AI Brain analyzing user intent for video code generation.

USER REQUEST: "${input.userPrompt}"

EXISTING SCENES: ${input.storyboardSoFar.length} scenes already created
${input.storyboardSoFar.length > 0 ? `Previous scenes context: ${JSON.stringify(input.storyboardSoFar.slice(-2), null, 2)}` : ''}

Analyze the user's request and provide strategic guidance for code generation.

FOCUS ON:
- What UI libraries would work best (Flowbite, HTML, custom components)
- What animations would enhance the user's vision
- Technical patterns that match the user's intent
- How to build upon existing scenes

RESPONSE FORMAT (JSON):
{
  "userIntent": "What the user really wants to achieve",
  "technicalRecommendations": [
    "Use Flowbite Table component for data display",
    "Implement typewriter animation for text reveal",
    "Add mouse cursor interaction effects"
  ],
  "uiLibraryGuidance": "Specific recommendation like 'Use Flowbite TextInput and Button components with rounded corners and neon gradient background'",
  "animationStrategy": "Detailed animation approach like 'Start with text input fade-in, then typewriter text reveal, followed by mouse click animation and camera zoom'",
  "focusAreas": [
    "Text input with neon gradient",
    "Typewriter text animation", 
    "Mouse cursor interaction",
    "Camera zoom transition"
  ],
  "previousContext": "How this builds on existing scenes (if any)"
}

Be specific and actionable. Focus on what will make the code generation successful.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: contextPrompt },
          { role: "user", content: input.userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No context response from Brain");
      }

      const parsed = JSON.parse(content);
      
      console.log(`[AddScene] Brain context generated:`, {
        userIntent: parsed.userIntent,
        recommendations: parsed.technicalRecommendations?.length || 0,
        guidance: parsed.uiLibraryGuidance?.substring(0, 50) + '...'
      });
      
      return {
        userIntent: parsed.userIntent || "Generate video scene",
        technicalRecommendations: parsed.technicalRecommendations || [],
        uiLibraryGuidance: parsed.uiLibraryGuidance || "Use appropriate UI components",
        animationStrategy: parsed.animationStrategy || "Smooth fade-in animations",
        previousContext: parsed.previousContext,
        focusAreas: parsed.focusAreas || ["Visual appeal", "Smooth animations"]
      };
    } catch (error) {
      console.warn("[AddScene] Failed to generate Brain context, using fallback:", error);
      
      // Intelligent fallback based on user prompt analysis
      const isDataFocused = /table|data|dashboard|crud|list/i.test(input.userPrompt);
      const isFormFocused = /input|form|submit|button/i.test(input.userPrompt);
      const isTextFocused = /text|type|write|appear/i.test(input.userPrompt);
      
      return {
        userIntent: "Generate video scene based on user request",
        technicalRecommendations: [
          isDataFocused ? "Use Flowbite Table component" : "Use semantic HTML elements",
          isFormFocused ? "Use Flowbite TextInput and Button components" : "Focus on visual elements",
          isTextFocused ? "Implement typewriter or text reveal animations" : "Use smooth transitions"
        ],
        uiLibraryGuidance: isDataFocused 
          ? "Use Flowbite Table and Card components for data display"
          : isFormFocused 
          ? "Use Flowbite TextInput and Button with proper styling"
          : "Use appropriate UI components for the content",
        animationStrategy: isTextFocused 
          ? "Use typewriter animation for text reveal with proper timing"
          : "Use interpolate() for smooth transitions with fade-in effects",
        focusAreas: [
          "Visual appeal", 
          "User experience", 
          "Smooth animations",
          ...(isTextFocused ? ["Text animation"] : []),
          ...(isFormFocused ? ["Form interaction"] : []),
          ...(isDataFocused ? ["Data presentation"] : [])
        ]
      };
    }
  }
}

export const addSceneTool = new AddSceneTool(); 