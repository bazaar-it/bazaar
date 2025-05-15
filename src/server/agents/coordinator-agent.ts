import { BaseAgent } from "./base-agent";
import type { AgentMessage } from "./base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, Artifact, TaskState, AgentSkill } from "~/types/a2a";
import { createTextMessage } from "~/types/a2a";

export class CoordinatorAgent extends BaseAgent {
  constructor() {
    super("CoordinatorAgent", "Orchestrates the component generation pipeline using A2A protocol");
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId || payload.componentJobId;

    try {
      switch (type) {
        case "CREATE_COMPONENT_REQUEST":
          const { animationDesignBrief, projectId } = payload;
          const task = await taskManager.createTask(projectId, {
            effect: animationDesignBrief.sceneName || "Custom Component",
            animationDesignBrief,
          });

          await this.logAgentMessage(message, true);

          await this.updateTaskState(task.id, 'working', 
            this.createSimpleTextMessage("Component generation request received, forwarding to BuilderAgent.")
          );

          return this.createA2AMessage(
            "BUILD_COMPONENT_REQUEST",
            task.id,
            "BuilderAgent",
            this.createSimpleTextMessage("Request to build component from Animation Design Brief."),
            undefined,
            correlationId
          );

        case "COMPONENT_PROCESS_ERROR":
        case "COMPONENT_FIX_ERROR":
        case "R2_STORAGE_ERROR":
        case "ADB_GENERATION_ERROR":
          if (!taskId) {
            console.error("Error: Missing taskId in error message payload", payload);
            await this.logAgentMessage(message);
            return null;
          }
          const errorMessage = payload.error || "Unknown error occurred";
          await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(errorMessage));
          await this.logAgentMessage(message, true);

          return this.createA2AMessage(
            "TASK_FAILED_NOTIFICATION",
            taskId,
            "UIAgent",
            this.createSimpleTextMessage(`Task failed: ${errorMessage}`),
            undefined,
            correlationId
          );
        
        case "COMPONENT_BUILD_SUCCESS":
          if (!taskId) {
            console.error("Error: Missing taskId in COMPONENT_BUILD_SUCCESS payload", payload);
            await this.logAgentMessage(message);
            return null;
          }
          await this.logAgentMessage(message, true);
          return this.createA2AMessage(
            "STORE_COMPONENT_REQUEST",
            taskId,
            "R2StorageAgent",
            this.createSimpleTextMessage("Request to store built component."),
            payload.artifacts as Artifact[] | undefined,
            correlationId
          );

        case "COMPONENT_STORED_SUCCESS":
          if (!taskId) {
            console.error("Error: Missing taskId in COMPONENT_STORED_SUCCESS payload", payload);
            await this.logAgentMessage(message);
            return null;
          }
          const artifactsToNotify = payload.artifacts as Artifact[] | undefined;
          await this.updateTaskState(taskId, 'completed', 
            this.createSimpleTextMessage("Component stored successfully.")
          );
          await this.logAgentMessage(message, true);

          return this.createA2AMessage(
            "TASK_COMPLETED_NOTIFICATION",
            taskId,
            "UIAgent",
            this.createSimpleTextMessage("Component generation completed successfully."),
            artifactsToNotify,
            correlationId
          );

        default:
          console.warn(`CoordinatorAgent received unhandled message type: ${type}, payload: ${JSON.stringify(payload)}`);
          await this.logAgentMessage(message);
          return null;
      }
    } catch (error: any) {
      console.error(`Error processing message in CoordinatorAgent (type: ${type}): ${error.message}`, { payload, error });
      if (taskId) {
        try {
          await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(`Coordinator internal error: ${error.message}`));
        } catch (updateError) {
            console.error(`Failed to update task state to failed after another error: ${updateError}`);
        }
      }
      await this.logAgentMessage(message, false);
      return null;
    }
  }

  getAgentCard() {
    const card = super.getAgentCard();
    const coordinatorSkills: AgentSkill[] = [
      {
        id: "orchestrate-component-generation",
        name: "Orchestrate Component Generation",
        description: "Manages the end-to-end lifecycle of custom video component creation, coordinating Builder, ErrorFixer, and Storage agents.",
        inputModes: ["data"],
        outputModes: ["text"],
      }
    ];
    card.skills = coordinatorSkills;
    return card;
  }
} 