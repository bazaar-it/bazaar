/**
 * Agent Discovery Service
 * 
 * Implements A2A-compliant agent discovery endpoints and agent cards.
 * @see https://github.com/google/A2A/blob/main/docs/agent-directory.md
 */

import crypto from "crypto";

/**
 * Agent Card interface as defined by the A2A protocol
 */
export interface AgentCard {
  id: string;         // Unique identifier for this agent
  name: string;       // Display name
  description: string; // Description of the agent's capabilities
  authType: "none" | "oauth2" | "api_key"; // Authentication type required
  auth?: {            // Authentication details if required
    type: string;
    instructions?: string;
  };
  capabilities: {
    canCreateTask: boolean;  // Can create tasks
    canGetTask: boolean;     // Can retrieve task status
    canCancelTask: boolean;  // Can cancel tasks
    subscribeToTaskStatus: boolean; // Supports SSE for task status updates
    modelName?: string;      // Name of model used (if LLM-based)
    tools?: Array<{         // Tools supported by this agent 
      name: string;
      description: string;
    }>;
  };
  maxTaskDuration?: number; // Maximum task duration in seconds
  systemMessage?: string;   // System prompt used for LLM agents
}

/**
 * Agent Directory Response
 */
export interface AgentDirectoryResponse {
  agents: AgentCard[];
}

/**
 * Agent Discovery Service
 */
export class AgentDiscoveryService {
  private static instance: AgentDiscoveryService;
  private agents: Map<string, AgentCard> = new Map();
  
  private constructor() {
    // Initialize with our default agents
    this.registerBuilderAgent();
    this.registerErrorFixerAgent();
    this.registerR2StorageAgent();
    this.registerCoordinatorAgent();
    this.registerUIAgent();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AgentDiscoveryService {
    if (!AgentDiscoveryService.instance) {
      AgentDiscoveryService.instance = new AgentDiscoveryService();
    }
    return AgentDiscoveryService.instance;
  }
  
  /**
   * Get all registered agent cards
   */
  public getAgentDirectory(): AgentDirectoryResponse {
    return {
      agents: Array.from(this.agents.values())
    };
  }
  
  /**
   * Get a specific agent card by ID
   */
  public getAgentCard(id: string): AgentCard | undefined {
    return this.agents.get(id);
  }
  
  /**
   * Register a new agent card
   */
  public registerAgent(agent: AgentCard): void {
    this.agents.set(agent.id, agent);
  }
  
  /**
   * Builder Agent Card
   * Responsible for generating custom component code
   */
  private registerBuilderAgent(): void {
    const builderAgent: AgentCard = {
      id: "builder-agent",
      name: "Component Builder",
      description: "Creates custom Remotion components based on descriptions",
      authType: "none",
      capabilities: {
        canCreateTask: true,
        canGetTask: true,
        canCancelTask: true,
        subscribeToTaskStatus: true,
        modelName: "gpt-4-turbo",
        tools: [
          {
            name: "generate_component",
            description: "Generate a custom Remotion component"
          },
          {
            name: "improve_component",
            description: "Improve an existing component"
          }
        ]
      },
      maxTaskDuration: 300, // 5 minutes
      systemMessage: "You are an expert Remotion component builder. Your task is to create high-quality, efficient React components for Remotion videos."
    };
    
    this.registerAgent(builderAgent);
  }
  
  /**
   * Error Fixer Agent Card
   * Responsible for fixing errors in custom components
   */
  private registerErrorFixerAgent(): void {
    const errorFixerAgent: AgentCard = {
      id: "error-fixer-agent",
      name: "Component Error Fixer",
      description: "Fixes errors in custom Remotion components",
      authType: "none",
      capabilities: {
        canCreateTask: false,
        canGetTask: true,
        canCancelTask: true,
        subscribeToTaskStatus: true,
        modelName: "gpt-4-turbo",
        tools: [
          {
            name: "fix_error",
            description: "Fix errors in a component"
          },
          {
            name: "validate_component",
            description: "Validate component code"
          }
        ]
      },
      maxTaskDuration: 180, // 3 minutes
      systemMessage: "You are an expert at debugging and fixing React and Remotion components. Your task is to identify and fix issues in component code."
    };
    
    this.registerAgent(errorFixerAgent);
  }
  
  /**
   * R2 Storage Agent Card
   * Responsible for storing components in R2
   */
  private registerR2StorageAgent(): void {
    const r2StorageAgent: AgentCard = {
      id: "r2-storage-agent",
      name: "Component Storage",
      description: "Stores compiled components in R2 storage",
      authType: "none",
      capabilities: {
        canCreateTask: false,
        canGetTask: true,
        canCancelTask: false,
        subscribeToTaskStatus: true,
        tools: [
          {
            name: "store_component",
            description: "Store compiled component in R2"
          },
          {
            name: "retrieve_component",
            description: "Retrieve component from R2"
          }
        ]
      },
      maxTaskDuration: 120 // 2 minutes
    };
    
    this.registerAgent(r2StorageAgent);
  }
  
  /**
   * Coordinator Agent Card
   * Responsible for orchestrating the component creation workflow
   */
  private registerCoordinatorAgent(): void {
    const coordinatorAgent: AgentCard = {
      id: "coordinator-agent",
      name: "Component Coordinator",
      description: "Coordinates the component creation and deployment workflow",
      authType: "none",
      capabilities: {
        canCreateTask: true,
        canGetTask: true,
        canCancelTask: true,
        subscribeToTaskStatus: true,
        tools: [
          {
            name: "create_component",
            description: "Start component creation workflow"
          },
          {
            name: "check_component_status",
            description: "Check status of component creation"
          }
        ]
      },
      maxTaskDuration: 600 // 10 minutes
    };
    
    this.registerAgent(coordinatorAgent);
  }
  
  /**
   * UI Agent Card
   * Responsible for UI updates and notifications
   */
  private registerUIAgent(): void {
    const uiAgent: AgentCard = {
      id: "ui-agent",
      name: "UI Updates",
      description: "Provides real-time UI updates for component creation process",
      authType: "none",
      capabilities: {
        canCreateTask: false,
        canGetTask: true,
        canCancelTask: false,
        subscribeToTaskStatus: true
      },
      maxTaskDuration: 3600 // 1 hour, for long-lived connections
    };
    
    this.registerAgent(uiAgent);
  }
}

// Export singleton instance
export const agentDiscovery = AgentDiscoveryService.getInstance();
