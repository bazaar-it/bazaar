// src/types/a2a.ts
/**
 * Type definitions for Google A2A protocol implementation
 * @see https://github.com/google/A2A
 */

import crypto from "crypto";
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard A2A task states as defined in the Google A2A protocol
 * @see https://github.com/google/A2A/blob/main/docs/tasks.md#task-states
 */
export type TaskState =
  | 'submitted' // Task received, acknowledged, not yet processing
  | 'working'   // Task actively being processed
  | 'input-required' // Agent needs additional input to proceed
  | 'completed' // Task finished successfully
  | 'canceled'  // Task canceled by client or server
  | 'failed'    // Task terminated due to error
  | 'unknown';  // Task state cannot be determined

/**
 * Mapping from our internal component job statuses to A2A task states
 */
export type ComponentJobStatus = 
  | 'pending' 
  | 'generating' 
  | 'building'
  | 'fixing'
  | 'built'
  | 'complete'
  | 'failed'
  | 'r2_failed'
  | 'fix_failed';

/**
 * Convert internal status to A2A task state
 */
export const mapInternalToA2AState = (internalStatus: ComponentJobStatus): TaskState => {
  switch (internalStatus) {
    case 'pending':
      return 'submitted';
    case 'generating':
    case 'building':
    case 'fixing':
      return 'working';
    case 'built':
    case 'complete':
      return 'completed';
    case 'r2_failed':
    case 'fix_failed':
    case 'failed':
      return 'failed';
    default:
      return 'unknown';
  }
};

/**
 * Convert A2A task state to internal status
 */
export const mapA2AToInternalState = (a2aState: TaskState): ComponentJobStatus => {
  switch (a2aState) {
    case 'submitted':
      return 'pending';
    case 'working':
      return 'generating'; // Default to initial working state
    case 'completed':
      return 'complete';
    case 'failed':
      return 'failed';
    case 'input-required':
      return 'pending'; // Map to pending but with requiresInput flag
    default:
      return 'pending';
  }
};

/**
 * Check if the current status requires user input
 */
export const requiresUserInput = (state: TaskState): boolean => {
  return state === 'input-required';
};

/**
 * Standard content part types for A2A messages
 */
export type PartType = 'text' | 'file' | 'data';

/**
 * Base interface for message parts
 */
export interface Part {
  type: PartType;
  id?: string;
}

/**
 * Text part for messages
 */
export interface TextPart extends Part {
  type: 'text';
  text: string;
}

/**
 * Data part for structured data
 */
export interface DataPart extends Part {
  type: 'data';
  mimeType: string;
  data: any;
}

/**
 * File part for file references
 */
export interface FilePart extends Part {
  type: 'file';
  mimeType: string;
  url: string;
}

/**
 * A2A Message containing one or more parts
 */
export interface Message {
  id: string;
  createdAt: string;
  parts: Part[];
  metadata?: Record<string, any>; // Added optional metadata field
}

/**
 * Artifact representing outputs from tasks
 */
export interface Artifact {
  id: string;
  type: string; // e.g., 'file', 'data'
  mimeType: string;
  url?: string;
  data?: any;
  description?: string;
  name?: string;
  createdAt: string;
}

/**
 * Task status representation for A2A
 */
export interface TaskStatus {
  id: string;
  state: TaskState;
  updatedAt: string;
  message?: Message;
  artifacts?: Artifact[];
  progress?: number; // Progress value between 0-100
}

/**
 * Full task representation for A2A
 */
export interface Task {
  id: string;
  state: TaskState;
  createdAt: string;
  updatedAt: string;
  message?: Message;
  artifacts?: Artifact[];
}

/**
 * JSON-RPC 2.0 Request
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: any;
}

/**
 * JSON-RPC 2.0 Error
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

/**
 * JSON-RPC 2.0 Success Response
 */
export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result: any;
}

/**
 * JSON-RPC 2.0 Error Response
 */
export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcError;
}

/**
 * Specific event type for task status updates, to be nested within SSEEvent.data
 */
export interface TaskStatusUpdateData {
  task_id: string;
  state: TaskState;
  message?: Message;
  // Add any other relevant status fields if needed
}

/**
 * Specific event type for task artifact updates, to be nested within SSEEvent.data
 */
export interface TaskArtifactUpdateData {
  task_id: string;
  artifact: Artifact;
  // Add any other relevant artifact fields if needed
}

/**
 * Data structure for agent messages from the Message Bus
 */
export interface AgentMessageData {
  task_id: string;
  message_id: string;
  from: string;
  to: string;
  type: string;
  timestamp: string;
  payload: any; // Component job, scene plan, error, etc.
}

/**
 * Data structure for agent communication events - used for visualizing agent interactions
 */
export interface AgentCommunicationData {
  type: 'agent_communication';
  data: {
    from: string;
    to: string;
    messageType: string;
    timestamp: string;
    taskId: string;
    payload?: any;
  };
}

/**
 * Discriminated union for the actual payload of an SSEEvent's data field (after JSON parsing)
 */
export type SSEEventPayload =
  | { type: 'task_status_update'; data: TaskStatusUpdateData }
  | { type: 'task_artifact_update'; data: TaskArtifactUpdateData }
  | { type: 'agent_message'; data: AgentMessageData }
  | { type: 'agent_communication'; data: AgentCommunicationData['data'] }
  | { type: 'error'; data: { code: number; message: string } }
  | { type: 'heartbeat'; data: { timestamp: string } };

/**
 * SSE Event structure as sent over the wire.
 * The `data` field is a JSON string of an SSEEventPayload object.
 */
export interface SSEEvent {
  id: string;       // Event ID, can be used for resynchronization
  event?: string;    // Optional: event type (e.g., 'message', 'status_update'). SSE standard field.
  data: string;     // JSON stringified SSEEventPayload
  retry?: number;    // Optional: reconnection time in ms. SSE standard field.
}

/**
 * Agent skill definition, aligning with Google A2A specification.
 * @see https://github.com/google/A2A/blob/main/docs/agent.md#agentskill
 */
export interface AgentSkill {
  id: string;
  name: string;
  description?: string | null; // Made description optional as per official spec examples
  tags?: string[] | null;
  examples?: Array<{
    name: string;
    description?: string | null;
    input: { message: Message }; 
    output?: { message?: Message; artifacts?: Artifact[] }; // Output is optional
  }> | null;
  inputModes?: Array<'text' | 'file' | 'data'> | null;
  outputModes?: Array<'text' | 'file' | 'data'> | null;
  inputSchema?: Record<string, any> | null; 
  outputSchema?: Record<string, any> | null; 
}

/**
 * Agent Capabilities according to A2A.
 * @see https://github.com/google/A2A/blob/main/docs/agent.md#agentcapabilities
 */
export interface AgentCapabilities {
  streaming: boolean;
  pushNotifications: boolean;
  stateTransitionHistory: boolean; // Indicates if the agent provides detailed task history
}

/**
 * Agent card definition, aligning with Google A2A specification.
 * @see https://github.com/google/A2A/blob/main/docs/agent.md#agentcard
 */
export interface AgentCard {
  // id: string; // Official A2A spec does not have `id` at the root of AgentCard itself, discovery is via URL.
  name: string;
  description?: string | null; // Optional
  url: string; // The agent's own A2A endpoint URL (JSON-RPC endpoint)
  provider?: {
    name: string;
    url?: string | null;
    description?: string | null; // Added optional description for provider
  } | null;
  version: string;
  documentationUrl?: string | null;
  capabilities: AgentCapabilities;
  authentication?: any | null; // More specific types can be used (e.g., OAuth, APIKey)
  defaultInputModes?: Array<'text' | 'file' | 'data'> | null;
  defaultOutputModes?: Array<'text' | 'file' | 'data'> | null;
  skills: AgentSkill[]; // Skills array is not optional in the spec
}

/**
 * Structured A2A-compliant message between agents
 */
export interface StructuredAgentMessage {
  id: string;
  taskId: string;
  sender: string;
  recipient: string;
  type: string;
  message?: Message;
  artifacts?: Artifact[];
  createdAt: string;
}

/**
 * Parameters for generating an Animation Design Brief
 */
export interface AnimationBriefGenerationParams {
  projectId: string; 
  sceneId: string;
  scenePurpose: string; 
  sceneElementsDescription: string; 
  desiredDurationInFrames: number;
  dimensions: { 
      width: number;
      height: number;
  };
  currentVideoContext?: string; 
  targetAudience?: string; 
  brandGuidelines?: string; 
  componentJobId?: string; // This is our internal ID, maps to A2A taskId
}

// Helper Functions

/**
 * Create a text message
 */
export const createTextMessage = (text: string): Message => {
  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    parts: [
      { type: 'text', text } as TextPart
    ]
  };
};

/**
 * Create a file artifact
 */
export const createFileArtifact = (
  id: string,
  url: string,
  mimeType: string = 'application/javascript',
  description?: string,
  name?: string
): Artifact => {
  return {
    id: id,
    type: 'file',
    mimeType,
    url,
    description,
    name,
    createdAt: new Date().toISOString()
  };
};

/**
 * Create a structured agent message
 */
export const createStructuredAgentMessage = (
  type: string,
  taskId: string,
  sender: string,
  recipient: string,
  message?: Message,
  artifacts?: Artifact[]
): StructuredAgentMessage => {
  return {
    id: uuidv4(),
    taskId,
    sender,
    recipient,
    type,
    message,
    artifacts,
    createdAt: new Date().toISOString()
  };
};

/**
 * Create a status update SSE event
 */
export const createStatusUpdateEvent = (taskStatus: TaskStatus): SSEEvent => {
  return {
    id: uuidv4(),
    event: 'status',
    data: JSON.stringify(taskStatus)
  };
};

/**
 * Create an artifact update SSE event
 */
export const createArtifactUpdateEvent = (artifact: Artifact): SSEEvent => {
  return {
    id: uuidv4(),
    event: 'artifact',
    data: JSON.stringify(artifact)
  };
}; 