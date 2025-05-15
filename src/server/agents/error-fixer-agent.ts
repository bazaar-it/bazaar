import { BaseAgent, type AgentMessage } from "./base-agent";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import type { Message, Artifact, TaskState, AgentSkill, ComponentJobStatus } from "~/types/a2a";
import { createTextMessage, createFileArtifact, mapA2AToInternalState } from "~/types/a2a";
import { repairComponentSyntax } from "~/server/workers/repairComponentSyntax"; // Corrected import name
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export class ErrorFixerAgent extends BaseAgent {
  constructor() {
    super("ErrorFixerAgent", "Analyzes and attempts to fix errors in component code.");
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId || payload.componentJobId;

    if (!taskId) {
      console.error("ErrorFixerAgent Error: Missing taskId in message payload", payload);
      await this.logAgentMessage(message);
      return null;
    }

    try {
      switch (type) {
        case "COMPONENT_SYNTAX_ERROR":
        case "COMPONENT_BUILD_ERROR":
          const { componentCode, errors, animationDesignBrief, attempts = 0 } = payload;

          if (!componentCode || !errors) {
            const errorMsg = "Missing componentCode or errors in error fixing request.";
            console.error(`ErrorFixerAgent Error: ${errorMsg}`, payload);
            await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(errorMsg), 'failed');
            await this.logAgentMessage(message, true);
            return this.createA2AMessage("COMPONENT_PROCESS_ERROR", taskId, "CoordinatorAgent", this.createSimpleTextMessage(errorMsg), undefined, correlationId);
          }

          await this.logAgentMessage(message, true);
          await this.updateTaskState(taskId, 'working', this.createSimpleTextMessage("Attempting to fix component errors..."), 'fixing');

          const fixResult = await repairComponentSyntax(componentCode);

          if (fixResult.fixedSyntaxErrors && fixResult.code && fixResult.code !== componentCode) {
            const fixSuccessMsg = `Component errors fixed successfully with ${fixResult.fixes.length} fixes.`;
            await this.updateTaskState(taskId, 'working', this.createSimpleTextMessage(fixSuccessMsg), 'generating');
            
            return this.createMessage(
              "REBUILD_COMPONENT_REQUEST",
              { taskId, fixedCode: fixResult.code, originalErrors: errors, animationDesignBrief }, 
              "BuilderAgent",
              correlationId
            );
          } else {
            const fixFailedAttempts = attempts + 1;
            const fixFailedMsg = `Failed to fix component errors after ${fixFailedAttempts} attempt(s). Issues: ${fixResult.fixes.join(", ") || 'none'}`;
            await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(fixFailedMsg), 'fix_failed');
            
            return this.createA2AMessage(
              "COMPONENT_FIX_ERROR",
              taskId,
              "CoordinatorAgent", 
              this.createSimpleTextMessage(fixFailedMsg),
              undefined,
              correlationId
            );
          }

        default:
          console.warn(`ErrorFixerAgent received unhandled message type: ${type}, payload: ${JSON.stringify(payload)}`);
          await this.logAgentMessage(message);
          return null;
      }
    } catch (error: any) {
      console.error(`Error processing message in ErrorFixerAgent (type: ${type}): ${error.message}`, { payload, error });
      await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(`ErrorFixerAgent internal error: ${error.message}`), 'failed');
      await this.logAgentMessage(message, false);
      return this.createA2AMessage("COMPONENT_PROCESS_ERROR", taskId, "CoordinatorAgent", this.createSimpleTextMessage(`ErrorFixerAgent error: ${error.message}`), undefined, correlationId);
    }
  }

  getAgentCard() {
    const card = super.getAgentCard();
    const errorFixerSkills: AgentSkill[] = [
      {
        id: "fix-component-code",
        name: "Fix Component Code",
        description: "Attempts to automatically fix syntax and build errors in TSX component code.",
        inputModes: ["data"], 
        outputModes: ["data"], 
      }
    ];
    card.skills = errorFixerSkills;
    return card;
  }
}

// repairComponentSyntax is expected to be an async function that takes (code, errors, brief) and returns { code: string, fixes: string[], fixedSyntaxErrors: boolean } 