import { MCPToolRegistry } from "./base";

/**
 * Global tool registry singleton - HMR safe
 * Prevents duplicate registrations during development hot reloads
 */
declare global {
  var __toolRegistry: MCPToolRegistry | undefined;
}

export const toolRegistry = globalThis.__toolRegistry ??= new MCPToolRegistry(); 