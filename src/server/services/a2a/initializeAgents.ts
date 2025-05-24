// src/server/services/a2a/initializeAgents.ts
import { type BaseAgent } from "~/server/agents/base-agent";
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
import { lifecycleManager } from "./lifecycleManager.service";

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
  a2aLogger.info("agent_registry", `Registered agent: ${agentName}`);

  // Also register with the central MessageBus so publish/subscribe works.
  try {
    messageBus.registerAgent(agent);
    // Register with lifecycle manager
    lifecycleManager.registerAgent(agent);
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
    a2aLogger.info("agent_lifecycle", "Agents already initialized, returning existing registry", { module: "agent_init"});
    // Return existing agents from registry
    return Object.values(agentRegistry);
  }
  
  a2aLogger.info("agent_lifecycle", "Initializing A2A Agents - first time initialization", { module: "agent_init"});
  
  try {
    // Create agent instances with the right constructor signatures
    const agents: BaseAgent[] = [];
    
    try {
      const coordinatorAgent = new CoordinatorAgent(taskManager);
      agents.push(coordinatorAgent);
      a2aLogger.info("agent_lifecycle", `Created CoordinatorAgent successfully`, { module: "agent_creation"});
    } catch (error) {
      const err = error as any;
      a2aLogger.error(
        "system", // TaskId can be null for system/init logs
        `Failed to create CoordinatorAgent. Error: ${err?.message || 'Unknown error'}. Stack: ${err?.stack || 'No stack'}. Details: ${JSON.stringify(err)}`,
        { agentName: "CoordinatorAgent", module: "agent_creation_error" }
      );
    }
    
    try {
      const scenePlannerAgent = new ScenePlannerAgent(taskManager);
      agents.push(scenePlannerAgent);
      a2aLogger.info("agent_lifecycle", `Created ScenePlannerAgent successfully`, { module: "agent_creation"});
    } catch (error) {
      const err = error as any;
      a2aLogger.error(
        "system",
        `Failed to create ScenePlannerAgent. Error: ${err?.message || 'Unknown error'}. Stack: ${err?.stack || 'No stack'}. Details: ${JSON.stringify(err)}`,
        { agentName: "ScenePlannerAgent", module: "agent_creation_error" }
      );
    }
    
    try {
      a2aLogger.info("agent_lifecycle", `Attempting to create BuilderAgent with modelName=${env.DEFAULT_ADB_MODEL || 'gpt-4'}`, { module: "agent_creation"});
      a2aLogger.info("agent_lifecycle", `OPENAI_API_KEY available: ${Boolean(process.env.OPENAI_API_KEY)}`, { module: "agent_creation"});
      
      const builderAgent = new BuilderAgent({ modelName: env.DEFAULT_ADB_MODEL || 'gpt-4' }, taskManager);
      agents.push(builderAgent);
      a2aLogger.info("agent_lifecycle", `Created BuilderAgent successfully`, { module: "agent_creation"});
    } catch (error) {
      const err = error as any;
      a2aLogger.error(
        "system",
        `Failed to create BuilderAgent. Error: ${err?.message || 'Unknown error'}. Stack: ${err?.stack || 'No stack'}. Details: ${JSON.stringify(err)}`,
        { agentName: "BuilderAgent", module: "agent_creation_error" }
      );
    }
    
    try {
      const uiAgent = new UIAgent(taskManager);
      agents.push(uiAgent);
      a2aLogger.info("agent_lifecycle", `Created UIAgent successfully`, { module: "agent_creation"});
    } catch (error) {
      const err = error as any;
      a2aLogger.error(
        "system",
        `Failed to create UIAgent. Error: ${err?.message || 'Unknown error'}. Stack: ${err?.stack || 'No stack'}. Details: ${JSON.stringify(err)}`,
        { agentName: "UIAgent", module: "agent_creation_error" }
      );
    }
    
    try {
      const errorFixerAgent = new ErrorFixerAgent({ modelName: env.DEFAULT_ADB_MODEL || 'gpt-4' }, taskManager);
      agents.push(errorFixerAgent);
      a2aLogger.info("agent_lifecycle", `Created ErrorFixerAgent successfully`, { module: "agent_creation"});
    } catch (error) {
      const err = error as any;
      a2aLogger.error(
        "system",
        `Failed to create ErrorFixerAgent. Error: ${err?.message || 'Unknown error'}. Stack: ${err?.stack || 'No stack'}. Details: ${JSON.stringify(err)}`,
        { agentName: "ErrorFixerAgent", module: "agent_creation_error" }
      );
    }
    
    try {
      const r2StorageAgent = new R2StorageAgent(taskManager);
      agents.push(r2StorageAgent);
      a2aLogger.info("agent_lifecycle", `Created R2StorageAgent successfully`, { module: "agent_creation"});
    } catch (error) {
      const err = error as any;
      a2aLogger.error(
        "system",
        `Failed to create R2StorageAgent. Error: ${err?.message || 'Unknown error'}. Stack: ${err?.stack || 'No stack'}. Details: ${JSON.stringify(err)}`,
        { agentName: "R2StorageAgent", module: "agent_creation_error" }
      );
    }
    
    // Only register agents that were successfully created
    if (agents.length > 0) {
      // Explicitly register each agent
      agents.forEach(agent => {
        registerAgent(agent);
      });
      
      // Mark initialization as complete
      agentsInitialized = true;
      
      // Initialize each agent's lifecycle
      Promise.all(agents.map(agent => agent.init()))
        .then(() => {
          a2aLogger.info("agent_lifecycle", "All agents initialized and ready", { module: "agent_initialization_complete" });
        })
        .catch(err => {
          a2aLogger.error("agent_lifecycle", `Error in agent initialization: ${err.message}`, { module: "agent_initialization_error" });
        });
      
      // Start lifecycle monitoring
      lifecycleManager.startMonitoring();
      
      // Log the initialized agents
      a2aLogger.info("agent_lifecycle", `Successfully initialized ${agents.length} agents: ${agents.map(a => a.getName()).join(', ')}`, { module: "agent_initialization_complete"});
    } else {
      a2aLogger.error("agent_lifecycle", "No agents could be initialized successfully", { module: "agent_initialization_failed"});
    }
    
    return agents;
  } catch (error) {
    a2aLogger.error("agent_lifecycle", `Error initializing agents: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}