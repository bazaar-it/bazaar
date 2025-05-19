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
import type { ToolCallAccumulator } from "~/types/chat";
import { chatLogger } from "~/lib/logger";

interface ToolCallResponse {
  message: string;
  patches?: Operation[];
}

export async function handleApplyJsonPatch(
  projectId: string,
  operations: Operation[],
  explanation?: string
): Promise<ToolCallResponse> {
  const messageId = "apply-json-patch";

  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid or empty patch operations",
    });
  }

  chatLogger.tool(messageId, "applyJsonPatch", `Applying ${operations.length} JSON patch operations to project ${projectId}`);

  await db.insert(patches).values({
    projectId,
    patch: operations as JsonPatch,
  });

  return {
    message: explanation || `Applied ${operations.length} patch operations to your video.`,
    patches: operations,
  };
}

export async function handleGenerateComponent(
  projectId: string,
  userId: string,
  effectDescription: string,
  assistantMessageId: string
): Promise<ToolCallResponse> {
  const startTime = Date.now();
  const messageId = assistantMessageId || "generate-component";

  if (!effectDescription || typeof effectDescription !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Missing or invalid effect description",
    });
  }

  chatLogger.tool(messageId, "generateRemotionComponent", `Generating component for project ${projectId} with description: ${effectDescription}`);

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
  chatLogger.tool(messageId, "generateRemotionComponent", `Generated component ${effect} (jobId: ${jobId}) in ${duration}ms`);

  return {
    message: `I'm generating a custom "${effect}" component based on your description. This might take a minute. You'll be able to add it to your timeline once it's ready.`,
  };
}

export async function handlePlanScenes(
  projectId: string,
  userId: string,
  scenePlan: any,
  assistantMessageId: string,
  emitter: Subject<any>
): Promise<ToolCallResponse> {
  const startTime = Date.now();
  const messageId = assistantMessageId || "plan-scenes";

  if (!scenePlan || !scenePlan.scenes || !Array.isArray(scenePlan.scenes)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid scene plan format",
    });
  }

  chatLogger.tool(messageId, "planVideoScenes", `Planning video with ${scenePlan.scenes.length} scenes for project ${projectId}`);

  try {
    for (let i = 0; i < scenePlan.scenes.length; i++) {
      const scene = scenePlan.scenes[i];
      if (!scene.id) {
        chatLogger.tool(messageId, "planVideoScenes", `Scene at index ${i} is missing an ID`);
      }
      if (!scene.description) {
        chatLogger.tool(messageId, "planVideoScenes", `Scene ${scene.id || i} is missing a description`);
      }
      if (typeof scene.durationInSeconds !== "number") {
        chatLogger.tool(messageId, "planVideoScenes", `Scene ${scene.id || i} has invalid duration: ${scene.durationInSeconds}`);
      }
      if (!scene.effectType) {
        chatLogger.tool(messageId, "planVideoScenes", `Scene ${scene.id || i} is missing an effect type`);
      }
    }
  } catch (validationError) {
    chatLogger.error(messageId, `Error validating scene plan`, { error: validationError });
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
  chatLogger.tool(messageId, "planVideoScenes", `Scene planning completed in ${duration}ms with ${result.patches?.length || 0} patches`);

  return result;
}
