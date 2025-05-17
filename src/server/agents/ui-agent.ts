// src/server/agents/ui-agent.ts
import { BaseAgent, type AgentMessage } from "./base-agent";
import type { TaskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, Artifact, TaskState, AgentSkill } from "~/types/a2a";
import { createTextMessage, createStatusUpdateEvent, createArtifactUpdateEvent } from "~/types/a2a";
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export class UIAgent extends BaseAgent {
  constructor(taskManager: TaskManager) {
    super("UIAgent", taskManager, "Handles UI notifications for A2A tasks via SSE.", true);
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId || payload.componentJobId;

    if (!taskId) {
      console.error("UIAgent Error: Missing taskId in message payload", payload);
      await this.logAgentMessage(message);
      return null;
    }

    try {
      await this.logAgentMessage(message, true);

      // Fetch the latest task details to ensure we have all info for the SSE event
      const taskStatus = await this.taskManager.getTaskStatus(taskId);

      switch (type) {
        case "TASK_COMPLETED_NOTIFICATION":
          // Task is fully complete. TaskManager has already updated the state.
          // UIAgent's role here is to ensure an SSE event is emitted if not already handled by TaskManager's stream.
          // This also handles the case where UIAgent is directly notified.
          if (taskStatus.state === 'completed') {
            const sseEvent = createStatusUpdateEvent(taskStatus);
            const taskStream = this.taskManager.createTaskStream(taskId);
            taskStream.next(sseEvent);
            // If this is the final notification, complete the stream.
            taskStream.complete(); 
          } else {
            // If task isn't actually completed, log a warning. State should be handled by TaskManager.
            console.warn(`UIAgent received TASK_COMPLETED_NOTIFICATION for task ${taskId} but its state is ${taskStatus.state}`);
          }
          break;

        case "TASK_FAILED_NOTIFICATION":
          if (taskStatus.state === 'failed') {
            const sseEvent = createStatusUpdateEvent(taskStatus);
            const taskStream = this.taskManager.createTaskStream(taskId);
            taskStream.next(sseEvent);
            taskStream.complete();
          } else {
            console.warn(`UIAgent received TASK_FAILED_NOTIFICATION for task ${taskId} but its state is ${taskStatus.state}`);
          }
          break;
        
        // Potentially handle other UI-specific notifications if needed

        default:
          console.warn(`UIAgent received unhandled message type: ${type}, payload: ${JSON.stringify(payload)}`);
          return null;
      }
    } catch (error: any) {
      console.error(`Error processing message in UIAgent (type: ${type}): ${error.message}`, { payload, error });
      // UIAgent typically doesn't change task state, but logs errors.
      // If a critical error happens in UIAgent itself, it might need to notify an admin or a master coordinator.
      await this.logAgentMessage(message, false); // Log original message as pending due to error in processing
    }
    return null; // UIAgent typically doesn't send messages back into the agent flow
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