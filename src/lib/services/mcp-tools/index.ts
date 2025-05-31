// src/lib/services/mcp-tools/index.ts

// Export main scene tools for use in Brain orchestrator
export { addSceneTool } from './addScene';
export { editSceneTool } from './editScene';
export { deleteSceneTool } from './deleteScene';

// Export MCP infrastructure
export { toolRegistry } from './registry';
export type { MCPTool, MCPResult } from './base';
