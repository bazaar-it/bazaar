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
import { messageBus } from "~/server/agents/message-bus";

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

  // Also register with the central MessageBus so publish/subscribe works.
  try {
    messageBus.registerAgent(agent);
  } catch (err) {
    // In case an agent is registered twice with the bus, ignore.
  }
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
    const agents = [];
    
    try {
      const coordinatorAgent = new CoordinatorAgent(taskManager);
      agents.push(coordinatorAgent);
      a2aLogger.info("agent_creation", `Created CoordinatorAgent successfully`);
    } catch (error) {
      a2aLogger.error("agent_creation_error", `Failed to create CoordinatorAgent: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      const scenePlannerAgent = new ScenePlannerAgent(taskManager);
      agents.push(scenePlannerAgent);
      a2aLogger.info("agent_creation", `Created ScenePlannerAgent successfully`);
    } catch (error) {
      a2aLogger.error("agent_creation_error", `Failed to create ScenePlannerAgent: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      console.log(`Attempting to create BuilderAgent with modelName=${env.DEFAULT_ADB_MODEL || 'gpt-4'}`);
      console.log(`OPENAI_API_KEY available: ${Boolean(process.env.OPENAI_API_KEY)}`); 
      
      const builderAgent = new BuilderAgent({ modelName: env.DEFAULT_ADB_MODEL || 'gpt-4' }, taskManager);
      agents.push(builderAgent);
      a2aLogger.info("agent_creation", `Created BuilderAgent successfully`);
    } catch (error) {
      console.error(`BUILDER AGENT ERROR: ${error instanceof Error ? error.message : String(error)}`);
      console.error(error); // Log the full error object
      a2aLogger.error("agent_creation_error", `Failed to create BuilderAgent: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      const uiAgent = new UIAgent(taskManager);
      agents.push(uiAgent);
      a2aLogger.info("agent_creation", `Created UIAgent successfully`);
    } catch (error) {
      a2aLogger.error("agent_creation_error", `Failed to create UIAgent: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      const errorFixerAgent = new ErrorFixerAgent({ modelName: env.DEFAULT_ADB_MODEL || 'gpt-4' }, taskManager);
      agents.push(errorFixerAgent);
      a2aLogger.info("agent_creation", `Created ErrorFixerAgent successfully`);
    } catch (error) {
      a2aLogger.error("agent_creation_error", `Failed to create ErrorFixerAgent: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      const r2StorageAgent = new R2StorageAgent(taskManager);
      agents.push(r2StorageAgent);
      a2aLogger.info("agent_creation", `Created R2StorageAgent successfully`);
    } catch (error) {
      a2aLogger.error("agent_creation_error", `Failed to create R2StorageAgent: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Only register agents that were successfully created
    if (agents.length > 0) {
      // Explicitly register each agent
      agents.forEach(agent => {
        registerAgent(agent);
        a2aLogger.info("agent_registration", `Registered agent: ${agent.getName()}`);
      });
      
      // Mark initialization as complete
      agentsInitialized = true;
      
      // Log the initialized agents
      a2aLogger.info("agent_initialization_complete", `Successfully initialized ${agents.length} agents: ${agents.map(a => a.getName()).join(', ')}`);
    } else {
      a2aLogger.error("agent_initialization_failed", "No agents could be initialized successfully");
    }
    
    return agents;
  } catch (error) {
    a2aLogger.error("agent_init_error", `Error initializing agents: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}