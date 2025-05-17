// src/server/agents/ui-agent.ts
import { BaseAgent, type AgentMessage } from "./base-agent";
import type { TaskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, Artifact, TaskState, AgentSkill } from "~/types/a2a";
import { createTextMessage, createStatusUpdateEvent, createArtifactUpdateEvent } from "~/types/a2a";
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { a2aLogger } from "~/lib/logger";
import { env } from "~/env";
import { MessageBus } from "./message-bus";

export class UIAgent extends BaseAgent {
  constructor(taskManager: TaskManager) {
    super("UIAgent", taskManager, "Handles UI notifications for A2A tasks via SSE.", true);
    
    // Register this agent with the Message Bus
    if (env.USE_MESSAGE_BUS) {
      this.bus.registerAgent(this);
      a2aLogger.info('ui_agent', `UIAgent registered with MessageBus`);
    }
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId || payload.componentJobId;

    if (!taskId) {
      a2aLogger.error('ui_agent', `Missing taskId in message payload`, { payload });
      await this.logAgentMessage(message);
      return null;
    }

    try {
      await this.logAgentMessage(message, true);
      a2aLogger.debug('ui_agent', `Processing ${type} message for task ${taskId}`, { correlationId });

      // Fetch the latest task details to ensure we have all info for the SSE event
      const taskStatus = await this.taskManager.getTaskStatus(taskId);

      switch (type) {
        case "TASK_COMPLETED_NOTIFICATION":
          // Task is fully complete. TaskManager has already updated the state.
          // UIAgent's role here is to ensure an SSE event is emitted if not already handled by TaskManager's stream.
          if (taskStatus.state === 'completed') {
            a2aLogger.info('ui_agent', `Sending completion SSE for task ${taskId}`, { state: taskStatus.state });
            const sseEvent = createStatusUpdateEvent(taskStatus);
            const taskStream = this.taskManager.createTaskStream(taskId);
            taskStream.next(sseEvent);
            taskStream.complete(); 

            // If Message Bus is enabled, send a confirmation back to the coordinator
            if (env.USE_MESSAGE_BUS) {
              const confirmationMessage = this.createA2AMessage(
                "UI_NOTIFICATION_DELIVERED",
                taskId,
                message.sender,
                this.createSimpleTextMessage(`Task completion notification delivered for ${taskId}`),
                undefined,
                correlationId,
                { success: true, notificationType: "completion" }
              );
              await this.bus.publish(confirmationMessage);
              return null;
            }
          } else {
            a2aLogger.warn('ui_agent', `Received TASK_COMPLETED_NOTIFICATION for task ${taskId} but state is ${taskStatus.state}`);
          }
          break;

        case "TASK_FAILED_NOTIFICATION":
          if (taskStatus.state === 'failed') {
            a2aLogger.info('ui_agent', `Sending failure SSE for task ${taskId}`, { state: taskStatus.state });
            const sseEvent = createStatusUpdateEvent(taskStatus);
            const taskStream = this.taskManager.createTaskStream(taskId);
            taskStream.next(sseEvent);
            taskStream.complete();

            // If Message Bus is enabled, send a confirmation back to the coordinator
            if (env.USE_MESSAGE_BUS) {
              const confirmationMessage = this.createA2AMessage(
                "UI_NOTIFICATION_DELIVERED",
                taskId,
                message.sender,
                this.createSimpleTextMessage(`Task failure notification delivered for ${taskId}`),
                undefined,
                correlationId,
                { success: true, notificationType: "failure" }
              );
              await this.bus.publish(confirmationMessage);
              return null;
            }
          } else {
            a2aLogger.warn('ui_agent', `Received TASK_FAILED_NOTIFICATION for task ${taskId} but state is ${taskStatus.state}`);
          }
          break;
        
        case "TASK_PROGRESS_UPDATE":
          // Handle progress updates by sending an SSE but not completing the stream
          a2aLogger.info('ui_agent', `Sending progress update SSE for task ${taskId}`, { progress: payload.progress });
          const progressEvent = createStatusUpdateEvent({
            ...taskStatus,
            progress: payload.progress || taskStatus.progress
          });
          const progressStream = this.taskManager.createTaskStream(taskId);
          progressStream.next(progressEvent);
          
          if (env.USE_MESSAGE_BUS) {
            const confirmationMessage = this.createA2AMessage(
              "UI_NOTIFICATION_DELIVERED",
              taskId,
              message.sender,
              this.createSimpleTextMessage(`Progress update notification delivered for ${taskId}`),
              undefined,
              correlationId,
              { success: true, notificationType: "progress" }
            );
            await this.bus.publish(confirmationMessage);
            return null;
          }
          break;

        default:
          a2aLogger.warn('ui_agent', `Received unhandled message type: ${type}`, { taskId });
          return null;
      }
    } catch (error) {
      a2aLogger.error('ui_agent', `Error processing ${type} message: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined, { taskId, correlationId });
      
      // If Message Bus is enabled, send an error notification back to the sender
      if (env.USE_MESSAGE_BUS) {
        const errorMessage = this.createA2AMessage(
          "UI_NOTIFICATION_FAILED",
          taskId,
          message.sender,
          this.createSimpleTextMessage(`Failed to deliver notification: ${error instanceof Error ? error.message : String(error)}`),
          undefined,
          correlationId,
          { success: false, error: error instanceof Error ? error.message : String(error) }
        );
        await this.bus.publish(errorMessage);
      }
      
      await this.logAgentMessage(message, false); // Log original message as pending due to error
    }
    
    return null; // UIAgent typically doesn't send messages back when not using Message Bus
  }

  getAgentCard() {
    const card = super.getAgentCard();
    const uiSkills: AgentSkill[] = [
      {
        id: "notify-ui-task-status",
        name: "Notify UI of Task Status",
        description: "Receives final task status updates (completed, failed) and ensures UI is notified via SSE.",
        inputModes: ["data"], // Expects task ID and status payload
        outputModes: [],       // Does not directly output to other agents, triggers SSE
      }
    ];
    card.skills = uiSkills;
    card.capabilities.streaming = true; // Confirms it interacts with SSE streams
    return card;
  }
} 