// src/server/agents/scene-planner-agent.patch.ts
// Patched version of ScenePlannerAgent that uses the fixed BaseAgentPatched class

import { randomUUID } from "crypto";
import { v4 as uuidv4 } from "uuid";

import { BaseAgentPatched } from "./base-agent.patch";

// Use any type for AgentMessage to avoid type incompatibilities in the patch file
// @ts-ignore
type AgentMessage = any;
import { env } from "~/env";
import { a2aLogger } from "~/lib/logger";
import {
  type AgentSkill,
  type TextPart,
  type Message,
  type Artifact,
} from "~/types/a2a";
import { TaskManager } from "~/server/services/a2a/taskManager.service";
import { handleScenePlan } from "~/server/services/scenePlanner.service";
import { analyzeSceneContent } from "../services/sceneAnalyzer.service";
import { db } from "~/server/db";
import { messageBus } from "./message-bus";

// Local types
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

// ScenePlannerAgentPatched class
export class ScenePlannerAgentPatched extends BaseAgentPatched {
  // Store a reference to the global message bus as fallback
  private messageBusFallback = messageBus;
  
  constructor(taskManager: TaskManager) {
    super(
      "ScenePlannerAgent",
      taskManager,
      "Creates structured scene plans for videos",
      true,
    );
    this.modelName = env.DEFAULT_ADB_MODEL || "gpt-3.5-turbo"; // Use a smaller model to avoid quota issues
    this.temperature = 1;
    a2aLogger.info("system", `ScenePlannerAgent constructor finished. Model: ${this.modelName}, Temp: ${this.temperature}. OpenAI Client: ${this.openai ? 'Available' : 'Not Available'}`, { module: "agent_constructor" });
    a2aLogger.info("system", `ScenePlannerAgent will use handleScenePlan from scenePlanner.service.ts for scene processing`, { module: "agent_constructor", integration: "scenePlanner.service.ts" });
    
    // Validate message bus connection
    if (env.USE_MESSAGE_BUS) {
      // Direct reference to bus property - will use the properly imported version
      if (!this.bus) {
        a2aLogger.error("system", "ScenePlannerAgent: Message bus is undefined in BaseAgent. Will use global messageBus as fallback.", { module: "agent_constructor" });
      } else {
        a2aLogger.info("system", "ScenePlannerAgent: Message bus connection from BaseAgent is available.", { module: "agent_constructor" });
      }
    }
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
      
      // Fallback to direct messageBus if bus from BaseAgent is not available
      await this.messageBusFallback.publish(message);
      a2aLogger.info(taskId, "Message published using fallback bus", { ...logContext, messageType: message.type });
      return true;
    } catch (error) {
      a2aLogger.error(taskId, "Failed to publish message to bus", { ...logContext, error: String(error) });
      return false;
    }
  }

  /**
   * Process incoming messages
   */
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const { type, payload, sender } = message;
    const taskId = payload.taskId;
    const logContext = { agent: this.name, sender, messageType: type, taskId };
    
    a2aLogger.info(taskId, `Processing message from ${sender}: ${type}`, logContext);
    
    try {
      if (type === "generate_scene_plan") {
        // Request to generate a scene plan
        a2aLogger.info(taskId, "Received scene plan generation request", logContext);
        
        const prompt = payload.message?.parts?.[0]?.text;
        if (!prompt) {
          throw new Error("Missing prompt in scene plan request");
        }
        
        a2aLogger.info(taskId, "Generating scene plan for prompt", { ...logContext, promptLength: prompt.length });
        
        try {
          // Generate the scene plan
          const scenePlan = await this.generateScenePlan(taskId, prompt);
          a2aLogger.info(taskId, `Generated plan with ${scenePlan.scenes.length} scenes`, { ...logContext, totalDuration: scenePlan.totalDuration });
          
          // Process and save the scene plan
          const processedPlan = await handleScenePlan(taskId, prompt, scenePlan);
          
          // Create response message
          const responseMessage = this.createA2AMessage(
            "scene_plan_completed",
            taskId,
            sender,
            this.createSimpleTextMessage(`Scene plan created with ${scenePlan.scenes.length} scenes: ${scenePlan.scenes.map(s => s.description.substring(0, 30)).join("; ").substring(0, 100)}...`),
            undefined,
            message.id, // Use original message ID as correlation
            { scenePlan: processedPlan }
          );
          
          // Publish to message bus if enabled
          await this.publishToMessageBus(responseMessage, taskId, { ...logContext, action: "scene_plan_completed" });
          
          // Also return the message for direct handler
          return responseMessage;
        } catch (error: any) {
          const errorMessage = this.createA2AMessage(
            "scene_plan_failed",
            taskId,
            sender,
            this.createSimpleTextMessage(`Failed to generate scene plan: ${error.message}`),
            undefined,
            message.id
          );
          
          await this.publishToMessageBus(errorMessage, taskId, { ...logContext, action: "scene_plan_failed", error: error.message });
          return errorMessage;
        }
      } else if (type === "analyze_scene_content") {
        // Request to analyze scene content
        a2aLogger.info(taskId, "Received scene content analysis request", logContext);
        
        try {
          const scenes = payload.scenes;
          if (!scenes || !Array.isArray(scenes)) {
            throw new Error("Missing scenes array in analysis request");
          }
          
          const analysis = await analyzeSceneContent(scenes);
          
          const responseMessage = this.createA2AMessage(
            "scene_analysis_completed",
            taskId,
            sender,
            this.createSimpleTextMessage(`Analyzed ${scenes.length} scenes`),
            undefined,
            message.id,
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
            message.id
          );
          
          await this.publishToMessageBus(errorMessage, taskId, { ...logContext, action: "scene_analysis_failed", error: error.message });
          return errorMessage;
        }
      } else {
        a2aLogger.warn(taskId, `Received unsupported message type: ${type}`, logContext);
        return null;
      }
    } catch (error: any) {
      a2aLogger.error(taskId, `Error processing message: ${error.message}`, { ...logContext, error: error.stack });
      
      const errorMessage = this.createA2AMessage(
        "error",
        taskId,
        sender,
        this.createSimpleTextMessage(`Error processing ${type}: ${error.message}`),
        undefined,
        message.id
      );
      
      await this.publishToMessageBus(errorMessage, taskId, { ...logContext, action: "error", error: error.message });
      return errorMessage;
    }
  }

  /**
   * Generate a scene plan based on a prompt
   */
  async generateScenePlan(taskId: string, prompt: string): Promise<EnhancedScenePlan> {
    const systemPrompt = `You are an expert video planner. Generate a JSON scene plan based on the prompt.
The scene plan should include:
- A series of scenes, each with a description, duration in seconds (1-20), and optional effect type
- Each scene should have a unique ID
- The total duration should be calculated from the individual scenes
- Include intent, style, and mood to guide the video generation

Format your response as a valid JSON object with the following structure:
{
  "scenes": [
    {
      "id": "scene-123",
      "description": "Scene description here",
      "durationInSeconds": 5,
      "effectType": "text" // optional
    }
  ],
  "totalDuration": 15,
  "intent": "Purpose of the video",
  "reasoning": "Why you chose this scene sequence",
  "fps": 30,
  "style": "Visual style like minimalist, colorful, etc.",
  "mood": "Emotional tone like energetic, calm, professional"
}`;

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
}
