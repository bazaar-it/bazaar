// @ts-nocheck
// src/server/agents/message-bus.ts

import type { AgentMessage } from "./base-agent"; // Using the internal AgentMessage type
import type { BaseAgent } from "./base-agent";
import { db } from "~/server/db";
import { agentMessages } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { StructuredAgentMessage, SSEEvent as ClientSSEEvent } from "~/types/a2a";
import { SSEEventType, type SSEEvent as InternalSSEEvent, type AgentCommunicationEvent } from "~/server/services/a2a/sseManager.service";
import { v4 as uuidv4 } from "uuid";
import { type Subject } from "rxjs";
import crypto from "crypto";
import { a2aLogger } from "~/lib/logger"; // Import a2aLogger

export class MessageBus {
  private static instance: MessageBus;
  private agents = new Map<string, BaseAgent>();
  // For direct subscriptions to messages for a specific agent (e.g., for logging or specific flows)
  private agentSubscribers = new Map<string, ((message: AgentMessage) => Promise<void>)[]>();
  // Dead Letter Queue for messages that repeatedly fail processing
  private deadLetterQueue: AgentMessage[] = [];

  private constructor() {}

  public static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
    }
    return MessageBus.instance;
  }

  registerAgent(agent: BaseAgent): void {
    const agentNameLower = agent.getName().toLowerCase();
    this.agents.set(agentNameLower, agent);
    this.agentSubscribers.set(agentNameLower, []); // Initialize subscribers for this agent
    a2aLogger.info(null, `MessageBus: Registered agent`, { 
      agentName: agent.getName(),
      lowercaseName: agentNameLower,
      module: "message_bus_registration"
    });
  }

  /**
   * Retrieve the current Dead Letter Queue contents
   */
  getDeadLetterQueue(): AgentMessage[] {
    return this.deadLetterQueue;
  }

  /**
   * Attempt to reprocess all messages in the Dead Letter Queue
   */
  async retryDeadLetterQueue(): Promise<void> {
    const messages = [...this.deadLetterQueue];
    this.deadLetterQueue = [];
    for (const msg of messages) {
      await this.publish(msg);
    }
  }

  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name.toLowerCase());
  }

  async publish(message: AgentMessage): Promise<void> {
    // Log the message to the database first
    await db.insert(agentMessages).values({
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      type: message.type,
      payload: message.payload as any, 
      correlationId: message.correlationId,
      status: "pending",
      createdAt: new Date(),
    });

    const taskId = (message.payload as any)?.taskId || (message.payload as any)?.componentJobId || "N/A";
    a2aLogger.info(taskId, `MessageBus: Publishing message`, { 
      messageId: message.id,
      type: message.type,
      sender: message.sender,
      recipient: message.recipient,
      status: "published_to_bus_and_db",
      module: "message_bus_publish"
    });
    
    // Emit agent communication as an SSE event for UI visualization
    if (taskId !== "N/A") {
      try {
        // Publish agent communication event for UI visualization
        this.publishAgentCommunication(taskId, {
          from: message.sender,
          to: message.recipient,
          messageType: message.type,
          payload: message.payload
        });
      } catch (err) {
        a2aLogger.warn(taskId, `Failed to emit agent communication event: ${err}`);
      }
    }

    // SSE updates are primarily handled by TaskManager based on state changes.
    // The direct SSE emission block related to a 'progress' variable that was previously here has been removed.
    // Agents should call taskManager.updateTaskState which handles SSE emissions for task status changes.

    const recipientAgentNameLower = message.recipient.toLowerCase();
    const recipientAgent = this.agents.get(recipientAgentNameLower);

    if (recipientAgent) {
      try {
        const responseMessage = await recipientAgent.processMessage(message);
        
        await db.update(agentMessages)
          .set({ status: "processed", processedAt: new Date() })
          .where(eq(agentMessages.id, message.id));
        a2aLogger.messageBusDelivery(message.id, message.recipient, taskId, { status: "processed_by_agent", agentName: recipientAgent.getName() });

        if (responseMessage) {
          const newResponseMessage = {
            ...responseMessage,
            id: crypto.randomUUID(), 
            correlationId: message.id, 
          };
          await this.publish(newResponseMessage);
        }
      } catch (error: any) {
        a2aLogger.error(taskId, `MessageBus: Error processing message by agent.`, {
          messageId: message.id,
          recipientAgentName: recipientAgent.getName(),
          recipientAgentNameLower,
          errorMessage: error.message,
          errorStack: error.stack,
          module: "message_bus_processing_error"
        });
        await db.update(agentMessages)
          .set({ status: "failed", processedAt: new Date(), payload: { ...(message.payload as object), error: String(error) } })
          .where(eq(agentMessages.id, message.id));
        this.deadLetterQueue.push(message);
      }
    } else {
      a2aLogger.warn(taskId, `MessageBus: No agent registered for recipient.`, {
        messageId: message.id, 
        recipient: message.recipient,
        recipientLowercase: recipientAgentNameLower,
        availableAgents: Array.from(this.agents.keys()),
        module: "message_bus_recipient_not_found"
      });
      await db.update(agentMessages)
        .set({ status: "failed", processedAt: new Date(), payload: { ...(message.payload as object), error: `Recipient not found: ${message.recipient}` } })
        .where(eq(agentMessages.id, message.id));
      this.deadLetterQueue.push(message);
    }

    // Notify any direct subscribers for this agent (e.g., for logging or other side effects)
    const subscribers = this.agentSubscribers.get(recipientAgentNameLower);
    if (subscribers) {
      a2aLogger.info(taskId, `MessageBus: Notifying ${subscribers.length} direct subscribers for agent`, { 
        agentName: message.recipient, 
        module: "message_bus_notify_subscribers"
      });
      for (const callback of subscribers) {
        try {
          await callback(message);
        } catch (subError: any) {
          a2aLogger.error(taskId, `MessageBus: Error in subscriber for agent.`, { 
            agentName: message.recipient, 
            errorMessage: subError.message, 
            module: "message_bus_subscriber_error"
          });
        }
      }
    }
  }
  
  /**
   * Allow external systems to subscribe to messages for a specific agent.
   * Useful for logging, monitoring, or triggering external workflows based on agent activity.
   */
  subscribeToAgentMessages(agentName: string, callback: (message: AgentMessage) => Promise<void>): () => void {
    const normalizedAgentName = agentName.toLowerCase();
    const subs = this.agentSubscribers.get(normalizedAgentName) || [];
    subs.push(callback);
    this.agentSubscribers.set(normalizedAgentName, subs);
    a2aLogger.info(null, `MessageBus: New direct subscription added for agent messages.`, { 
      agentName: agentName,
      normalizedAgentName: normalizedAgentName,
      subscriberCount: subs.length,
      module: "message_bus_subscription"
    });
    
    return () => {
      const currentSubs = this.agentSubscribers.get(normalizedAgentName) || [];
      this.agentSubscribers.set(normalizedAgentName, currentSubs.filter(cb => cb !== callback));
      a2aLogger.info(null, `MessageBus: Subscription removed for agent messages.`, { 
        agentName: agentName,
        normalizedAgentName: normalizedAgentName,
        remainingSubscribers: currentSubs.filter(cb => cb !== callback).length,
        module: "message_bus_unsubscription"
      });
    };
  }
  
  // SSE Stream Management - delegates to TaskManager
  // The MessageBus itself doesn't manage SSE streams directly but provides access to TaskManager's streaming capabilities if needed
  // or agents can call TaskManager directly.

  /**
   * Creates or retrieves an SSE stream for a specific task.
   * This now directly uses the TaskManager's capability.
   */
  public getTaskStream(taskId: string): Subject<ClientSSEEvent> {
    return taskManager.createTaskStream(taskId);
  }

  /**
   * Emits an event to a specific task's SSE stream.
   * This is a utility that might be used by agents if they need to push updates directly.
   * Typically, TaskManager handles SSE emissions based on state changes.
   */
  public emitToTaskStream(taskId: string, event: InternalSSEEvent): void {
    // Convert internal event to client-compatible event format
    const clientEvent = this.convertToClientEvent(event);
    
    // Get the task stream
    const stream = taskManager.createTaskStream(taskId); // Ensures stream exists
    
    // Send the event
    stream.next(clientEvent);
    // Note: Closing the stream should be handled by the TaskManager when a task reaches a terminal state.
  }
  
  /**
   * Convert internal SSE event to client-compatible format
   */
  private convertToClientEvent(internalEvent: InternalSSEEvent): ClientSSEEvent {
    // Generate an ID for the event
    const id = uuidv4();
    
    // Determine event type based on the internal event type
    let eventType = 'message';
    switch (internalEvent.type) {
      case SSEEventType.TaskStatusUpdate:
        eventType = 'task_status_update';
        break;
      case SSEEventType.TaskArtifactUpdate:
        eventType = 'task_artifact_update';
        break;
      case SSEEventType.AgentCommunication:
        eventType = 'agent_communication';
        break;
      case SSEEventType.Error:
        eventType = 'error';
        break;
      case SSEEventType.Heartbeat:
        eventType = 'heartbeat';
        break;
    }
    
    // Create the client-compatible event
    return {
      id,
      event: eventType,
      data: JSON.stringify(internalEvent)
    };
  }
  
  /**
   * Publish an agent communication event for message passing visualization
   * @param taskId Task ID
   * @param data Communication details including sender, recipient, etc.
   */
  public publishAgentCommunication(taskId: string, data: {
    from: string;
    to: string;
    messageType: string;
    payload?: any;
  }): void {
    // Create event
    const event: AgentCommunicationEvent = {
      type: SSEEventType.AgentCommunication,
      timestamp: new Date().toISOString(),
      data: {
        from: data.from,
        to: data.to,
        messageType: data.messageType,
        timestamp: new Date().toISOString(),
        taskId: taskId,
        payload: data.payload
      }
    };
    
    // Send to subscribers
    this.emitToTaskStream(taskId, event);
    
    // Log the communication
    a2aLogger.debug(
      "agent_communication",
      `[AGENT_MSG] ${data.from} → ${data.to}: ${data.messageType}`,
      { taskId, messageType: data.messageType }
    );
  }

  // Cleanup method if needed, e.g., on server shutdown
  cleanup(): void {
    // TaskManager should handle its own stream cleanup (e.g., on task completion or error)
    // MessageBus only needs to clear its direct agent subscribers.
    this.agentSubscribers.clear();
    console.log("MessageBus: Cleaned up direct agent message subscribers.");
  }
}

export const messageBus = MessageBus.getInstance(); 

// Add global monitoring subscription for all agent messages
messageBus.subscribeToAgentMessages('*', async (message) => {
  a2aLogger.debug(
    'message_bus', 
    `[A2A:BUS] ${message.sender} → ${message.recipient}: ${message.type}`,
    { 
      messageId: message.id,
      taskId: message.payload?.taskId,
      type: message.type
    }
  );
});

// Add specific monitoring for error messages
const errorTypes = [
  'SCENE_PLAN_ERROR',
  'COMPONENT_GENERATION_FAILED',
  'COMPONENT_FIX_ERROR',
  'COMPONENT_STORAGE_FAILED',
  'ADB_GENERATION_ERROR',
  'R2_STORAGE_ERROR',
  'COMPONENT_PROCESS_ERROR' // Added this based on its usage
];

messageBus.subscribeToAgentMessages('CoordinatorAgent', async (message) => {
  if (errorTypes.includes(message.type)) {
    // Track error messages specifically
    a2aLogger.error(
      'error_tracking',
      `[ERROR TRACKING] ${message.type} from ${message.sender}`,
      null,
      {
        messageId: message.id,
        taskId: message.payload?.taskId,
        errorDetails: message.payload?.error,
        timestamp: new Date().toISOString()
      }
    );
  }
});

// Performance monitoring for high-latency message flows
const processingTimes = new Map<string, {start: number, type: string}>();

// Track when messages are sent to agents that typically have high latency
messageBus.subscribeToAgentMessages('ScenePlannerAgent', async (message) => {
  if (message.type === 'CREATE_SCENE_PLAN_REQUEST') {
    processingTimes.set(message.id, {start: Date.now(), type: message.type});
  }
});

messageBus.subscribeToAgentMessages('BuilderAgent', async (message) => {
  if (message.type === 'GENERATE_COMPONENT_REQUEST') {
    processingTimes.set(message.id, {start: Date.now(), type: message.type});
  }
});

// Track completions to measure latency
messageBus.subscribeToAgentMessages('*', async (message) => {
  if (message.correlationId && processingTimes.has(message.correlationId)) {
    const startData = processingTimes.get(message.correlationId);
    if (startData) {
      const processingTime = Date.now() - startData.start;
      a2aLogger.info(
        'performance_metrics',
        `[PERF] ${startData.type} → ${message.type} took ${processingTime}ms`,
        {
          messageId: message.id,
          correlationId: message.correlationId,
          processingTimeMs: processingTime,
          sourceType: startData.type,
          responseType: message.type
        }
      );
      // Clean up tracked message
      processingTimes.delete(message.correlationId);
    }
  }
});

// Periodically clean up old processing time entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  processingTimes.forEach((data, id) => {
    if (now - data.start > oneHourMs) {
      processingTimes.delete(id);
      a2aLogger.warn('performance_metrics', `[PERF] Message ${id} of type ${data.type} has been processing for >1 hour - tracking removed`);
    }
  });
}, 15 * 60 * 1000); // Clean up every 15 minutes