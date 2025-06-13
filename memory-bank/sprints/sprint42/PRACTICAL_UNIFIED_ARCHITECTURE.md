# Practical Unified Architecture: From Current Codebase to Perfect System

## Overview

This document outlines how to restructure our existing Bazaar-Vid codebase into the optimal architecture, combining the best of both proposals with what we already have.

## Current State Analysis

### What We Have
```
src/
├── app/projects/[id]/generate/
│   └── workspace/panels/ChatPanelG.tsx    # UI entry point
├── server/api/routers/
│   └── generation.ts                       # API endpoint
├── brain/
│   └── orchestratorNEW.ts                  # Decision making
├── tools/                                  # MCP-style tools
│   ├── add/add.ts
│   └── edit/edit.ts
├── server/services/scene/                  # Business logic
│   ├── add/CodeGenerator.ts
│   └── edit/BaseEditor.ts
└── lib/types/                              # Type definitions
```

### Current Problems
1. **Field Inconsistency**: `existingCode` vs `tsxCode` vs `code`
2. **Response Inconsistency**: Different shapes from different services
3. **No Tracing**: Hard to debug issues
4. **Tight Coupling**: Services directly call each other
5. **No Event System**: UI polling for updates

## The Practical Perfect Architecture

### Core Architecture Principles

1. **Separation of Concerns**
   - **Tools**: Pure functions that generate/transform content (no DB access)
   - **Brain**: Makes decisions about which tool to use
   - **Router**: Orchestrates flow and handles ALL database operations
   - **Services**: Reusable business logic (AI generation, validation)

2. **Data Flow**
   ```
   UI → Router → Brain → Tool → Router → Database → Event → UI
        (orchestrates)  (decides) (generates) (persists)
   ```

3. **Field Consistency**
   - Database defines truth: `tsxCode` (never `code`, `existingCode`, `sceneCode`)
   - Types generated from database schema
   - Same field names everywhere

### Phase 1: Universal Types & Response Format (Week 1)

#### 1.1 Create Universal Response Wrapper
```typescript
// src/lib/types/api/universal.ts
export interface UniversalResponse<TData = unknown> {
  // Consistent response shape for EVERYTHING
  data: TData;
  meta: {
    requestId: string;
    timestamp: number;
    operation: Operation;
    entity: Entity;
    success: boolean;
    affectedIds: string[];
    executionTimeMs: number;
  };
  context?: {
    reasoning?: string;
    chatResponse?: string;
    suggestions?: string[];
  };
  error?: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    retryable: boolean;
  };
}

// All possible operations
export type Operation = 
  | 'scene.create'
  | 'scene.update' 
  | 'scene.delete'
  | 'scene.analyze'
  | 'brain.decide'
  | 'project.read';

export type Entity = 'scene' | 'project' | 'user';

export enum ErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  AI_ERROR = 'AI_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR'
}
```

#### 1.2 Generate Types from Database
```typescript
// scripts/generate-types.ts
import { db, scenes } from '@/server/db';

// Generate scene type that EXACTLY matches database
export async function generateTypes() {
  const typeDefinition = `
    // THIS FILE IS AUTO-GENERATED - DO NOT EDIT
    export interface SceneEntity {
      readonly id: string;
      readonly projectId: string;
      name: string;
      tsxCode: string;      // Database column: tsx_code
      duration: number;     // Always in frames
      order: number;
      layoutJson?: string | null;
      props?: Record<string, any> | null;
      readonly createdAt: Date;
      readonly updatedAt: Date;
    }
  `;
  
  fs.writeFileSync('src/generated/entities.ts', typeDefinition);
}

// Add to package.json scripts
"scripts": {
  "generate:types": "tsx scripts/generate-types.ts",
  "dev": "npm run generate:types && next dev"
}
```

### Phase 2: Restructure API Layer (Week 1)

#### 2.1 Update Generation Router (Handles All Database Operations)
```typescript
// src/server/api/routers/generation.ts
import { UniversalResponse } from '@/lib/types/api/universal';
import { SceneEntity } from '@/generated/entities';

export const generationRouter = createTRPCRouter({
  // ALL endpoints return UniversalResponse
  generateScene: protectedProcedure
    .input(z.object({
      prompt: z.string(),
      imageUrls: z.array(z.string()).optional(),
      projectId: z.string()
    }))
    .mutation(async ({ ctx, input }): Promise<UniversalResponse<SceneEntity>> => {
      const requestId = crypto.randomUUID();
      const startTime = Date.now();
      
      try {
        // 1. Brain decision
        const decision = await brainOrchestrator.decide({
          prompt: input.prompt,
          imageUrls: input.imageUrls,
          projectId: input.projectId,
          userId: ctx.session.user.id
        });
        
        // 2. Execute tool (pure function - no DB)
        const toolOutput = await toolExecutor.execute(decision);
        
        // 3. Router saves to database
        const [scene] = await db.insert(scenes).values({
          projectId: input.projectId,
          name: toolOutput.name,
          tsxCode: toolOutput.tsxCode,      // From tool output
          duration: toolOutput.duration,
          order: await this.getNextOrder(input.projectId),
          layoutJson: toolOutput.layoutJson,
          props: toolOutput.props
        }).returning();
        
        // 4. Fire-and-forget background tasks
        this.backgroundTasks(scene, requestId);
        
        // 5. Return universal response
        return {
          data: scene,
          meta: {
            requestId,
            timestamp: Date.now(),
            operation: 'scene.create',
            entity: 'scene',
            success: true,
            affectedIds: [scene.id],
            executionTimeMs: Date.now() - startTime
          },
          context: {
            reasoning: decision.reasoning,
            chatResponse: decision.chatResponse
          }
        };
      } catch (error) {
        return {
          data: null as any,
          meta: {
            requestId,
            timestamp: Date.now(),
            operation: 'scene.create',
            entity: 'scene',
            success: false,
            affectedIds: [],
            executionTimeMs: Date.now() - startTime
          },
          error: {
            code: ErrorCode.AI_ERROR,
            message: error.message,
            details: error,
            retryable: true
          }
        };
      }
    }),
    
  editScene: protectedProcedure
    .input(z.object({
      sceneId: z.string(),
      prompt: z.string()
    }))
    .mutation(async ({ ctx, input }): Promise<UniversalResponse<SceneEntity>> => {
      const requestId = crypto.randomUUID();
      
      // 1. Get current scene from DB
      const currentScene = await db.query.scenes.findFirst({
        where: eq(scenes.id, input.sceneId)
      });
      
      if (!currentScene) {
        return this.errorResponse(ErrorCode.NOT_FOUND, 'Scene not found', requestId);
      }
      
      // 2. Tool transforms content (no DB access)
      const editOutput = await editTool.execute({
        currentTsxCode: currentScene.tsxCode,  // Pass correct field
        prompt: input.prompt
      });
      
      // 3. Router updates database
      const [updatedScene] = await db.update(scenes)
        .set({
          tsxCode: editOutput.tsxCode,
          duration: editOutput.duration || currentScene.duration,
          props: editOutput.props || currentScene.props,
          updatedAt: new Date()
        })
        .where(eq(scenes.id, input.sceneId))
        .returning();
      
      // 4. Background tasks
      this.backgroundTasks(updatedScene, requestId);
      
      return this.successResponse(updatedScene, 'scene.update', requestId);
    }),
    
  // Helper methods
  private async getNextOrder(projectId: string): Promise<number> {
    const maxOrder = await db.query.scenes.findFirst({
      where: eq(scenes.projectId, projectId),
      orderBy: desc(scenes.order)
    });
    return (maxOrder?.order ?? -1) + 1;
  },
  
  private backgroundTasks(scene: SceneEntity, requestId: string) {
    // Fire and forget - don't await
    eventBus.publish({
      type: 'scene.created',
      payload: scene,
      projectId: scene.projectId,
      requestId
    }).catch(e => logger.error('Event publish failed', e));
    
    // Upload to storage
    storageService.upload(scene.id, scene.tsxCode)
      .catch(e => logger.error('Storage upload failed', e));
    
    // Update cache
    cache.set(`scene:${scene.id}`, scene)
      .catch(e => logger.error('Cache update failed', e));
  },
    
  // Stream updates using SSE
  subscribeToUpdates: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .subscription(async function* ({ input, ctx }) {
      const stream = eventBus.subscribe(`project.${input.projectId}`);
      
      for await (const event of stream) {
        yield {
          data: event.payload,
          meta: {
            requestId: event.id,
            timestamp: event.timestamp,
            operation: event.operation,
            entity: event.entity,
            success: true,
            affectedIds: event.affectedIds,
            executionTimeMs: 0
          }
        } as UniversalResponse;
      }
    })
});
```

### Phase 3: Fix Brain & Tools (Week 2)

#### 3.1 Update Brain Orchestrator
```typescript
// src/brain/orchestratorNEW.ts
export interface BrainDecision {
  toolName: string;
  toolParams: Record<string, any>;
  reasoning: string;
  chatResponse: string;
  confidence: number;
}

export class BrainOrchestrator {
  async decide(input: {
    prompt: string;
    imageUrls?: string[];
    projectId: string;
    userId: string;
  }): Promise<BrainDecision> {
    // Get project context
    const context = await this.buildContext(input.projectId);
    
    // Use AI to analyze and decide
    const decision = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: BRAIN_PROMPT },
        { role: 'user', content: JSON.stringify({ input, context }) }
      ],
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(decision.choices[0].message.content) as BrainDecision;
  }
}
```

#### 3.2 Standardize Tools (Pure Functions - No Database Access)
```typescript
// src/tools/base.ts
export abstract class BaseTool<TInput, TOutput> {
  abstract name: string;
  abstract description: string;
  
  // Tools are PURE FUNCTIONS - generate/transform only
  abstract execute(input: TInput): Promise<TOutput>;
  
  // Wrapper ensures consistent error handling
  async run(input: TInput): Promise<TOutput> {
    const span = startSpan(`tool.${this.name}`);
    
    try {
      const output = await this.execute(input);
      span.setStatus('success');
      return output;
    } catch (error) {
      span.setStatus('error');
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}

// src/tools/add/add.ts
export interface AddSceneOutput {
  name: string;
  tsxCode: string;      // Matches database field
  duration: number;
  layoutJson: string;
  props?: Record<string, any>;
}

export class AddSceneTool extends BaseTool<AddSceneInput, AddSceneOutput> {
  name = 'addScene';
  description = 'Generates scene content';
  
  async execute(input: AddSceneInput): Promise<AddSceneOutput> {
    // 1. Generate layout
    const layout = await layoutGenerator.generate(input);
    
    // 2. Generate code
    const code = await codeGenerator.generate(layout, input);
    
    // 3. Return generated content (NO DATABASE!)
    return {
      name: code.name,
      tsxCode: code.tsxCode,      // ✓ Correct field name
      duration: code.duration,
      layoutJson: JSON.stringify(layout),
      props: code.props
    };
  }
}

// src/tools/edit/edit.ts
export interface EditSceneOutput {
  tsxCode: string;      // NEVER existingCode
  duration?: number;
  props?: Record<string, any>;
}

export class EditSceneTool extends BaseTool<EditSceneInput, EditSceneOutput> {
  name = 'editScene';
  description = 'Edits scene content';
  
  async execute(input: EditSceneInput): Promise<EditSceneOutput> {
    // Pure transformation - no DB access
    const updated = await this.codeEditor.edit({
      currentCode: input.currentTsxCode,  // Input uses correct field
      editPrompt: input.prompt
    });
    
    return {
      tsxCode: updated.tsxCode,  // Output uses correct field
      duration: updated.duration,
      props: updated.props
    };
  }
}
```

### Phase 4: Fix Services (Week 2)

#### 4.1 Standardize Service Interfaces
```typescript
// src/server/services/base.ts
export abstract class BaseService<TConfig = unknown> {
  constructor(
    protected config: TConfig,
    protected deps: {
      ai: OpenAI;
      db: Database;
      storage: StorageService;
      events: EventBus;
    }
  ) {}
  
  // Structured generation helper
  protected async generateWithAI<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    const response = await this.deps.ai.chat.completions.create({
      model: this.config.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    
    const parsed = JSON.parse(response.choices[0].message.content);
    return schema.parse(parsed);
  }
}

// src/server/services/scene/add/CodeGenerator.ts
export class CodeGeneratorService extends BaseService<CodeGenConfig> {
  async generate(layout: Layout, input: CodeGenInput): Promise<SceneCode> {
    const prompt = this.buildPrompt(layout, input);
    
    // Generate with schema validation
    const generated = await this.generateWithAI(prompt, sceneCodeSchema);
    
    // Return with EXACT field names
    return {
      name: generated.name,
      tsxCode: generated.tsxCode,    // ✓ Always tsxCode
      duration: generated.duration,
      props: generated.props
    };
  }
}
```

### Phase 5: Update UI Layer (Week 3)

#### 5.1 Fix ChatPanelG
```typescript
// src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
export function ChatPanelG({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { mutate: generateScene } = api.generation.generateScene.useMutation();
  
  // Subscribe to real-time updates
  api.generation.subscribeToUpdates.useSubscription(
    { projectId },
    {
      onData: (response: UniversalResponse) => {
        if (response.meta.operation === 'scene.create' && response.data) {
          // Update UI with new scene
          addSceneToTimeline(response.data as SceneEntity);
        }
      }
    }
  );
  
  const handleSend = async (prompt: string, images?: File[]) => {
    // Optimistic update
    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: tempId,
      type: 'user',
      content: prompt
    }]);
    
    try {
      const response = await generateScene({
        prompt,
        imageUrls: images ? await uploadImages(images) : undefined,
        projectId
      });
      
      // Add AI response
      if (response.context?.chatResponse) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'assistant',
          content: response.context.chatResponse
        }]);
      }
      
      if (!response.meta.success) {
        throw new Error(response.error?.message || 'Generation failed');
      }
    } catch (error) {
      // Handle error
      toast.error(error.message);
    }
  };
  
  return (
    <ChatInterface
      messages={messages}
      onSend={handleSend}
    />
  );
}
```

#### 5.2 Update VideoState
```typescript
// src/stores/videoState.ts
interface VideoState {
  // Normalized data matching database exactly
  project: Project | null;
  scenes: Map<string, SceneEntity>;    // SceneEntity from generated types
  timeline: string[];                  // Just scene IDs
  
  // Actions
  setProject: (project: Project) => void;
  addScene: (scene: SceneEntity) => void;
  updateScene: (id: string, updates: Partial<SceneEntity>) => void;
  deleteScene: (id: string) => void;
  
  // Selectors
  getScenesInOrder: () => SceneEntity[];
  getSceneById: (id: string) => SceneEntity | undefined;
}

export const useVideoState = create<VideoState>((set, get) => ({
  project: null,
  scenes: new Map(),
  timeline: [],
  
  addScene: (scene) => set(state => {
    state.scenes.set(scene.id, scene);
    state.timeline.push(scene.id);
    return { scenes: new Map(state.scenes), timeline: [...state.timeline] };
  }),
  
  updateScene: (id, updates) => set(state => {
    const scene = state.scenes.get(id);
    if (scene) {
      // Merge updates, keeping exact field names
      const updated = { ...scene, ...updates };
      state.scenes.set(id, updated);
      return { scenes: new Map(state.scenes) };
    }
    return state;
  }),
  
  getScenesInOrder: () => {
    const { scenes, timeline } = get();
    return timeline
      .map(id => scenes.get(id))
      .filter((s): s is SceneEntity => s !== undefined);
  }
}));
```

### Phase 6: Add Observability (Week 3)

#### 6.1 Request Tracing
```typescript
// src/lib/tracing.ts
export class TraceSpan {
  private span: any;
  
  constructor(name: string, parentId?: string) {
    this.span = tracer.startSpan(name, {
      parent: parentId ? getSpan(parentId) : undefined
    });
  }
  
  setAttributes(attrs: Record<string, any>) {
    this.span.setAttributes(attrs);
  }
  
  recordException(error: Error) {
    this.span.recordException(error);
  }
  
  end() {
    this.span.end();
  }
}

// Use in all services
export function traced<T extends (...args: any[]) => any>(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    const span = new TraceSpan(`${target.constructor.name}.${propertyKey}`);
    
    try {
      const result = await originalMethod.apply(this, args);
      span.setAttributes({ success: true });
      return result;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  };
  
  return descriptor;
}
```

### Phase 7: Event Bus Implementation (Week 4)

```typescript
// src/lib/events/bus.ts
export class EventBus {
  private emitter = new EventEmitter();
  
  publish(event: DomainEvent): void {
    const channel = `${event.entity}.${event.operation}`;
    this.emitter.emit(channel, event);
    
    // Also emit to project channel
    if (event.projectId) {
      this.emitter.emit(`project.${event.projectId}`, event);
    }
  }
  
  subscribe(channel: string): AsyncIterableIterator<DomainEvent> {
    const queue: DomainEvent[] = [];
    let resolve: ((value: IteratorResult<DomainEvent>) => void) | null = null;
    
    const handler = (event: DomainEvent) => {
      if (resolve) {
        resolve({ value: event, done: false });
        resolve = null;
      } else {
        queue.push(event);
      }
    };
    
    this.emitter.on(channel, handler);
    
    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      
      async next(): Promise<IteratorResult<DomainEvent>> {
        if (queue.length > 0) {
          return { value: queue.shift()!, done: false };
        }
        
        return new Promise(r => {
          resolve = r;
        });
      }
    };
  }
}

export const eventBus = new EventBus();
```

## Tool Executor Pattern

```typescript
// src/server/services/toolExecutor.ts
export class ToolExecutor {
  private tools = new Map<string, BaseTool<any, any>>();
  
  constructor() {
    // Register all tools
    this.tools.set('addScene', new AddSceneTool());
    this.tools.set('editScene', new EditSceneTool());
    this.tools.set('deleteScene', new DeleteSceneTool());
  }
  
  async execute(decision: BrainDecision): Promise<any> {
    const tool = this.tools.get(decision.toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${decision.toolName}`);
    }
    
    // Tools return generated content, not database entities
    return tool.execute(decision.toolParams);
  }
}
```

## Migration Checklist

### Week 1: Foundation
- [ ] Generate types from database
- [ ] Create UniversalResponse type
- [ ] Update generation.ts to handle all DB operations
- [ ] Add request ID to all operations

### Week 2: Core Services  
- [ ] Fix Brain orchestrator response format
- [ ] Update tools to be pure functions (no DB access)
- [ ] Move all DB operations to router
- [ ] Standardize service base class
- [ ] Remove all field transformations (use tsxCode everywhere)

### Week 3: UI & State
- [ ] Update ChatPanelG with new API
- [ ] Fix VideoState to use SceneEntity
- [ ] Add real-time subscriptions
- [ ] Implement optimistic updates

### Week 4: Polish
- [ ] Add distributed tracing
- [ ] Implement event bus
- [ ] Add error boundaries
- [ ] Performance monitoring

## Key Benefits

1. **Type Safety**: Generated types make `existingCode` errors impossible
2. **Consistency**: Every response has same shape via UniversalResponse
3. **Debuggability**: Request IDs and tracing throughout
4. **Real-time**: Event-driven updates replace polling
5. **Maintainability**: Clear separation of concerns

## Success Metrics

- Zero field name mismatches (tsxCode everywhere)
- All API responses follow UniversalResponse format
- Every operation traceable via requestId
- Real-time updates working via SSE
- Type generation automated in build process