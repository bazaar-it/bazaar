# TICKET-002: Create Universal Response Format

## Overview
Implement UniversalResponse wrapper for ALL API responses to ensure consistency across the entire system.

## Current State

### Problem Areas

1. **Inconsistent response formats** across different endpoints:
   ```typescript
   // Current generation.ts returns custom format
   return {
     success: true,
     operation: decision.toolName || 'unknown',
     scene: toolResult.scene ? { scene: { ... } } : null,
     chatResponse: decision.chatResponse,
     debug: decision.debug,
   };
   
   // Some services return StandardApiResponse
   // Others return raw data
   // No consistent error handling
   ```

2. **No request tracing** - impossible to debug issues across services

3. **Error responses vary** wildly between endpoints

## Implementation Plan

### Step 1: Create Universal Response Type

Create `/src/lib/types/api/universal.ts`:
```typescript
/**
 * Universal response format for ALL API operations
 * Every single endpoint MUST return this format
 */
export interface UniversalResponse<TData = unknown> {
  // The actual data (null on error)
  data: TData;
  
  // Metadata about the operation
  meta: {
    requestId: string;      // Unique ID for tracing
    timestamp: number;      // When response was created
    operation: Operation;   // What operation was performed
    entity: Entity;         // What entity was affected
    success: boolean;       // Did it succeed?
    affectedIds: string[];  // What IDs were created/updated/deleted
    executionTimeMs: number; // How long it took
  };
  
  // Optional context (reasoning, suggestions, etc)
  context?: {
    reasoning?: string;      // Why the AI made this decision
    chatResponse?: string;   // Message for the user
    suggestions?: string[];  // What user could do next
  };
  
  // Error information (only present on failure)
  error?: {
    code: ErrorCode;        // Standardized error code
    message: string;        // Human-readable message
    details?: unknown;      // Technical details for debugging
    retryable: boolean;     // Can this be retried?
  };
}

// All possible operations in the system
export type Operation = 
  | 'scene.create'
  | 'scene.update' 
  | 'scene.delete'
  | 'scene.analyze'
  | 'brain.decide'
  | 'project.read'
  | 'project.update'
  | 'user.authenticate';

// All entities in the system
export type Entity = 'scene' | 'project' | 'user' | 'decision';

// Standardized error codes
export enum ErrorCode {
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Permission errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // External service errors
  AI_ERROR = 'AI_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

### Step 2: Create Response Helpers

Create `/src/lib/api/response-helpers.ts`:
```typescript
import { UniversalResponse, Operation, Entity, ErrorCode } from '~/lib/types/api/universal';
import { customAlphabet } from 'nanoid';

// Generate short, readable request IDs
const generateRequestId = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 12);

export class ResponseBuilder {
  private startTime: number;
  private requestId: string;
  
  constructor(requestId?: string) {
    this.startTime = Date.now();
    this.requestId = requestId || generateRequestId();
  }
  
  success<T>(
    data: T,
    operation: Operation,
    entity: Entity,
    affectedIds: string[] = []
  ): UniversalResponse<T> {
    return {
      data,
      meta: {
        requestId: this.requestId,
        timestamp: Date.now(),
        operation,
        entity,
        success: true,
        affectedIds,
        executionTimeMs: Date.now() - this.startTime
      }
    };
  }
  
  error(
    code: ErrorCode,
    message: string,
    operation: Operation,
    entity: Entity,
    details?: unknown
  ): UniversalResponse<null> {
    return {
      data: null,
      meta: {
        requestId: this.requestId,
        timestamp: Date.now(),
        operation,
        entity,
        success: false,
        affectedIds: [],
        executionTimeMs: Date.now() - this.startTime
      },
      error: {
        code,
        message,
        details,
        retryable: this.isRetryable(code)
      }
    };
  }
  
  withContext<T>(
    response: UniversalResponse<T>,
    context: {
      reasoning?: string;
      chatResponse?: string;
      suggestions?: string[];
    }
  ): UniversalResponse<T> {
    return {
      ...response,
      context
    };
  }
  
  private isRetryable(code: ErrorCode): boolean {
    return [
      ErrorCode.AI_ERROR,
      ErrorCode.STORAGE_ERROR,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.RATE_LIMITED,
      ErrorCode.SERVICE_UNAVAILABLE
    ].includes(code);
  }
}
```

### Step 3: Update Generation Router

Update `/src/server/api/routers/generation.ts`:
```typescript
import { ResponseBuilder } from '~/lib/api/response-helpers';
import { UniversalResponse, ErrorCode } from '~/lib/types/api/universal';

export const generationRouter = createTRPCRouter({
  generateScene: protectedProcedure
    .input(generateSceneSchema)
    .mutation(async ({ ctx, input }): Promise<UniversalResponse<SceneEntity>> => {
      const response = new ResponseBuilder();
      
      try {
        // 1. Validate input
        if (!input.prompt?.trim()) {
          return response.error(
            ErrorCode.INVALID_INPUT,
            'Prompt is required',
            'scene.create',
            'scene'
          );
        }
        
        // 2. Brain decision
        const decision = await brainOrchestrator.decide({
          prompt: input.prompt,
          imageUrls: input.imageUrls,
          projectId: input.projectId,
          userId: ctx.session.user.id
        });
        
        // 3. Execute tool
        const toolOutput = await toolExecutor.execute(decision);
        
        // 4. Save to database
        const [scene] = await ctx.db.insert(scenes).values({
          projectId: input.projectId,
          name: toolOutput.name,
          tsxCode: toolOutput.tsxCode,
          duration: toolOutput.duration,
          order: await this.getNextOrder(input.projectId),
          layoutJson: toolOutput.layoutJson,
          props: toolOutput.props
        }).returning();
        
        // 5. Return success response
        return response
          .success(scene, 'scene.create', 'scene', [scene.id])
          .withContext({
            reasoning: decision.reasoning,
            chatResponse: decision.chatResponse,
            suggestions: ['Edit the scene', 'Add another scene', 'Preview video']
          });
          
      } catch (error) {
        console.error('[generateScene] Error:', error);
        
        // Determine error type
        if (error.message?.includes('AI')) {
          return response.error(
            ErrorCode.AI_ERROR,
            'Failed to generate scene content',
            'scene.create',
            'scene',
            error
          );
        }
        
        return response.error(
          ErrorCode.INTERNAL_ERROR,
          'An unexpected error occurred',
          'scene.create',
          'scene',
          error
        );
      }
    }),
    
  editScene: protectedProcedure
    .input(editSceneSchema)
    .mutation(async ({ ctx, input }): Promise<UniversalResponse<SceneEntity>> => {
      const response = new ResponseBuilder();
      
      try {
        // Similar pattern...
        const currentScene = await ctx.db.query.scenes.findFirst({
          where: eq(scenes.id, input.sceneId)
        });
        
        if (!currentScene) {
          return response.error(
            ErrorCode.NOT_FOUND,
            `Scene ${input.sceneId} not found`,
            'scene.update',
            'scene'
          );
        }
        
        // ... rest of implementation
      } catch (error) {
        // ... error handling
      }
    })
});
```

### Step 4: Update Frontend to Handle Universal Response

Update `/src/lib/api/client.ts`:
```typescript
import type { UniversalResponse } from '~/lib/types/api/universal';

export function handleUniversalResponse<T>(
  response: UniversalResponse<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: UniversalResponse<T>['error']) => void;
  }
) {
  if (response.meta.success && response.data) {
    options?.onSuccess?.(response.data);
    return response.data;
  }
  
  if (response.error) {
    console.error(`[${response.meta.requestId}] Error:`, response.error);
    options?.onError?.(response.error);
    
    if (response.error.retryable) {
      console.log('This error is retryable');
    }
    
    throw new Error(response.error.message);
  }
  
  throw new Error('Invalid response format');
}
```

Update usage in components:
```typescript
// In ChatPanelG.tsx
const handleSend = async (prompt: string) => {
  try {
    const response = await api.generation.generateScene.mutate({
      prompt,
      projectId
    });
    
    const scene = handleUniversalResponse(response, {
      onSuccess: (data) => {
        console.log(`Scene created in ${response.meta.executionTimeMs}ms`);
        if (response.context?.chatResponse) {
          addMessage('assistant', response.context.chatResponse);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      }
    });
    
  } catch (error) {
    // Already handled by handleUniversalResponse
  }
};
```

## After Implementation

### Every API Response Has Same Shape
```typescript
// Success response
{
  data: { id: "123", tsxCode: "...", ... },
  meta: {
    requestId: "AB3DE7K9MN2P",
    timestamp: 1703001234567,
    operation: "scene.create",
    entity: "scene",
    success: true,
    affectedIds: ["123"],
    executionTimeMs: 1234
  },
  context: {
    reasoning: "User wanted an intro scene",
    chatResponse: "I've created an intro scene with your logo",
    suggestions: ["Add animation", "Change colors"]
  }
}

// Error response
{
  data: null,
  meta: {
    requestId: "XY9ZA2B4CD6E",
    timestamp: 1703001234567,
    operation: "scene.create",
    entity: "scene", 
    success: false,
    affectedIds: [],
    executionTimeMs: 567
  },
  error: {
    code: "AI_ERROR",
    message: "Failed to generate scene content",
    details: { ... },
    retryable: true
  }
}
```

## Testing Plan

### 1. Unit Tests for Response Helpers
Create `/src/lib/api/__tests__/response-helpers.test.ts`:
```typescript
describe('ResponseBuilder', () => {
  it('creates success response with correct format', () => {
    const builder = new ResponseBuilder();
    const response = builder.success(
      { id: '123', name: 'Test' },
      'scene.create',
      'scene',
      ['123']
    );
    
    expect(response.meta.success).toBe(true);
    expect(response.meta.requestId).toMatch(/^[A-Z0-9]{12}$/);
    expect(response.data).toEqual({ id: '123', name: 'Test' });
    expect(response.error).toBeUndefined();
  });
  
  it('creates error response with retryable flag', () => {
    const builder = new ResponseBuilder();
    const response = builder.error(
      ErrorCode.AI_ERROR,
      'AI service failed',
      'scene.create',
      'scene'
    );
    
    expect(response.meta.success).toBe(false);
    expect(response.error?.retryable).toBe(true);
    expect(response.data).toBeNull();
  });
});
```

### 2. Integration Tests
```typescript
describe('Generation API', () => {
  it('returns UniversalResponse format', async () => {
    const response = await api.generation.generateScene.mutate({
      prompt: 'Create intro',
      projectId: '123'
    });
    
    // Check structure
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('meta');
    expect(response.meta).toHaveProperty('requestId');
    expect(response.meta).toHaveProperty('executionTimeMs');
  });
});
```

### 3. Error Scenario Tests
```typescript
it('handles not found error correctly', async () => {
  const response = await api.generation.editScene.mutate({
    sceneId: 'non-existent',
    prompt: 'Edit this'
  });
  
  expect(response.meta.success).toBe(false);
  expect(response.error?.code).toBe(ErrorCode.NOT_FOUND);
  expect(response.error?.retryable).toBe(false);
});
```

## Success Criteria

- [ ] All API endpoints return UniversalResponse format
- [ ] Request IDs are unique and traceable
- [ ] Error responses include standardized error codes
- [ ] Frontend handles responses consistently
- [ ] Execution time is tracked for all operations

## Dependencies

- TICKET-001 must be complete (for SceneEntity type)
- nanoid package for request ID generation

## Time Estimate

- Type creation: 1 hour
- Helper implementation: 1 hour
- Router updates: 1 hour
- Testing: 30 minutes
- **Total: 3.5 hours**