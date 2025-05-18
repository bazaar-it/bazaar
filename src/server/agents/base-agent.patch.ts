// src/server/agents/base-agent.patch.ts
// This is a patched version of the BaseAgent class that fixes the module system mismatch
// by properly handling message bus imports

import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { a2aLogger } from '~/lib/logger';
import { TaskManager } from '~/server/services/a2a/taskManager.service';
// Import these from types/a2a instead of utils/messageFormatters
import { createTextMessage, createFileArtifact } from '~/types/a2a';
import type {
  AgentSkill,
  Message,
  Artifact,
} from '~/types/a2a';

// Use any type for AgentMessage to avoid type incompatibilities in the patch file
// We're only trying to fix the module system issues, not refactor the type system
// @ts-ignore
type AgentMessage = any;

// Import the message bus directly
import { messageBus } from './message-bus';

/**
 * BaseAgent class - patched version without require()
 */
export abstract class BaseAgentPatched {
  protected name: string;
  protected description: string;
  protected taskManager: TaskManager;
  protected openai: OpenAI | null = null;
  protected modelName: string = 'gpt-4o-mini';
  protected temperature: number = 0.7;

  /**
   * Central MessageBus accessor for all agents.
   * This version uses a direct import to avoid require()
   */
  protected get bus() {
    // Direct reference to imported messageBus
    return messageBus;
  }
  
  constructor(name: string, taskManager: TaskManager, description?: string, useOpenAI: boolean = false) {
    this.name = name;
    this.taskManager = taskManager;
    this.description = description || `${name} Agent`;
    
    const logContext = { agentName: this.name, module: "agent_constructor" };

    if (useOpenAI) {
      // Use null for taskId in system/initialization logs
      a2aLogger.info("system", `Agent ${this.name} is configured to use OpenAI. Checking API Key...`, logContext);
      if (process.env.OPENAI_API_KEY) {
        try {
          this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
          a2aLogger.info("system", `Agent ${this.name}: Successfully initialized OpenAI client with model ${this.modelName}.`, logContext);
        } catch (error) {
          const err = error as any;
          a2aLogger.error("system", `Agent ${this.name}: Error initializing OpenAI client. It will be disabled. Error: ${err?.message || 'Unknown OpenAI init error'}`, { ...logContext, errorDetails: JSON.stringify(err) });
          this.openai = null;
        }
      } else {
        a2aLogger.warn("system", `Agent ${this.name}: OpenAI usage was requested, but OPENAI_API_KEY is not set. OpenAI features will be disabled.`, logContext);
        this.openai = null;
      }
    } else {
      a2aLogger.info("system", `Agent ${this.name} initialized without OpenAI integration.`, logContext);
    }
    // Log agent construction after OpenAI init attempt.
    a2aLogger.info("system", `Agent ${this.name} constructed. OpenAI initialized: ${!!this.openai}`, { ...logContext, openAIInitialized: !!this.openai });
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
    const newMessage = {
      type,
      payload,
      sender: this.name,
      recipient,
      id: uuidv4(),
      correlationId,
      timestamp: new Date().toISOString()
    };
    a2aLogger.agentSend(this.name, payload.taskId || "N/A", recipient, type, { messageId: newMessage.id, payload, correlationId, context: "internal_message" });
    return newMessage;
  }
  
  /**
   * Create an A2A message with standard structure
   */
  createA2AMessage(
    type: string,
    taskId: string,
    recipient: string,
    message?: Message,
    artifacts?: Artifact[],
    correlationId?: string,
    additionalPayload?: Record<string, any>
  ): AgentMessage {
    const payload = {
      taskId,
      message,
      artifacts,
      ...(additionalPayload || {})
    };
    
    const newMessage = this.createMessage(type, payload, recipient, correlationId);
    a2aLogger.agentSend(this.name, taskId, recipient, type, { messageId: newMessage.id, context: "a2a_message" });
    return newMessage;
  }
  
  /**
   * Create a simple text message
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
   * Log an agent message
   */
  async logAgentMessage(message: AgentMessage, success: boolean = true): Promise<void> {
    const { type, payload, sender, recipient, id, correlationId } = message;
    const taskId = payload.taskId || payload.componentJobId;
    
    if (success) {
      a2aLogger.info(taskId || "unknown_task", `[${sender} → ${recipient}] ${type}`, {
        messageId: id,
        correlationId,
        payload: JSON.stringify(payload).substring(0, 200) + "..."
      });
    } else {
      a2aLogger.error(taskId || "unknown_task", `Failed message [${sender} → ${recipient}] ${type}`, new Error("Message delivery failed"), {
        messageId: id,
        correlationId,
        payload: JSON.stringify(payload).substring(0, 200) + "..."
      });
    }
  }
  
  /**
   * Get the name of the agent
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get the description of the agent
   */
  getDescription(): string {
    return this.description;
  }
  
  /**
   * Get the skills supported by this agent
   * Each agent must implement this to advertise its capabilities
   */
  getSkills(): AgentSkill[] {
    return this.getAgentSkills();
  }
  
  /**
   * Abstract method to be implemented by each agent
   * Must return the agent's skills
   */
  protected abstract getAgentSkills(): AgentSkill[];
}
