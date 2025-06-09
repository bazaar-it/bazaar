// src/server/services/mcp/tools/createSceneFromImage.ts
import { z } from "zod";
import { BaseMCPTool } from "~/server/services/mcp/tools/base";
import { codeGeneratorService } from "~/server/services/generation/codeGenerator.service";
import { conversationalResponseService } from "~/server/services/ai/conversationalResponse.service";

const createSceneFromImageInputSchema = z.object({
  imageUrls: z.array(z.string()).describe("Array of image URLs to recreate as motion graphics"),
  userPrompt: z.string().describe("User's description/context for the image"),
  projectId: z.string().describe("Project ID to add the scene to"),
  sceneNumber: z.number().optional().describe("Optional scene number/position"),
  visionAnalysis: z.any().optional().describe("Optional pre-computed vision analysis from analyzeImage tool"),
});

type CreateSceneFromImageInput = z.infer<typeof createSceneFromImageInputSchema>;

interface CreateSceneFromImageOutput {
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  debug?: any;
  chatResponse?: string;
}

export class CreateSceneFromImageTool extends BaseMCPTool<CreateSceneFromImageInput, CreateSceneFromImageOutput> {
  name = "createSceneFromImage";
  description = "Create a motion graphics scene directly from uploaded images. Use when user uploads images and wants them recreated as animations.";
  inputSchema = createSceneFromImageInputSchema;
  
  protected async execute(input: CreateSceneFromImageInput): Promise<CreateSceneFromImageOutput> {
    const { imageUrls, userPrompt, projectId, sceneNumber, visionAnalysis } = input;

    try {
      console.log(`[CreateSceneFromImage] 🖼️ Creating scene from ${imageUrls.length} image(s)`);
      console.log(`[CreateSceneFromImage] 💬 User context: "${userPrompt.substring(0, 100)}..."`);

      // Generate function name
      const timestamp = Date.now().toString(36);
      const functionName = `Scene${sceneNumber || 'X'}_${timestamp}`;

      // Use CodeGenerator's new image-to-code method
      const result = await codeGeneratorService.generateCodeFromImage({
        imageUrls,
        userPrompt,
        functionName,
        visionAnalysis,
      });

      // Generate conversational response
      const chatResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'createSceneFromImage',
        userPrompt,
        result: { 
          sceneName: result.name,
          duration: result.duration,
          imageCount: imageUrls.length,
          approach: "direct image recreation"
        },
        context: { 
          sceneCount: (sceneNumber || 1),
          projectId,
          imageUrls: imageUrls.length
        }
      });

      console.log(`[CreateSceneFromImage] ✅ Direct image-to-code generation completed: ${result.name}`);

      return {
        sceneCode: result.code,
        sceneName: result.name,
        duration: result.duration,
        reasoning: result.reasoning,
        chatResponse,
        debug: result.debug
      };
    } catch (error) {
      console.error("[CreateSceneFromImage] Error:", error);
      
      // Generate error response
      const errorResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'createSceneFromImage',
        userPrompt,
        result: { error: String(error) },
        context: {
          sceneName: "Image Recreation Failed",
          sceneCount: sceneNumber || 1,
          projectId,
          imageUrls: imageUrls.length
        }
      });

      return {
        sceneCode: "",
        sceneName: "",
        duration: 0,
        reasoning: "Failed to generate scene from images",
        debug: { error: String(error) },
        chatResponse: errorResponse,
      };
    }
  }
}

export const createSceneFromImageTool = new CreateSceneFromImageTool(); 