# Unified Perfect Architecture: The Best of Both Worlds

## Executive Summary

This document presents a unified architecture that combines:
- **Universal Envelope Pattern**: Simple, consistent response format across all operations
- **Domain-Driven Design**: Clear business logic encapsulation and type safety
- **Database-First Types**: Single source of truth for all data structures
- **Gradual Migration**: Reuse existing code while fixing critical issues

The key insight: We can have both simplicity AND structure by using a universal envelope for transport while maintaining domain patterns for business logic.

## Core Principles

### 1. Universal Response Envelope
Every operation returns the same structure:
```typescript
interface UniversalResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: number;
    duration?: number;
    version?: string;
  };
}
```

### 2. Database as Single Source of Truth
All types are generated from the database schema:
```typescript
// Generated from database
export type Scene = {
  id: string;
  projectId: string;
  name: string;
  duration: number;
  position: number;
  tsxCode: string;  // ALWAYS tsxCode, never code/sceneCode/existingCode
  aiContext?: any;
  props?: any;
  createdAt: Date;
  updatedAt: Date;
};
```

### 3. Command Pattern for Business Logic
Clear separation of concerns with command objects:
```typescript
interface Command<TInput, TOutput> {
  execute(input: TInput): Promise<UniversalResponse<TOutput>>;
}
```

### 4. Gradual Migration Strategy
Wrap existing services incrementally while fixing issues.

## Implementation Details

### Universal Service Wrapper
Transform any existing service into the universal pattern:

```typescript
// src/server/services/universal/UniversalServiceWrapper.ts
export class UniversalServiceWrapper {
  static wrap<T>(
    fn: (...args: any[]) => Promise<T>
  ): (...args: any[]) => Promise<UniversalResponse<T>> {
    return async (...args: any[]) => {
      const startTime = Date.now();
      try {
        const result = await fn(...args);
        return {
          success: true,
          data: result,
          metadata: {
            timestamp: Date.now(),
            duration: Date.now() - startTime
          }
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message || 'An error occurred',
            details: error
          },
          metadata: {
            timestamp: Date.now(),
            duration: Date.now() - startTime
          }
        };
      }
    };
  }
}
```

### Domain Commands with Universal Response

```typescript
// src/server/services/scene/commands/AddSceneCommand.ts
import { UniversalResponse } from '@/server/services/universal/types';
import { Scene } from '@/server/db/schema'; // Database-generated type

export interface AddSceneInput {
  projectId: string;
  name: string;
  duration: number;
  position: number;
  tsxCode: string;  // ALWAYS tsxCode
  aiContext?: any;
  props?: any;
}

export class AddSceneCommand implements Command<AddSceneInput, Scene> {
  constructor(
    private db: Database,
    private storage: StorageService,
    private codeGenerator: CodeGeneratorService
  ) {}

  async execute(input: AddSceneInput): Promise<UniversalResponse<Scene>> {
    try {
      // Validate input
      this.validateInput(input);
      
      // Generate optimized code
      const optimizedCode = await this.codeGenerator.optimize(input.tsxCode);
      
      // Store in database
      const scene = await this.db.insert(scenes).values({
        ...input,
        tsxCode: optimizedCode  // ALWAYS tsxCode
      }).returning();
      
      // Store in R2
      await this.storage.uploadSceneCode(scene.id, optimizedCode);
      
      return {
        success: true,
        data: scene,
        metadata: {
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_SCENE_ERROR',
          message: error.message,
          details: error
        }
      };
    }
  }
  
  private validateInput(input: AddSceneInput): void {
    if (!input.tsxCode) {
      throw new Error('tsxCode is required');
    }
    // More validation...
  }
}
```

### Unified API Router

```typescript
// src/server/api/routers/unified/scene.ts
export const unifiedSceneRouter = createTRPCRouter({
  add: publicProcedure
    .input(addSceneSchema)
    .mutation(async ({ input, ctx }) => {
      const command = new AddSceneCommand(
        ctx.db,
        ctx.storage,
        ctx.codeGenerator
      );
      return command.execute(input);
    }),
    
  edit: publicProcedure
    .input(editSceneSchema)
    .mutation(async ({ input, ctx }) => {
      const command = new EditSceneCommand(ctx.db, ctx.storage);
      return command.execute(input);
    }),
    
  delete: publicProcedure
    .input(deleteSceneSchema)
    .mutation(async ({ input, ctx }) => {
      const command = new DeleteSceneCommand(ctx.db, ctx.storage);
      return command.execute(input);
    })
});
```

### Fixing the tsxCode Problem

```typescript
// src/server/services/scene/mappers/SceneMapper.ts
export class SceneMapper {
  /**
   * Maps any legacy field names to the correct tsxCode field
   */
  static normalizeScene(scene: any): Scene {
    return {
      ...scene,
      tsxCode: scene.tsxCode || scene.code || scene.sceneCode || scene.existingCode,
      // Remove any legacy fields
      code: undefined,
      sceneCode: undefined,
      existingCode: undefined
    };
  }
  
  /**
   * Ensures all scenes use tsxCode consistently
   */
  static normalizeScenes(scenes: any[]): Scene[] {
    return scenes.map(scene => this.normalizeScene(scene));
  }
}
```

## Migration Path from Current Codebase

### Phase 1: Wrap Existing Services (Week 1)
```typescript
// Wrap existing StandardSceneService
const wrappedAddScene = UniversalServiceWrapper.wrap(
  standardSceneService.addScene.bind(standardSceneService)
);

// Use in router
export const sceneRouter = createTRPCRouter({
  add: publicProcedure
    .input(addSceneSchema)
    .mutation(async ({ input }) => {
      // Fix field naming before passing to service
      const normalizedInput = {
        ...input,
        tsxCode: input.tsxCode || input.code || input.existingCode
      };
      return wrappedAddScene(normalizedInput);
    })
});
```

### Phase 2: Create Domain Commands (Week 2)
- Implement AddSceneCommand, EditSceneCommand, DeleteSceneCommand
- Each command wraps the existing service but adds validation and consistency
- Gradually move logic from services into commands

### Phase 3: Update Client Code (Week 3)
```typescript
// Update client to expect UniversalResponse
const { data: scene, error } = await trpc.scene.add.mutate({
  projectId: '123',
  name: 'New Scene',
  tsxCode: '<Scene>...</Scene>'  // Always use tsxCode
});

if (error) {
  console.error(`Error ${error.code}: ${error.message}`);
} else {
  console.log('Scene created:', scene);
}
```

### Phase 4: Refactor Services (Week 4)
- Once all routers use commands, refactor internal services
- Remove duplicate logic
- Ensure all database operations use tsxCode

## Benefits of the Unified Approach

### 1. Consistency Without Complexity
- Universal envelope provides predictable API responses
- Command pattern keeps business logic organized
- No need to rewrite everything at once

### 2. Type Safety from Database
```typescript
// All types come from one place
import { Scene, Project, User } from '@/server/db/schema';

// No more manual type definitions that drift from reality
```

### 3. Fixed Field Naming
- tsxCode is enforced everywhere
- Mapper handles legacy data during migration
- No more confusion about which field to use

### 4. Gradual Migration
- Start by wrapping existing services
- Move logic to commands over time
- Update clients as needed
- No big bang rewrite

### 5. Better Error Handling
```typescript
// Consistent error structure everywhere
if (!response.success) {
  logger.error({
    code: response.error.code,
    message: response.error.message,
    details: response.error.details
  });
}
```

### 6. Reuses Existing Code
- StandardSceneService continues to work
- MCP tools wrapped in universal response
- Database queries unchanged
- Just adds consistency layer on top

## Example: Complete Scene Management

```typescript
// src/server/api/routers/scene.ts
export const sceneRouter = createTRPCRouter({
  // List scenes with universal response
  list: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const scenes = await ctx.db
          .select()
          .from(scenesTable)
          .where(eq(scenesTable.projectId, input.projectId));
          
        return {
          success: true,
          data: SceneMapper.normalizeScenes(scenes)
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'LIST_SCENES_ERROR',
            message: error.message
          }
        };
      }
    }),
    
  // Add scene using command pattern
  add: publicProcedure
    .input(addSceneSchema)
    .mutation(async ({ input, ctx }) => {
      const command = new AddSceneCommand(ctx.db, ctx.storage);
      return command.execute(input);
    }),
    
  // Edit scene with proper tsxCode handling
  edit: publicProcedure
    .input(editSceneSchema)
    .mutation(async ({ input, ctx }) => {
      const command = new EditSceneCommand(ctx.db, ctx.storage);
      // Ensure we're using tsxCode
      const normalizedInput = {
        ...input,
        tsxCode: input.tsxCode || input.code
      };
      return command.execute(normalizedInput);
    })
});
```

## Conclusion

This unified architecture provides:
1. **Simplicity**: Universal envelope for all responses
2. **Structure**: Command pattern for business logic
3. **Consistency**: tsxCode everywhere, no exceptions
4. **Flexibility**: Gradual migration path
5. **Reusability**: Leverages existing code

By combining the best aspects of both architectural approaches, we get a system that is both simple to use and well-structured internally. The universal envelope provides a consistent API surface, while the command pattern keeps our business logic organized and testable.

Most importantly, this approach fixes the tsxCode problem once and for all by:
- Using database-generated types as the single source of truth
- Providing mappers to handle legacy field names during migration
- Enforcing tsxCode in all new code
- Allowing gradual updates to existing code

The result is a codebase that is easier to understand, maintain, and extend.