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
  constructor(taskManager: TaskManager) {
    super(
      "ScenePlannerAgent",
      taskManager,
      "Creates structured scene plans for videos",
      true,
    );

    this.modelName = "gpt-4o-mini"; // creative LLM
    this.temperature = 0.7;

    a2aLogger.info(
      "agent_init",
      `ScenePlannerAgent constructed at ${new Date().toISOString()}`,
    );
    globalThis.__SCENE_PLANNER_AGENT_CONSTRUCTED = new Date().toISOString();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Public API – the only method other actors call
  // ──────────────────────────────────────────────────────────────────────────────
  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const taskId = message.payload?.taskId ?? message.id ?? randomUUID();
    const logPrefix = `[ScenePlannerAgent][${taskId}]`;
    const start = Date.now();

    const prompt =
      message.payload?.prompt ||
      (Array.isArray(message.payload?.message?.parts)
        ? message.payload!.message.parts.find(
            (p: any) => typeof p?.text === "string",
          )?.text ?? "Create a generic video scene plan"
        : "Create a generic video scene plan");

    a2aLogger.info(`${logPrefix} Received message`, {
      messageId: message.id,
      sender: message.sender,
      promptPreview: prompt.slice(0, 60),
    });

    // 1️⃣ Mark task as working
    await this.taskManager.updateTaskStatus(
      taskId,
      "working",
      this.createSimpleTextMessage("Planning scenes for your video…"),
    );

    try {
      // 2️⃣ Generate scene plan via LLM
      const scenePlan = await this.generateScenePlan(prompt);

      // 3️⃣ Optional scene analysis – flag super‑complex scenes
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

      // 4️⃣ Persist in DB (so the editor can pick it up later)
      await handleScenePlan(
        taskId,
        message.payload?.userId ?? "system",
        {
          scenes: scenePlan.scenes,
          intent: scenePlan.intent,
          reasoning: scenePlan.reasoning ?? "",
          fps: scenePlan.fps ?? 30,
        },
        `msg-${uuidv4()}`,
        db,
      );

      // 5️⃣ Mark task as completed
      await this.taskManager.updateTaskStatus(
        taskId,
        "completed",
        this.createSimpleTextMessage(
          `Scene plan ready – ${scenePlan.scenes.length} scenes, total ${scenePlan.totalDuration.toFixed(
            1,
          )} s$${flaggedScenes.length ? `; ⚠️ check ${flaggedScenes.join(", ")}` : ""}.`,
        ),
      );

      // 6️⃣ Emit bus response
      const response: AgentMessage = {
        id: uuidv4(),
        type: "SCENE_PLAN_COMPLETED",
        sender: this.name,
        recipient: message.sender,
        payload: {
          taskId,
          projectId: message.payload?.projectId,
          scenePlan,
          correlationId: message.id,
        },
      };

      if (env.USE_MESSAGE_BUS) await this.bus.publish(response);

      a2aLogger.info(`${logPrefix} Completed in ${(Date.now() - start) / 1000}s`);
      return env.USE_MESSAGE_BUS ? null : response;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      a2aLogger.error(`${logPrefix} Error: ${errorMsg}`);

      await this.taskManager.updateTaskStatus(
        taskId,
        "failed",
        this.createSimpleTextMessage(`Failed to create scene plan: ${errorMsg}`),
      );

      const errorResponse: AgentMessage = {
        id: uuidv4(),
        type: "SCENE_PLAN_ERROR",
        sender: this.name,
        recipient: message.sender,
        payload: {
          taskId,
          error: errorMsg,
          correlationId: message.id,
        },
      };

      if (env.USE_MESSAGE_BUS) await this.bus.publish(errorResponse);
      return env.USE_MESSAGE_BUS ? null : errorResponse;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private async generateScenePlan(prompt: string): Promise<EnhancedScenePlan> {
    const systemPrompt = `You are an expert video editor creating a scene plan for a short video.\n- Ensure smooth transitions between scenes\n- Vary scene types for visual interest\n- Consider the overall narrative flow\n- Total video length should be 15‒60 seconds\n\nReturn **valid JSON only** in the following schema:\n{\n  \"intent\": string,\n  \"reasoning\": string,\n  \"scenes\": [\n    { id, description, durationInSeconds, effectType? }\n  ],\n  \"fps\": number\n}`;

    const raw = await this.generateStructuredResponse<EnhancedScenePlan>(
      prompt,
      systemPrompt,
    );
    if (!raw || !Array.isArray(raw.scenes) || !raw.scenes.length) {
      throw new Error("LLM returned no scenes");
    }

    const scenes: Scene[] = raw.scenes.map((s, i) => ({
      id: s.id || `scene-${i + 1}`,
      description: s.description || `Scene ${i + 1}`,
      durationInSeconds: Math.max(3, Math.min(10, s.durationInSeconds || 5)),
      effectType: s.effectType ?? "text",
    }));

    const totalDuration = scenes.reduce((sum, s) => sum + s.durationInSeconds, 0);

    return {
      scenes,
      totalDuration,
      intent: raw.intent || "Generated video based on prompt",
      reasoning: raw.reasoning,
      fps: raw.fps ?? 30,
      style: raw.style,
      mood: raw.mood,
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

  // A tiny helper so we don’t have to import createTextMessage everywhere
  public createSimpleTextMessage(text: string): Message {
    return {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      parts: [{ type: "text", text } as TextPart],
    };
  }
}
