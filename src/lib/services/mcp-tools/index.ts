// src/lib/services/mcp-tools/index.ts

// Export main scene tools
export { addSceneTool } from './addScene';
export { editSceneTool } from './editScene';
export { deleteSceneTool } from './deleteScene';
export { fixBrokenSceneTool } from './fixBrokenScene';
export { changeDurationTool } from './changeDuration';

// Export image tools  
export { analyzeImageTool } from './analyzeImage';
export { createSceneFromImageTool } from './createSceneFromImage';
export { editSceneWithImageTool } from './editSceneWithImage';

// Export MCP infrastructure
export { toolRegistry } from './registry';
export type { MCPTool, MCPResult } from './base';
