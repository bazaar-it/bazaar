# TICKET-012: Comprehensive Testing Suite

## Overview
Ensure the system is truly idiot-proof with extensive tests covering all user flows, edge cases, and error scenarios.

## Current State

### Problem Areas
1. **Limited test coverage** - Many paths untested
2. **No E2E tests** - User flows not validated
3. **Missing chaos testing** - System fragility unknown
4. **Performance untested** - Speed requirements not verified

## Implementation Plan

### Step 1: Unit Tests for Pure Functions

Create `/src/tools/__tests__/add.test.ts`:
```typescript
import { AddSceneTool } from '../add/add';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('AddSceneTool', () => {
  let tool: AddSceneTool;
  
  beforeEach(() => {
    tool = new AddSceneTool();
  });
  
  describe('Pure Function Behavior', () => {
    it('generates consistent output for same input', async () => {
      const input = {
        userPrompt: 'Create a blue intro scene',
        projectContext: {
          sceneCount: 0,
          brandColors: ['#0066FF'],
        },
      };
      
      const result1 = await tool.execute(input);
      const result2 = await tool.execute(input);
      
      // Should generate similar structure (not identical due to AI variation)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.duration).toBe(result2.duration);
    });
    
    it('includes brand colors in generated scene', async () => {
      const brandColor = '#FF5500';
      const result = await tool.execute({
        userPrompt: 'Create intro',
        projectContext: {
          sceneCount: 0,
          brandColors: [brandColor],
        },
      });
      
      expect(result.success).toBe(true);
      expect(result.tsxCode).toContain(brandColor);
    });
    
    it('handles image input correctly', async () => {
      const result = await tool.execute({
        userPrompt: 'Create scene from this',
        imageUrls: ['https://example.com/mockup.png'],
      });
      
      expect(result.success).toBe(true);
      expect(result.reasoning).toContain('image');
    });
  });
  
  describe('Error Handling', () => {
    it('handles AI service errors gracefully', async () => {
      // Mock AI service to throw
      jest.spyOn(tool['aiService'], 'generateStructured')
        .mockRejectedValue(new Error('AI service unavailable'));
      
      const result = await tool.execute({
        userPrompt: 'Create scene',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service unavailable');
    });
    
    it('validates generated code before returning', async () => {
      // Mock AI to return invalid TSX
      jest.spyOn(tool['aiService'], 'generateStructured')
        .mockResolvedValue({
          code: 'invalid { tsx code',
          duration: 150,
        });
      
      const result = await tool.execute({
        userPrompt: 'Create scene',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid TSX');
    });
  });
});
```

### Step 2: Integration Tests

Create `/src/server/api/routers/__tests__/generation.integration.test.ts`:
```typescript
import { createInnerTRPCContext } from '~/server/api/trpc';
import { appRouter } from '~/server/api/root';
import { db } from '~/server/db';

describe('Generation Router Integration', () => {
  let ctx: ReturnType<typeof createInnerTRPCContext>;
  let caller: ReturnType<typeof appRouter.createCaller>;
  
  beforeEach(async () => {
    // Create test context
    ctx = createInnerTRPCContext({
      headers: new Headers(),
      userId: 'test-user',
    });
    
    caller = appRouter.createCaller(ctx);
    
    // Clean database
    await db.delete(scenes).where(eq(scenes.projectId, 'test-project'));
  });
  
  describe('Complete Flow: Prompt → Brain → Tool → Database', () => {
    it('creates scene from user prompt', async () => {
      const result = await caller.generation.generateScene({
        projectId: 'test-project',
        userMessage: 'Create a welcome scene with company logo',
      });
      
      expect(result.success).toBe(true);
      expect(result.data.operation).toBe('scene.create');
      
      // Verify scene saved to database
      const savedScene = await db.query.scenes.findFirst({
        where: eq(scenes.id, result.data.scene.id),
      });
      
      expect(savedScene).toBeDefined();
      expect(savedScene.tsxCode).toContain('logo');
      expect(savedScene.order).toBe(0);
    });
    
    it('edits existing scene', async () => {
      // Create initial scene
      const [scene] = await db.insert(scenes).values({
        projectId: 'test-project',
        name: 'Test Scene',
        tsxCode: '<div>Original</div>',
        duration: 150,
        order: 0,
      }).returning();
      
      // Edit it
      const result = await caller.generation.generateScene({
        projectId: 'test-project',
        userMessage: 'Make the text bigger and red',
      });
      
      expect(result.success).toBe(true);
      expect(result.data.operation).toBe('scene.update');
      
      // Verify changes
      const updated = await db.query.scenes.findFirst({
        where: eq(scenes.id, scene.id),
      });
      
      expect(updated.tsxCode).toContain('fontSize');
      expect(updated.tsxCode).toContain('red');
    });
    
    it('handles concurrent requests correctly', async () => {
      // Fire 5 requests simultaneously
      const promises = Array.from({ length: 5 }, (_, i) => 
        caller.generation.generateScene({
          projectId: 'test-project',
          userMessage: `Create scene ${i}`,
        })
      );
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Should have 5 scenes with correct order
      const scenes = await db.query.scenes.findMany({
        where: eq(scenes.projectId, 'test-project'),
        orderBy: [asc(scenes.order)],
      });
      
      expect(scenes.length).toBe(5);
      scenes.forEach((scene, i) => {
        expect(scene.order).toBe(i);
      });
    });
  });
});
```

### Step 3: E2E Tests

Create `/e2e/user-flows.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete User Flows', () => {
  test('user creates video from scratch', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Create project
    await page.click('text=New Project');
    await page.fill('[name="projectName"]', 'Test Video');
    await page.click('text=Create');
    
    // Wait for workspace
    await page.waitForURL(/\/projects\/.*\/generate/);
    
    // Create first scene
    await page.fill('[placeholder*="Type a message"]', 'Create a blue intro with my logo');
    await page.click('button[aria-label="Send message"]');
    
    // Wait for scene to appear
    await expect(page.locator('.preview-panel')).toContainText('Scene 1', {
      timeout: 10000,
    });
    
    // Add another scene
    await page.fill('[placeholder*="Type a message"]', 'Add a transition to white');
    await page.click('button[aria-label="Send message"]');
    
    await expect(page.locator('.preview-panel')).toContainText('Scene 2', {
      timeout: 10000,
    });
    
    // Edit first scene
    await page.fill('[placeholder*="Type a message"]', 'Make the intro text bigger');
    await page.click('button[aria-label="Send message"]');
    
    // Verify chat response
    await expect(page.locator('.chat-messages')).toContainText('updated', {
      timeout: 5000,
    });
  });
  
  test('user uploads image for style reference', async ({ page }) => {
    await page.goto('/projects/test-project/generate');
    
    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-assets/style-reference.png');
    
    // Type message
    await page.fill('[placeholder*="Type a message"]', 'Make it look like this');
    await page.click('button[aria-label="Send message"]');
    
    // Verify image preview shown
    await expect(page.locator('.attached-image')).toBeVisible();
    
    // Wait for scene update
    await expect(page.locator('.chat-messages')).toContainText('match', {
      timeout: 10000,
    });
  });
  
  test('handles errors gracefully', async ({ page }) => {
    await page.goto('/projects/test-project/generate');
    
    // Simulate network error
    await page.route('**/api/trpc/**', route => route.abort());
    
    // Try to create scene
    await page.fill('[placeholder*="Type a message"]', 'Create scene');
    await page.click('button[aria-label="Send message"]');
    
    // Should show error message
    await expect(page.locator('.toast-error')).toContainText('Failed');
    
    // Should show retry button
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
});
```

### Step 4: Performance Tests

Create `/src/__tests__/performance.test.ts`:
```typescript
describe('Performance Requirements', () => {
  test('scene generation completes in < 2 seconds', async () => {
    const start = Date.now();
    
    const result = await caller.generation.generateScene({
      projectId: 'perf-test',
      userMessage: 'Create a simple text scene',
    });
    
    const duration = Date.now() - start;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2000);
  });
  
  test('handles 10 concurrent users', async () => {
    const users = Array.from({ length: 10 }, (_, i) => ({
      userId: `user-${i}`,
      projectId: `project-${i}`,
    }));
    
    const start = Date.now();
    
    // Simulate concurrent requests
    const results = await Promise.all(
      users.map(user => 
        caller.generation.generateScene({
          projectId: user.projectId,
          userMessage: 'Create intro',
        })
      )
    );
    
    const duration = Date.now() - start;
    
    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    // Should complete reasonably fast
    expect(duration).toBeLessThan(5000);
  });
  
  test('caching improves repeat requests', async () => {
    const prompt = 'Create a red square animation';
    
    // First request (cold)
    const cold = await measureTime(() => 
      caller.generation.generateScene({
        projectId: 'cache-test',
        userMessage: prompt,
      })
    );
    
    // Second request (warm)
    const warm = await measureTime(() => 
      caller.generation.generateScene({
        projectId: 'cache-test',
        userMessage: prompt,
      })
    );
    
    // Cache should make it 50% faster
    expect(warm.duration).toBeLessThan(cold.duration * 0.5);
  });
});
```

### Step 5: Chaos Testing

Create `/src/__tests__/chaos.test.ts`:
```typescript
describe('Chaos Testing - System Resilience', () => {
  test('recovers from database connection loss', async () => {
    // Simulate connection drop
    const originalQuery = db.query;
    let failCount = 0;
    
    jest.spyOn(db, 'query', 'get').mockImplementation(() => {
      failCount++;
      if (failCount <= 2) {
        throw new Error('Connection lost');
      }
      return originalQuery;
    });
    
    // Should retry and succeed
    const result = await caller.generation.generateScene({
      projectId: 'chaos-test',
      userMessage: 'Create scene',
    });
    
    expect(result.success).toBe(true);
    expect(failCount).toBeGreaterThan(1);
  });
  
  test('handles AI service timeout', async () => {
    // Mock slow AI response
    jest.spyOn(openai.chat.completions, 'create')
      .mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 35000))
      );
    
    const result = await caller.generation.generateScene({
      projectId: 'timeout-test',
      userMessage: 'Create scene',
    });
    
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('TIMEOUT');
  });
  
  test('handles malformed AI responses', async () => {
    // Mock AI returning garbage
    jest.spyOn(openai.chat.completions, 'create')
      .mockResolvedValue({
        choices: [{
          message: {
            content: '```not valid json at all```',
          },
        }],
      });
    
    const result = await caller.generation.generateScene({
      projectId: 'malformed-test',
      userMessage: 'Create scene',
    });
    
    // Should fallback gracefully
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('AI_RESPONSE_INVALID');
  });
  
  test('prevents resource exhaustion', async () => {
    // Try to create 1000 scenes at once
    const promises = Array.from({ length: 1000 }, (_, i) =>
      caller.generation.generateScene({
        projectId: 'exhaustion-test',
        userMessage: `Scene ${i}`,
      }).catch(e => ({ error: e }))
    );
    
    const results = await Promise.all(promises);
    
    // Some should be rate limited
    const rateLimited = results.filter(r => 
      r.error?.code === 'RATE_LIMITED'
    );
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### Step 6: Test Utilities

Create `/src/test-utils/builders.ts`:
```typescript
// Test data builders
export class SceneBuilder {
  private scene: Partial<Scene> = {
    id: `scene-${Math.random()}`,
    name: 'Test Scene',
    tsxCode: '<div>Test</div>',
    duration: 150,
    order: 0,
  };
  
  withName(name: string): this {
    this.scene.name = name;
    return this;
  }
  
  withCode(code: string): this {
    this.scene.tsxCode = code;
    return this;
  }
  
  withDuration(duration: number): this {
    this.scene.duration = duration;
    return this;
  }
  
  build(): Scene {
    return this.scene as Scene;
  }
}

// Mock AI responses
export function mockAIResponse(overrides?: Partial<AIResponse>) {
  return {
    tsxCode: '<div>Mocked Scene</div>',
    duration: 150,
    reasoning: 'Test reasoning',
    ...overrides,
  };
}

// Test database helpers
export async function setupTestProject(projectId: string) {
  await db.insert(projects).values({
    id: projectId,
    name: 'Test Project',
    userId: 'test-user',
  });
}

export async function cleanupTestData(projectId: string) {
  await db.delete(scenes).where(eq(scenes.projectId, projectId));
  await db.delete(projects).where(eq(projects.id, projectId));
}
```

## Test Coverage Requirements

### Coverage Targets
- **Unit Tests**: 95% coverage for all pure functions
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: All critical user paths covered
- **Performance Tests**: All operations meet SLA
- **Chaos Tests**: System recovers from all failure modes

### Critical Test Scenarios

1. **Rapid Scene Creation**
   - User creates 10 scenes in quick succession
   - System maintains order and consistency

2. **Large Image Upload**
   - User uploads 5MB image
   - System compresses and processes correctly

3. **Network Failures**
   - Connection drops during generation
   - System retries and recovers

4. **AI Service Issues**
   - AI returns invalid response
   - System provides meaningful error

5. **Database Constraints**
   - Duplicate scene names
   - System handles gracefully

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate types
        run: npm run generate:types
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Success Criteria

- [ ] 95% code coverage achieved
- [ ] All user flows have E2E tests
- [ ] Performance tests verify < 2s generation
- [ ] Chaos tests prove system resilience
- [ ] CI runs all tests on every commit

## Time Estimate

- Unit tests: 2 hours
- Integration tests: 2 hours
- E2E tests: 2 hours
- Performance tests: 1 hour
- Chaos tests: 1 hour
- **Total: 8 hours**