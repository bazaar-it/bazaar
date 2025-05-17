// src/server/services/a2a/initializeAgents.ts
import { BaseAgent } from "~/server/agents/base-agent";
import { CoordinatorAgent } from "~/server/agents/coordinator-agent";
import { ScenePlannerAgent } from "~/server/agents/scene-planner-agent";
import { BuilderAgent } from "~/server/agents/builder-agent";
import { UIAgent } from "~/server/agents/ui-agent";
import { ErrorFixerAgent } from "~/server/agents/error-fixer-agent";
import { R2StorageAgent } from "~/server/agents/r2-storage-agent";
import { initializeA2AFileTransport, a2aLogger } from "~/lib/logger";
import { type TaskManager } from "./taskManager.service";
import { env } from "~/env";

// Registry of agents for lookup by name 
// This replaces the import from agentRegistry.service to avoid conflict
export const agentRegistry: Record<string, BaseAgent> = {};

// Flag to track if agents have been initialized
let agentsInitialized = false;

/**
 * Register an agent in the global registry
 */
export function registerAgent(agent: BaseAgent): void {
  const agentName = agent.getName();
  
  // Skip if already registered to prevent duplicate registrations
  if (agentRegistry[agentName]) {
    a2aLogger.info("agent_registry", `Agent ${agentName} already registered, skipping duplicate registration`);
    return;
  }
  
  agentRegistry[agentName] = agent;
  console.log(`Registered agent: ${agentName}`);
}

/**
 * Initialize all agents in the A2A system
 * 
 * This function creates instances of all agent types and registers with the task manager.
 * It also initializes the A2A file transport for logging.
 * 
 * @param taskManager The task manager instance used for agent registration
 * @returns Array of initialized agent instances
 */
export function initializeAgents(taskManager: TaskManager): BaseAgent[] {
  // Initialize A2A file transport for logging first
  initializeA2AFileTransport();
  
  // Check if agents have already been initialized to prevent duplication
  if (agentsInitialized) {
    a2aLogger.info("agent_init", "Agents already initialized, returning existing registry");
    // Return existing agents from registry
    return Object.values(agentRegistry);
  }
  
  a2aLogger.info("agent_init", "Initializing A2A Agents - first time initialization");
  
  try {
    // Create agent instances with the right constructor signatures
    const coordinatorAgent = new CoordinatorAgent(taskManager);
    const scenePlannerAgent = new ScenePlannerAgent(taskManager);
    const builderAgent = new BuilderAgent({ modelName: env.DEFAULT_ADB_MODEL }, taskManager);
    const uiAgent = new UIAgent(taskManager);
    const errorFixerAgent = new ErrorFixerAgent({ modelName: env.DEFAULT_ADB_MODEL }, taskManager);
    const r2StorageAgent = new R2StorageAgent(taskManager);
    
    // Create the array of all agents
    const agents = [
      coordinatorAgent,
      scenePlannerAgent,
      builderAgent,
      uiAgent,
      errorFixerAgent,
      r2StorageAgent,
    ];
    
    // Explicitly register each agent
    agents.forEach(agent => {
      registerAgent(agent);
      a2aLogger.info("agent_registration", `Registered agent: ${agent.getName()}`);
    });
    
    // Mark initialization as complete
    agentsInitialized = true;
    
    // Log the initialized agents
    a2aLogger.info("agent_initialization_complete", `Successfully initialized ${agents.length} agents: ${agents.map(a => a.getName()).join(', ')}`);
    
    return agents;
  } catch (error) {
    a2aLogger.error("agent_init_error", `Error initializing agents: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}