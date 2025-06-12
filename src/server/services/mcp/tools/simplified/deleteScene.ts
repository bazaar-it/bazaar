// src/server/services/mcp/tools/simplified/deleteScene.ts
import { z } from 'zod';
import { sceneService } from '@/server/services/scene/scene.service';
import type { McpTool } from '@/server/services/mcp/types';

/**
 * Simplified Delete Scene Tool
 * Simple scene deletion with consistent response format
 */
export const deleteSceneTool: McpTool = {
  name: 'deleteScene',
  description: 'Delete a scene from the project',
  
  inputSchema: z.object({
    sceneId: z.string().describe('ID of the scene to delete'),
  }),
  
  execute: async (input, context) => {
    if (context.debug) {
      console.log('[deleteSceneTool] Deleting scene:', input.sceneId);
    }
    
    // Simple deletion - returns StandardApiResponse<DeleteOperationResponse>
    const response = await sceneService.deleteScene({
      sceneId: input.sceneId
    });
    
    return response;
  }
};

/**
 * System prompt addition for the Brain:
 * 
 * When users want to remove a scene, use the 'deleteScene' tool.
 * 
 * Examples:
 * - "Delete the last scene" → deleteScene with the scene ID
 * - "Remove scene 3" → deleteScene with the scene ID
 * - "Get rid of that scene" → deleteScene with the scene ID
 * 
 * Always confirm which scene to delete if unclear.
 */