/**
 * Generation Router with Universal Response Format
 * Modularized version - imports operations from subdirectory
 */

import { createTRPCRouter } from "~/server/api/trpc";

// Import all operations from modular files
import { generateScene, duplicateScene, removeScene } from "./generation/scene-operations";
import { getProjectScenes } from "./generation/project-operations";
import { 
  getMessageIterations, 
  getBatchMessageIterations, 
  revertToIteration 
} from "./generation/iteration-operations";
import { addTemplate } from "./generation/template-operations";
import { enhancePrompt } from "./generation/prompt-operations";

export const generationUniversalRouter = createTRPCRouter({
  // Scene operations
  generateScene,
  duplicateScene,
  removeScene,
  
  // Project operations
  getProjectScenes,
  
  // Iteration operations
  getMessageIterations,
  getBatchMessageIterations,
  revertToIteration,
  
  // Template operations
  addTemplate,
  
  // Prompt operations
  enhancePrompt,
});