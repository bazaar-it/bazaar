import { BaseMCPTool } from "~/tools/helpers/base";
import { layoutGenerator } from "./add_helpers/layoutGeneratorNEW";
import { codeGenerator } from "./add_helpers/CodeGeneratorNEW";
import { imageToCodeGenerator } from "./add_helpers/ImageToCodeGeneratorNEW";
import { db } from "~/server/db";
import { scenes } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import type { AddToolInput, AddToolOutput } from "~/tools/helpers/types";
import { addToolInputSchema } from "~/tools/helpers/types";

/**
 * ADD Tool - Creates new scenes from text or image prompts
 * Supports both text-based and image-based scene creation
 */
export class AddTool extends BaseMCPTool<AddToolInput, AddToolOutput> {
  name = "ADD";
  description = "Create new motion graphics scenes from text descriptions or images";
  inputSchema = addToolInputSchema;

  protected async execute(input: AddToolInput): Promise<AddToolOutput> {
    try {
      // Handle image-based scene creation
      if (input.imageUrls && input.imageUrls.length > 0) {
        return await this.createSceneFromImages(input);
      }
      
      // Handle text-based scene creation
      return await this.createSceneFromText(input);
    } catch (error) {
      return {
        success: false,
        sceneCode: "",
        sceneName: "",
        duration: 0,
        reasoning: `ADD tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create scene from text prompt using two-step pipeline
   */
  private async createSceneFromText(input: AddToolInput): Promise<AddToolOutput> {
    // Generate function name
    const functionName = this.generateFunctionName(input.projectId, input.sceneNumber);
    
    // Step 1: Generate layout JSON
    const layoutResult = await layoutGenerator.generateLayout({
      userPrompt: input.userPrompt,
      projectId: input.projectId,
      previousSceneJson: await this.getPreviousSceneJson(input.projectId),
      visionAnalysis: input.visionAnalysis,
    });

    // Step 2: Generate React code from layout
    const codeResult = await codeGenerator.generateCode({
      userPrompt: input.userPrompt,
      layoutJson: layoutResult.layoutJson,
      functionName: functionName,
      projectId: input.projectId,
    });

    // Step 3: Save to database
    const savedScene = await this.saveSceneToDatabase({
      projectId: input.projectId,
      code: codeResult.code,
      name: codeResult.name,
      duration: codeResult.duration,
      userPrompt: input.userPrompt,
      layoutJson: JSON.stringify(layoutResult.layoutJson),
    });

    return {
      success: true,
      sceneCode: codeResult.code,
      sceneName: codeResult.name,
      duration: codeResult.duration,
      layoutJson: JSON.stringify(layoutResult.layoutJson),
      reasoning: `Text-based scene created: ${codeResult.reasoning}`,
      debug: {
        layoutGeneration: layoutResult.debug,
        codeGeneration: codeResult.debug,
        databaseSave: { sceneId: savedScene?.id || 'unknown' },
      },
    };
  }

  /**
   * Create scene directly from images
   */
  private async createSceneFromImages(input: AddToolInput): Promise<AddToolOutput> {
    if (!input.imageUrls || input.imageUrls.length === 0) {
      throw new Error("No images provided for image-based scene creation");
    }

    // Generate function name
    const functionName = this.generateFunctionName(input.projectId, input.sceneNumber);

    // Generate code directly from images
    const codeResult = await imageToCodeGenerator.generateCodeFromImage({
      imageUrls: input.imageUrls,
      userPrompt: input.userPrompt,
      functionName: functionName,
      visionAnalysis: input.visionAnalysis,
    });

    // Save to database
    const savedScene = await this.saveSceneToDatabase({
      projectId: input.projectId,
      code: codeResult.code,
      name: codeResult.name,
      duration: codeResult.duration,
      userPrompt: input.userPrompt,
    });

    return {
      success: true,
      sceneCode: codeResult.code,
      sceneName: codeResult.name,
      duration: codeResult.duration,
      reasoning: `Image-based scene created: ${codeResult.reasoning}`,
      debug: {
        imageGeneration: codeResult.debug,
        databaseSave: { sceneId: savedScene?.id || 'unknown' },
      },
    };
  }

  /**
   * Generate a unique function name for the scene
   */
  private generateFunctionName(projectId: string, sceneNumber?: number): string {
    const timestamp = Date.now().toString().slice(-6);
    const sceneNum = sceneNumber || Math.floor(Math.random() * 1000);
    return `Scene${sceneNum}_${timestamp}`;
  }

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
      console.warn('[AddTool] Could not fetch previous scene JSON:', error);
      return undefined;
    }
  }

  /**
   * Save scene to database
   */
  private async saveSceneToDatabase(input: {
    projectId: string;
    code: string;
    name: string;
    duration: number;
    userPrompt: string;
    layoutJson?: string;
  }) {
    try {
      const [savedScene] = await db.insert(scenes).values({
        projectId: input.projectId,
        name: input.name,
        tsxCode: input.code,
        duration: input.duration,
        layoutJson: input.layoutJson,
        order: 0,
      }).returning();

      return savedScene;
    } catch (error) {
      console.error('[AddTool] Failed to save scene to database:', error);
      return {
        id: 'failed-save',
        name: input.name,
        tsxCode: input.code,
        duration: input.duration,
      };
    }
  }
}

// Export singleton instance
export const addTool = new AddTool();
