import { BaseAgent } from "~/server/agents/base-agent";
import type { AgentCard } from "~/types/a2a";

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
}

// Export singleton instance
export const agentRegistry = AgentRegistry.getInstance(); 