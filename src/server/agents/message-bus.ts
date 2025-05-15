// src/server/agents/message-bus.ts

import type { AgentMessage } from "./base-agent"; // Using the internal AgentMessage type
import type { BaseAgent } from "./base-agent";
import { db } from "~/server/db";
import { agentMessages } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { StructuredAgentMessage, SSEEvent } from "~/types/a2a";
import { Subject } from "rxjs";
import crypto from "crypto";

export class MessageBus {
  private static instance: MessageBus;
  private agents: Map<string, BaseAgent> = new Map();
  // For direct subscriptions to messages for a specific agent (e.g., for logging or specific flows)
  private agentSubscribers: Map<string, ((message: AgentMessage) => Promise<void>)[]> = new Map();

  private constructor() {}

  public static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
    }
    return MessageBus.instance;
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.name.toLowerCase(), agent);
    this.agentSubscribers.set(agent.name.toLowerCase(), []);
    console.log(`MessageBus: Registered agent: ${agent.name}`);
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

    console.log(`MessageBus: Published message ${message.id} from ${message.sender} to ${message.recipient} (Type: ${message.type})`);

    // SSE updates are primarily handled by TaskManager based on state changes.
    // The direct SSE emission block related to a 'progress' variable that was previously here has been removed.
    // Agents should call taskManager.updateTaskState which handles SSE emissions for task status changes.

    const recipientAgent = this.agents.get(message.recipient.toLowerCase());

    if (recipientAgent) {
      try {
        const responseMessage = await recipientAgent.processMessage(message);
        
        await db.update(agentMessages)
          .set({ status: "processed", processedAt: new Date() })
          .where(eq(agentMessages.id, message.id));

        if (responseMessage) {
          const newResponseMessage = {
            ...responseMessage,
            id: crypto.randomUUID(), 
            correlationId: message.id, 
          };
          await this.publish(newResponseMessage);
        }
      } catch (error) {
        console.error(`MessageBus: Error processing message ${message.id} by ${recipientAgent.name}:`, error);
        await db.update(agentMessages)
          .set({ status: "failed", processedAt: new Date(), payload: { ...(message.payload as object), error: String(error) } })
          .where(eq(agentMessages.id, message.id));
      }
    } else {
      console.warn(`MessageBus: No agent registered for recipient: ${message.recipient}. Message ID: ${message.id}`);
      await db.update(agentMessages)
        .set({ status: "failed", processedAt: new Date(), payload: { ...(message.payload as object), error: `Recipient not found: ${message.recipient}` } })
        .where(eq(agentMessages.id, message.id));
    }

    // Notify any direct subscribers for this agent (e.g., for logging or other side effects)
    const subscribers = this.agentSubscribers.get(message.recipient.toLowerCase());
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          await callback(message);
        } catch (subError) {
          console.error(`MessageBus: Error in subscriber for ${message.recipient}:`, subError);
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
    
    return () => {
      const currentSubs = this.agentSubscribers.get(normalizedAgentName) || [];
      this.agentSubscribers.set(normalizedAgentName, currentSubs.filter(cb => cb !== callback));
    };
  }
  
  // SSE Stream Management - delegates to TaskManager
  // The MessageBus itself doesn't manage SSE streams directly but provides access to TaskManager's streaming capabilities if needed
  // or agents can call TaskManager directly.

  /**
   * Creates or retrieves an SSE stream for a specific task.
   * This now directly uses the TaskManager's capability.
   */
  public getTaskStream(taskId: string): Subject<SSEEvent> {
    return taskManager.createTaskStream(taskId);
  }

  /**
   * Emits an event to a specific task's SSE stream.
   * This is a utility that might be used by agents if they need to push updates directly.
   * Typically, TaskManager handles SSE emissions based on state changes.
   */
  public emitToTaskStream(taskId: string, event: SSEEvent): void {
    const stream = taskManager.createTaskStream(taskId); // Ensures stream exists
    stream.next(event);
    // Note: Closing the stream should be handled by the TaskManager when a task reaches a terminal state.
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