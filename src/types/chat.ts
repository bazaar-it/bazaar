// src/types/chat.ts
import type { Operation } from "fast-json-patch";
import type { InferSelectModel } from "drizzle-orm";
import { messages } from "~/server/db/schema";

/**
 * Represent the status of a scene during generation
 */
export type SceneStatus = "pending" | "building" | "success" | "error";

/**
 * The structure of a scene result during planning
 */
export interface SceneResult {
  sceneId: string;
  type: string;
  durationInFrames: number;
  jobId?: string;
  effect?: string;
  status: SceneStatus;
  error?: string;
}

/**
 * Component job tracking information
 */
export interface ComponentJob {
  description: string;
  jobId: string;
  name: string;
}

/**
 * Response from scene planning operation
 */
export interface ScenePlanResponse {
  message: string;
  patches?: Operation[];
}

/**
 * Status update event types for streaming
 */
export enum StreamEventType {
  CHUNK = "chunk",
  TOOL_CALL = "toolCall",
  CONTENT_COMPLETE = "contentComplete",
  SCENE_STATUS = "sceneStatus",
  TOOL_RESULT = "toolResult",
  ERROR = "error",
  DONE = "done",
}

/**
 * Streaming events for real-time updates
 */
export type StreamEvent =
  | { type: "status"; status: "thinking" | "tool_calling" | "building" }
  | { type: "delta"; content: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_result"; name: string; success: boolean; jobId?: string | null; finalContent?: string }
  | { type: "complete"; finalContent: string }
  | { type: "error"; error: string; finalContent?: string }
  | { type: "finalized"; status: "success" | "error" | "building" | "pending"; jobId?: string | null }
  | { type: "scenePlan"; plan: any; status: "planning_complete" }
  | { type: "sceneStatus"; sceneId: string; sceneIndex: number; status: "pending" | "building" | "success" | "error"; jobId?: string; error?: string };

/**
 * Scene analysis for component generation
 */
export interface SceneAnalysis {
  requiredElements: string[];
  visualStyle: string;
  complexity: number;
  suggestedComponentName: string;
}

/**
 * Message model from the database
 */
export type Message = InferSelectModel<typeof messages>; 