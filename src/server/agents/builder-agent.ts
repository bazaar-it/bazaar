import { BaseAgent, type AgentMessage } from "./base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, Artifact, TaskState, AgentSkill, ComponentJobStatus } from "~/types/a2a";
import { createTextMessage, createFileArtifact, mapA2AToInternalState } from "~/types/a2a";
import { generateComponentCode } from "~/server/workers/generateComponentCode";
import { buildCustomComponent } from "~/server/workers/buildCustomComponent";
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export class BuilderAgent extends BaseAgent {
  constructor() {
    super("BuilderAgent", "Generates and builds Remotion components from Animation Design Briefs.");
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId || payload.componentJobId;

    if (!taskId) {
      console.error("BuilderAgent Error: Missing taskId in message payload", payload);
      await this.logAgentMessage(message); 
      return null;
    }

    try {
      switch (type) {
        case "BUILD_COMPONENT_REQUEST":
          const { animationDesignBrief, projectId } = payload;

          if (!animationDesignBrief || !projectId) {
            const errorMsg = "Missing animationDesignBrief or projectId in BUILD_COMPONENT_REQUEST.";
            console.error(`BuilderAgent Error: ${errorMsg}`, payload);
            await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(errorMsg), 'failed');
            await this.logAgentMessage(message, true);
            return this.createA2AMessage("COMPONENT_PROCESS_ERROR", taskId, "CoordinatorAgent", this.createSimpleTextMessage(errorMsg), undefined, correlationId);
          }

          await this.logAgentMessage(message, true);
          await this.updateTaskState(taskId, 'working', this.createSimpleTextMessage("Generating component code..."), 'generating');

          // Generate component code
          // generateComponentCode returns an object: { code: string, ..., valid?: boolean, error?: string, processedCode?: string }
          const generationResult = await generateComponentCode(taskId, animationDesignBrief.description, animationDesignBrief);
          const componentCode = generationResult.processedCode || generationResult.code; // Use processed code if fixes were applied

          await db.update(customComponentJobs)
            .set({ tsxCode: componentCode })
            .where(eq(customComponentJobs.id, taskId));

          if (!generationResult.valid && generationResult.error) {
            const syntaxErrorMsg = `Component syntax validation failed: ${generationResult.error}`;
            await this.updateTaskState(taskId, 'working', this.createSimpleTextMessage(syntaxErrorMsg), 'failed');
            // Create an artifact with the source code for the ErrorFixerAgent
            const sourceCodeArtifact = this.createSimpleFileArtifact(taskId + "-source.tsx", "", "text/tsx", "Original source code with syntax errors");
            // Ideally, the 'data' field of the artifact would contain the base64 of componentCode if not using a URL
            // For now, we assume ErrorFixerAgent can get it from DB or it's passed in payload of COMPONENT_SYNTAX_ERROR
            return this.createA2AMessage(
              "COMPONENT_SYNTAX_ERROR",
              taskId,
              "ErrorFixerAgent",
              this.createSimpleTextMessage(syntaxErrorMsg),
              [/* sourceCodeArtifact */], // Consider passing componentCode directly in payload if not too large
              correlationId
            );
          }

          await this.updateTaskState(taskId, 'working', this.createSimpleTextMessage("Building component..."), 'building');
          const buildSuccessful = await buildCustomComponent(taskId, false);

          if (buildSuccessful) {
            // Refetch job to get outputUrl as buildCustomComponent updates it internally
            const updatedJob = await db.query.customComponentJobs.findFirst({ where: eq(customComponentJobs.id, taskId) });
            const outputUrl = updatedJob?.outputUrl;

            if (outputUrl) {
              const buildSuccessMsg = "Component built successfully.";
              const builtArtifact = this.createSimpleFileArtifact(taskId + "-bundle.js", outputUrl, "application/javascript", "Built component bundle");
              await this.updateTaskState(taskId, 'working', this.createSimpleTextMessage(buildSuccessMsg), 'built');
              await this.addTaskArtifact(taskId, builtArtifact);
              
              return this.createA2AMessage(
                "COMPONENT_BUILD_SUCCESS", 
                taskId,
                "CoordinatorAgent", 
                this.createSimpleTextMessage(buildSuccessMsg),
                [builtArtifact],
                correlationId
              );
            } else {
              const buildErrorMsg = "Component build succeeded but outputUrl is missing.";
              await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(buildErrorMsg), 'failed');
              return this.createA2AMessage("COMPONENT_BUILD_ERROR", taskId, "ErrorFixerAgent", this.createSimpleTextMessage(buildErrorMsg), undefined, correlationId);
            }
          } else {
            // Refetch job to get errorMessage
            const failedJob = await db.query.customComponentJobs.findFirst({ where: eq(customComponentJobs.id, taskId) });
            const buildErrorMsg = `Component build failed: ${failedJob?.errorMessage || 'Unknown build error'}`;
            await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(buildErrorMsg), 'failed');
            return this.createA2AMessage("COMPONENT_BUILD_ERROR", taskId, "ErrorFixerAgent", this.createSimpleTextMessage(buildErrorMsg), undefined, correlationId);
          }

        case "REBUILD_COMPONENT_REQUEST": 
          const { fixedCode } = payload;
          if (!fixedCode) {
            const errorMsg = "Missing fixedCode in REBUILD_COMPONENT_REQUEST.";
            console.error(`BuilderAgent Error: ${errorMsg}`, payload);
            await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(errorMsg), 'failed');
            await this.logAgentMessage(message, true);
            return this.createA2AMessage("COMPONENT_PROCESS_ERROR", taskId, "CoordinatorAgent", this.createSimpleTextMessage(errorMsg), undefined, correlationId);
          }

          await this.logAgentMessage(message, true);
          await this.updateTaskState(taskId, 'working', this.createSimpleTextMessage("Rebuilding component with fixed code..."), 'building');

          await db.update(customComponentJobs)
            .set({ tsxCode: fixedCode })
            .where(eq(customComponentJobs.id, taskId));

          const rebuildSuccessful = await buildCustomComponent(taskId, false);

          if (rebuildSuccessful) {
            const updatedJob = await db.query.customComponentJobs.findFirst({ where: eq(customComponentJobs.id, taskId) });
            const outputUrl = updatedJob?.outputUrl;

            if (outputUrl) {
              const rebuildSuccessMsg = "Component rebuilt successfully.";
              const rebuiltArtifact = this.createSimpleFileArtifact(taskId + "-bundle.js", outputUrl, "application/javascript", "Rebuilt component bundle");
              await this.updateTaskState(taskId, 'working', this.createSimpleTextMessage(rebuildSuccessMsg), 'built');
              await this.addTaskArtifact(taskId, rebuiltArtifact);
              
              return this.createA2AMessage(
                "COMPONENT_BUILD_SUCCESS", 
                taskId,
                "CoordinatorAgent", 
                this.createSimpleTextMessage(rebuildSuccessMsg),
                [rebuiltArtifact],
                correlationId
              );
            } else {
                const rebuildErrorMsg = "Component rebuild succeeded but outputUrl is missing.";
                await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(rebuildErrorMsg), 'failed');
                return this.createA2AMessage("COMPONENT_BUILD_ERROR", taskId, "ErrorFixerAgent", this.createSimpleTextMessage(rebuildErrorMsg), undefined, correlationId);
            }
          } else {
            const failedJob = await db.query.customComponentJobs.findFirst({ where: eq(customComponentJobs.id, taskId) });
            const rebuildErrorMsg = `Component rebuild failed: ${failedJob?.errorMessage || 'Unknown build error'}`;
            await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(rebuildErrorMsg), 'failed');
            return this.createA2AMessage(
              "COMPONENT_BUILD_ERROR",
              taskId, 
              "CoordinatorAgent",
              this.createSimpleTextMessage(rebuildErrorMsg),
              undefined,
              correlationId
            );
          }

        default:
          console.warn(`BuilderAgent received unhandled message type: ${type}, payload: ${JSON.stringify(payload)}`);
          await this.logAgentMessage(message);
          return null;
      }
    } catch (error: any) {
      console.error(`Error processing message in BuilderAgent (type: ${type}): ${error.message}`, { payload, error });
      await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(`BuilderAgent internal error: ${error.message}`), 'failed');
      await this.logAgentMessage(message, false);
      return this.createA2AMessage("COMPONENT_PROCESS_ERROR", taskId, "CoordinatorAgent", this.createSimpleTextMessage(`BuilderAgent error: ${error.message}`), undefined, correlationId);
    }
  }

  getAgentCard() {
    const card = super.getAgentCard();
    const builderSkills: AgentSkill[] = [
      {
        id: "generate-code-from-brief",
        name: "Generate Component Code",
        description: "Generates TSX component code based on an Animation Design Brief.",
        inputModes: ["data"], 
        outputModes: ["file"], 
      },
      {
        id: "build-component-from-code",
        name: "Build Component",
        description: "Compiles TSX component code into a runnable JavaScript bundle.",
        inputModes: ["file"], 
        outputModes: ["file"], 
      }
    ];
    card.skills = builderSkills;
    return card;
  }
} 