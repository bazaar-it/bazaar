// src/server/services/mcp/tools/registry.ts
import { MCPToolRegistry } from "./base";
import { addSceneTool } from "./addScene";
import { editSceneTool } from "./editScene";
import { deleteSceneTool } from "./deleteScene";
import { fixBrokenSceneTool } from "./fixBrokenScene";
import { analyzeImageTool } from "./analyzeImage";
import { createSceneFromImageTool } from "./createSceneFromImage";
import { editSceneWithImageTool } from "./editSceneWithImage";
import { changeDurationTool } from "./changeDuration"; // Added import

/**
 * Global tool registry singleton - HMR safe
 * Prevents duplicate registrations during development hot reloads
 */
declare global {
  // eslint-disable-next-line no-var
  var __toolRegistry: MCPToolRegistry | undefined;
}

export const toolRegistry = globalThis.__toolRegistry ??= new MCPToolRegistry();

// Register all tools
toolRegistry.register(addSceneTool);
toolRegistry.register(editSceneTool);
toolRegistry.register(deleteSceneTool);
toolRegistry.register(fixBrokenSceneTool);
toolRegistry.register(analyzeImageTool);
toolRegistry.register(createSceneFromImageTool);
toolRegistry.register(editSceneWithImageTool);
toolRegistry.register(changeDurationTool);
 