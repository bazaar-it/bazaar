// src/server/services/mcp/tools/addScene.ts
import { z } from "zod";
import { BaseMCPTool } from "~/server/services/mcp/tools/base";
import { sceneBuilderService } from "~/server/services/generation/sceneBuilder.service";
import { db } from "~/server/db";
import { scenes } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";

const addSceneInputSchema = z.object({
  userPrompt: z.string().describe("User's description of what they want in the scene"),
  projectId: z.string().describe("Project ID to add the scene to"),
  sceneNumber: z.number().optional().describe("Optional scene number/position"),
  storyboardSoFar: z.array(z.any()).optional().describe("Existing scenes for context"),
  replaceWelcomeScene: z.boolean().optional().describe("Whether to replace the welcome scene"),
  visionAnalysis: z.any().optional().describe("Vision analysis from analyzeImage tool"),
});

type AddSceneInput = z.infer<typeof addSceneInputSchema>;

interface AddSceneOutput {
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  layoutJson?: string;
  debug?: any;
  chatResponse?: string;
  replacedWelcomeScene?: boolean;
}

export class AddSceneTool extends BaseMCPTool<AddSceneInput, AddSceneOutput> {
  name = "addScene";
  description = "Create a new scene from user prompt. Use when user requests a new scene or this is the first scene. Automatically replaces welcome scene if present.";
  inputSchema = addSceneInputSchema;
  
  // NEW: Support for progress callbacks
  private onProgress?: (stage: string, status: string) => void;
  
  /**
   * Get the previous scene's JSON for style consistency
   */
  private async getPreviousSceneJson(projectId: string): Promise<string | undefined> {
    try {
      const sceneResults = await db.query.scenes.findMany({
        where: eq(scenes.projectId, projectId),
        orderBy: [desc(scenes.order)],
        limit: 1,
      });
      
      return sceneResults[0]?.layoutJson || undefined;
    } catch (error) {
      console.warn('[AddScene] Could not fetch previous scene JSON:', error);
      return undefined;
    }
  }

  protected async execute(input: AddSceneInput): Promise<AddSceneOutput> {
    const { userPrompt, projectId, storyboardSoFar } = input;

    try {
      // Check if we should replace the welcome scene
      const hasWelcomeScene = storyboardSoFar?.some((scene: any) => 
        scene.data?.isWelcomeScene || scene.type === "welcome"
      );
      
      const shouldReplaceWelcome = hasWelcomeScene && (storyboardSoFar?.length === 1);

      // 🎯 PROGRESS UPDATE: Starting layout generation
      this.onProgress?.('🎨 Planning your scene layout...', 'building');

      // Use the proven two-step pipeline for code generation
      const result = await sceneBuilderService.generateTwoStepCode({
        userPrompt,
        projectId,
        sceneNumber: input.sceneNumber,
        previousSceneJson: await this.getPreviousSceneJson(projectId),
        visionAnalysis: input.visionAnalysis,
      });

      // 🎯 PROGRESS UPDATE: Scene generation complete
      this.onProgress?.('✅ Scene generated successfully!', 'building');

      return {
        sceneCode: result.code,
        sceneName: result.name,
        duration: result.duration,
        layoutJson: JSON.stringify(result.layoutJson), // Store JSON spec
        reasoning: result.reasoning,
        chatResponse: undefined, // Brain will generate this if needed
        debug: result.debug
      };
    } catch (error) {
      console.error("[AddScene] Error:", error);
      
      return {
        sceneCode: "",
        sceneName: "",
        duration: 0,
        reasoning: "Failed to generate scene code",
        debug: { error: String(error) },
        chatResponse: undefined, // Brain will handle error messaging
        replacedWelcomeScene: false
      };
    }
  }

  // NEW: Method to set progress callback
  setProgressCallback(callback: (stage: string, status: string) => void) {
    this.onProgress = callback;
  }
}

export const addSceneTool = new AddSceneTool(); 