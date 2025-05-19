import { BaseAgent, type AgentLifecycleState } from "~/server/agents/base-agent";
import type { AgentCard } from "~/types/a2a";
import { lifecycleManager } from "./lifecycleManager.service";

/**
 * AgentRegistry service
 * 
 * Maintains registry of available A2A-compliant agents and provides discovery mechanisms
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }
  
  /**
   * Register an agent with the registry
   */
  public registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.name.toLowerCase(), agent);
    lifecycleManager.registerAgent(agent);
    console.log(`Registered agent: ${agent.name}`);
  }
  
  /**
   * Get agent by name
   */
  public getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name.toLowerCase());
  }
  
  /**
   * Get all registered agents
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Get agent card for a specific agent
   */
  public getAgentCard(name: string): AgentCard | undefined {
    const agent = this.getAgent(name);
    if (!agent) {
      return undefined;
    }
    
    return agent.getAgentCard();
  }
  
  /**
   * Get all agent cards for discovery
   */
  public getAllAgentCards(): AgentCard[] {
    return this.getAllAgents().map(agent => agent.getAgentCard());
  }

  public getAgentStatuses(): { name: string; state: AgentLifecycleState; lastHeartbeat: number }[] {
    return lifecycleManager.getAgentStatuses();
  }
}

// Export singleton instance
export const agentRegistry = AgentRegistry.getInstance();

// Global registry of agents
const agentRegistryGlobal: Record<string, BaseAgent> = {};

/**
 * Register an agent in the global registry
 */
export function registerAgentGlobal(agent: BaseAgent): void {
  const agentName = agent.getName();
  agentRegistryGlobal[agentName] = agent;
  console.log(`Registered agent: ${agentName}`);
}

/**
 * Get an agent by name from the global registry
 */
export function getAgentGlobal(agentName: string): BaseAgent | undefined {
  return agentRegistryGlobal[agentName];
}

/**
 * Get all registered agents from the global registry
 */
export function getAllAgentsGlobal(): BaseAgent[] {
  return Object.values(agentRegistryGlobal);
}

// ... rest of existing code ... 