import { BaseAgent, type AgentMessage } from "./base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, Artifact, TaskState, AgentSkill, ComponentJobStatus, AnimationBriefGenerationParams } from "~/types/a2a";
import { createTextMessage, createFileArtifact, mapA2AToInternalState } from "~/types/a2a";
import { generateAnimationDesignBrief } from "~/server/services/animationDesigner.service";
import { db } from "~/server/db";
import { animationDesignBriefs, customComponentJobs } from "~/server/db/schema"; // Assuming animationDesignBriefs schema exists
import { eq } from "drizzle-orm";
import crypto from "crypto";

export class ADBAgent extends BaseAgent {
  constructor() {
    super("ADBAgent", "Handles Animation Design Brief (ADB) generation and management.");
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, id: correlationId } = message;
    // For GENERATE_DESIGN_BRIEF, taskId might not exist yet if ADBAgent is the entry point.
    // We will use componentJobId from payload if it exists, otherwise TaskManager will create one.
    let taskId = payload.taskId || payload.componentJobId;
 
    try {
      switch (type) {
        case "GENERATE_DESIGN_BRIEF_REQUEST": // Renamed for clarity from external source
          const { 
            description, // This is likely the scenePurpose or part of sceneElementsDescription
            projectId, 
            sceneId, 
            duration, 
            dimensions, 
            componentJobId: existingJobId,
            sceneElementsDescription, // If provided separately
            currentVideoContext,
            targetAudience,
            brandGuidelines
          } = payload;

          // If a componentJobId (our internal ID for the customComponentJobs table) is provided,
          // use it as the taskId for A2A tracking. Otherwise, TaskManager will generate a new one.
          taskId = existingJobId || crypto.randomUUID(); 

          await this.logAgentMessage(message, true);
          await this.updateTaskState(taskId, 'working', 
            this.createSimpleTextMessage("Generating Animation Design Brief..."), 
            existingJobId ? mapA2AToInternalState('working') : 'pending' // If job exists, it becomes working, else it's pending until full task created by Coordinator
          );

          // Prepare params for generateAnimationDesignBrief
          const adbParams: AnimationBriefGenerationParams = {
            projectId,
            sceneId,
            scenePurpose: description, // Mapping description to scenePurpose
            sceneElementsDescription: sceneElementsDescription || "", // Use if provided, else empty
            desiredDurationInFrames: duration || 90, // Default to 3 seconds (90 frames @ 30fps)
            dimensions: dimensions || { width: 1920, height: 1080 },
            componentJobId: taskId, // Link ADB to this task/job
            currentVideoContext,
            targetAudience,
            brandGuidelines
          };

          const { brief, briefId } = await generateAnimationDesignBrief(adbParams);

          // Store the ADB in its own table if schema exists
          // For now, we'll assume the brief is an artifact of this task step
          const adbArtifact: Artifact = {
            id: briefId || crypto.randomUUID(),
            type: "data",
            mimeType: "application/json",
            data: brief,
            description: "Animation Design Brief",
            createdAt: new Date().toISOString(),
            name: `adb-${taskId}.json`
          };

          await this.addTaskArtifact(taskId, adbArtifact);
          await this.updateTaskState(taskId, 'completed', // This specific ADB generation task is complete
            this.createSimpleTextMessage("Animation Design Brief generated successfully."),
            existingJobId ? mapA2AToInternalState('completed') : 'pending' 
          );

          // Send brief to CoordinatorAgent to start the component generation process
          return this.createA2AMessage(
            "CREATE_COMPONENT_REQUEST",
            taskId, // Use the same taskId for the overarching component generation task
            "CoordinatorAgent",
            this.createSimpleTextMessage("Request to create component from generated ADB."),
            [adbArtifact],
            correlationId
          );

        default:
          console.warn(`ADBAgent received unhandled message type: ${type}, payload: ${JSON.stringify(payload)}`);
          await this.logAgentMessage(message);
          return null;
      }
    } catch (error: any) {
      console.error(`Error processing message in ADBAgent (type: ${type}): ${error.message}`, { payload, error });
      if (taskId) {
        await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(`ADBAgent error: ${error.message}`), 'failed');
      }
      await this.logAgentMessage(message, false);
      // Notify Coordinator about the failure if a task was involved
      if (taskId) {
        return this.createA2AMessage("ADB_GENERATION_ERROR", taskId, "CoordinatorAgent", this.createSimpleTextMessage(`ADBAgent error: ${error.message}`), undefined, correlationId);
      }
      return null;
    }
  }

  getAgentCard() {
    const card = super.getAgentCard();
    const adbSkills: AgentSkill[] = [
      {
        id: "generate-animation-design-brief",
        name: "Generate Animation Design Brief",
        description: "Creates a structured Animation Design Brief from a natural language description and scene parameters.",
        inputModes: ["data"], // Expects description, projectId, sceneId, etc.
        outputModes: ["data"], // Outputs the structured ADB as a data artifact
      }
    ];
    card.skills = adbSkills;
    return card;
  }
} 