// src/server/agents/coordinator-agent.ts
import { v4 as uuidv4 } from 'uuid';
import { BaseAgent, type AgentMessage } from "./base-agent"; 
import type { TaskManager } from "../services/a2a/taskManager.service";
import { ScenePlannerAgent } from "./scene-planner-agent";
import type {
  Task, 
  TaskState,
  ComponentJobStatus,
  Message,
  Artifact,
  TaskStatus, 
  AgentSkill  
  // AgentErrorPayload, 
  // CustomComponentJobTask 
} from "../../types/a2a";
import { type AnimationDesignBrief } from "~/lib/schemas/animationDesignBrief.schema"; 
import { createTextMessage } from "../../types/a2a"; 
import { a2aLogger, logAgentProcess, logAgentSend } from "~/lib/logger";
import { env } from "~/env";

// Define Agent Names used by CoordinatorAgent
const AGENT_NAME = {
  UI_AGENT: "UIAgent",
  ERROR_FIXER_AGENT: "ErrorFixerAgent",
  BUILDER_AGENT: "BuilderAgent",
  R2_STORAGE_AGENT: "R2StorageAgent",
  SCENE_PLANNER_AGENT: "ScenePlannerAgent",
  ADB_AGENT: "ADBAgent",
  COORDINATOR_AGENT: "CoordinatorAgent" 
} as const;

// Define the expected shape of the task object from TaskManager.getTaskById
interface CustomComponentJobTask {
  id: string;
  projectId: string;
  effect: string;
  status: string; 
  props?: Record<string, unknown> | null;
  componentName?: string | null;
  generatedCode?: string | null;
  compiledPath?: string | null;
  errorLogs?: string | null;
  retryCount?: number;
  taskId?: string | null; 
  animationDesignBrief?: AnimationDesignBrief | null; 
  currentStep?: string | null;
  history?: any | null; 
  sseEnabled?: boolean;
  createdAt: Date;
  updatedAt?: Date | null;
  original_tsx_code?: string | null; 
  last_fix_attempt?: Date | null; 
  fix_issues?: string | null; 

  taskState: TaskStatus; 
}

interface AgentErrorPayload {
  message: string;
  details?: any; 
  code?: string | number; 
}

export class CoordinatorAgent extends BaseAgent {
  private readonly SYSTEM_PROMPT = `You are the CoordinatorAgent in the Bazaar-Vid video generation pipeline.
Your role is to analyze requests and determine the optimal processing flow.

Available agents:
- ScenePlannerAgent: Creates structured scene plans with timing and transitions from text prompts
- ADBAgent: Creates detailed Animation Design Briefs from scene plans
- BuilderAgent: Generates React/Remotion code from Animation Design Briefs
- ErrorFixerAgent: Debugs and repairs component code
- R2StorageAgent: Handles storage and retrieval of generated components
- UIAgent: Provides user interface notifications and updates

Respond with JSON in this format:
{
  "targetAgent": "AgentName",
  "action": "Action to take",
  "reason": "Detailed explanation of your decision"
}`;

  constructor(taskManager: TaskManager) { 
    super("CoordinatorAgent", taskManager, "Orchestrates the component generation pipeline using A2A protocol with LLM routing intelligence", true);
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId || payload.componentJobId || `temp-${Date.now()}`;
    const logPrefix = `[${this.name}][${taskId}]`;

    // Enhanced logging for incoming message
    a2aLogger.info(
      `${logPrefix} Received message: ${type}`,
      {
        messageId: message.id,
        sender: message.sender,
        correlationId,
        payload: payload ? Object.keys(payload) : 'no payload'
      }
    );

    try {
      switch (type) {
        case "CREATE_VIDEO_REQUEST":
          const { prompt, projectId, userId } = payload;
          
          if (!prompt || !projectId || !userId) {
            const errorMsg = "Missing required parameters: prompt, projectId, or userId";
            a2aLogger.error(logPrefix, errorMsg, { payload });
            throw new Error(errorMsg);
          }
          
          a2aLogger.info(
            `${logPrefix} Processing CREATE_VIDEO_REQUEST`,
            { 
              projectId,
              promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
              userId 
            }
          );

          // Create a task for this video generation request
          const videoTask = await this.taskManager.createTask(projectId, {
            effect: prompt.substring(0, 60) + "...",
            message: createTextMessage(prompt)
          });
          
          const videoTaskId = videoTask.id;
          logAgentProcess(a2aLogger, this.name, videoTaskId, type, `Task ${videoTaskId} created by TaskManager.`);
          
          await this.logAgentMessage(message, true);
          
          const routingDecision = await this.determineProcessingFlow(prompt);
          
          if (routingDecision) {
            const decisionArtifact = this.createDataArtifact(
              routingDecision,
              "coordinator-decision",
              `Routing decision for task ${videoTaskId}`
            );
            await this.addTaskArtifact(videoTaskId, decisionArtifact);
          }
          
          const targetAgent = routingDecision?.targetAgent || "ScenePlannerAgent";
          const routingReason = routingDecision?.reason || 
            "Starting video generation flow with scene planning";
          
          const taskStateUpdateMessage = this.createSimpleTextMessage(`${routingReason}. Forwarding to ${targetAgent}.`);
          
          logAgentProcess(a2aLogger, this.name, videoTaskId, type, `Routing to ${targetAgent} for video task. Reason: ${routingReason}`);
          const existingTask = await this.taskManager.getTaskById(videoTaskId); 
          if (!existingTask) {
            console.warn(`CoordinatorAgent: Task ${videoTaskId} not found when trying to update state for ${targetAgent} routing. State not updated.`);
          } else {
            await this.taskManager.updateTaskStatus(
              videoTaskId, 
              'working', 
              taskStateUpdateMessage,
              undefined, 
              true
            );
            await this.updateTaskState(videoTaskId, 'working', 
              taskStateUpdateMessage, 
              undefined, 
              'video_generation_started' as ComponentJobStatus
            );
          }
          
          logAgentProcess(a2aLogger, this.name, videoTaskId, type, `Task state updated to working, creating follow-up for ${targetAgent}.`);
          
          // Create message to send to ScenePlannerAgent
          const scenePlannerMessage: AgentMessage = {
            id: uuidv4(),
            type: "CREATE_SCENE_PLAN_REQUEST",
            sender: this.name,
            recipient: targetAgent,
            timestamp: new Date().toISOString(),
            payload: {
              projectId,
              userId,
              taskId: videoTaskId,
              prompt,
              correlationId: correlationId || message.id,
              metadata: payload.metadata,
              // Add additional context for debugging
              _debug: {
                originalMessageId: message.id,
                processedAt: new Date().toISOString()
              }
            }
          };

          // Log the message being sent to ScenePlannerAgent
          a2aLogger.info(
            `${logPrefix} Forwarding to ${targetAgent}`,
            {
              messageId: scenePlannerMessage.id,
              recipient: targetAgent,
              payloadKeys: Object.keys(scenePlannerMessage.payload),
              promptPreview: payload.prompt 
                ? `${payload.prompt.substring(0, 100)}${payload.prompt.length > 100 ? '...' : ''}` 
                : 'no prompt',
              correlationId: scenePlannerMessage.payload.correlationId
            }
          );
          
          // Add debug logging for the full payload in development
          if (process.env.NODE_ENV === 'development') {
            a2aLogger.debug(
              `${logPrefix} Full payload for ${targetAgent}`,
              JSON.stringify(scenePlannerMessage.payload, null, 2)
            );
          }

          // Send the message either via message bus or direct call
          if (env.USE_MESSAGE_BUS) {
            // Publish via message bus for decoupled routing
            await this.bus.publish(scenePlannerMessage);
            return null; // In bus mode we don't wait for an immediate synchronous response
          } else {
            // Legacy direct call path for ScenePlannerAgent
            if (targetAgent === "ScenePlannerAgent") {
              const scenePlannerAgent = new ScenePlannerAgent(this.taskManager);
              const scenePlanResponse = await scenePlannerAgent.processMessage(scenePlannerMessage);
              
              if (!scenePlanResponse) {
                a2aLogger.error(logPrefix, "Failed to get response from ScenePlannerAgent");
                const errorMessage = this.createA2AMessage(
                  "ERROR",
                  videoTaskId,
                  message.sender,
                  this.createSimpleTextMessage("No response from ScenePlannerAgent"),
                  undefined,
                  message.id,
                  { success: false, error: "No response from ScenePlannerAgent" }
                );
                return errorMessage;
              }
              return scenePlanResponse;
            } else {
              // For any other agent, just return the message
              return scenePlannerMessage;
            }
          }
          
        case "CREATE_COMPONENT_REQUEST":
          const { animationDesignBrief, projectId: componentProjectId } = payload;
          logAgentProcess(a2aLogger, this.name, taskId || "N/A", type, "Processing CREATE_COMPONENT_REQUEST", { projectId: componentProjectId, animationDesignBrief });
          
          const task = await this.taskManager.createTask(componentProjectId, {
            effect: animationDesignBrief.sceneName || "Custom Component",
            animationDesignBrief,
            message: createTextMessage(`Initial task for: ${animationDesignBrief.sceneName}`)
          });
          const newTaskId = task.id;
          logAgentProcess(a2aLogger, this.name, newTaskId, type, `Task ${newTaskId} created by TaskManager.`);
          
          await this.logAgentMessage(message, true);
          
          const briefDescription = animationDesignBrief.scenePurpose || animationDesignBrief.sceneName || "Custom component creation";
          const componentRoutingDecision = await this.determineProcessingFlow(briefDescription);
          
          if (componentRoutingDecision) {
            const decisionArtifact = this.createDataArtifact(
              componentRoutingDecision,
              "coordinator-decision",
              `Routing decision for task ${newTaskId}`
            );
            await this.addTaskArtifact(newTaskId, decisionArtifact);
          }

          const componentRoutingReason = componentRoutingDecision?.reason || 
            "Standard component generation flow initiated";
          
          const componentTaskStateUpdateMessage = this.createSimpleTextMessage(`${componentRoutingReason}. Forwarding to BuilderAgent.`);

          logAgentProcess(a2aLogger, this.name, newTaskId, type, `Routing to BuilderAgent for component generation. Reason: ${componentRoutingReason}`);
          const existingComponentTask = await this.taskManager.getTaskById(newTaskId); 
          if (!existingComponentTask) {
            console.warn(`CoordinatorAgent: Task ${newTaskId} not found when trying to update state for BuilderAgent routing. State not updated.`);
          } else {
            await this.taskManager.updateTaskStatus(
              newTaskId,
              'working',
              componentTaskStateUpdateMessage,
              undefined, 
              true
            );
            await this.updateTaskState(newTaskId, 'working', 
              componentTaskStateUpdateMessage, 
              undefined, 
              'component_generation_started' as ComponentJobStatus
            );
          }
          
          logAgentProcess(a2aLogger, this.name, newTaskId, type, "Task state updated to working, creating follow-up for BuilderAgent.");
          
          const generateComponentResponse = this.createA2AMessage(
            "GENERATE_COMPONENT_REQUEST",
            newTaskId,
            AGENT_NAME.BUILDER_AGENT,
            this.createSimpleTextMessage("Generating component from Animation Design Brief"),
            undefined,
            correlationId,
            {
              projectId: componentProjectId,
              effect: animationDesignBrief.sceneName || "custom",
              animationDesignBrief
            }
          );
          
          if (env.USE_MESSAGE_BUS) await this.bus.publish(generateComponentResponse);
          return env.USE_MESSAGE_BUS ? null : generateComponentResponse;

        case "SCENE_PLAN_CREATED":
          if (!taskId) {
            a2aLogger.error(this.name, "Missing taskId in SCENE_PLAN_CREATED payload", null, { type, payload });
            await this.logAgentMessage(message);
            return null;
          }
          
          logAgentProcess(a2aLogger, this.name, taskId, type, "Processing SCENE_PLAN_CREATED from ScenePlannerAgent", { 
            scenePlans: payload.scenePlans ? `Received scene plan with ${payload.scenePlans.scenes?.length || 0} scenes` : 'No scene plans in payload',
            correlationId
          });
          
          // Add any artifacts from the scene planner to the task
          const scenePlanArtifacts = payload.artifacts as Artifact[] | undefined;
          if (scenePlanArtifacts && scenePlanArtifacts.length > 0) {
            for (const artifact of scenePlanArtifacts) {
              await this.addTaskArtifact(taskId, artifact);
            }
          }
          
          await this.logAgentMessage(message, true);
          
          // Update task state to indicate scene planning is complete and we're moving to animation design
          await this.updateTaskState(
            taskId,
            'working',
            this.createSimpleTextMessage("Scene plan created successfully. Generating animation design brief..."),
            undefined,
            'scene_planning_completed' as ComponentJobStatus
          );
          
          // Forward the scene plan to the ADBAgent to create an animation design brief
          const sceneResponse = this.createA2AMessage(
            "CREATE_ANIMATION_DESIGN_REQUEST",
            taskId,
            "ADBAgent",
            this.createSimpleTextMessage("Request to create animation design brief from scene plan"),
            undefined,
            correlationId,
            {
              projectId: payload.projectId,
              userId: payload.userId,
              scenePlans: payload.scenePlans,
              sceneResults: payload.sceneResults,
              metadata: payload.metadata
            }
          );
          
          if (env.USE_MESSAGE_BUS) await this.bus.publish(sceneResponse);
          return env.USE_MESSAGE_BUS ? null : sceneResponse;

        case "SCENE_PLAN_SUCCESS":
          if (!taskId) {
            a2aLogger.error(this.name, "Missing taskId in SCENE_PLAN_SUCCESS payload", null, { type, payload });
            await this.logAgentMessage(message);
            return null;
          }
          
          logAgentProcess(a2aLogger, this.name, taskId, type, "Processing SCENE_PLAN_SUCCESS. Adding artifacts.", { payload });
          
          const scenePlanSuccessArtifacts = payload.artifacts as Artifact[] | undefined;
          if (scenePlanSuccessArtifacts && scenePlanSuccessArtifacts.length > 0) {
            for (const artifact of scenePlanSuccessArtifacts) {
              await this.addTaskArtifact(taskId, artifact);
            }
          }
          
          const scenePlanSuccessMessage = await this.generateSuccessMessage("SCENE_PLAN_SUCCESS");
          if (scenePlanSuccessMessage) {
            await this.updateTaskState(
              taskId, 
              'working',
              this.createSimpleTextMessage(scenePlanSuccessMessage), 
              undefined, 
              'scene_plan_generated' as ComponentJobStatus
            );
          }
          
          await this.logAgentMessage(message, true);
          return null;
          
        case "SCENE_PLAN_ERROR":
          if (!taskId) {
            a2aLogger.error(this.name, "Missing taskId in SCENE_PLAN_ERROR payload", null, { type, payload });
            await this.logAgentMessage(message);
            return null;
          }
          
          const scenePlanErrorMessage = payload.error || "Unknown error occurred during scene planning";
          logAgentProcess(a2aLogger, this.name, taskId, type, `Processing scene planning error: ${scenePlanErrorMessage}. Updating task to failed.`, { errorPayload: payload });
          
          const enhancedScenePlanErrorDescription = await this.analyzeError(type, scenePlanErrorMessage);
          const scenePlanUserFriendlyMessage = enhancedScenePlanErrorDescription || scenePlanErrorMessage;
          
          await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(scenePlanUserFriendlyMessage), undefined, 'scene_plan_generation_failed' as ComponentJobStatus); 
          await this.logAgentMessage(message, true);
          
          return this.createA2AMessage(
            "TASK_FAILED_NOTIFICATION",
            taskId,
            "UIAgent",
            this.createSimpleTextMessage(`Task failed: ${scenePlanUserFriendlyMessage}`),
            undefined,
            correlationId
          );

        case "COMPONENT_PROCESS_ERROR":
        case "COMPONENT_FIX_ERROR":
        case "R2_STORAGE_ERROR":
        case "ADB_GENERATION_ERROR":
          if (!taskId) {
            a2aLogger.error(this.name, "Missing taskId in error message payload", null, { type, payload });
            await this.logAgentMessage(message);
            return null;
          }
          
          const errorMessage = payload.error || "Unknown error occurred during component processing";
          logAgentProcess(a2aLogger, this.name, taskId, type, `Processing error: ${errorMessage}. Updating task to failed.`, { errorPayload: payload });
          
          const enhancedErrorDescription = await this.analyzeError(type, errorMessage);
          const userFriendlyMessage = enhancedErrorDescription || errorMessage;
          
          await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(userFriendlyMessage), undefined, 'component_generation_failed' as ComponentJobStatus); 
          await this.logAgentMessage(message, true);

          const componentErrorNotificationResponse = this.createA2AMessage(
            "TASK_FAILED_NOTIFICATION",
            taskId,
            "UIAgent",
            this.createSimpleTextMessage(`Task failed: ${userFriendlyMessage}`),
            undefined,
            correlationId
          );
          
          if (env.USE_MESSAGE_BUS) await this.bus.publish(componentErrorNotificationResponse);
          return env.USE_MESSAGE_BUS ? null : componentErrorNotificationResponse;
        
        case "COMPONENT_BUILD_SUCCESS":
          if (!taskId) {
            a2aLogger.error(this.name, "Missing taskId in COMPONENT_BUILD_SUCCESS payload", null, { type, payload });
            await this.logAgentMessage(message);
            return null;
          }
          logAgentProcess(a2aLogger, this.name, taskId, type, "Processing COMPONENT_BUILD_SUCCESS. Forwarding to R2StorageAgent.", { payload });
          
          const successMessage = await this.generateSuccessMessage("COMPONENT_BUILD_SUCCESS");
          if (successMessage) {
            await this.updateTaskState(
              taskId, 
              'working',
              this.createSimpleTextMessage(successMessage), 
              undefined, 
              'component_built' as ComponentJobStatus
            );
          }
          
          await this.logAgentMessage(message, true);
          const storeComponentResponse = this.createA2AMessage(
            "STORE_COMPONENT_REQUEST",
            taskId,
            "R2StorageAgent",
            this.createSimpleTextMessage("Request to store built component."),
            payload.artifacts as Artifact[] | undefined,
            correlationId
          );
          
          if (env.USE_MESSAGE_BUS) await this.bus.publish(storeComponentResponse);
          return env.USE_MESSAGE_BUS ? null : storeComponentResponse;

        case "COMPONENT_STORED_SUCCESS":
          if (!taskId) {
            a2aLogger.error(this.name, "Missing taskId in COMPONENT_STORED_SUCCESS payload", null, { type, payload });
            await this.logAgentMessage(message);
            return null;
          }
          const artifactsToNotify = payload.artifacts as Artifact[] | undefined;
          logAgentProcess(a2aLogger, this.name, taskId, type, "Processing COMPONENT_STORED_SUCCESS. Updating task to completed.", { artifactsToNotify });
          
          const completionSummary = await this.generateSuccessMessage("COMPONENT_STORED_SUCCESS");
          await this.updateTaskState(taskId, 'completed', 
            this.createSimpleTextMessage(completionSummary || "Component stored successfully."), 
            payload.artifacts, 
            'component_stored' as ComponentJobStatus
          );
          await this.logAgentMessage(message, true);

          const completionNotificationResponse = this.createA2AMessage(
            "TASK_COMPLETED_NOTIFICATION",
            taskId,
            "UIAgent",
            this.createSimpleTextMessage(completionSummary || "Component generation completed successfully."),
            artifactsToNotify,
            correlationId
          );
          
          if (env.USE_MESSAGE_BUS) await this.bus.publish(completionNotificationResponse);
          return env.USE_MESSAGE_BUS ? null : completionNotificationResponse;

        case "COMPONENT_STORAGE_FAILED": {
          if (!taskId) {
            a2aLogger.error(this.name, `Missing taskId in COMPONENT_STORAGE_FAILED payload`, null, { type, payload });
            await this.logAgentMessage(message); 
            return null;
          }

          const csfErrorMessage = payload.error?.message || "Component storage failed";
          const csfErrorDetails = payload.error?.details;
          const csfUserFriendlyError = `Error storing component: ${csfErrorMessage}`;

          logAgentProcess(a2aLogger, this.name, taskId, type, `Processing ${type}: ${csfUserFriendlyError}. Updating task to failed.`, { errorPayload: payload });

          await this.updateTaskState(
            taskId,
            'failed',
            this.createSimpleTextMessage(csfUserFriendlyError),
            undefined,
            'component_storage_failed' as ComponentJobStatus
          );
          await this.logAgentMessage(message, true); 

          const storageFailedResponse = this.createA2AMessage(
            "TASK_FAILED_NOTIFICATION",
            taskId,
            AGENT_NAME.UI_AGENT,
            this.createSimpleTextMessage(`Task failed: ${csfUserFriendlyError}`),
            undefined,
            correlationId,
            { error: { message: csfUserFriendlyError, details: csfErrorDetails } }
          );
          
          if (env.USE_MESSAGE_BUS) await this.bus.publish(storageFailedResponse);
          return env.USE_MESSAGE_BUS ? null : storageFailedResponse;
        }

        case "COMPONENT_GENERATION_FAILED": {
          const taskData = await this.taskManager.getTaskById(taskId);

          if (!taskData) {
            a2aLogger.error(
              this.name, 
              `Task ${taskId} not found when handling COMPONENT_GENERATION_FAILED.`,
              null,
              { taskId, correlationId }
            );
            return this.createA2AMessage(
              "ERROR_INTERNAL",
              taskId,
              AGENT_NAME.ERROR_FIXER_AGENT, 
              this.createSimpleTextMessage(`Task ${taskId} not found. Unable to process component generation failure.`),
              undefined,
              correlationId
            );
          }

          const task = taskData as CustomComponentJobTask;
          logAgentProcess(a2aLogger, this.name, taskId, type, "Processing COMPONENT_GENERATION_FAILED after fetching task data", { payload, taskStatus: task.taskState });

          const { error: rawError, animationDesignBrief: adbFromPayload } = payload as { error: AgentErrorPayload, animationDesignBrief?: AnimationDesignBrief }; 
          
          await this.logAgentMessage(message, true); 

          const effectiveAdb: AnimationDesignBrief | undefined = adbFromPayload || task.animationDesignBrief || undefined;

          const decision = await this.determineCoordinatorActionForFailedComponent(
            taskId, 
            rawError, 
            effectiveAdb 
          );

          logAgentProcess(a2aLogger, this.name, taskId, type, "LLM decision for failed component", { decision });

          if (decision.decision === "ForwardToAgent" && decision.targetAgent && decision.action) {
            await this.updateTaskState(
              taskId,
              'working', 
              this.createSimpleTextMessage(`Attempting to fix component: ${decision.reason}`),
              undefined,
              'fixing' as ComponentJobStatus 
            );
            return this.createA2AMessage(
              decision.action, 
              taskId, 
              decision.targetAgent, 
              this.createSimpleTextMessage(decision.reason), 
              undefined, 
              correlationId, 
              decision.data 
            );
          } else {
            a2aLogger.warn(this.name, `Unexpected decision or TerminateProcessing for failed component: ${decision.decision}. Terminating.`, { taskId, decision }); 
            await this.updateTaskState(
              taskId,
              'failed',
              this.createSimpleTextMessage(`Processing terminated by Coordinator: ${decision.reason}`),
              undefined,
              'failed' as ComponentJobStatus
            );
            return null; 
          }
        }

        case "REQUEST_TASK_EXECUTION":
          if (!taskId) {
            a2aLogger.error(this.name, "Missing taskId in REQUEST_TASK_EXECUTION payload", null, { type, payload });
            await this.logAgentMessage(message);
            return null;
          }
          
          logAgentProcess(a2aLogger, this.name, taskId, type, "Processing REQUEST_TASK_EXECUTION", { payload });
          
          // Extract the necessary information from the payload
          const reqTaskPrompt = payload.prompt;
          const reqTaskEffect = payload.effect;
          const reqTaskMetadata = payload.fullMetadata;
          
          // Add task processing status update
          const reqTaskProcessingMessage = this.createSimpleTextMessage("Task received by CoordinatorAgent, determining optimal processing flow...");
          await this.updateTaskState(taskId, 'working', reqTaskProcessingMessage, undefined, 'processing' as ComponentJobStatus);
          
          // Determine the appropriate agent to handle this task
          const reqTaskRoutingDecision = await this.determineProcessingFlow(reqTaskPrompt);
          
          // Transform the routing decision based on available agents
          let reqTaskTargetAgent = "ScenePlannerAgent"; // Default to ScenePlannerAgent
          let reqTaskMessageType = "CREATE_SCENE_PLAN_REQUEST";
          let reqTaskRoutingReason = "Standard video generation flow initiated";
          
          if (reqTaskRoutingDecision) {
            // Create an artifact for decision traceability
            const reqTaskDecisionArtifact = this.createDataArtifact(
              reqTaskRoutingDecision,
              "coordinator-decision",
              `Routing decision for task ${taskId}`
            );
            await this.addTaskArtifact(taskId, reqTaskDecisionArtifact);
            
            // Map the LLM routing decision to actual agent names
            // Only assign to available agents in the registry
            const targetAgentName = reqTaskRoutingDecision.targetAgent;
            if (targetAgentName) {
              if (targetAgentName.toLowerCase().includes('scene') || 
                  targetAgentName.toLowerCase().includes('planner')) {
                reqTaskTargetAgent = "ScenePlannerAgent";
                reqTaskMessageType = "CREATE_SCENE_PLAN_REQUEST";
              } else if (targetAgentName.toLowerCase().includes('adb') || 
                         targetAgentName.toLowerCase().includes('design') || 
                         targetAgentName.toLowerCase().includes('brief')) {
                reqTaskTargetAgent = "ADBAgent";
                reqTaskMessageType = "GENERATE_ADB_REQUEST";
              } else if (targetAgentName.toLowerCase().includes('build')) {
                reqTaskTargetAgent = "BuilderAgent";
                reqTaskMessageType = "BUILD_COMPONENT_REQUEST";
              }
            }
            
            reqTaskRoutingReason = reqTaskRoutingDecision.reason || reqTaskRoutingReason;
          }
          
          const reqTaskStatusMessage = this.createSimpleTextMessage(`${reqTaskRoutingReason}. Forwarding to ${reqTaskTargetAgent}.`);
          
          await this.updateTaskState(
            taskId, 
            'working', 
            reqTaskStatusMessage, 
            undefined, 
            'video_generation_started' as ComponentJobStatus
          );
          
          logAgentProcess(a2aLogger, this.name, taskId, type, `Routing to ${reqTaskTargetAgent}. Reason: ${reqTaskRoutingReason}`);
          
          // Log the message receipt for visualization
          await this.logAgentMessage(message, true);
          
          // Forward the task to the appropriate agent
          return this.createA2AMessage(
            reqTaskMessageType,
            taskId,
            reqTaskTargetAgent,
            this.createSimpleTextMessage(`Request forwarded to ${reqTaskTargetAgent}: ${reqTaskPrompt?.substring(0, 100)}${reqTaskPrompt?.length > 100 ? '...' : ''}`),
            undefined,
            correlationId,
            {
              projectId: reqTaskMetadata?.projectId,
              prompt: reqTaskPrompt,
              metadata: reqTaskMetadata
            }
          );
          
        default:
          a2aLogger.warn(this.name, `Received unhandled message type: ${type}`, { payload, taskId: taskId || "N/A" });
          await this.logAgentMessage(message);
          return null;
      }
    } catch (error: any) {
      a2aLogger.error(this.name, `Error processing message in CoordinatorAgent (type: ${type}): ${error.message}`, error, { payload, taskId: taskId || "N/A" });
      if (taskId) {
        try {
          await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(`Coordinator internal error: ${error.message}`), undefined, 'failed' as ComponentJobStatus); 
        } catch (updateError: any) {
            a2aLogger.error(this.name, `Failed to update task state to failed after another error: ${updateError.message}`, updateError, { originalError: error.message, taskId });
        }
      }
      await this.logAgentMessage(message, false);
      return null;
    }
  }

  private async determineProcessingFlow(prompt: string): Promise<{
    targetAgent: string;
    action: string;
    reason: string;
  } | null> {
    try {
      const analysisPrompt = `Please analyze this component or video generation request and determine the best processing route:
      
"${prompt}"

Based on this description, which agent should handle this request first, what action should be taken, and why?`;

      return await this.generateStructuredResponse<{
        targetAgent: string;
        action: string;
        reason: string;
      }>(analysisPrompt, this.SYSTEM_PROMPT);
    } catch (error) {
      a2aLogger.error('coordinator_agent', `Error in determineProcessingFlow: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
      return null;
    }
  }

  private async analyzeError(errorType: string, errorMessage: string): Promise<string | null> {
    try {
      const prompt = `I received the following error while processing a component:
Type: ${errorType}
Error: ${errorMessage}

Please provide a clear, user-friendly explanation of what went wrong and potential solutions.`;

      const response = await this.generateResponse(prompt, 
        "You are an expert troubleshooter for the Bazaar-Vid video generation system. Explain errors in simple terms that non-technical users can understand.");
      
      return response;
    } catch (error) {
      a2aLogger.error('coordinator_agent', `Error in analyzeError: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
      return null;
    }
  }

  private async generateSuccessMessage(successType: string): Promise<string | null> {
    try {
      const prompt = `I need a user-friendly success message for the following event: ${successType}`;

      const response = await this.generateResponse(prompt, 
        "You are writing clear, positive messages for users of the Bazaar-Vid system. Keep messages concise (2-3 sentences max) but informative about what was accomplished.");
      
      return response;
    } catch (error) {
      a2aLogger.error('coordinator_agent', `Error in generateSuccessMessage: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
      return null;
    }
  }

  private async determineCoordinatorActionForFailedComponent(
    taskId: string,
    rawError: AgentErrorPayload, 
    adb: AnimationDesignBrief | undefined
  ): Promise<{
    decision: string; 
    reason: string; 
    targetAgent: string | null; 
    action: string | null; 
    data: any | null; 
  }> {
    const prompt = `Task ID: ${taskId} encountered a COMPONENT_GENERATION_FAILED error.
Error Message: ${rawError.message}
Error Details: ${rawError.details || 'N/A'}
Animation Design Brief Scene Name: ${adb?.sceneName || 'N/A'}
Animation Design Brief Description: ${adb?.scenePurpose || 'N/A'}

Based on this failure, please decide the next course of action. Your options are:
1. TerminateProcessing: If the error seems unrecoverable or if multiple fix attempts have failed (assume this is the first attempt for now unless otherwise specified by a retry count later).
2. ForwardToAgent: If the error seems potentially fixable by the ErrorFixerAgent.

Provide your response as a JSON object with the following fields:
- "decision": (string) "TerminateProcessing" or "ForwardToAgent".
- "reason": (string) A concise explanation for your decision. This will be shown to the user or used in logs.
- "targetAgent": (string | null) If "ForwardToAgent", set to "ErrorFixerAgent". Otherwise, null.
- "action": (string | null) If "ForwardToAgent", set to "FIX_COMPONENT_REQUEST". Otherwise, null.
- "data": (object | null) If "ForwardToAgent", include any specific analysis or context for the ErrorFixerAgent, e.g., { "analysis": "The issue might be X..." }. Otherwise, null.

Example for fixable error:
{
  "decision": "ForwardToAgent",
  "reason": "The build failed due to a missing import. ErrorFixerAgent can attempt to add it.",
  "targetAgent": "ErrorFixerAgent",
  "action": "FIX_COMPONENT_REQUEST",
  "data": { "analysis": "Error suggests a missing 'react' import." }
}

Example for unfixable error:
{
  "decision": "TerminateProcessing",
  "reason": "The provided design brief is fundamentally incompatible with the rendering engine.",
  "targetAgent": null,
  "action": null,
  "data": null
}

Please analyze the provided error and ADB to make your decision for Task ID: ${taskId}.`;

    try {
      const llmDecision = await this.generateStructuredResponse<{
        decision: string;
        reason: string;
        targetAgent: string | null;
        action: string | null;
        data: any | null;
      }>(prompt, this.SYSTEM_PROMPT);

      if (!llmDecision) {
        a2aLogger.error(this.name, `LLM failed to provide a structured decision for COMPONENT_GENERATION_FAILED on task ${taskId}. Defaulting to TerminateProcessing.`, null, { taskId, rawError, adb });
        return {
          decision: "TerminateProcessing",
          reason: "Coordinator LLM failed to make a decision. Defaulting to termination.",
          targetAgent: null,
          action: null,
          data: null,
        };
      }
      return llmDecision;
    } catch (error) {
      a2aLogger.error(this.name, `Error in determineCoordinatorActionForFailedComponent for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined, { taskId, rawError, adb });
      return {
        decision: "TerminateProcessing",
        reason: `Error during LLM decision process for component failure: ${error instanceof Error ? error.message : String(error)}. Defaulting to termination.`,
        targetAgent: null,
        action: null,
        data: null,
      };
    }
  }

  getAgentSkills(): AgentSkill[] {
    return [
      {
        id: "orchestrate-video-generation",
        name: "Orchestrate Video Generation",
        description: "Coordinates the end-to-end video generation pipeline from text prompt to final video.",
        inputModes: ["text"],
        outputModes: ["text", "data"],
        examples: [
          {
            name: "Create Video",
            description: "Create a video from a text prompt",
            input: { message: createTextMessage("Create a 30-second video showing a rocket launch") }
          }
        ]
      },
      {
        id: "orchestrate-component-generation",
        name: "Orchestrate Component Generation",
        description: "Manages the end-to-end lifecycle of custom video component creation, coordinating Builder, ErrorFixer, and Storage agents.",
        inputModes: ["text", "data"],
        outputModes: ["text", "data"],
        examples: [
          {
            name: "Process ADB",
            description: "Process an Animation Design Brief into a component",
            input: { message: createTextMessage("Create a component from the ADB") }
          }
        ]
      }
    ];
  }

  getAgentCard() {
    const card = super.getAgentCard();
    card.skills = this.getAgentSkills();
    return card;
  }
} 