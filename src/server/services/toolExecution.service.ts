// @ts-nocheck
// src/server/services/toolExecution.service.ts
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import type { Subject } from "rxjs";
import { type Operation } from "fast-json-patch";
import { db } from "~/server/db";
import { patches } from "~/server/db/schema";
import { handleScenePlan } from "./scenePlanner.service";
import { generateComponent } from "./componentGenerator.service";
import type { InputProps } from "~/types/input-props";
import type { JsonPatch } from "~/types/json-patch";
import type { ToolCallAccumulator, StreamEventType } from "~/types/chat";
import { chatLogger } from "~/lib/logger";

/**
 * Interface for tool call responses
 */
export interface ToolCallResponse {
  message: string;
  patches?: Operation[];
  success?: boolean;
  error?: string;
}

/**
 * Represents a tool handler function
 */
export type ToolHandler = (
  projectId: string, 
  userId: string, 
  args: any, 
  assistantMessageId: string, 
  emitter?: Subject<{type: StreamEventType; [key: string]: any}>
) => Promise<ToolCallResponse>;

/**
 * Registry of available tools and their handlers
 */
export class ToolExecutionService {
  private toolHandlers: Record<string, ToolHandler> = {};

  constructor() {
    // Register default tools
    this.registerTool("applyJsonPatch", this.handleApplyJsonPatch.bind(this));
    this.registerTool("generateRemotionComponent", this.handleGenerateComponent.bind(this));
    this.registerTool("planVideoScenes", this.handlePlanScenes.bind(this));
  }

  /**
   * Registers a new tool handler
   * 
   * @param toolName - Name of the tool to register
   * @param handler - Function to handle the tool call
   */
  registerTool(toolName: string, handler: ToolHandler): void {
    this.toolHandlers[toolName] = handler;
  }

  /**
   * Executes a tool call with parsed arguments
   * 
   * @param toolName - Name of the tool to execute
   * @param projectId - ID of the project context
   * @param userId - ID of the user
   * @param args - Parsed arguments for the tool
   * @param assistantMessageId - ID of the assistant message
   * @param emitter - Optional event emitter for progress updates
   * @returns Tool call response with results
   */
  async executeTool(
    toolName: string,
    projectId: string,
    userId: string,
    args: any,
    assistantMessageId: string,
    emitter?: Subject<{type: StreamEventType; [key: string]: any}>
  ): Promise<ToolCallResponse> {
    const handler = this.toolHandlers[toolName];
    
    if (!handler) {
      chatLogger.tool(assistantMessageId, toolName, `Unknown tool call`, {
        toolName
      });
      return {
        message: `Error: Unknown tool call "${toolName}"`,
        success: false,
        error: `Unknown tool: ${toolName}`
      };
    }
    
    try {
      const startTime = Date.now();
      chatLogger.tool(assistantMessageId, toolName, `Executing tool call`);
      
      const response = await handler(projectId, userId, args, assistantMessageId, emitter);
      
      const executionTime = Date.now() - startTime;
      chatLogger.tool(assistantMessageId, toolName, `Executed in`, {
        duration: executionTime
      });
      
      // Ensure success property is set
      return {
        ...response,
        success: response.success !== false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      chatLogger.error(assistantMessageId, `Error executing tool ${toolName}: ${errorMessage}`);
      
      return {
        message: `Error: ${errorMessage}`,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Handles JSON patch application
   */
  private async handleApplyJsonPatch(
    projectId: string,
    userId: string,
    args: { operations: Operation[]; explanation?: string },
    assistantMessageId: string
  ): Promise<ToolCallResponse> {
    const { operations, explanation } = args;
    
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid or empty patch operations",
      });
    }

    chatLogger.tool(assistantMessageId, "applyJsonPatch", `Applying ${operations.length} JSON patch operations to project ${projectId}`);

    await db.insert(patches).values({
      projectId,
      patch: operations as JsonPatch,
    });

    return {
      message: explanation || `Applied ${operations.length} patch operations to your video.`,
      patches: operations,
    };
  }

  /**
   * Handles component generation
   */
  private async handleGenerateComponent(
    projectId: string,
    userId: string,
    args: { effectDescription: string },
    assistantMessageId: string
  ): Promise<ToolCallResponse> {
    const { effectDescription } = args;
    const startTime = Date.now();

    if (!effectDescription || typeof effectDescription !== "string") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Missing or invalid effect description",
      });
    }

    chatLogger.tool(assistantMessageId, "generateRemotionComponent", `Generating component for project ${projectId} with description: ${effectDescription}`);

    const tempSceneId = randomUUID();
    const briefParams = {
      projectId,
      sceneId: tempSceneId,
      scenePurpose: effectDescription,
      sceneElementsDescription: effectDescription,
      desiredDurationInFrames: 6 * 30,
      dimensions: { width: 1920, height: 1080 },
    };

    const { brief, briefId } = await import("~/server/services/animationDesigner.service")
      .then((module) => module.generateAnimationDesignBrief(briefParams));

    const { jobId, effect } = await generateComponent(
      projectId,
      brief,
      assistantMessageId,
      6,
      30,
      tempSceneId,
      userId,
      briefId
    );

    const duration = Date.now() - startTime;
    chatLogger.tool(assistantMessageId, "generateRemotionComponent", `Generated component ${effect} (jobId: ${jobId}) in ${duration}ms`);

    return {
      message: `I'm generating a custom "${effect}" component based on your description. This might take a minute. You'll be able to add it to your timeline once it's ready.`,
    };
  }

  /**
   * Handles video scene planning
   */
  private async handlePlanScenes(
    projectId: string,
    userId: string,
    args: any,
    assistantMessageId: string,
    emitter?: Subject<any>
  ): Promise<ToolCallResponse> {
    const startTime = Date.now();
    const scenePlan = args;

    if (!scenePlan?.scenes || !Array.isArray(scenePlan.scenes)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid scene plan format",
      });
    }

    chatLogger.tool(assistantMessageId, "planVideoScenes", `Planning video with ${scenePlan.scenes.length} scenes for project ${projectId}`);

    try {
      for (let i = 0; i < scenePlan.scenes.length; i++) {
        const scene = scenePlan.scenes[i];
        if (!scene.id) {
          chatLogger.tool(assistantMessageId, "planVideoScenes", `Scene at index ${i} is missing an ID`);
        }
        if (!scene.description) {
          chatLogger.tool(assistantMessageId, "planVideoScenes", `Scene ${scene.id || i} is missing a description`);
        }
        if (typeof scene.durationInSeconds !== "number") {
          chatLogger.tool(assistantMessageId, "planVideoScenes", `Scene ${scene.id || i} has invalid duration: ${scene.durationInSeconds}`);
        }
        if (!scene.effectType) {
          chatLogger.tool(assistantMessageId, "planVideoScenes", `Scene ${scene.id || i} is missing an effect type`);
        }
      }
    } catch (validationError) {
      chatLogger.error(assistantMessageId, `Error validating scene plan`, { error: validationError });
    }

    if (!emitter) {
      throw new Error("Emitter is required for scene planning");
    }

    const result = await handleScenePlan(
      projectId,
      userId,
      scenePlan,
      assistantMessageId,
      db,
      emitter
    );

    const duration = Date.now() - startTime;
    chatLogger.tool(assistantMessageId, "planVideoScenes", `Scene planning completed in ${duration}ms with ${result.patches?.length || 0} patches`);

    return result;
  }
}

// Export singleton instance
export const toolExecutionService = new ToolExecutionService();
