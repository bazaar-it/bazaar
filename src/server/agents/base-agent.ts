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
import { TaskManager } from '../services/a2a/taskManager.service'; 
import { a2aLogger } from '~/lib/logger'; 
import { OpenAI } from 'openai';

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
  protected modelName: string = 'gpt-4o-mini';
  protected temperature: number = 0.7;

  /**
   * Central MessageBus accessor for all agents.  Having a getter avoids each
   * agent file importing the bus directly and makes it easy to replace the
   * implementation (e.g. swap EventEmitter for Redis) without changing agent
   * code.
   */
  protected get bus() {
    // Lazy-load to break circular-import issues.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("./message-bus").messageBus as typeof import("./message-bus").messageBus;
  }
  
  constructor(name: string, taskManager: TaskManager, description?: string, useOpenAI: boolean = false) {
    this.name = name;
    this.taskManager = taskManager;
    this.description = description || `${name} Agent`;
    
    // Initialize OpenAI if needed
    if (useOpenAI) {
      console.log(`${name}: Trying to initialize OpenAI. API Key available: ${Boolean(process.env.OPENAI_API_KEY)}`);
      
      if (process.env.OPENAI_API_KEY) {
        try {
          this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
          console.log(`${name}: Successfully initialized OpenAI client`);
          a2aLogger.info("agent_init", `Agent ${this.name} initialized with OpenAI integration.`);
        } catch (error) {
          console.error(`${name}: Error initializing OpenAI:`, error);
          a2aLogger.error("agent_init_error", `Error initializing OpenAI for ${this.name}: ${error instanceof Error ? error.message : String(error)}`);
          // Still allow the agent to initialize even without OpenAI
          this.openai = null;
        }
      } else {
        console.warn(`${name}: OpenAI requested but API key is missing`);
        a2aLogger.warn("agent_init_warning", `Agent ${this.name} requested OpenAI but API key is missing`);
        this.openai = null;
      }
    } else {
      a2aLogger.info("agent_init", `Agent ${this.name} initialized without OpenAI integration.`);
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
      a2aLogger.agentProcess(this.name, taskId, "updateTaskState", `Updating task to state: ${state}, internalStatus: ${internalStatus}`);

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
      a2aLogger.agentProcess(this.name, taskId, "addTaskArtifact", `Adding artifact: ${artifact.id}`);
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
    temperature: number = 0
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