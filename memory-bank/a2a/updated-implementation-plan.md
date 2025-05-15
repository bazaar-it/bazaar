//memory-bank/a2a/updated-implementation-plan.md

# Bazaar-Vid A2A Implementation Plan

This document outlines the plan for updating our Agent-to-Agent (A2A) system to align with the Google A2A protocol standards, creating a more interoperable and standardized implementation.

## Executive Summary

Our current A2A design provides a solid foundation but requires several key enhancements to comply with Google's A2A specifications:

1. **Standardize Task Lifecycle**: Adopt the A2A standard task states instead of custom component job statuses
2. **Add Agent Discovery**: Implement AgentCard endpoints for each agent
3. **Support Structured Content Types**: Enhance message format to handle different content modalities
4. **Implement SSE Streaming**: Replace Pusher with Server-Sent Events for real-time updates

This plan details how to implement these changes while minimizing disruption to existing functionality.

## 1. Standardizing Task Lifecycle

### Current State

Our component generation pipeline currently uses custom status values in the database:

```typescript
// Custom job statuses
'pending' | 'generating' | 'building' | 'fixing' | 'built' | 'r2_failed' | 'fix_failed' | 'complete' | 'failed'
```

### Target State

Implement the standard A2A task states:

```typescript
type TaskState =
  | 'submitted' // Task received, acknowledged, not yet processing
  | 'working'   // Task actively being processed
  | 'input-required' // Agent needs additional input to proceed
  | 'completed' // Task finished successfully
  | 'canceled'  // Task canceled by client or server
  | 'failed'    // Task terminated due to error
  | 'unknown';  // Task state cannot be determined
```

### Implementation Steps

1. **Database Schema Update**

```typescript
// Update customComponentJobs table schema
export const customComponentJobs = pgTable('bazaar-vid_custom_component_job', {
  // Existing fields...
  status: text('status').$type<A2ATaskState>(),
  internalStatus: text('internal_status').$type<ComponentJobStatus>(), // For internal tracking
  // New fields
  task_id: text('task_id').notNull(), // A2A task ID
  requires_input: boolean('requires_input').default(false),
  input_type: text('input_type'), // What kind of input is needed
  // ...
});
```

2. **State Mapping**

Create a bidirectional mapping between our internal statuses and A2A statuses:

```typescript
// src/server/a2a/taskStateMapping.ts
export function mapInternalToA2AState(internalStatus: ComponentJobStatus): A2ATaskState {
  switch (internalStatus) {
    case 'pending': return 'submitted';
    case 'generating':
    case 'building':
    case 'fixing': return 'working';
    case 'built': return 'working'; // Still need R2 verification
    case 'r2_failed':
    case 'fix_failed':
    case 'failed': return 'failed';
    case 'complete': return 'completed';
    default: return 'unknown';
  }
}

export function requiresUserInput(internalStatus: ComponentJobStatus): boolean {
  // Determine if this state needs user input
  return ['fix_failed', 'r2_failed'].includes(internalStatus);
}
```

3. **Task Management**

Create a task manager to handle A2A task lifecycle:

```typescript
// src/server/a2a/taskManager.ts
export class TaskManager {
  async createTask(projectId: string, params: any): Promise<Task> {
    // Generate task ID
    const taskId = crypto.randomUUID();
    
    // Create component job
    const componentJobId = await db.insert(customComponentJobs).values({
      id: crypto.randomUUID(),
      projectId,
      effect: params.name || 'Custom Component',
      status: 'submitted',
      internalStatus: 'pending',
      task_id: taskId,
      createdAt: new Date(),
    }).returning({ id: customComponentJobs.id });
    
    // Return task object
    return {
      id: taskId,
      state: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Other task fields...
    };
  }
  
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    // Retrieve component job by task ID
    const job = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.task_id, taskId)
    });
    
    if (!job) {
      return {
        id: taskId,
        state: 'unknown',
        updatedAt: new Date().toISOString(),
      };
    }
    
    // Map to A2A state
    const state = mapInternalToA2AState(job.internalStatus);
    
    return {
      id: taskId,
      state,
      updatedAt: job.updatedAt?.toISOString() || new Date().toISOString(),
      message: job.errorMessage ? {
        parts: [{ text: job.errorMessage }]
      } : undefined,
      artifacts: job.outputUrl ? [
        {
          id: `component-${job.id}`,
          mimeType: 'application/javascript',
          url: job.outputUrl
        }
      ] : undefined
    };
  }
  
  // Other methods for updating task state, adding artifacts, etc.
}
```

4. **API Endpoints**

Implement the JSON-RPC endpoints required by A2A:

```typescript
// src/app/api/a2a/route.ts
import { NextRequest, NextResponse } from "next/server";
import { taskManager } from "~/server/a2a/taskManager";

export async function POST(req: NextRequest) {
  const jsonRpcRequest = await req.json();
  
  // Validate JSON-RPC request
  if (jsonRpcRequest.jsonrpc !== "2.0" || !jsonRpcRequest.method || !jsonRpcRequest.id) {
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid Request"
      },
      id: jsonRpcRequest.id || null
    }, { status: 400 });
  }
  
  // Handle methods
  try {
    switch (jsonRpcRequest.method) {
      case "tasks/create":
        const task = await taskManager.createTask(
          jsonRpcRequest.params.projectId,
          jsonRpcRequest.params
        );
        return NextResponse.json({
          jsonrpc: "2.0",
          result: task,
          id: jsonRpcRequest.id
        });
        
      case "tasks/get":
        const taskStatus = await taskManager.getTaskStatus(
          jsonRpcRequest.params.id
        );
        return NextResponse.json({
          jsonrpc: "2.0",
          result: taskStatus,
          id: jsonRpcRequest.id
        });
      
      // Other method handlers...
      
      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not found"
          },
          id: jsonRpcRequest.id
        }, { status: 404 });
    }
  } catch (error) {
    console.error("A2A JSON-RPC Error:", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
        data: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      id: jsonRpcRequest.id
    }, { status: 500 });
  }
}
```

## 2. Agent Discovery via AgentCards

### Implementation Steps

1. **Define Agent Cards**

Create card definitions for each agent:

```typescript
// src/server/a2a/agentCards.ts
import { AgentCard } from "./types";

export const builderAgentCard: AgentCard = {
  id: "builder-agent",
  name: "Builder Agent",
  description: "Generates and builds Remotion component code from animation design briefs",
  provider: {
    name: "Bazaar-Vid",
    url: "https://bazaar-vid.example.com"
  },
  url: "https://bazaar-vid.example.com/api/a2a/builder",
  streaming: true,
  pushNotifications: true,
  skills: [
    {
      id: "generate-component",
      name: "Generate Component",
      description: "Generate a Remotion component from an animation design brief",
      inputModes: ["text"],
      outputModes: ["text", "file"],
      inputSchema: {
        type: "object",
        properties: {
          animationDesignBrief: {
            type: "object",
            // Schema for animation design brief
          },
          projectId: {
            type: "string",
            format: "uuid"
          }
        },
        required: ["animationDesignBrief", "projectId"]
      },
      examples: [
        {
          name: "Generate Fade In Text Animation",
          description: "Create a component with text that fades in",
          input: {
            message: {
              parts: [
                {
                  text: "Create a text animation that fades in"
                }
              ]
            }
          },
          output: {
            message: {
              parts: [
                {
                  text: "Component generated successfully"
                }
              ]
            },
            artifacts: [
              {
                id: "component-123",
                mimeType: "application/javascript",
                url: "https://example.com/components/123"
              }
            ]
          }
        }
      ]
    }
  ]
};

// Define cards for other agents (ErrorFixer, R2Storage, etc.)
```

2. **Agent Discovery Endpoint**

```typescript
// src/app/api/a2a/agent-card/[agentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { 
  builderAgentCard, 
  errorFixerAgentCard,
  // Other agent cards 
} from "~/server/a2a/agentCards";

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string }}
) {
  const agentId = params.agentId;
  
  // Find the requested agent card
  let agentCard;
  switch (agentId) {
    case "builder":
      agentCard = builderAgentCard;
      break;
    case "error-fixer":
      agentCard = errorFixerAgentCard;
      break;
    // Other agents...
    default:
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  
  return NextResponse.json(agentCard);
}
```

3. **Agent Directory**

```typescript
// src/app/api/a2a/agent-directory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { 
  builderAgentCard, 
  errorFixerAgentCard,
  // Other agent cards 
} from "~/server/a2a/agentCards";

export async function GET(req: NextRequest) {
  // Return a simplified list of all available agents
  const agents = [
    {
      id: builderAgentCard.id,
      name: builderAgentCard.name,
      description: builderAgentCard.description,
      url: `/api/a2a/agent-card/${builderAgentCard.id}`
    },
    {
      id: errorFixerAgentCard.id,
      name: errorFixerAgentCard.name,
      description: errorFixerAgentCard.description,
      url: `/api/a2a/agent-card/${errorFixerAgentCard.id}`
    },
    // Other agents...
  ];
  
  return NextResponse.json({ agents });
}
```

## 3. Support for Structured Content Types

### Implementation Steps

1. **Define Message Types**

```typescript
// src/server/a2a/types.ts
export interface MessagePart {
  text?: string;
  data?: Record<string, any>;
  file?: {
    mimeType: string;
    data?: string; // Base64 encoded
    url?: string;
  };
}

export interface Message {
  parts: MessagePart[];
}

export interface Artifact {
  id: string;
  mimeType: string;
  url?: string;
  data?: string; // Base64 encoded
  description?: string;
}

export interface Task {
  id: string;
  state: TaskState;
  createdAt: string;
  updatedAt: string;
  message?: Message;
  artifacts?: Artifact[];
}

export interface TaskStatus {
  id: string;
  state: TaskState;
  updatedAt: string;
  message?: Message;
  artifacts?: Artifact[];
}
```

2. **Enhanced Message Handling**

```typescript
// src/server/agents/base-agent.ts
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

export abstract class BaseAgent {
  readonly name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  abstract processMessage(message: StructuredAgentMessage): Promise<StructuredAgentMessage | null>;
  
  createMessage(
    type: string, 
    taskId: string,
    recipient: string,
    messageParts?: MessagePart[],
    artifacts?: Artifact[]
  ): StructuredAgentMessage {
    return {
      type,
      task_id: taskId,
      message: messageParts ? { parts: messageParts } : undefined,
      artifacts,
      sender: this.name,
      recipient,
      id: crypto.randomUUID(),
    };
  }
  
  // Helper methods for creating common message part types
  createTextPart(text: string): MessagePart {
    return { text };
  }
  
  createDataPart(data: Record<string, any>): MessagePart {
    return { data };
  }
  
  createFilePart(mimeType: string, url: string): MessagePart {
    return { 
      file: {
        mimeType,
        url
      }
    };
  }
  
  createArtifact(id: string, mimeType: string, url: string, description?: string): Artifact {
    return {
      id,
      mimeType,
      url,
      description
    };
  }
}
```

3. **Update Agents to Use Structured Messages**

For example, updating the BuilderAgent:

```typescript
// src/server/agents/builder-agent.ts
export class BuilderAgent extends BaseAgent {
  // ...
  
  async processMessage(message: StructuredAgentMessage): Promise<StructuredAgentMessage | null> {
    if (message.type === 'BUILD_COMPONENT_REQUEST') {
      const { task_id } = message;
      // Extract data from the message - assuming it's in the first data part
      const dataPart = message.message?.parts.find(part => part.data);
      const animationDesignBrief = dataPart?.data?.animationDesignBrief;
      const projectId = dataPart?.data?.projectId;
      
      if (!animationDesignBrief || !projectId) {
        return this.createMessage(
          'COMPONENT_PROCESS_ERROR',
          task_id,
          'CoordinatorAgent',
          [this.createTextPart('Missing required animation design brief or project ID')]
        );
      }
      
      try {
        // Build logic...
        const result = await this.buildComponent(task_id, animationDesignBrief, projectId);
        
        if (result.success) {
          return this.createMessage(
            'COMPONENT_BUILD_SUCCESS',
            task_id,
            'R2StorageAgent',
            [this.createTextPart('Component built successfully')],
            [this.createArtifact(
              `component-${task_id}`,
              'application/javascript',
              result.outputUrl,
              'Generated Remotion component'
            )]
          );
        } else {
          return this.createMessage(
            'COMPONENT_BUILD_ERROR',
            task_id,
            'ErrorFixerAgent',
            [
              this.createTextPart('Component build failed'),
              this.createDataPart({
                componentCode: result.code,
                errors: result.errors
              })
            ]
          );
        }
      } catch (error) {
        return this.createMessage(
          'COMPONENT_PROCESS_ERROR',
          task_id,
          'CoordinatorAgent',
          [this.createTextPart(`Error: ${error.message}`)]
        );
      }
    }
    
    // Other message type handlers...
    
    return null;
  }
}
```

## 4. SSE Streaming

### Implementation Steps

1. **Define SSE Event Types**

```typescript
// src/server/a2a/sseEvents.ts
export interface TaskStatusUpdateEvent {
  type: 'task_status_update';
  data: {
    task_id: string;
    state: TaskState;
    message?: Message;
  };
}

export interface TaskArtifactUpdateEvent {
  type: 'task_artifact_update';
  data: {
    task_id: string;
    artifact: Artifact;
  };
}

export type SSEEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent;
```

2. **SSE Endpoint**

```typescript
// src/app/api/a2a/tasks/[taskId]/stream/route.ts
import { NextRequest } from "next/server";
import { taskManager } from "~/server/a2a/taskManager";

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string }}
) {
  const taskId = params.taskId;
  
  // Validate task existence
  const task = await taskManager.getTaskStatus(taskId);
  if (task.state === 'unknown') {
    return new Response('Task not found', { status: 404 });
  }
  
  // Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      function sendEvent(event: SSEEvent) {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
      
      // Initial state
      sendEvent({
        type: 'task_status_update',
        data: {
          task_id: taskId,
          state: task.state,
          message: task.message
        }
      });
      
      // Send artifact info if available
      if (task.artifacts && task.artifacts.length > 0) {
        for (const artifact of task.artifacts) {
          sendEvent({
            type: 'task_artifact_update',
            data: {
              task_id: taskId,
              artifact
            }
          });
        }
      }
      
      // Register for updates
      const cleanup = taskManager.subscribeToTaskUpdates(taskId, (update) => {
        if (update.type === 'status') {
          sendEvent({
            type: 'task_status_update',
            data: {
              task_id: taskId,
              state: update.state,
              message: update.message
            }
          });
        } else if (update.type === 'artifact') {
          sendEvent({
            type: 'task_artifact_update',
            data: {
              task_id: taskId,
              artifact: update.artifact
            }
          });
        }
      });
      
      // Close stream when appropriate (e.g., task reaches terminal state)
      const intervalId = setInterval(async () => {
        const currentStatus = await taskManager.getTaskStatus(taskId);
        if (['completed', 'failed', 'canceled', 'unknown'].includes(currentStatus.state)) {
          clearInterval(intervalId);
          cleanup();
          controller.close();
        }
      }, 5000);
      
      // Handle client disconnection
      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        cleanup();
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

3. **Task Manager Updates**

Add subscription support to the TaskManager:

```typescript
// src/server/a2a/taskManager.ts
interface TaskUpdateCallback {
  (update: TaskUpdate): void;
}

interface TaskUpdate {
  type: 'status' | 'artifact';
  state?: TaskState;
  message?: Message;
  artifact?: Artifact;
}

export class TaskManager {
  private taskSubscriptions: Map<string, Set<TaskUpdateCallback>> = new Map();
  
  // ... other methods
  
  subscribeToTaskUpdates(taskId: string, callback: TaskUpdateCallback): () => void {
    if (!this.taskSubscriptions.has(taskId)) {
      this.taskSubscriptions.set(taskId, new Set());
    }
    
    const callbacks = this.taskSubscriptions.get(taskId)!;
    callbacks.add(callback);
    
    // Return cleanup function
    return () => {
      const callbacks = this.taskSubscriptions.get(taskId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.taskSubscriptions.delete(taskId);
        }
      }
    };
  }
  
  updateTaskStatus(taskId: string, state: TaskState, message?: Message): void {
    // Update database...
    
    // Notify subscribers
    this.notifyTaskUpdate(taskId, {
      type: 'status',
      state,
      message
    });
  }
  
  addTaskArtifact(taskId: string, artifact: Artifact): void {
    // Update database...
    
    // Notify subscribers
    this.notifyTaskUpdate(taskId, {
      type: 'artifact',
      artifact
    });
  }
  
  private notifyTaskUpdate(taskId: string, update: TaskUpdate): void {
    const callbacks = this.taskSubscriptions.get(taskId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(update);
        } catch (error) {
          console.error(`Error in task update callback for task ${taskId}:`, error);
        }
      }
    }
  }
}
```

4. **Replace Pusher with SSE in Frontend**

```typescript
// src/client/hooks/useTaskStream.ts
import { useState, useEffect } from 'react';
import { TaskState, Message, Artifact } from '~/server/a2a/types';

interface TaskStatusUpdate {
  state: TaskState;
  message?: Message;
}

export function useTaskStream(taskId: string | null) {
  const [status, setStatus] = useState<TaskStatusUpdate | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!taskId) return;
    
    let eventSource: EventSource;
    let isClosed = false;
    
    const startStream = () => {
      setIsStreaming(true);
      setError(null);
      
      eventSource = new EventSource(`/api/a2a/tasks/${taskId}/stream`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'task_status_update') {
            setStatus({
              state: data.data.state,
              message: data.data.message
            });
            
            // Close stream if we reach a terminal state
            if (['completed', 'failed', 'canceled'].includes(data.data.state)) {
              closeStream();
            }
          } else if (data.type === 'task_artifact_update') {
            setArtifacts(prev => [...prev, data.data.artifact]);
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };
      
      eventSource.onerror = () => {
        setError('Error connecting to task stream');
        closeStream();
      };
    };
    
    const closeStream = () => {
      if (isClosed) return;
      
      if (eventSource) {
        eventSource.close();
      }
      
      setIsStreaming(false);
      isClosed = true;
    };
    
    startStream();
    
    return closeStream;
  }, [taskId]);
  
  return { status, artifacts, isStreaming, error };
}
```

## Migration Plan

To implement these changes with minimal disruption, we recommend this phased approach:

### Phase 1: Preparation (2 weeks)

1. Create the necessary new database schema changes
2. Implement the TaskManager and BaseAgent updates
3. Create the AgentCard definitions
4. Develop SSE infrastructure

### Phase 2: Endpoint Implementation (2 weeks)

1. Create JSON-RPC endpoints for task management
2. Implement the SSE streaming endpoints
3. Develop the agent discovery endpoints
4. Create frontend hooks for SSE streaming

### Phase 3: Agent Refactoring (3 weeks)

1. Refactor BuilderAgent to use structured messages
2. Update ErrorFixerAgent to use the new message format
3. Modify CoordinatorAgent to handle task state transitions
4. Adapt R2StorageAgent and UIAgent

### Phase 4: Testing and Validation (2 weeks)

1. Create comprehensive test suite for A2A compliance
2. Validate all endpoints against the Google A2A specification
3. Test with external A2A clients
4. Stress test the SSE implementation

### Phase 5: UI Integration and Rollout (1 week)

1. Update the frontend to use the new SSE streaming
2. Replace Pusher-based updates with SSE
3. Deploy and monitor the system

## Conclusion

By implementing these changes, our Bazaar-Vid A2A system will become fully compliant with the Google A2A protocol specification. This will enable:

1. **Interoperability** with other A2A-compliant agents
2. **Better monitoring** of component generation through standardized task states
3. **Enhanced robustness** with Server-Sent Events replacing Pusher
4. **Increased flexibility** with structured message parts
5. **Future extensibility** through the well-defined agent discovery mechanism

The implementation plan is designed to minimize disruption while enhancing our existing A2A architecture to meet industry standards.
