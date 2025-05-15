//memory-bank/a2a/core-components.md

# A2A System Core Components

This document details the core components of the Agent-to-Agent (A2A) system and their implementation, aligned with Google's A2A protocol.

## A2A Protocol Types

First, let's define the key A2A protocol types that our system will use:

```typescript
// src/types/a2a.ts
export type Role = "user" | "agent";

export interface TextPart {
  type: "text";
  text: string;
  metadata?: Record<string, any> | null;
}

export interface FilePart {
  type: "file";
  file: {
    name?: string | null;
    mimeType?: string | null;
    bytes?: string | null; // Base64 encoded content
    uri?: string | null;   // URL to the file
  };
  metadata?: Record<string, any> | null;
}

export interface DataPart {
  type: "data";
  data: Record<string, any>;
  metadata?: Record<string, any> | null;
}

export type Part = TextPart | FilePart | DataPart;

export interface Message {
  role: Role;
  parts: Part[];
  metadata?: Record<string, any> | null;
}

export interface Artifact {
  name?: string | null;
  description?: string | null;
  parts: Part[];
  index: number;
  append?: boolean | null;
  lastChunk?: boolean | null;
  metadata?: Record<string, any> | null;
}

export type TaskState = "submitted" | "working" | "input-required" | "completed" | "canceled" | "failed" | "unknown";

export interface TaskStatus {
  state: TaskState;
  message: Message | null;
  timestamp: string; // ISO 8601 timestamp
}

export interface AgentCapabilities {
  streaming: boolean;
  pushNotifications: boolean;
  stateTransitionHistory: boolean;
}

export interface AgentSkill {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  examples?: string[] | null;
  inputModes?: string[] | null;
  outputModes?: string[] | null;
}

export interface AgentCard {
  name: string;
  description: string | null;
  url: string;
  provider: {
    name: string;
    description?: string | null;
  } | null;
  version: string;
  documentationUrl: string | null;
  capabilities: AgentCapabilities;
  authentication: any | null;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentSkill[];
}
```

## BaseAgent

The foundation for all agents in the system, providing standardized message handling capabilities with A2A protocol support.

```typescript
// src/server/agents/base-agent.ts
import { 
  TaskState, 
  TaskStatus, 
  Message, 
  Part, 
  Artifact, 
  TextPart 
} from '~/types/a2a';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export interface AgentMessage {
  type: string;            // The message type (e.g., 'BUILD_COMPONENT_REQUEST')
  payload: Record<string, any>; // Message data
  sender: string;          // Sender agent name
  recipient: string;       // Recipient agent name
  id: string;              // Unique message ID
  correlationId?: string;  // For linking related messages
}

export abstract class BaseAgent {
  readonly name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  // Core method that each agent must implement to process messages
  abstract processMessage(message: AgentMessage): Promise<AgentMessage | null>;
  
  // Helper method to create properly structured messages
  createMessage(type: string, payload: Record<string, any>, recipient: string): AgentMessage {
    return {
      type,
      payload,
      sender: this.name,
      recipient,
      id: crypto.randomUUID(),
    };
  }
  
  // Helper to create a simple text message
  createTextMessage(role: "user" | "agent", text: string): Message {
    const textPart: TextPart = {
      type: "text",
      text
    };
    
    return {
      role,
      parts: [textPart]
    };
  }
  
  // Helper to create a file artifact
  createFileArtifact(name: string, url: string, mimeType: string = "application/javascript"): Artifact {
    return {
      name,
      parts: [{
        type: "file",
        file: {
          name,
          uri: url,
          mimeType
        }
      }],
      index: 0
    };
  }
  
  // Helper to create a message with structured parts
  createMessageWithParts(
    type: string,
    parts: Part[],
    recipient: string,
    correlationId?: string
  ): AgentMessage {
    return {
      type,
      payload: { 
        message: {
          role: "agent",
          parts
        }
      },
      sender: this.name,
      recipient,
      id: crypto.randomUUID(),
      correlationId
    };
  }
  
  // Update task state according to A2A protocol
  async updateTaskState(
    componentJobId: string, 
    state: TaskState,
    message?: Message
  ): Promise<void> {
    const taskStatus: TaskStatus = {
      state,
      message: message || null,
      timestamp: new Date().toISOString()
    };
    
    await db.update(customComponentJobs)
      .set({ 
        status: state,
        taskState: taskStatus,
        updatedAt: new Date()
      })
      .where(eq(customComponentJobs.id, componentJobId));
  }
  
  // Add an artifact to a task
  async addTaskArtifact(
    componentJobId: string,
    artifact: Artifact
  ): Promise<void> {
    const job = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, componentJobId)
    });
    
    const artifacts = job?.artifacts ? [...job.artifacts, artifact] : [artifact];
    
    await db.update(customComponentJobs)
      .set({ 
        artifacts,
        updatedAt: new Date()
      })
      .where(eq(customComponentJobs.id, componentJobId));
  }
}
```

## MessageBus

The central communication system that routes messages between agents, now with A2A protocol support and SSE streaming.

```typescript
// src/server/agents/message-bus.ts
import { AgentMessage, BaseAgent } from './base-agent';
import { db } from '~/server/db';
import { agentMessages } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { Subject } from 'rxjs';

export class MessageBus {
  private agents: Map<string, BaseAgent> = new Map();
  private subscribers: Map<string, ((message: AgentMessage) => Promise<void>)[]> = new Map();
  private eventSubjects: Map<string, Subject<any>> = new Map(); // For SSE streaming
  
  // Register an agent with the message bus
  register(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
    this.subscribers.set(agent.name, []);
  }
  
  // Get an agent by name
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }
  
  // Send a message to its recipient
  async publish(message: AgentMessage, progress?: string): Promise<void> {
    // Store message in database for persistence
    await db.insert(agentMessages).values({
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      type: message.type,
      payload: message.payload,
      correlationId: message.correlationId,
      status: 'pending',
      createdAt: new Date(),
    });
    
    // If progress is provided, create a progress message
    if (progress && message.payload.componentJobId) {
      // Emit progress event to any active SSE streams
      this.emitTaskUpdate(message.payload.componentJobId, {
        id: message.payload.componentJobId,
        status: {
          state: 'working',
          message: {
            role: 'agent',
            parts: [{ type: 'text', text: progress }]
          },
          timestamp: new Date().toISOString()
        },
        final: false
      });
    }
    
    // Find the recipient agent and deliver the message
    const recipient = this.agents.get(message.recipient);
    if (recipient) {
      const response = await recipient.processMessage(message);
      
      // Update message status
      await db.update(agentMessages)
        .set({ status: 'processed', processedAt: new Date() })
        .where(eq(agentMessages.id, message.id));
        
      // If there's a response, publish it
      if (response) {
        await this.publish({
          ...response,
          correlationId: message.correlationId || message.id,
        });
      }
    }
  }
  
  // Allow external systems to monitor messages
  subscribe(agentName: string, callback: (message: AgentMessage) => Promise<void>): () => void {
    const subs = this.subscribers.get(agentName) || [];
    subs.push(callback);
    this.subscribers.set(agentName, subs);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(agentName) || [];
      this.subscribers.set(agentName, subs.filter(cb => cb !== callback));
    };
  }
  
  // Create an SSE stream for a task
  createTaskStream(componentJobId: string): Subject<any> {
    // Create a new subject for this stream
    const subject = new Subject<any>();
    this.eventSubjects.set(componentJobId, subject);
    
    // Return cleanup function
    return subject;
  }
  
  // Emit task update to SSE stream
  emitTaskUpdate(componentJobId: string, event: any): void {
    const subject = this.eventSubjects.get(componentJobId);
    if (subject) {
      subject.next(event);
      
      // If this is a final event, complete the subject
      if (event.final) {
        subject.complete();
        this.eventSubjects.delete(componentJobId);
      }
    }
  }
  
  // Close all streams and clean up
  cleanup(): void {
    // Complete all active streams
    for (const subject of this.eventSubjects.values()) {
      subject.complete();
    }
    this.eventSubjects.clear();
  }
}

export const messageBus = new MessageBus();
```

## System Setup

Code to initialize the agent system and register all agents:

```typescript
// src/server/agents/setup.ts
import { messageBus } from './message-bus';
import { BuilderAgent } from './builder-agent';
import { ErrorFixerAgent } from './error-fixer-agent';
import { CoordinatorAgent } from './coordinator-agent';
import { R2StorageAgent } from './r2-storage-agent';
import { UIAgent } from './ui-agent';
import { ADBAgent } from './adb-agent';

export function setupAgentSystem() {
  const agents = [
    new BuilderAgent(),
    new ErrorFixerAgent(),
    new CoordinatorAgent(),
    new R2StorageAgent(),
    new UIAgent(),
    new ADBAgent(),
  ];
  
  for (const agent of agents) {
    messageBus.register(agent);
    console.log(`Registered agent: ${agent.name}`);
  }
  
  return messageBus;
}
```

## tRPC Integration

API endpoints to interact with the agent system:

```typescript
// src/server/api/routers/agent.ts
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { z } from 'zod';
import { CoordinatorAgent } from '~/server/agents/coordinator-agent';
import { messageBus } from '~/server/agents/message-bus';
import { observable } from '@trpc/server/observable';

const coordinatorAgent = new CoordinatorAgent();
messageBus.register(coordinatorAgent);

export const agentRouter = createTRPCRouter({
  // Start a component generation process
  createComponent: protectedProcedure
    .input(z.object({
      animationDesignBrief: z.any(), // Use your AnimationDesignBrief schema
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const { animationDesignBrief, projectId } = input;
      const message = coordinatorAgent.initiateComponentCreation(animationDesignBrief, projectId);
      await messageBus.publish(message);
      
      return { 
        success: true, 
        componentJobId: message.payload.componentJobId 
      };
    }),
    
  // Get task details with A2A format
  getTask: protectedProcedure
    .input(z.object({
      componentJobId: z.string().uuid(),
      historyLength: z.number().default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { componentJobId, historyLength } = input;
      
      const component = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, componentJobId)
      });
      
      if (!component) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }
      
      // Return in A2A Task format
      return {
        id: component.id,
        sessionId: null,
        status: component.taskState || {
          state: component.status,
          message: null,
          timestamp: component.updatedAt?.toISOString() || component.createdAt.toISOString()
        },
        artifacts: component.artifacts || [],
        history: historyLength > 0 ? (component.history || []).slice(-historyLength) : null,
        metadata: component.metadata || null
      };
    }),
    
  // Subscribe to real-time task updates via SSE
  subscribeToTask: protectedProcedure
    .input(z.object({
      componentJobId: z.string().uuid(),
      clientId: z.string().optional(),
      lastEventId: z.string().optional()
    }))
    .subscription(async ({ input }) => {
      const { componentJobId } = input;
      
      // Create observable for SSE updates
      return observable((emit) => {
        // Create a new event stream for this task
        const subject = messageBus.createTaskStream(componentJobId);
        
        // Subscribe to task updates
        const subscription = subject.subscribe({
          next: (event) => {
            emit.next(event);
          },
          error: (err) => {
            emit.error(err);
          },
          complete: () => {
            emit.complete();
          }
        });
        
        // Return cleanup function
        return () => {
          subscription.unsubscribe();
        };
      });
    }),
    
  // View agent message history for debugging
  getMessageHistory: protectedProcedure
    .input(z.object({
      componentJobId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { componentJobId } = input;
      
      // Fetch all messages related to this component job
      const messages = await ctx.db.select()
        .from(agentMessages)
        .where(sql`${agentMessages.payload}->>'componentJobId' = ${componentJobId}`)
        .orderBy(agentMessages.createdAt);
      
      return messages;
    }),
});
```

## REST API for A2A Protocol Compliance

In addition to tRPC endpoints, we add standard REST API routes for A2A protocol compatibility:

```typescript
// src/app/api/agents/[agentName]/tasks/send/route.ts
import { NextResponse } from 'next/server';
import { messageBus } from '~/server/agents/message-bus';

export async function POST(
  request: Request,
  { params }: { params: { agentName: string } }
) {
  try {
    const agentName = params.agentName;
    const body = await request.json();
    const { id, sessionId, message } = body.params;
    
    // Check if agent exists
    const agent = messageBus.getAgent(agentName);
    if (!agent) {
      return NextResponse.json(
        { error: { code: -32601, message: "Agent not found" } },
        { status: 404 }
      );
    }
    
    // Create and publish message to agent
    const agentMessage = agent.createMessageWithParts(
      'CREATE_COMPONENT_REQUEST',
      message.parts,
      agentName
    );
    
    // Set the componentJobId to the provided task id
    agentMessage.payload.componentJobId = id;
    
    await messageBus.publish(agentMessage);
    
    // Get the task details to return
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, id)
    });
    
    if (!component) {
      return NextResponse.json(
        { error: { code: -32001, message: "Task not found" } },
        { status: 404 }
      );
    }
    
    // Return task in A2A format
    return NextResponse.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        id: component.id,
        sessionId,
        status: component.taskState || {
          state: component.status,
          message: null,
          timestamp: component.updatedAt?.toISOString() || component.createdAt.toISOString()
        },
        artifacts: component.artifacts || [],
        history: null,
        metadata: component.metadata || null
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        jsonrpc: "2.0", 
        id: body?.id, 
        error: { 
          code: -32603, 
          message: "Internal error", 
          data: error.message 
        } 
      },
      { status: 500 }
    );
  }
}
```

## SSE Implementation for A2A Streaming

```typescript
// src/app/api/agents/[agentName]/tasks/sendSubscribe/route.ts
import { streamResponse } from 'next/server';
import { messageBus } from '~/server/agents/message-bus';

export async function POST(
  request: Request,
  { params }: { params: { agentName: string } }
) {
  const agentName = params.agentName;
  const body = await request.json();
  const { id, sessionId, message } = body.params;
  
  // Check if agent exists
  const agent = messageBus.getAgent(agentName);
  if (!agent) {
    return NextResponse.json(
      { error: { code: -32601, message: "Agent not found" } },
      { status: 404 }
    );
  }
  
  // Create streaming response
  return streamResponse(async (stream) => {
    try {
      // Create a subject for this stream
      const subject = messageBus.createTaskStream(id);
      
      // Subscribe to task updates
      const subscription = subject.subscribe({
        next: (event) => {
          stream.write(event);
        },
        error: (err) => {
          stream.write({
            id,
            status: {
              state: 'failed',
              message: {
                role: "agent",
                parts: [{ type: "text", text: err.message }]
              },
              timestamp: new Date().toISOString()
            },
            final: true
          });
          stream.close();
        },
        complete: () => {
          stream.close();
        }
      });
      
      // Create and publish message to agent
      const agentMessage = agent.createMessageWithParts(
        'CREATE_COMPONENT_REQUEST',
        message.parts,
        agentName
      );
      
      // Set the componentJobId to the provided task id
      agentMessage.payload.componentJobId = id;
      
      await messageBus.publish(agentMessage);
      
      // Handle stream closing
      stream.onClose(() => {
        subscription.unsubscribe();
      });
    } catch (error) {
      stream.write({
        id,
        status: {
          state: 'failed',
          message: {
            role: "agent",
            parts: [{ type: "text", text: error.message }]
          },
          timestamp: new Date().toISOString()
        },
        final: true
      });
      stream.close();
    }
  });
}
```

## Agent Card Implementation

```typescript
// src/app/.well-known/agent.json/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Return the coordinator agent card in A2A format
  return NextResponse.json({
    name: "Bazaar-Vid Component Coordinator",
    description: "Creates and manages custom video components for Bazaar-Vid",
    url: "/api/agents/coordinator",
    provider: {
      name: "Bazaar-Vid",
      description: "Intelligent Video Creation Platform"
    },
    version: "1.0.0",
    documentationUrl: "/docs/agents",
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: true
    },
    authentication: null,
    defaultInputModes: ["text", "data"],
    defaultOutputModes: ["text", "file"],
    skills: [
      {
        id: "create-component",
        name: "Create Component",
        description: "Generate and build a custom video component",
        tags: ["video", "component", "generation"],
        examples: [
          "Create a text animation component",
          "Generate a particle effect component"
        ]
      }
    ]
  });
}
```

These core components provide the foundation for an A2A protocol-compliant implementation, enabling standardized task states, structured content types, SSE streaming, and external agent discovery.
