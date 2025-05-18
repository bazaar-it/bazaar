// src/server/agents/scene-planner-agent.ts
import { randomUUID } from "crypto";
import { v4 as uuidv4 } from "uuid";

import { BaseAgent, type AgentMessage } from "./base-agent";
import { env } from "~/env";
import { a2aLogger } from "~/lib/logger";
import {
  type AgentSkill,
  type TextPart,
  type ComponentJobStatus,
  type Message,
  type Artifact,
} from "~/types/a2a";
import { TaskManager } from "~/server/services/a2a/taskManager.service";
import { handleScenePlan } from "~/server/services/scenePlanner.service";
import { analyzeSceneContent } from "../services/sceneAnalyzer.service";
import { db } from "~/server/db";
import { messageBus } from "./message-bus";

// ────────────────────────────────────────────────────────────────────────────────
// Local types
// ────────────────────────────────────────────────────────────────────────────────
interface Scene {
  id: string;
  description: string;
  durationInSeconds: number;
  effectType?: string;
}

interface EnhancedScenePlan {
  scenes: Scene[];
  totalDuration: number;
  intent: string;
  reasoning?: string;
  fps?: number;
  style?: string;
  mood?: string;
}

// In–memory cache flag so we can easily see if the agent is rebuilt at runtime
// (handy while developing with hot‑reload)
// eslint-disable-next-line no-var
declare global {
  var __SCENE_PLANNER_AGENT_CONSTRUCTED: string | undefined;
}

// ────────────────────────────────────────────────────────────────────────────────
// ScenePlannerAgent class
// ────────────────────────────────────────────────────────────────────────────────
export class ScenePlannerAgent extends BaseAgent {
  // Store a reference to the global message bus as fallback
  private messageBusFallback = messageBus;
  
  constructor(taskManager: TaskManager) {
    super(
      "ScenePlannerAgent",
      taskManager,
      "Creates structured scene plans for videos",
      true,
    );
    this.modelName = env.DEFAULT_ADB_MODEL || "gpt-4o-mini";
    this.temperature = 1;
    a2aLogger.info("system", `ScenePlannerAgent constructor finished. Model: ${this.modelName}, Temp: ${this.temperature}. OpenAI Client: ${this.openai ? 'Available' : 'Not Available'}`, { module: "agent_constructor" });
    a2aLogger.info("system", `ScenePlannerAgent will use handleScenePlan from scenePlanner.service.ts for scene processing`, { module: "agent_constructor", integration: "scenePlanner.service.ts" });
    
    // Validate message bus connection
    if (env.USE_MESSAGE_BUS) {
      if (!this.bus) {
        a2aLogger.error("system", "ScenePlannerAgent: Message bus is undefined in BaseAgent. Will use global messageBus as fallback.", { module: "agent_constructor" });
      } else {
        a2aLogger.info("system", "ScenePlannerAgent: Message bus connection from BaseAgent is available.", { module: "agent_constructor" });
      }
    }
    
    globalThis.__SCENE_PLANNER_AGENT_CONSTRUCTED = new Date().toISOString();
  }

  /**
   * Handle publishing to message bus with fallback
   */
  private async publishToMessageBus(message: AgentMessage, taskId: string, logContext: Record<string, any>): Promise<boolean> {
    if (!env.USE_MESSAGE_BUS) {
      return false;
    }
    
    try {
      // First try the message bus from BaseAgent
      if (this.bus) {
        await this.bus.publish(message);
        a2aLogger.info(taskId, "Message successfully published to bus", { ...logContext, messageType: message.type });
        return true;
      }
      
      // If BaseAgent's bus is undefined, try the fallback global messageBus
      if (this.messageBusFallback) {
        await this.messageBusFallback.publish(message);
        a2aLogger.info(taskId, "Message published to fallback global messageBus", { ...logContext, messageType: message.type });
        return true;
      }
      
      a2aLogger.error(taskId, "Cannot publish message: No message bus available (both this.bus and fallback are undefined)", { ...logContext, messageType: message.type });
      return false;
    } catch (busError) {
      a2aLogger.error(taskId, `Failed to publish message to bus: ${busError instanceof Error ? busError.message : String(busError)}`, 
        { ...logContext, error: busError, messageType: message.type });
      return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Public API – the only method other actors call
  // ──────────────────────────────────────────────────────────────────────────────
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, sender } = message;
    const taskId = payload?.taskId ?? message.id ?? randomUUID();
    const correlationId = payload?.correlationId || message.correlationId || message.id;
    
    const logContext = { 
      agentName: this.name, 
      taskId, 
      messageId: message.id, 
      messageType: type, 
      sender, 
      module: "scene_planner_processMessage" 
    };
    
    a2aLogger.info(taskId, `Processing message from ${sender}: ${type}`, { ...logContext, payloadKeys: Object.keys(payload || {}) });
    
    // Handle different message types explicitly
    if (type === "CREATE_SCENE_PLAN_REQUEST" || type === "generate_scene_plan") {
      a2aLogger.info(taskId, "Received scene plan generation request", logContext);
      
      // Extract prompt from message
      let prompt = "";
      if (payload.prompt) {
        prompt = payload.prompt;
      } else if (payload.message) {
        // Try to extract text from the message parts
        if (typeof payload.message === "object" && payload.message.parts) {
          const textParts = payload.message.parts.filter((p: any) => p.type === "text");
          if (textParts.length > 0) {
            prompt = textParts.map((p: any) => p.text).join("\n");
          }
        } else if (typeof payload.message === "string") {
          prompt = payload.message;
        }
      }
      
      if (!prompt) {
        a2aLogger.error(taskId, "No prompt found in message payload.", logContext);
        await this.updateTaskState(taskId, "failed", this.createSimpleTextMessage("ScenePlannerAgent: No prompt provided."), undefined, "failed");
        
        const errorResponse = this.createA2AMessage(
          "SCENE_PLAN_ERROR", 
          taskId, 
          sender, 
          this.createSimpleTextMessage("No prompt in request for scene planning."),
          undefined,
          correlationId
        );
        
        await this.publishToMessageBus(errorResponse, taskId, logContext);
        return errorResponse;
      }
      
      a2aLogger.info(taskId, "Processing scene plan request with prompt", { ...logContext, promptPreview: prompt.substring(0, 100) });
      
      await this.updateTaskState(
        taskId,
        "working",
        this.createSimpleTextMessage("Planning scenes for your video…"),
        undefined,
        "scene_planning_started" as ComponentJobStatus
      );
      
      try {
        const scenePlan = await this.generateScenePlan(taskId, prompt);
        a2aLogger.info(taskId, "Scene plan generated by LLM.", { ...logContext, sceneCount: scenePlan.scenes.length, totalDuration: scenePlan.totalDuration });
        
        // Optional scene analysis – flag super‑complex scenes
        const flaggedScenes: string[] = [];
        for (const [idx, scene] of scenePlan.scenes.entries()) {
          const analysis = await analyzeSceneContent(
            scene.description,
            idx,
            scenePlan.scenes.length,
          );
          if (analysis.complexity > 0.8) {
            flaggedScenes.push(`Scene ${idx + 1}`);
          }
        }
        
        // Persist in DB (so the editor can pick it up later)
        a2aLogger.info(taskId, `Calling handleScenePlan from scenePlanner.service.ts with ${scenePlan.scenes.length} scenes`, { 
          ...logContext, 
          integration: "scenePlanner.service.ts",
          projectId: payload?.projectId,
          sceneCount: scenePlan.scenes.length 
        });
        
        await handleScenePlan(
          payload?.projectId || "unknown_project", 
          payload?.userId ?? "system",
          {
            scenes: scenePlan.scenes,
            intent: scenePlan.intent,
            reasoning: scenePlan.reasoning ?? "",
            fps: scenePlan.fps ?? 30,
          },
          `msg-${uuidv4()}`,
          db,
        );
        
        a2aLogger.info(taskId, "Scene plan persisted to database.", logContext);
        
        const successMessage = this.createSimpleTextMessage(
          `Scene plan ready – ${scenePlan.scenes.length} scenes, total ${scenePlan.totalDuration.toFixed(1)}s. Forwarding for ADB generation.`
        );
        
        await this.updateTaskState(taskId, "completed", successMessage, undefined, "scene_planning_completed" as ComponentJobStatus);
        
        const responseMessage = this.createA2AMessage(
          "SCENE_PLAN_CREATED",
          taskId,
          sender,
          successMessage,
          [this.createDataArtifact(scenePlan, "scene-plan", "Generated scene plan")],
          correlationId,
          { scenePlan: scenePlan }
        );
        
        const processingTime = message.timestamp ? (Date.now() - new Date(message.timestamp).getTime()) / 1000 : -1;
        a2aLogger.info(taskId, `Scene planning successfully completed. Sending response. Processing time: ${processingTime.toFixed(2)}s`, { ...logContext, sceneCount: scenePlan.scenes.length });
        
        // Try to publish via message bus
        const publishSuccess = await this.publishToMessageBus(responseMessage, taskId, logContext);
        
        // If message bus is enabled and publishing succeeded, return null
        if (env.USE_MESSAGE_BUS && publishSuccess) {
          return null;
        }
        
        // Otherwise, fall back to direct return
        return responseMessage;
        
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        a2aLogger.error(taskId, `Error during scene planning in processMessage: ${errorMsg}`, { ...logContext, error: err, errorStack: (err instanceof Error ? err.stack : undefined) });
        
        await this.updateTaskState(taskId, "failed", this.createSimpleTextMessage(`Failed to create scene plan: ${errorMsg}`), undefined, "failed");
        
        const errorResponse = this.createA2AMessage(
          "SCENE_PLAN_ERROR", 
          taskId, 
          sender, 
          this.createSimpleTextMessage(`Scene planning failed: ${errorMsg}`),
          undefined,
          correlationId
        );
        
        // Try to publish via message bus
        const publishSuccess = await this.publishToMessageBus(errorResponse, taskId, logContext);
        
        // If message bus is enabled and publishing succeeded, return null
        if (env.USE_MESSAGE_BUS && publishSuccess) {
          return null;
        }
        
        // Otherwise, fall back to direct return
        return errorResponse;
      }
    } else if (type === "analyze_scene_content") {
      // Request to analyze scene content
      a2aLogger.info(taskId, "Received scene content analysis request", logContext);
      
      try {
        const scenes = payload.scenes;
        if (!scenes || !Array.isArray(scenes)) {
          throw new Error("Missing scenes array in analysis request");
        }
        
        // Analyze each scene individually and combine results
        const analysisResults = [];
        for (const [idx, scene] of scenes.entries()) {
          const analysis = await analyzeSceneContent(
            scene.description || scene,
            idx,
            scenes.length
          );
          analysisResults.push(analysis);
        }
        
        const analysis = { scenes: analysisResults };
        
        const responseMessage = this.createA2AMessage(
          "scene_analysis_completed",
          taskId,
          sender,
          this.createSimpleTextMessage(`Analyzed ${scenes.length} scenes`),
          undefined,
          correlationId,
          { analysis }
        );
        
        await this.publishToMessageBus(responseMessage, taskId, { ...logContext, action: "scene_analysis_completed" });
        return responseMessage;
      } catch (error: any) {
        const errorMessage = this.createA2AMessage(
          "scene_analysis_failed",
          taskId,
          sender,
          this.createSimpleTextMessage(`Failed to analyze scene content: ${error.message}`),
          undefined,
          correlationId
        );
        
        await this.publishToMessageBus(errorMessage, taskId, { ...logContext, action: "scene_analysis_failed", error: error.message });
        return errorMessage;
      }
    } else {
      a2aLogger.warn(taskId, `Received unsupported message type: ${type}`, logContext);
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private async generateScenePlan(taskId: string, prompt: string): Promise<EnhancedScenePlan> {
    const systemPrompt = `You are an expert video editor creating a scene plan for a short video.\n- Ensure smooth transitions between scenes\n- Vary scene types for visual interest\n- Consider the overall narrative flow\n- Total video length should be 15‒60 seconds\n\nReturn **valid JSON only** in the following schema:\n{\n  "intent": string,\n  "reasoning": string,\n  "scenes": [\n    { "id": string, "description": string, "durationInSeconds": number, "effectType"?: string }\n  ],\n  "fps": number\n}`;
    const logContext = { agentName: this.name, taskId, module: "scene_planner_generateScenePlan" };
    a2aLogger.info(taskId, "Sending prompt to LLM for scene plan generation.", { ...logContext, promptLength: prompt.length, systemPromptPreview: systemPrompt.substring(0, 100) });
    
    let rawLLMResponse: string | null = null;
    try {
      const response = await this.openai?.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: prompt }
        ],
        temperature: this.temperature,
        response_format: { type: 'json_object' }
      });
      rawLLMResponse = response?.choices[0]?.message.content || null;
    } catch (llmError) {
      a2aLogger.error(taskId, "LLM call failed in generateScenePlan", { ...logContext, error: llmError });
      throw llmError; // Re-throw to be caught by processMessage
    }

    if (!rawLLMResponse) {
      a2aLogger.error(taskId, "LLM returned null or empty response for scene plan.", logContext);
      throw new Error("LLM returned null or empty response for scene plan.");
    }
    a2aLogger.info(taskId, "Raw LLM response received.", { ...logContext, responseLength: rawLLMResponse.length, responsePreview: rawLLMResponse.substring(0, 200) });

    let parsedPlan: EnhancedScenePlan;
    try {
      parsedPlan = JSON.parse(rawLLMResponse);
    } catch (parseError) {
      a2aLogger.error(taskId, "Failed to parse LLM JSON response for scene plan.", { ...logContext, rawResponse: rawLLMResponse, error: parseError });
      throw new Error(`Failed to parse LLM JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    if (!parsedPlan || !Array.isArray(parsedPlan.scenes) || !parsedPlan.scenes.length) {
      a2aLogger.error(taskId, "LLM returned no scenes or invalid plan structure.", { ...logContext, parsedPlan });
      throw new Error("LLM returned no scenes or invalid plan structure.");
    }
    a2aLogger.info(taskId, `LLM successfully parsed into ${parsedPlan.scenes.length} scenes.`, { ...logContext });

    const scenes: Scene[] = parsedPlan.scenes.map((s, i) => ({
      id: s.id || `scene-${uuidv4()}`, // Ensure unique ID
      description: s.description || `Scene ${i + 1}`,
      durationInSeconds: Math.max(1, Math.min(30, s.durationInSeconds || 5)), // Ensure duration is reasonable
      effectType: s.effectType ?? "text",
    }));

    const totalDuration = scenes.reduce((sum, s) => sum + s.durationInSeconds, 0);

    return {
      scenes,
      totalDuration,
      intent: parsedPlan.intent || "Generated video based on prompt",
      reasoning: parsedPlan.reasoning,
      fps: parsedPlan.fps ?? 30,
      style: parsedPlan.style,
      mood: parsedPlan.mood,
    };
  }

  protected getAgentSkills(): AgentSkill[] {
    const exampleInput = this.createSimpleTextMessage(
      "Create a short intro animation for a tech company called 'Innovate'",
    );
    const exampleOutput = this.createSimpleTextMessage(
      "Scene plan created with 3 scenes: logo reveal, product showcase, contact info",
    );

    return [
      {
        id: "scene-planning",
        name: "Scene Planning",
        description: "Creates structured scene plans for videos based on user input",
        examples: [
          {
            name: "Create Tech Intro",
            description: "Create a scene plan for a tech company intro",
            input: { message: exampleInput },
            output: { message: exampleOutput },
          },
        ],
        inputModes: ["text"],
        outputModes: ["text", "data"],
      },
    ];
  }

  // A tiny helper so we don't have to import createTextMessage everywhere
  public createSimpleTextMessage(text: string): Message {
    return {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      parts: [{ type: "text", text } as TextPart],
    };
  }
}
