// src/server/services/mcp/tools/simplified/index.ts
export { addSceneTool } from './addScene';
export { editSceneTool } from './editScene';
export { deleteSceneTool } from './deleteScene';

// Export all tools as an array for easy registration
export const simplifiedTools = [
  require('./addScene').addSceneTool,
  require('./editScene').editSceneTool,
  require('./deleteScene').deleteSceneTool,
];