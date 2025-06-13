# TICKET-004: Move Database Operations to Router

## Overview
Router becomes the orchestrator that handles ALL database operations. Tools provide generated content, router persists it.

## Current State

### Problem Areas

1. **Database operations might be scattered** across tools and services
2. **Router does transformations**:
   ```typescript
   // Current generation.ts transforms field names
   existingCode: sceneToEdit.tsxCode,  // ❌ Transformation!
   ```
3. **No clear separation** between generation and persistence
4. **Background tasks** (events, storage) might block responses

## Implementation Plan

### Step 1: Create Database Service Layer

Create `/src/server/api/services/database.service.ts`:
```typescript
import { db } from "~/server/db";
import { scenes, projects, messages } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { SceneEntity } from "~/generated/entities";

export class DatabaseService {
  /**
   * Get next scene order for a project
   */
  async getNextSceneOrder(projectId: string): Promise<number> {
    const lastScene = await db.query.scenes.findFirst({
      where: eq(scenes.projectId, projectId),
      orderBy: [desc(scenes.order)],
    });
    
    return (lastScene?.order ?? -1) + 1;
  }

  /**
   * Save new scene to database
   */
  async createScene(data: {
    projectId: string;
    name: string;
    tsxCode: string;
    duration: number;
    layoutJson?: string;
    props?: Record<string, any>;
  }): Promise<SceneEntity> {
    const order = await this.getNextSceneOrder(data.projectId);
    
    const [scene] = await db.insert(scenes).values({
      ...data,
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    return scene;
  }

  /**
   * Update existing scene
   */
  async updateScene(
    sceneId: string, 
    updates: {
      tsxCode?: string;
      duration?: number;
      props?: Record<string, any>;
      name?: string;
    }
  ): Promise<SceneEntity> {
    const [updated] = await db.update(scenes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(scenes.id, sceneId))
      .returning();
      
    if (!updated) {
      throw new Error(`Scene ${sceneId} not found`);
    }
    
    return updated;
  }

  /**
   * Delete scene
   */
  async deleteScene(sceneId: string): Promise<void> {
    await db.delete(scenes).where(eq(scenes.id, sceneId));
  }

  /**
   * Get scene by ID
   */
  async getScene(sceneId: string): Promise<SceneEntity | null> {
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId),
    });
    
    return scene || null;
  }

  /**
   * Get all scenes for a project
   */
  async getProjectScenes(projectId: string): Promise<SceneEntity[]> {
    return db.query.scenes.findMany({
      where: eq(scenes.projectId, projectId),
      orderBy: [scenes.order],
    });
  }

  /**
   * Save chat message
   */
  async saveMessage(data: {
    projectId: string;
    content: string;
    role: 'user' | 'assistant';
    imageUrls?: string[];
  }): Promise<void> {
    await db.insert(messages).values({
      ...data,
      createdAt: new Date(),
    });
  }
}

export const databaseService = new DatabaseService();
```

### Step 2: Create Background Task Service

Create `/src/server/api/services/background.service.ts`:
```typescript
import { eventBus } from "~/lib/events/bus";
import { storageService } from "~/server/services/storage";
import { cacheService } from "~/server/services/cache";
import type { SceneEntity } from "~/generated/entities";

export class BackgroundTaskService {
  /**
   * Execute background tasks without blocking response
   * Fire-and-forget pattern
   */
  async executeTasks(
    scene: SceneEntity,
    operation: 'create' | 'update' | 'delete',
    requestId: string
  ): Promise<void> {
    // Don't await these - let them run in background
    this.publishEvent(scene, operation, requestId).catch(e => 
      console.error('[Background] Event publish failed:', e)
    );
    
    if (operation !== 'delete') {
      this.uploadToStorage(scene).catch(e => 
        console.error('[Background] Storage upload failed:', e)
      );
      
      this.updateCache(scene).catch(e => 
        console.error('[Background] Cache update failed:', e)
      );
    }
  }

  private async publishEvent(
    scene: SceneEntity,
    operation: string,
    requestId: string
  ): Promise<void> {
    await eventBus.publish({
      type: `scene.${operation}d`,
      entity: 'scene',
      operation,
      payload: scene,
      projectId: scene.projectId,
      requestId,
      timestamp: Date.now(),
    });
  }

  private async uploadToStorage(scene: SceneEntity): Promise<void> {
    await storageService.uploadScene(scene.id, {
      tsxCode: scene.tsxCode,
      props: scene.props,
    });
  }

  private async updateCache(scene: SceneEntity): Promise<void> {
    await cacheService.set(`scene:${scene.id}`, scene, {
      ttl: 3600, // 1 hour
    });
  }
}

export const backgroundTaskService = new BackgroundTaskService();
```

### Step 3: Refactor Generation Router

Update `/src/server/api/routers/generation.ts`:
```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { orchestrator } from "~/brain/orchestratorNEW";
import { addTool } from "~/tools/add/add";
import { editTool } from "~/tools/edit/edit";
import { deleteTool } from "~/tools/delete/delete";
import { databaseService } from "../services/database.service";
import { backgroundTaskService } from "../services/background.service";
import { ResponseBuilder } from "~/lib/api/response-helpers";
import type { UniversalResponse, ErrorCode } from "~/lib/types/api/universal";
import type { SceneEntity } from "~/generated/entities";
import type { AddToolOutput, EditToolOutput } from "~/tools/helpers/types";

export const generationRouter = createTRPCRouter({
  /**
   * Generate new scene
   * Router handles ALL database operations
   */
  generateScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      prompt: z.string(),
      imageUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }): Promise<UniversalResponse<SceneEntity>> => {
      const response = new ResponseBuilder();
      
      try {
        // 1. Get project context (previous scenes for style consistency)
        const projectScenes = await databaseService.getProjectScenes(input.projectId);
        const previousScene = projectScenes[projectScenes.length - 1];
        
        // 2. Save user message
        await databaseService.saveMessage({
          projectId: input.projectId,
          content: input.prompt,
          role: 'user',
          imageUrls: input.imageUrls,
        });
        
        // 3. Get decision from brain
        const decision = await orchestrator.decide({
          prompt: input.prompt,
          imageUrls: input.imageUrls,
          projectId: input.projectId,
          userId: ctx.session.user.id,
          context: {
            sceneCount: projectScenes.length,
            lastSceneStyle: previousScene?.layoutJson,
          },
        });
        
        // 4. Execute tool (pure function - no DB)
        const toolOutput = await addTool.execute({
          userPrompt: input.prompt,
          projectId: input.projectId,
          userId: ctx.session.user.id,
          sceneNumber: projectScenes.length + 1,
          previousSceneContext: previousScene ? {
            tsxCode: previousScene.tsxCode,  // ✓ Correct field name
            style: previousScene.layoutJson || undefined,
          } : undefined,
          imageUrls: input.imageUrls,
          visionAnalysis: decision.visionAnalysis,
        });
        
        if (!toolOutput.success) {
          throw new Error(toolOutput.error || 'Tool execution failed');
        }
        
        // 5. Router saves to database
        const scene = await databaseService.createScene({
          projectId: input.projectId,
          name: toolOutput.name!,
          tsxCode: toolOutput.tsxCode!,      // ✓ No transformation needed
          duration: toolOutput.duration!,
          layoutJson: toolOutput.layoutJson,
          props: toolOutput.props,
        });
        
        // 6. Save AI response
        if (decision.chatResponse) {
          await databaseService.saveMessage({
            projectId: input.projectId,
            content: decision.chatResponse,
            role: 'assistant',
          });
        }
        
        // 7. Fire background tasks (don't await)
        backgroundTaskService.executeTasks(scene, 'create', response.requestId);
        
        // 8. Return response
        return response
          .success(scene, 'scene.create', 'scene', [scene.id])
          .withContext({
            reasoning: decision.reasoning,
            chatResponse: decision.chatResponse,
            suggestions: ['Edit the scene', 'Add another scene', 'Preview video'],
          });
          
      } catch (error) {
        console.error('[generateScene] Error:', error);
        return response.error(
          ErrorCode.AI_ERROR,
          error.message || 'Failed to generate scene',
          'scene.create',
          'scene',
          error
        );
      }
    }),

  /**
   * Edit existing scene
   * Router fetches current data and saves changes
   */
  editScene: protectedProcedure
    .input(z.object({
      sceneId: z.string(),
      prompt: z.string(),
      imageUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }): Promise<UniversalResponse<SceneEntity>> => {
      const response = new ResponseBuilder();
      
      try {
        // 1. Get current scene from database
        const currentScene = await databaseService.getScene(input.sceneId);
        if (!currentScene) {
          return response.error(
            ErrorCode.NOT_FOUND,
            `Scene ${input.sceneId} not found`,
            'scene.update',
            'scene'
          );
        }
        
        // 2. Verify ownership
        if (currentScene.projectId !== input.projectId) {
          return response.error(
            ErrorCode.FORBIDDEN,
            'Scene does not belong to this project',
            'scene.update',
            'scene'
          );
        }
        
        // 3. Save user message
        await databaseService.saveMessage({
          projectId: input.projectId,
          content: input.prompt,
          role: 'user',
          imageUrls: input.imageUrls,
        });
        
        // 4. Get decision from brain
        const decision = await orchestrator.decide({
          prompt: input.prompt,
          imageUrls: input.imageUrls,
          projectId: input.projectId,
          userId: ctx.session.user.id,
          context: {
            currentScene: {
              id: currentScene.id,
              name: currentScene.name,
              duration: currentScene.duration,
            },
          },
        });
        
        // 5. Execute edit tool (pure function - no DB)
        const toolOutput = await editTool.execute({
          userPrompt: input.prompt,
          projectId: input.projectId,
          sceneId: input.sceneId,
          tsxCode: currentScene.tsxCode,      // ✓ Pass correct field name
          currentDuration: currentScene.duration,
          editType: decision.editType || 'creative',
          imageUrls: input.imageUrls,
          visionAnalysis: decision.visionAnalysis,
        });
        
        if (!toolOutput.success) {
          throw new Error(toolOutput.error || 'Edit failed');
        }
        
        // 6. Router updates database
        const updatedScene = await databaseService.updateScene(input.sceneId, {
          tsxCode: toolOutput.tsxCode,        // ✓ No transformation needed
          duration: toolOutput.duration,
          props: toolOutput.props,
        });
        
        // 7. Save AI response
        if (decision.chatResponse) {
          await databaseService.saveMessage({
            projectId: input.projectId,
            content: decision.chatResponse,
            role: 'assistant',
          });
        }
        
        // 8. Fire background tasks
        backgroundTaskService.executeTasks(updatedScene, 'update', response.requestId);
        
        // 9. Return response
        return response
          .success(updatedScene, 'scene.update', 'scene', [updatedScene.id])
          .withContext({
            reasoning: decision.reasoning,
            chatResponse: decision.chatResponse,
          });
          
      } catch (error) {
        console.error('[editScene] Error:', error);
        return response.error(
          ErrorCode.INTERNAL_ERROR,
          error.message || 'Failed to edit scene',
          'scene.update',
          'scene',
          error
        );
      }
    }),

  /**
   * Delete scene
   * Router handles the actual deletion
   */
  deleteScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
    }))
    .mutation(async ({ ctx, input }): Promise<UniversalResponse<{ deletedId: string }>> => {
      const response = new ResponseBuilder();
      
      try {
        // 1. Verify scene exists and ownership
        const scene = await databaseService.getScene(input.sceneId);
        if (!scene) {
          return response.error(
            ErrorCode.NOT_FOUND,
            `Scene ${input.sceneId} not found`,
            'scene.delete',
            'scene'
          );
        }
        
        if (scene.projectId !== input.projectId) {
          return response.error(
            ErrorCode.FORBIDDEN,
            'Scene does not belong to this project',
            'scene.delete',
            'scene'
          );
        }
        
        // 2. Execute delete tool (validation only)
        const toolOutput = await deleteTool.execute({
          userPrompt: `Delete scene ${scene.name}`,
          projectId: input.projectId,
          sceneId: input.sceneId,
          confirmDeletion: true,
        });
        
        if (!toolOutput.success) {
          throw new Error(toolOutput.error || 'Delete validation failed');
        }
        
        // 3. Router performs actual deletion
        await databaseService.deleteScene(input.sceneId);
        
        // 4. Fire background tasks
        backgroundTaskService.executeTasks(scene, 'delete', response.requestId);
        
        // 5. Return response
        return response
          .success(
            { deletedId: input.sceneId },
            'scene.delete',
            'scene',
            [input.sceneId]
          );
          
      } catch (error) {
        console.error('[deleteScene] Error:', error);
        return response.error(
          ErrorCode.INTERNAL_ERROR,
          error.message || 'Failed to delete scene',
          'scene.delete',
          'scene',
          error
        );
      }
    }),
});
```

## After Implementation

### Clear Separation of Concerns

```typescript
// 1. Tools generate content (pure functions)
const content = await addTool.execute({
  userPrompt: "Create intro",
  projectId: "123"
});
// Returns: { tsxCode, name, duration, layoutJson }

// 2. Router persists to database
const scene = await databaseService.createScene({
  projectId: "123",
  tsxCode: content.tsxCode,  // Direct assignment, no transformation
  name: content.name,
  duration: content.duration,
});

// 3. Background tasks don't block
backgroundTaskService.executeTasks(scene, 'create', requestId);
// Returns immediately, tasks run async
```

### No Field Transformations

```typescript
// BEFORE (bad):
existingCode: scene.tsxCode  // ❌ Transformation

// AFTER (good):
tsxCode: scene.tsxCode       // ✓ Direct pass-through
```

## Testing Plan

### 1. Unit Tests for Database Service
```typescript
describe('DatabaseService', () => {
  it('creates scene with correct fields', async () => {
    const scene = await databaseService.createScene({
      projectId: '123',
      name: 'Test Scene',
      tsxCode: '<div>Test</div>',
      duration: 150,
    });
    
    expect(scene).toHaveProperty('id');
    expect(scene.tsxCode).toBe('<div>Test</div>');
    expect(scene.order).toBe(0); // First scene
  });
  
  it('calculates correct order', async () => {
    // Create first scene
    await databaseService.createScene({ projectId: '123', ... });
    
    // Create second scene
    const scene2 = await databaseService.createScene({ projectId: '123', ... });
    expect(scene2.order).toBe(1);
  });
});
```

### 2. Integration Tests for Router
```typescript
describe('Generation Router', () => {
  it('orchestrates tool and database correctly', async () => {
    const response = await api.generation.generateScene.mutate({
      projectId: '123',
      prompt: 'Create intro scene',
    });
    
    expect(response.meta.success).toBe(true);
    expect(response.data).toHaveProperty('id');
    expect(response.data.tsxCode).toBeTruthy();
    
    // Verify scene was saved
    const saved = await databaseService.getScene(response.data.id);
    expect(saved).toBeTruthy();
  });
});
```

### 3. Background Task Tests
```typescript
describe('BackgroundTaskService', () => {
  it('executes tasks without blocking', async () => {
    const start = Date.now();
    
    await backgroundTaskService.executeTasks(mockScene, 'create', '123');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10); // Should return immediately
  });
});
```

## Success Criteria

- [ ] Only router touches the database
- [ ] Tools receive and return plain objects
- [ ] No field name transformations
- [ ] Background tasks don't block responses
- [ ] All operations properly traced with requestId

## Dependencies

- TICKET-001: Generated types (SceneEntity)
- TICKET-002: Universal response format
- TICKET-003: Pure function tools

## Time Estimate

- Database service: 2 hours
- Background service: 1 hour
- Router refactoring: 4 hours
- Testing: 1 hour
- **Total: 8 hours**