// src/server/agents/setup.ts

import { messageBus, type MessageBus } from './message-bus';
import { CoordinatorAgent } from './coordinator-agent';
import { BuilderAgent, type BuilderAgentParams } from './builder-agent'; 
import { ErrorFixerAgent, type ErrorFixerAgentParams } from './error-fixer-agent'; 
import { R2StorageAgent } from './r2-storage-agent';
import { UIAgent } from './ui-agent';
import { ADBAgent } from './adb-agent';
import { agentRegistry } from '~/server/services/a2a/agentRegistry.service';
import { taskManager } from '~/server/services/a2a/taskManager.service'; 

/**
 * Initializes the A2A agent system by:
 * 1. Creating instances of all agents.
 * 2. Registering them with the MessageBus.
 * 3. Registering them with the AgentRegistry for discovery.
 */
export function setupAgentSystem(): MessageBus {
  // Define default/empty params for agents that require them
  // TODO: Replace placeholder modelName with actual values, possibly from env variables
  const defaultBuilderParams: BuilderAgentParams = {
    modelName: "gpt-4o-mini", // Placeholder
  };
  const defaultErrorFixerParams: ErrorFixerAgentParams = {
    modelName: "gpt-4o-mini", // Placeholder
  };

  // Create agent instances
  const coordinator = new CoordinatorAgent(taskManager);
  const builder = new BuilderAgent(defaultBuilderParams, taskManager);
  const errorFixer = new ErrorFixerAgent(defaultErrorFixerParams, taskManager);
  const r2Storage = new R2StorageAgent(taskManager);
  const ui = new UIAgent(taskManager);
  const adb = new ADBAgent(taskManager);

  const agents = [coordinator, builder, errorFixer, r2Storage, ui, adb];

  // Register agents with both MessageBus and AgentRegistry
  for (const agent of agents) {
    messageBus.registerAgent(agent);
    agentRegistry.registerAgent(agent); // For discovery via AgentCards
  }
  
  console.log("A2A Agent System setup complete. All agents registered.");
  return messageBus;
}

/**
 * Call this function when the server starts to initialize the agent system.
 * Example usage in `src/server/index.ts` or your main server startup file:
 * 
 * import { setupAgentSystem } from './agents/setup';
 * setupAgentSystem();
 */ 