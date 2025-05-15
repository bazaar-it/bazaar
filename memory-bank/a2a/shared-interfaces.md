# A2A Shared Interfaces

This document contains the definitive TypeScript interfaces that both developers should use when implementing their portions of the A2A protocol. Keeping these interfaces in sync is critical for successful integration.

## Core Types

```typescript
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
  | 'r2_failed' 
  | 'fix_failed' 
  | 'complete' 
  | 'failed';

/**
 * Part of a structured message in the A2A protocol
 * @see https://github.com/google/A2A/blob/main/docs/tasks.md#message-parts
 */
export interface MessagePart {
  text?: string;
  data?: Record<string, any>;
  file?: {
    mimeType: string;
    data?: string; // Base64 encoded
    url?: string;
  };
}

/**
 * A structured message consisting of multiple parts
 */
export interface Message {
  parts: MessagePart[];
}

/**
 * An artifact produced by a task
 * @see https://github.com/google/A2A/blob/main/docs/tasks.md#artifacts
 */
export interface Artifact {
  id: string;
  mimeType: string;
  url?: string;
  data?: string; // Base64 encoded
  description?: string;
}

/**
 * A task in the A2A protocol
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
 * A task status response
 */
export interface TaskStatus {
  id: string;
  state: TaskState;
  updatedAt: string;
  message?: Message;
  artifacts?: Artifact[];
}
```

## JSON-RPC Request/Response Types

```typescript
/**
 * Standard JSON-RPC 2.0 request
 * @see https://www.jsonrpc.org/specification
 */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, any>;
  id: string | number;
}

/**
 * Standard JSON-RPC 2.0 success response
 */
export interface JsonRpcSuccessResponse {
  jsonrpc: "2.0";
  result: any;
  id: string | number;
}

/**
 * Standard JSON-RPC 2.0 error response
 */
export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

/**
 * Union type for JSON-RPC responses
 */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;
```

## Agent Discovery Types

```typescript
/**
 * Agent skill definition
 * @see https://github.com/google/A2A/blob/main/docs/agent.md#agent-skills
 */
export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  inputModes: Array<'text' | 'file' | 'data'>;
  outputModes: Array<'text' | 'file' | 'data'>;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  examples?: Array<{
    name: string;
    description?: string;
    input: {
      message: Message;
    };
    output: {
      message?: Message;
      artifacts?: Artifact[];
    };
  }>;
}

/**
 * Agent card definition
 * @see https://github.com/google/A2A/blob/main/docs/agent.md#agent-card
 */
export interface AgentCard {
  id: string;
  name: string;
  description: string;
  provider: {
    name: string;
    url: string;
  };
  url: string;
  streaming: boolean;
  pushNotifications: boolean;
  skills: AgentSkill[];
}
```

## SSE Event Types

```typescript
/**
 * Event for task status updates via SSE
 */
export interface TaskStatusUpdateEvent {
  type: 'task_status_update';
  data: {
    task_id: string;
    state: TaskState;
    message?: Message;
  };
}

/**
 * Event for task artifact updates via SSE
 */
export interface TaskArtifactUpdateEvent {
  type: 'task_artifact_update';
  data: {
    task_id: string;
    artifact: Artifact;
  };
}

/**
 * Union type for all SSE events
 */
export type SSEEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent;
```

## Agent Message Types

```typescript
/**
 * Structured message format for agent-to-agent communication
 */
export interface StructuredAgentMessage {
  type: string;
  task_id: string;
  message?: Message;
  artifacts?: Artifact[];
  sender: string;
  recipient: string;
  id: string;
  correlationId?: string;
}
```

## Implementation Guidelines

1. All type definitions should match exactly between both implementations
2. Any changes to these interfaces must be communicated to both developers
3. Add new types to this document as needed, but notify the other developer
4. When in doubt, refer to the Google A2A protocol documentation

## Integration Points

The following areas require particularly careful coordination:

1. **Task State Transitions**: Both components need to agree on valid state transitions
2. **Message Format**: Ensure message parts are consistently structured
3. **SSE Event Structure**: Events must follow the same format for frontend integration
4. **Error Handling**: Coordinate error codes and messages across components 