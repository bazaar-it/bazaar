import { db } from "~/server/db";
import { agentMessages, customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import type { 
  TaskState, 
  TaskStatus, 
  Message, 
  Artifact, 
  Part, 
  TextPart,
  StructuredAgentMessage,
  ComponentJobStatus,
  AgentSkill,
  AgentCard,
  AgentCapabilities
} from "~/types/a2a";
import {
  createTextMessage,
  createFileArtifact,
  createStructuredAgentMessage,
  mapA2AToInternalState
} from "~/types/a2a";
import { taskManager } from "~/server/services/a2a/taskManager.service";

/**
 * Standard Agent Message format for internal message passing
 */
export interface AgentMessage {
  type: string;            // The message type (e.g., 'BUILD_COMPONENT_REQUEST')
  payload: Record<string, any>; // Message data
  sender: string;          // Sender agent name
  recipient: string;       // Recipient agent name
  id: string;              // Unique message ID
  correlationId?: string;  // For linking related messages
}

/**
 * Base class for all A2A-compliant agents
 */
export abstract class BaseAgent {
  readonly name: string;
  readonly description: string;
  
  constructor(name: string, description?: string) {
    this.name = name;
    this.description = description || `${name} Agent`;
  }
  
  /**
   * Process an incoming message
   * This must be implemented by each agent
   */
  abstract processMessage(message: AgentMessage): Promise<AgentMessage | null>;
  
  /**
   * Create a new agent message
   */
  createMessage(
    type: string, 
    payload: Record<string, any>, 
    recipient: string,
    correlationId?: string
  ): AgentMessage {
    return {
      type,
      payload,
      sender: this.name,
      recipient,
      id: crypto.randomUUID(),
      correlationId
    };
  }
  
  /**
   * Create a structured A2A-compliant agent message
   */
  createA2AMessage(
    type: string,
    taskId: string, 
    recipient: string,
    message?: Message,
    artifacts?: Artifact[],
    correlationId?: string
  ): AgentMessage {
    const structuredMessage = createStructuredAgentMessage(
      type,
      taskId,
      this.name,
      recipient,
      message,
      artifacts
    );
    
    return {
      type,
      payload: structuredMessage,
      sender: this.name,
      recipient,
      id: structuredMessage.id,
      correlationId
    };
  }
  
  /**
   * Create a simple text message in A2A format
   */
  createSimpleTextMessage(text: string): Message {
    return createTextMessage(text);
  }
  
  /**
   * Create a file artifact in A2A format
   */
  createSimpleFileArtifact(
    id: string,
    url: string,
    mimeType: string = "application/javascript",
    description?: string
  ): Artifact {
    return createFileArtifact(id, url, mimeType, description);
  }
  
  /**
   * Update task state using the TaskManager service
   */
  async updateTaskState(
    taskId: string, 
    state: TaskState,
    message?: Message,
    internalStatus?: ComponentJobStatus
  ): Promise<void> {
    const effectiveInternalStatus = internalStatus || mapA2AToInternalState(state);
    await taskManager.updateTaskStatus(taskId, state, effectiveInternalStatus, message);
    
    // Log this as an agent message as well for audit trail
    await this.logAgentMessage({
      type: "TASK_STATE_UPDATE",
      payload: { taskId, newState: state, internalStatus: effectiveInternalStatus, messageContent: message },
      sender: this.name,
      recipient: "TaskManager",
      id: crypto.randomUUID()
    });
  }
  
  /**
   * Add an artifact to a task using the TaskManager service
   */
  async addTaskArtifact(
    taskId: string,
    artifact: Artifact
  ): Promise<void> {
    await taskManager.addTaskArtifact(taskId, artifact);
    
    // Log this as an agent message
    await this.logAgentMessage({
      type: "TASK_ARTIFACT_ADDED",
      payload: { taskId, artifact },
      sender: this.name,
      recipient: "TaskManager",
      id: crypto.randomUUID()
    });
  }
  
  /**
   * Log an agent message to the database
   */
  async logAgentMessage(message: AgentMessage, processed: boolean = false): Promise<void> {
    await db.insert(agentMessages).values({
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      type: message.type,
      payload: message.payload,
      correlationId: message.correlationId,
      status: processed ? 'processed' : 'pending',
      createdAt: new Date(),
      processedAt: processed ? new Date() : undefined
    });
  }
  
  /**
   * Mark a message as processed
   */
  async markMessageProcessed(messageId: string): Promise<void> {
    await db.update(agentMessages)
      .set({ 
        status: 'processed',
        processedAt: new Date()
      })
      .where(eq(agentMessages.id, messageId));
  }
  
  /**
   * Get the agent card in A2A format
   * This provides discovery metadata about the agent
   */
  getAgentCard(): AgentCard {
    return {
      name: this.name,
      description: this.description,
      url: `/api/a2a/agents/${this.name.toLowerCase()}`,
      provider: {
        name: "Bazaar-Vid",
        url: "https://bazaar-vid.com"
      },
      version: "1.0.0",
      documentationUrl: `/docs/agents/${this.name.toLowerCase()}`,
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true
      } as AgentCapabilities,
      authentication: null,
      defaultInputModes: ["text", "data"] as Array<'text' | 'file' | 'data'>,
      defaultOutputModes: ["text", "file"] as Array<'text' | 'file' | 'data'>,
      skills: [] as AgentSkill[]
    };
  }
} 