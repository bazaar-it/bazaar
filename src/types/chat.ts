// src/types/chat.ts
import type { Operation } from "fast-json-patch";
import type { InferSelectModel } from "drizzle-orm";
import { messages } from "~/server/db/schema";

/**
 * Represent the status of a scene during generation
 */
export type SceneStatus = "pending" | "building" | "success" | "error" | "tool_calling";

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
  id: string;
  name: string;
  prompt: string;
  description?: string;
  jobId?: string; // For backwards compatibility
  variation?: string;
  timeframe?: string;
}

/**
 * Response from scene planning operation
 */
export interface ScenePlanResponse {
  message: string;
  patches?: Operation[];
}

/**
 * For accumulating tool call fragments across stream chunks
 */
export interface ToolCallAccumulator {
  id?: string;
  index: number;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
  complete: boolean;
}

/**
 * Enhanced message updates for chat panel
 */
export interface MessageUpdates {
  status?: "pending" | "error" | "success" | "building" | "tool_calling";
  kind?: "text" | "error" | "status" | "tool_result";
  content?: string;
  delta?: string;
  jobId?: string | null;
  toolName?: string;
  toolStartTime?: number;
  executionTimeSeconds?: number | null;
  eventId?: string;
}

/**
 * Records the state of a tool call to support reconnections
 */
export interface ToolCallState {
  messageId: string;
  timestamp: number;
  accumulatedCalls: Record<number, ToolCallAccumulator>;
  streamedContent: string;
  executedCalls: string[]; // IDs of already executed tool calls
  status: 'accumulating' | 'executing' | 'completed' | 'error';
  error?: string;
}

/**
 * Represents a buffered event for possible replay
 */
export interface BufferedEvent {
  id: string;
  messageId: string;
  timestamp: number;
  event: StreamEvent;
  processed: boolean;
}

/**
 * Configuration for the event buffer
 */
export interface EventBufferConfig {
  maxBufferSize: number;
  bufferExpiryMs: number;
  reconnectWindowMs: number;
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
  PROGRESS = "progress",
  RECONNECTED = "reconnected", // New event type for reconnection
}

/**
 * Streaming events for real-time updates
 */
export type StreamEvent =
  | { type: "status"; status: "thinking" | "tool_calling" | "building" }
  | { type: "delta"; content: string; eventId?: string }
  | { type: "tool_start"; name: string; eventId?: string }
  | { type: "tool_result"; name: string; success: boolean; jobId?: string | null; finalContent?: string; eventId?: string }
  | { type: "complete"; finalContent: string; eventId?: string }
  | { type: "error"; error: string; finalContent?: string; eventId?: string }
  | { type: "finalized"; status: "success" | "error" | "building" | "pending"; jobId?: string | null; eventId?: string }
  | { type: "scenePlan"; plan: any; status: "planning_complete"; eventId?: string }
  | { type: "sceneStatus"; sceneId: string; sceneIndex: number; status: "pending" | "building" | "success" | "error"; jobId?: string; error?: string; eventId?: string }
  | { type: "progress"; message: string; eventId?: string }
  | { type: "reconnected"; lastEventId?: string; missedEvents: number; eventId?: string };

/**
 * Connection metadata for a streaming client
 */
export interface ClientConnection {
  clientId: string;
  messageId: string;
  lastEventId?: string;
  lastEventTime: number;
  isActive: boolean;
  disconnectedAt?: number;
}

/**
 * Scene analysis for component generation
 */
export interface SceneAnalysis {
  requiredElements: string[];
  visualStyle: string;
  complexity: number;
  suggestedComponentName: string;
  isFirstScene?: boolean;
  isLastScene?: boolean;
}

/**
 * Message model from the database
 */
export type Message = InferSelectModel<typeof messages>; 