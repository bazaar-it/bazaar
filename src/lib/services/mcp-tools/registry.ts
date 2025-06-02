import { MCPToolRegistry } from "./base";
import { addSceneTool } from "./addScene";
import { editSceneTool } from "./editScene";
import { deleteSceneTool } from "./deleteScene";
import { fixBrokenSceneTool } from "./fixBrokenScene";
import { analyzeImageTool } from "./analyzeImage";
import { createSceneFromImageTool } from "./createSceneFromImage";
import { editSceneWithImageTool } from "./editSceneWithImage";

/**
 * Global tool registry singleton - HMR safe
 * Prevents duplicate registrations during development hot reloads
 */
declare global {
  var __toolRegistry: MCPToolRegistry | undefined;
}

export const toolRegistry = globalThis.__toolRegistry ??= new MCPToolRegistry(); 