// src/server/services/mcp/tools/simplified/editScene.ts
import { z } from 'zod';
import { sceneService } from '@/server/services/scene/scene.service';
import type { McpTool } from '@/server/services/mcp/types';

/**
 * Simplified Edit Scene Tool
 * Handles ALL edit types: content, structure, style, duration, and image-based edits
 */
export const editSceneTool: McpTool = {
  name: 'editScene',
  description: 'Edit any aspect of an existing scene - content, structure, style, or duration',
  
  inputSchema: z.object({
    sceneId: z.string().describe('ID of the scene to edit'),
    prompt: z.string().optional().describe('Description of changes to make'),
    editType: z.enum(['surgical', 'creative', 'fix'])
      .optional()
      .describe('Type of edit: surgical (minimal changes), creative (bigger changes), fix (error correction)'),
    imageUrls: z.array(z.string()).optional().describe('Images for visual reference'),
    duration: z.number().optional().describe('New duration in frames (30fps)'),
  }),
  
  execute: async (input, context) => {
    // Default to surgical edit if not specified
    const editType = input.editType || 'surgical';
    
    if (context.debug) {
      console.log('[editSceneTool] Input:', {
        sceneId: input.sceneId,
        editType,
        hasPrompt: !!input.prompt,
        hasImages: !!input.imageUrls?.length,
        hasDuration: !!input.duration
      });
    }
    
    // SceneService automatically handles:
    // - Duration only → No AI, instant update
    // - Text edits → Routes to appropriate model based on editType
    // - Image edits → Uses vision model (editSceneWithImage)
    // - Combined edits → Applies all changes
    const response = await sceneService.editScene({
      sceneId: input.sceneId,
      prompt: input.prompt,
      editType,
      imageUrls: input.imageUrls,
      duration: input.duration
    });
    
    return response;
  }
};

/**
 * System prompt addition for the Brain:
 * 
 * When users want to edit a scene, always use the 'editScene' tool.
 * It handles all types of modifications:
 * 
 * 1. Duration changes:
 *    - "Make it 5 seconds" → editScene with duration: 150
 *    - "Double the length" → editScene with calculated duration
 * 
 * 2. Content edits (choose editType based on request):
 *    - "Change the text to red" → editType: 'surgical' (minimal change)
 *    - "Make it more exciting" → editType: 'creative' (bigger changes)
 *    - "Restructure the layout" → editType: 'creative' (bigger changes)
 *    - "Fix the export error" → editType: 'fix' (error correction)
 *    - "Component is not rendering" → editType: 'fix' (broken scene)
 * 
 * 3. Image-based edits:
 *    - "Match this style [image]" → include imageUrls
 *    - "Use these colors [image]" → include imageUrls + prompt
 * 
 * 4. Combined edits:
 *    - "Make it 10 seconds and change colors" → duration + prompt
 *    - "Match this image and make it longer" → imageUrls + duration
 * 
 * Default to 'surgical' editType when unclear.
 */