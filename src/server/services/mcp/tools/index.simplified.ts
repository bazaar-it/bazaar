// src/server/services/mcp/tools/index.simplified.ts
// This exports the simplified 3-tool architecture

// Export simplified scene tools
export { addSceneTool } from './simplified/addScene';
export { editSceneTool } from './simplified/editScene';
export { deleteSceneTool } from './simplified/deleteScene';

// Export image analysis (still needed for brain to understand images)
export { analyzeImageTool } from './analyzeImage';

// Export MCP infrastructure
export { toolRegistry } from './registry';
export type { MCPTool, MCPResult } from './base';

// Create simplified tool array for registration
export const simplifiedToolSet = [
  require('./simplified/addScene').addSceneTool,
  require('./simplified/editScene').editSceneTool,
  require('./simplified/deleteScene').deleteSceneTool,
  require('./analyzeImage').analyzeImageTool,
];