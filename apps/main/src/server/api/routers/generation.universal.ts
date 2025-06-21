/**
 * Generation Router with Universal Response Format
 * Modularized version - imports operations from subdirectory
 */

import { createTRPCRouter } from "~/server/api/trpc";

// Import all operations from modular files
import { generateScene, removeScene } from "./generation/scene-operations";
import { getProjectScenes } from "./generation/project-operations";
import { 
  getMessageIterations, 
  getBatchMessageIterations, 
  revertToIteration 
} from "./generation/iteration-operations";
import { addTemplate } from "./generation/template-operations";

export const generationUniversalRouter = createTRPCRouter({
  // Scene operations
  generateScene,
  removeScene,
  
  // Project operations
  getProjectScenes,
  
  // Iteration operations
  getMessageIterations,
  getBatchMessageIterations,
  revertToIteration,
  
  // Template operations
  addTemplate,
});