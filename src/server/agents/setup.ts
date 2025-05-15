// src/server/agents/setup.ts

import { messageBus, type MessageBus } from './message-bus';
import { CoordinatorAgent } from './coordinator-agent';
import { BuilderAgent } from './builder-agent';
import { ErrorFixerAgent } from './error-fixer-agent';
import { R2StorageAgent } from './r2-storage-agent';
import { UIAgent } from './ui-agent';
import { ADBAgent } from './adb-agent';
import { agentRegistry } from '~/server/services/a2a/agentRegistry.service';

/**
 * Initializes the A2A agent system by:
 * 1. Creating instances of all agents.
 * 2. Registering them with the MessageBus.
 * 3. Registering them with the AgentRegistry for discovery.
 */
export function setupAgentSystem(): MessageBus {
  // Create agent instances
  const coordinator = new CoordinatorAgent();
  const builder = new BuilderAgent();
  const errorFixer = new ErrorFixerAgent();
  const r2Storage = new R2StorageAgent();
  const ui = new UIAgent();
  const adb = new ADBAgent();

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