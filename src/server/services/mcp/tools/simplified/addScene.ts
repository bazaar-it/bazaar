// src/server/services/mcp/tools/simplified/addScene.ts
import { z } from 'zod';
import { sceneService } from '@/server/services/scene/scene.service';
import type { McpTool } from '@/server/services/mcp/types';

/**
 * Simplified Add Scene Tool
 * Handles BOTH text prompt and image creation automatically
 */
export const addSceneTool: McpTool = {
  name: 'addScene',
  description: 'Create a new scene from text description or images. Automatically detects the best approach.',
  
  inputSchema: z.object({
    projectId: z.string().describe('The project to add the scene to'),
    prompt: z.string().describe('Description of what kind of scene to create'),
    imageUrls: z.array(z.string()).optional().describe('Optional images to create the scene from'),
    order: z.number().optional().describe('Position in the timeline (0-based)'),
    previousSceneJson: z.string().optional().describe('JSON of the previous scene for context'),
  }),
  
  execute: async (input, context) => {
    // Log for debugging
    if (context.debug) {
      console.log('[addSceneTool] Input:', {
        hasImages: !!input.imageUrls?.length,
        prompt: input.prompt.substring(0, 50) + '...'
      });
    }
    
    // SceneService automatically handles:
    // - Text prompt → Layout + Code generation (uses layoutGenerator + codeGenerator models)
    // - Images → Direct vision-based generation (uses createSceneFromImage model)
    const response = await sceneService.addScene({
      projectId: input.projectId,
      prompt: input.prompt,
      imageUrls: input.imageUrls,
      order: input.order,
      previousSceneJson: input.previousSceneJson,
      visionAnalysis: context.visionAnalysis // Pass through any vision context
    });
    
    // Return the standardized response directly
    // No transformation needed - SceneService returns StandardApiResponse
    return response;
  }
};

/**
 * System prompt addition for the Brain:
 * 
 * When users want to create a scene, always use the 'addScene' tool.
 * It automatically handles both text and image inputs:
 * - If the user provides images, include them in imageUrls
 * - If it's just a text description, only provide the prompt
 * - The tool will automatically use the right approach
 * 
 * Examples:
 * - "Create a blue gradient scene" → addScene with just prompt
 * - "Create a scene from this image [image]" → addScene with prompt + imageUrls
 * - "Make a scene like the uploaded design" → addScene with imageUrls
 */