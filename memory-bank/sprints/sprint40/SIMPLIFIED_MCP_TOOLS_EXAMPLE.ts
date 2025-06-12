// Example: How MCP Tools become ultra-simple with new SceneService

import { z } from 'zod';
import { sceneService } from '@/server/services/scene/scene.service';
import { Tool } from '@/lib/types/mcp';

// ============= JUST 3 TOOLS NOW! =============

/**
 * Add Scene Tool - Handles BOTH prompt and image creation
 * No more separate createSceneFromImage tool needed!
 */
export const addSceneTool: Tool = {
  name: 'addScene',
  description: 'Create a new scene from text prompt or images',
  input: z.object({
    projectId: z.string().describe('Project to add scene to'),
    prompt: z.string().describe('What kind of scene to create'),
    imageUrls: z.array(z.string()).optional().describe('Optional images to create from'),
    order: z.number().optional().describe('Scene order in timeline'),
  }),
  execute: async (input) => {
    // That's it! Service handles everything
    return sceneService.addScene(input);
  }
};

/**
 * Edit Scene Tool - Handles ALL edit types including duration
 * No more separate editSceneWithImage or changeDuration tools!
 */
export const editSceneTool: Tool = {
  name: 'editScene',
  description: 'Edit a scene - content, structure, style, or duration',
  input: z.object({
    sceneId: z.string().describe('Scene to edit'),
    prompt: z.string().optional().describe('What changes to make'),
    editType: z.enum(['surgical', 'creative', 'structural'])
      .optional()
      .default('surgical')
      .describe('Type of edit - surgical preserves structure'),
    imageUrls: z.array(z.string()).optional().describe('Images for reference'),
    duration: z.number().optional().describe('New duration in frames'),
  }),
  execute: async (input) => {
    // Service automatically routes to right operation
    return sceneService.editScene(input);
  }
};

/**
 * Delete Scene Tool - Simple deletion
 */
export const deleteSceneTool: Tool = {
  name: 'deleteScene',
  description: 'Delete a scene from the project',
  input: z.object({
    sceneId: z.string().describe('Scene to delete'),
  }),
  execute: async (input) => {
    return sceneService.deleteScene(input);
  }
};

// ============= USAGE EXAMPLES =============

/*
BEFORE (Confusing):
- User: "Create a scene from this image"
- System: Must pick 'createSceneFromImage' tool
- User: "Change the duration to 5 seconds"  
- System: Must pick 'changeDuration' tool
- User: "Edit this scene based on this reference image"
- System: Must pick 'editSceneWithImage' tool

AFTER (Simple):
- User: "Create a scene from this image"
- System: Uses 'addScene' with imageUrls
- User: "Change the duration to 5 seconds"
- System: Uses 'editScene' with duration
- User: "Edit this scene based on this reference image"
- System: Uses 'editScene' with imageUrls
*/

// ============= ORCHESTRATOR INTEGRATION =============

export const sceneTools = [
  addSceneTool,
  editSceneTool,
  deleteSceneTool,
  // That's all! No more tool explosion
];

// ============= SYSTEM PROMPT UPDATE =============

export const SIMPLIFIED_TOOL_PROMPT = `
You have 3 scene management tools:

1. **addScene** - Creates new scenes
   - From text prompts (generates layout + code)
   - From images (direct vision-based generation)
   - Auto-detects based on imageUrls presence

2. **editScene** - Modifies existing scenes
   - Content edits: surgical (precise), creative (rewrite), structural (refactor)
   - Duration changes: just pass duration number
   - Image-based edits: include imageUrls
   - Auto-selects right AI model for the task

3. **deleteScene** - Removes scenes

Examples:
- "Create a blue gradient scene" → addScene with prompt
- "Create scene from [image]" → addScene with imageUrls
- "Change text to red" → editScene with editType: 'surgical'
- "Make it 10 seconds" → editScene with duration: 300
- "Match this style [image]" → editScene with imageUrls

The tools handle routing automatically - you just specify what the user wants!
`;

// ============= BENEFITS =============

/*
1. **Simpler Mental Model**
   - Just think: add, edit, or delete
   - No tool selection confusion

2. **Future Proof**
   - Easy to add new edit types
   - Easy to add new creation modes
   - No new tools needed

3. **Better UX**
   - Users don't see tool complexity
   - Natural language just works
   - Consistent behavior

4. **Easier Testing**
   - 3 tools vs 7+ tools
   - Clear boundaries
   - Predictable behavior
*/