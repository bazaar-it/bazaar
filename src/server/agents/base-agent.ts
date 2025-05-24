// src/server/agents/base-agent.ts
import { db } from "~/server/db";
import { agentMessages, customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
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
import { type TaskManager } from '../services/a2a/taskManager.service'; 
import { a2aLogger, logAgentSend, logAgentProcess } from '~/lib/logger'; 
import { OpenAI } from 'openai';
import { messageBus } from './message-bus';
import { lifecycleManager } from '../services/a2a/lifecycleManager.service';

export enum AgentLifecycleState {
  Initializing = 'initializing',
  Ready = 'ready',
  Processing = 'processing',
  Idle = 'idle',
  Stopping = 'stopping',
  Error = 'error'
}

/**
 * Structure for messages exchanged between agents
 */
export interface AgentMessage {
  id: string;
  type: string;
  payload: AgentMessagePayload;
  sender: string;
  recipient: string;
  timestamp?: string;
  correlationId?: string;
}

/**
 * Generic payload structure for agent messages.
 * Specific payload types can extend this or be used directly if simple.
 */
export type AgentMessagePayload = Record<string, any>;

/**
 * Base class for all A2A-compliant agents
 */
export abstract class BaseAgent {
  protected name: string;
  protected description: string;
  protected taskManager: TaskManager;
  protected openai: OpenAI | null = null;
  protected modelName = 'gpt-4o-mini';
  protected temperature = 1; // Only temp=1 supported with o4-mini
  protected lifecycleState: AgentLifecycleState = AgentLifecycleState.Initializing;
  protected heartbeatIntervalMs = 10000;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * Central MessageBus accessor for all agents.  Having a getter avoids each
   * agent file importing the bus directly and makes it easy to replace the
   * implementation (e.g. swap EventEmitter for Redis) without changing agent
   * code.
   */
  protected get bus() {
    return messageBus;
  }
  
  constructor(name: string, taskManager: TaskManager, description?: string, useOpenAI = false) {
    this.name = name;
    this.taskManager = taskManager;
    this.description = description || `${name} Agent`;
    
    const logContext = { agentName: this.name, module: "agent_constructor" };

    if (useOpenAI) {
      // Use 'agent_lifecycle' for taskId in system/initialization logs
      a2aLogger.info("agent_lifecycle", `Agent ${this.name} is configured to use OpenAI. Checking API Key...`, logContext);
      if (process.env.OPENAI_API_KEY) {
        try {
          this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
          a2aLogger.info("agent_lifecycle", `Agent ${this.name}: Successfully initialized OpenAI client with model ${this.modelName}.`, logContext);
        } catch (error) {
          const err = error as any;
          a2aLogger.error("agent_lifecycle", `Agent ${this.name}: Error initializing OpenAI client. It will be disabled. Error: ${err?.message || 'Unknown OpenAI init error'}`, { ...logContext, errorDetails: JSON.stringify(err) });
          this.openai = null;
        }
      } else {
        a2aLogger.warn("agent_lifecycle", `Agent ${this.name}: OpenAI usage was requested, but OPENAI_API_KEY is not set. OpenAI features will be disabled.`, logContext);
        this.openai = null;
      }
    } else {
      a2aLogger.info("agent_lifecycle", `Agent ${this.name} initialized without OpenAI integration.`, logContext);
    }
    // Log agent construction after OpenAI init attempt.
    a2aLogger.info(
      "agent_lifecycle",
      `Agent ${this.name} constructed. OpenAI initialized: ${!!this.openai}`,
      { ...logContext, openAIInitialized: !!this.openai }
    );
    this.lifecycleState = AgentLifecycleState.Initializing;
  }

  async init(): Promise<void> {
    this.lifecycleState = AgentLifecycleState.Ready;
    lifecycleManager.updateState(this.name, this.lifecycleState);
    lifecycleManager.recordHeartbeat(this.name);
    this.startHeartbeat();
  }

  async start(): Promise<void> {
    this.lifecycleState = AgentLifecycleState.Processing;
    lifecycleManager.updateState(this.name, this.lifecycleState);
  }

  async stop(): Promise<void> {
    this.lifecycleState = AgentLifecycleState.Stopping;
    lifecycleManager.updateState(this.name, this.lifecycleState);
    this.stopHeartbeat();
  }

  async destroy(): Promise<void> {
    this.lifecycleState = AgentLifecycleState.Stopping;
    lifecycleManager.updateState(this.name, this.lifecycleState);
    this.stopHeartbeat();
  }

  getStatus(): AgentLifecycleState {
    return this.lifecycleState;
  }

  protected startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      lifecycleManager.recordHeartbeat(this.name);
    }, this.heartbeatIntervalMs);
  }

  protected stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
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
    logAgentSend(a2aLogger, this.name, payload.taskId || "N/A", recipient, type, { messageId: newMessage.id, payload, correlationId, context: "internal_message" });
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
    logAgentSend(a2aLogger, this.name, taskId, recipient, type, { messageId: newMessage.id, context: "a2a_message" });
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
    mimeType = "application/javascript",
    description?: string
  ): Artifact {
    return createFileArtifact(id, url, mimeType, description);
  }
  
  /**
   * Log an agent message
   */
  async logAgentMessage(message: AgentMessage, success = true): Promise<void> {
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
   * Update task state in the task manager
   */
  async updateTaskState(
    taskId: string,
    state: TaskState,
    messageInput?: Message | string, 
    artifacts?: Artifact[],
    internalStatus?: ComponentJobStatus | null
  ): Promise<void> {
    try {
      logAgentProcess(a2aLogger, this.name, taskId, "updateTaskState", `Updating task to state: ${state}, internalStatus: ${internalStatus}`);

      let finalMessage: Message;

      if (typeof messageInput === 'string') {
        finalMessage = createTextMessage(messageInput);
      } else if (messageInput) {
        // Clone the message object to avoid mutating the original input
        finalMessage = { ...messageInput, metadata: { ...(messageInput.metadata || {}) } }; 
      } else {
        finalMessage = createTextMessage('Status updated by agent.');
      }

      // Ensure metadata exists
      if (!finalMessage.metadata) {
        finalMessage.metadata = {};
      }
      // Preserve existing metadata and include internal status if provided
      if (internalStatus) {
        finalMessage.metadata.componentJobStatus = internalStatus;
      }
      // Include agent name in metadata for UI identification
      finalMessage.metadata.agentName = this.name;
      
      // The 5th argument to taskManager.updateTaskStatus is isInternalStateUpdate.
      // This could be true if an internalStatus is provided, or if the task is 'working'.
      const isInternalUpdate = !!internalStatus || state === 'working';

      await this.taskManager.updateTaskStatus(
        taskId, 
        state, 
        finalMessage, 
        artifacts, 
        isInternalUpdate
      );
    } catch (error: any) {
      a2aLogger.error(this.name, `Failed to update task state: ${error.message}`, error, { taskId, state, internalStatus });
    }
  }
  
  /**
   * Add an artifact to a task
   */
  async addTaskArtifact(
    taskId: string,
    artifact: Artifact
  ): Promise<void> {
    try {
      logAgentProcess(a2aLogger, this.name, taskId, "addTaskArtifact", `Adding artifact: ${artifact.id}`);
      await this.taskManager.addTaskArtifact(taskId, artifact);
    } catch (error: any) {
      a2aLogger.error(this.name, `Failed to add task artifact: ${error.message}`, error, { taskId, artifactId: artifact.id });
    }
  }
  
  /**
   * Get the agent's capabilities card
   */
  getAgentCard() {
    return {
      name: this.name,
      description: this.description,
      version: "1.0.0",
      url: `/api/a2a/${this.name.toLowerCase()}`,
      provider: {
        name: "Bazaar-Vid",
      },
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true
      },
      defaultInputModes: ["text", "data"],
      defaultOutputModes: ["text", "data"],
      skills: this.getAgentSkills()
    };
  }
  
  /**
   * Get agent skills (to be implemented by subclasses)
   */
  protected getAgentSkills(): AgentSkill[] {
    return [{
      id: "default-skill",
      name: "Default Skill",
      description: "Base agent skill",
      inputModes: ["text", "data"],
      outputModes: ["text", "data"],
    }];
  }
  
  /**
   * Generate a response using the configured LLM
   * Only available if useOpenAI=true was passed to constructor
   */
  protected async generateResponse(
    prompt: string, 
    systemPrompt?: string,
    temperature?: number
  ): Promise<string | null> {
    if (!this.openai) {
      a2aLogger.error("llm_error", `${this.name}: Attempted to use LLM without OpenAI initialization`);
      return null;
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt }
        ],
        temperature: temperature ?? this.temperature
      });
      
      return response.choices[0]?.message.content || null;
    } catch (error: any) {
      a2aLogger.error("llm_error", `LLM generation error in ${this.name}: ${error.message}`, error);
      return null;
    }
  }
  
  /**
   * Generate a structured response using JSON mode
   * Only available if useOpenAI=true was passed to constructor
   */
  protected async generateStructuredResponse<T>(
    prompt: string,
    systemPrompt: string,
    temperature = 1 // Only temp=1 supported with o4-mini
  ): Promise<T | null> {
    if (!this.openai) {
      a2aLogger.error("llm_error", `${this.name}: Attempted to use LLM without OpenAI initialization`);
      return null;
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: prompt }
        ],
        temperature,
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0]?.message.content || '{}';
      return JSON.parse(content) as T;
    } catch (error: any) {
      a2aLogger.error("llm_error", `LLM structured generation error in ${this.name}: ${error.message}`, error);
      return null;
    }
  }
  
  /**
   * Extract text from a message object
   */
  protected extractTextFromMessage(message?: Message): string {
    if (!message?.parts || message.parts.length === 0) {
      return "";
    }
    
    const textParts = message.parts.filter(part => part.type === 'text') as TextPart[];
    if (textParts.length === 0) {
      return "";
    }
    
    return textParts.map(part => part.text).join("\n");
  }
  
  /**
   * Create a new text artifact
   */
  protected createTextArtifact(
    text: string,
    name?: string,
    description?: string
  ): Artifact {
    return {
      id: uuidv4(),
      type: "file",
      mimeType: "text/plain",
      name: name || `${this.name.toLowerCase()}-artifact`,
      description: description,
      data: text,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Create a JSON data artifact
   */
  protected createDataArtifact(
    data: any,
    name?: string,
    description?: string
  ): Artifact {
    return {
      id: uuidv4(),
      type: "data",
      mimeType: "application/json",
      name: name || `${this.name.toLowerCase()}-data`,
      description: description,
      data: data,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Create a message with multiple parts
   */
  protected createMessageWithParts(parts: Part[]): Message {
    return {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      parts
    };
  }

  /**
   * Get the name of the agent
   */
  public getName(): string {
    return this.name;
  }
} 