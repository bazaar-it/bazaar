# A2A Agent Intelligence Implementation Guide

## Overview

Following Google's [official A2A specification](https://google.github.io/A2A/specification/), each agent in the system must be an opaque "black box" with its own reasoning capabilities, while communicating through a standardized protocol. This document outlines how to integrate LLMs into your agents while maintaining compliance with the A2A protocol.

## Core A2A Protocol Components

The A2A protocol requires these key components for agent communication:

1. **JSON-RPC**: All agent communication follows JSON-RPC 2.0 format
2. **Task Management**: Tasks with defined lifecycle states (submitted, working, input-required, completed, canceled, failed)
3. **Streaming**: Real-time updates via SSE (Server-Sent Events)
4. **Message Parts**: Support for different content types (text, file, data)
5. **Artifacts**: Structured outputs returned by agents
6. **Agent Cards**: Capability advertisement for discovery

## 1. Base Agent Implementation with LLM

```typescript
// src/server/agents/base-agent.ts

import { OpenAI } from 'openai';
import { TaskManager } from '../services/a2a/taskManager.service';
import { MessageBus } from '../services/a2a/messageBus.service';
import { a2aLogger } from '~/lib/logger';
import { 
  Task, TaskState, Message, TextPart, 
  DataPart, FilePart, Artifact, TaskStatus 
} from '~/types/a2a';

export abstract class BaseAgent {
  protected openai: OpenAI;
  private agentCard: AgentCard;
  
  constructor(
    protected readonly agentName: string,
    protected readonly taskManager: TaskManager,
    protected readonly messageBus: MessageBus,
    protected readonly modelName: string = 'gpt-4o-mini',
    protected readonly temperature: number = 0.7,
  ) {
    // Initialize LLM client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Initialize agent card for discovery
    this.agentCard = this.createAgentCard();
    
    // Register with message bus for receiving tasks
    this.messageBus.registerAgent(this);
    a2aLogger.info(null, `Agent ${agentName} initialized with model ${modelName}`);
  }
  
  /**
   * Create Agent Card for capability discovery
   * Following A2A specifications at: https://google.github.io/A2A/specification/agent-discovery/
   */
  protected createAgentCard(): AgentCard {
    return {
      name: this.agentName,
      description: `Agent responsible for ${this.agentName.toLowerCase()} operations`,
      version: "1.0.0",
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true
      },
      defaultInputModes: ["text"],
      defaultOutputModes: ["text", "data"],
      skills: this.getAgentSkills(),
      authentication: {
        schemes: ["Bearer"]
      },
      url: `/api/a2a/${this.agentName.toLowerCase()}`
    };
  }
  
  /**
   * Define agent-specific skills
   * Must be implemented by each agent
   */
  protected abstract getAgentSkills(): AgentSkill[];
  
  /**
   * Process an incoming task
   * This is the main entry point for agents
   */
  public abstract processTask(taskId: string): Promise<void>;
  
  /**
   * Generate a response using the configured LLM
   */
  protected async generateResponse(
    prompt: string, 
    systemPrompt?: string,
    temperature?: number
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: temperature ?? this.temperature
      });
      
      return response.choices[0]?.message.content || '';
    } catch (error) {
      a2aLogger.error(null, `LLM generation error in ${this.agentName}`, error);
      throw error;
    }
  }
  
  /**
   * Generate a structured response using JSON mode
   */
  protected async generateStructuredResponse<T>(
    prompt: string,
    systemPrompt: string,
    temperature: number = 0
  ): Promise<T> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0]?.message.content || '{}';
      return JSON.parse(content) as T;
    } catch (error) {
      a2aLogger.error(null, `LLM structured generation error in ${this.agentName}`, error);
      throw error;
    }
  }
  
  /**
   * Stream tokens from LLM and emit interim updates
   * Follows A2A streaming pattern
   */
  protected async streamResponse(
    taskId: string,
    prompt: string,
    systemPrompt: string
  ): Promise<void> {
    try {
      // First update to "working" state
      await this.taskManager.updateTaskStatus(taskId, TaskState.WORKING, {
        message: "Processing your request..."
      });
      
      const stream = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: this.temperature,
        stream: true
      });
      
      let accumulatedResponse = '';
      
      // Process the stream in chunks
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          accumulatedResponse += content;
          
          // Emit update with partial response
          // Note: Not sending a final:true flag yet
          await this.taskManager.emitTaskStatusUpdate(taskId, {
            state: TaskState.WORKING,
            message: {
              role: "agent",
              parts: [{ type: "text", text: `${accumulatedResponse}...` }]
            }
          });
        }
      }
      
      // Send final completed response
      await this.taskManager.updateTaskStatus(taskId, TaskState.COMPLETED, {
        message: {
          role: "agent",
          parts: [{ type: "text", text: accumulatedResponse }]
        }
      });
      
    } catch (error) {
      a2aLogger.error(taskId, `Stream response error in ${this.agentName}`, error);
      await this.taskManager.updateTaskStatus(taskId, TaskState.FAILED, {
        message: `Streaming failed: ${error.message}`
      });
    }
  }
  
  /**
   * Create a text artifact
   */
  protected createTextArtifact(
    text: string,
    name?: string,
    description?: string
  ): Artifact {
    return {
      id: crypto.randomUUID(),
      type: "file",
      mimeType: "text/plain",
      name: name || `${this.agentName.toLowerCase()}-artifact`,
      description: description,
      data: text,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Create a JSON data artifact
   */
  protected createDataArtifact(
    data: any,
    name?: string,
    description?: string
  ): Artifact {
    return {
      id: crypto.randomUUID(),
      type: "data",
      mimeType: "application/json",
      name: name || `${this.agentName.toLowerCase()}-data`,
      description: description,
      data: data,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Extract text prompt from task object
   */
  protected extractPromptFromTask(task: Task): string {
    // Extract text from message parts
    if (task.message?.parts) {
      const textPart = task.message.parts.find(part => 
        part.type === 'text') as TextPart | undefined;
      if (textPart?.text) {
        return textPart.text;
      }
    }
    return "No prompt found in task";
  }
  
  /**
   * Request input from user
   * Sets task state to 'input-required' per A2A spec
   */
  protected async requestUserInput(
    taskId: string,
    message: string,
    inputType: string = "text"
  ): Promise<void> {
    await this.taskManager.updateTaskStatus(
      taskId,
      TaskState.INPUT_REQUIRED,
      {
        message: {
          role: "agent",
          parts: [{ type: "text", text: message }]
        }
      },
      { inputType }
    );
  }
}
```

## 2. Coordinator Agent with LLM Decision Making

```typescript
// src/server/agents/coordinator-agent.ts

import { BaseAgent } from './base-agent';
import { Task, TaskState, AgentSkill } from '~/types/a2a';

export class CoordinatorAgent extends BaseAgent {
  private readonly SYSTEM_PROMPT = `You are the CoordinatorAgent in a video generation pipeline.
Your role is to analyze user requests and determine which specialized agent should handle the task.

Available agents:
- ScenePlannerAgent: Creates high-level scene plans from user prompts
- ADBAgent: Converts scene plans into detailed Animation Design Briefs
- BuilderAgent: Generates React/Remotion code from ADBs
- ErrorFixerAgent: Fixes issues in generated components
- R2StorageAgent: Handles storage of built components

Output as JSON: { "nextAgent": "<agent_name>", "reason": "<explanation>" }`;

  protected getAgentSkills(): AgentSkill[] {
    return [{
      id: "task-coordination",
      name: "Task Coordination",
      description: "Analyzes requests and coordinates workflow across specialized agents",
      tags: ["coordination", "workflow", "planning"],
      examples: [
        "Create a 5-second animation of a bouncing ball",
        "Generate a video intro with fade effects"
      ]
    }];
  }

  async processTask(taskId: string): Promise<void> {
    const task = await this.taskManager.getTask(taskId);
    if (!task) {
      a2aLogger.error(taskId, `Task not found: ${taskId}`);
      return;
    }
    
    try {
      // Update to working state immediately
      await this.taskManager.updateTaskStatus(taskId, TaskState.WORKING, {
        message: "Analyzing your request..."
      });
      
      // Extract task prompt
      const prompt = this.extractPromptFromTask(task);
      
      // If prompt is too vague, request more information
      if (prompt.length < 10) {
        await this.requestUserInput(
          taskId, 
          "Please provide more details about the video you want to create."
        );
        return;
      }
      
      // Use LLM to decide next steps
      const decision = await this.generateStructuredResponse<{
        nextAgent: string;
        reason: string;
      }>(prompt, this.SYSTEM_PROMPT);
      
      a2aLogger.info(taskId, `Coordinator routing to ${decision.nextAgent}: ${decision.reason}`);
      
      // Create decision artifact
      const decisionArtifact = this.createDataArtifact(
        decision,
        "coordination-decision",
        "Coordination decision on task routing"
      );
      
      // Add artifact to task
      await this.taskManager.addTaskArtifact(taskId, decisionArtifact);
      
      // Forward to next agent via message bus
      await this.messageBus.sendMessage({
        taskId,
        from: this.agentName,
        to: decision.nextAgent,
        content: prompt,
        metadata: { reason: decision.reason }
      });
      
      // Update task status
      await this.taskManager.updateTaskStatus(taskId, TaskState.WORKING, {
        message: {
          role: "agent",
          parts: [
            { 
              type: "text", 
              text: `Task assigned to ${decision.nextAgent}: ${decision.reason}` 
            }
          ]
        }
      });
      
    } catch (error) {
      a2aLogger.error(taskId, `Error in CoordinatorAgent`, error);
      await this.taskManager.updateTaskStatus(taskId, TaskState.FAILED, {
        message: {
          role: "agent",
          parts: [
            { 
              type: "text", 
              text: `Coordination failed: ${error.message}` 
            }
          ]
        }
      });
    }
  }
}
```

## 3. Scene Planner Agent with LLM Creative Planning

```typescript
// src/server/agents/scene-planner-agent.ts

import { BaseAgent } from './base-agent';
import { TaskState, AgentSkill } from '~/types/a2a';

interface ScenePlan {
  scenes: Array<{
    id: string;
    name: string;
    description: string;
    duration: number;
    elements: string[];
  }>;
  totalDuration: number;
}

export class ScenePlannerAgent extends BaseAgent {
  private readonly SYSTEM_PROMPT = `You are the ScenePlannerAgent responsible for breaking down video creation requests into scenes.
For each scene, provide:
1. A descriptive name
2. Detailed description of what happens
3. Duration in seconds
4. Key visual elements

Output must be valid JSON matching this format:
{
  "scenes": [
    {
      "id": "scene-1",
      "name": "Scene name",
      "description": "Detailed description",
      "duration": 3.5,
      "elements": ["element1", "element2"]
    }
  ],
  "totalDuration": 10
}`;

  protected getAgentSkills(): AgentSkill[] {
    return [{
      id: "scene-planning",
      name: "Scene Planning",
      description: "Creates detailed scene plans from video descriptions",
      tags: ["scenes", "planning", "storyboard"],
      examples: [
        "Break down a 10-second product intro into scenes",
        "Plan scenes for an animated logo reveal"
      ]
    }];
  }

  async processTask(taskId: string): Promise<void> {
    const task = await this.taskManager.getTask(taskId);
    if (!task) {
      a2aLogger.error(taskId, `Task not found: ${taskId}`);
      return;
    }
    
    try {
      // Stream the thinking process to provide real-time feedback
      await this.streamResponse(
        taskId,
        this.extractPromptFromTask(task),
        "I'm planning your scenes. Thinking about how to break down your request into a cohesive sequence..."
      );
      
      // Generate the actual scene plan
      const scenePlan = await this.generateStructuredResponse<ScenePlan>(
        this.extractPromptFromTask(task),
        this.SYSTEM_PROMPT
      );
      
      // Create scene plan artifact
      const scenePlanArtifact = this.createDataArtifact(
        scenePlan,
        "scene-plan",
        `Scene plan with ${scenePlan.scenes.length} scenes, total duration: ${scenePlan.totalDuration}s`
      );
      
      // Add artifact to task
      await this.taskManager.addTaskArtifact(taskId, scenePlanArtifact);
      
      // Forward to ADB Generator
      await this.messageBus.sendMessage({
        taskId,
        from: this.agentName,
        to: "ADBAgent",
        content: JSON.stringify(scenePlan),
        metadata: { 
          sceneCount: scenePlan.scenes.length,
          totalDuration: scenePlan.totalDuration 
        }
      });
      
      // Update task status
      await this.taskManager.updateTaskStatus(taskId, TaskState.WORKING, {
        message: {
          role: "agent",
          parts: [
            { 
              type: "text", 
              text: `Scene planning complete with ${scenePlan.scenes.length} scenes. Generating animation designs...` 
            }
          ]
        }
      });
      
    } catch (error) {
      a2aLogger.error(taskId, `Error in ScenePlannerAgent`, error);
      await this.taskManager.updateTaskStatus(taskId, TaskState.FAILED, {
        message: {
          role: "agent", 
          parts: [
            { 
              type: "text", 
              text: `Scene planning failed: ${error.message}` 
            }
          ]
        }
      });
    }
  }
}
```

## 4. Agent Registry & Factory

```typescript
// src/server/services/a2a/agentRegistry.service.ts

import { CoordinatorAgent } from '../../agents/coordinator-agent';
import { ScenePlannerAgent } from '../../agents/scene-planner-agent';
import { ADBAgent } from '../../agents/adb-agent';
import { BuilderAgent } from '../../agents/builder-agent';
import { ErrorFixerAgent } from '../../agents/error-fixer-agent';
import { R2StorageAgent } from '../../agents/r2-storage-agent';
import { BaseAgent } from '../../agents/base-agent';
import { TaskManager } from './taskManager.service';
import { MessageBus } from './messageBus.service';

interface AgentConfig {
  model: string;
  systemPrompt: string;
  temperature: number;
}

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private agentConfigs: Map<string, AgentConfig> = new Map();

  constructor(
    private readonly taskManager: TaskManager,
    private readonly messageBus: MessageBus
  ) {
    // Initialize default configs
    this.setupDefaultConfigs();
  }

  private setupDefaultConfigs(): void {
    // Config for each agent type
    this.agentConfigs.set("CoordinatorAgent", {
      model: "gpt-4o-mini",
      systemPrompt: "You are a workflow coordinator...",
      temperature: 0.2
    });
    
    this.agentConfigs.set("ScenePlannerAgent", {
      model: "gpt-4-turbo",
      systemPrompt: "You are a scene planning expert...",
      temperature: 0.7
    });
    
    this.agentConfigs.set("ADBAgent", {
      model: "gpt-4-turbo",
      systemPrompt: "You are an animation design expert...",
      temperature: 0.7
    });
    
    this.agentConfigs.set("BuilderAgent", {
      model: "gpt-4-turbo",
      systemPrompt: "You are a React/Remotion code generation expert...",
      temperature: 0.0
    });
    
    this.agentConfigs.set("ErrorFixerAgent", {
      model: "gpt-4-turbo",
      systemPrompt: "You are a code debugging expert...",
      temperature: 0.0
    });
    
    this.agentConfigs.set("R2StorageAgent", {
      model: "gpt-4o-mini",
      systemPrompt: "You are a storage management specialist...",
      temperature: 0.0
    });
  }

  /**
   * Initialize and register all agents
   */
  public initializeAgents(): void {
    // Create all agent instances
    this.registerAgent(new CoordinatorAgent(
      "CoordinatorAgent",
      this.taskManager,
      this.messageBus,
      this.agentConfigs.get("CoordinatorAgent")?.model,
      this.agentConfigs.get("CoordinatorAgent")?.temperature
    ));
    
    this.registerAgent(new ScenePlannerAgent(
      "ScenePlannerAgent",
      this.taskManager,
      this.messageBus,
      this.agentConfigs.get("ScenePlannerAgent")?.model,
      this.agentConfigs.get("ScenePlannerAgent")?.temperature
    ));
    
    // Initialize other agents similarly...
  }

  /**
   * Register an agent instance
   */
  public registerAgent(agent: BaseAgent): void {
    const agentName = agent.constructor.name;
    this.agents.set(agentName, agent);
  }

  /**
   * Get an agent by name
   */
  public getAgent(agentName: string): BaseAgent | undefined {
    return this.agents.get(agentName);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all agent names
   */
  public getAgentNames(): string[] {
    return Array.from(this.agents.keys());
  }
}
```

## A2A JSON-RPC Implementation

To fully comply with A2A, implement these JSON-RPC endpoints:

```typescript
// src/app/api/a2a/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AgentRegistry } from '~/server/services/a2a/agentRegistry.service';
import { TaskManager } from '~/server/services/a2a/taskManager.service';
import { a2aLogger } from '~/lib/logger';

// JSON-RPC request schema
const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]),
  method: z.string(),
  params: z.any().optional(),
});

/**
 * A2A JSON-RPC API handler
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate as JSON-RPC request
    const result = JsonRpcRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: result.error.format(),
        },
      }, { status: 400 });
    }
    
    const { jsonrpc, id, method, params } = result.data;
    
    // Log request
    a2aLogger.info(null, `A2A JSON-RPC request: ${method}`, { method, params });
    
    // Handle different methods
    switch (method) {
      case 'tasks/send':
        return handleTaskSend(id, params);
      
      case 'tasks/get':
        return handleTaskGet(id, params);
      
      case 'tasks/cancel':
        return handleTaskCancel(id, params);
      
      case 'agent/discover':
        return handleAgentDiscover(id, params);
      
      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        }, { status: 404 });
    }
    
  } catch (error) {
    a2aLogger.error(null, `A2A JSON-RPC error`, error);
    
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message,
      },
    }, { status: 500 });
  }
}

/**
 * Handle tasks/send method
 */
async function handleTaskSend(id: string | number | null, params: any) {
  // Implementation details...
  
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result: {
      // Task object
    },
  });
}

// Implement other method handlers...
```

## SSE Implementation for Task Updates

```typescript
// src/app/api/a2a/tasks/[taskId]/stream/route.ts

import { NextRequest } from 'next/server';
import { TaskManager } from '~/server/services/a2a/taskManager.service';
import { a2aLogger } from '~/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  
  // Set headers for SSE
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  
  // Create response stream
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Log connection
  a2aLogger.info(taskId, `SSE connection established for task ${taskId}`);
  
  // Subscribe to task updates
  const unsubscribe = TaskManager.getInstance().subscribeToTaskUpdates(
    taskId,
    async (event) => {
      // Format event according to SSE protocol
      const eventData = `event: ${event.type}\nid: ${Date.now()}\ndata: ${JSON.stringify(event.data)}\n\n`;
      
      // Write to stream
      await writer.write(new TextEncoder().encode(eventData));
      
      // If task completed/failed/canceled, close the stream
      if (
        event.type === 'status' && 
        ['completed', 'failed', 'canceled'].includes(event.data.state)
      ) {
        unsubscribe();
        await writer.close();
      }
    }
  );
  
  // Handle client disconnect
  req.signal.addEventListener('abort', () => {
    a2aLogger.info(taskId, `SSE connection closed for task ${taskId}`);
    unsubscribe();
    writer.close().catch(console.error);
  });
  
  // Return the stream response
  return new Response(stream.readable, { headers });
}
```

## References

1. **A2A Protocol Specification**: [Google's A2A Docs](https://google.github.io/A2A/specification/) provide the definitive guide for the Agent-to-Agent protocol structure.

2. **JSON-RPC Methods**: According to the [A2A Communication guide](https://google.github.io/A2A/specification/agent-to-agent-communication/), agents must implement specific RPC methods like `tasks/send`, `tasks/get`, etc.

3. **Task State Machine**: The A2A protocol defines specific task states (submitted, working, input-required, completed, canceled, failed) that must be followed.

4. **Agent Discovery**: The [Agent Card specification](https://google.github.io/A2A/specification/agent-discovery/) defines how agents advertise their capabilities.

5. **MCP Integration**: The [A2A design principles](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) explain how A2A complements Anthropic's Model Context Protocol (MCP).

## Implementation Checklist

1. ✅ Implement BaseAgent with LLM integration
2. ✅ Create specialized agents with domain-specific prompts
3. ✅ Implement JSON-RPC endpoints following A2A spec
4. ✅ Add SSE streaming for real-time updates
5. ✅ Support proper task lifecycle states
6. ✅ Handle artifacts beyond just text data
7. ✅ Implement agent discovery via Agent Cards
8. ✅ Support multi-modality in message parts
