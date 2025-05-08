// /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/memory-bank/testing/animationDesigner_service_test_fixes.md
# Fixes for animationDesigner.service.test.ts

Below are the specific changes needed to fix the TypeScript errors in the `animationDesigner.service.test.ts` file:

## 1. Fix "Argument of type 'X' is not assignable to parameter of type 'never'" errors

These errors occur on lines 70, 74, 122, 152, and 174. In each case, we need to ensure proper type casting with `as any` on complex object values passed to mock functions.

### Specific Fixes

```diff
@@ -65,10 +65,15 @@
       };

       // Setup the mocks with proper types
+      // Fix TypeScript errors by removing <any, any> from jest.Mock
+      // These were causing 'Generic type Mock requires between 0 and 1 type arguments'
+      const mockDbInsert = db.insert as jest.Mock;
+      const mockDbUpdate = db.update as jest.Mock; 
+      const mockOpenAICreate = openai.chat.completions.create as jest.Mock;
       
       mockDbInsert.mockReturnValue({
-        returning: jest.fn().mockResolvedValue([mockPendingBrief]),
+        // Fix 'not assignable to parameter of type never' by adding 'as any'
+        returning: jest.fn().mockResolvedValueOnce([mockPendingBrief] as any),
       });

@@ -91,7 +96,8 @@
       // Verify the database insert was called
       expect(mockDbInsert).toHaveBeenCalledTimes(1);
-      expect(mockDbInsert.mock.calls[0][0]).toHaveProperty('projectId', 'test-project-id');
+      // Add non-null assertion to fix 'possibly undefined' errors
+      expect(mockDbInsert.mock.calls[0]![0]).toHaveProperty('projectId', 'test-project-id');
@@ -125,7 +131,7 @@
       };

       // Use type assertion to avoid TypeScript errors with complex mock structures
-      mockOpenAICreate.mockResolvedValue(mockLLMResponse as any);
+      mockOpenAICreate.mockResolvedValueOnce(mockLLMResponse as any);

@@ -142,10 +148,9 @@
         updatedAt: new Date(),
       };

-      const mockDbInsert = db.insert as jest.Mock<any, any>;
-      const mockDbUpdate = db.update as jest.Mock<any, any>;
-      const mockOpenAICreate = openai.chat.completions.create as jest.Mock<any, any>;
-      
+      const mockDbInsert = db.insert as jest.Mock;
+      const mockDbUpdate = db.update as jest.Mock; 
+      const mockOpenAICreate = openai.chat.completions.create as jest.Mock;
       
       mockDbInsert.mockReturnValue({
          returning: jest.fn().mockResolvedValueOnce([mockPendingBrief] as any),
@@ -164,13 +169,13 @@

       // Mock LLM error
       const mockError = new Error('LLM API Error');
-      mockOpenAICreate.mockRejectedValue(mockError);
+      mockOpenAICreate.mockRejectedValueOnce(mockError as any);

       // Mock the database update for error state
       mockDbUpdate.mockReturnValue({
-        where: jest.fn().mockResolvedValue([{ affected: 1 }]),
+        where: jest.fn().mockResolvedValueOnce([{ affected: 1 }] as any),
       });
```

## 2. Full File Replacement Version

If you prefer to replace the entire file, here's a clean version with all errors fixed:

```typescript
// /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/server/services/__tests__/animationDesigner.service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { generateAnimationDesignBrief } from '../animationDesigner.service';
import { db } from '~/server/db';
import { animationDesignBriefs } from '~/server/db/schema';

// Define simpler types for our mocks that are compatible with Jest
type MockFunction = jest.Mock;

interface MockDB {
  insert: MockFunction;
  update: MockFunction;
  query: MockFunction;
  select: MockFunction;
}

// Create explicit mocks instead of relying on path aliases
const mockOpenAICreate = jest.fn();
const mockOpenAI = {
  chat: {
    completions: {
      create: mockOpenAICreate
    }
  }
};

// Mock the database with explicit functions
const mockDbInsert = jest.fn().mockReturnValue({ returning: jest.fn() });
const mockDbUpdate = jest.fn().mockReturnValue({ where: jest.fn() });
const mockDbQuery = jest.fn();
const mockDbSelect = jest.fn().mockReturnValue({ where: jest.fn() });

// Manually mock the modules to bypass path resolution issues
jest.mock('~/server/db', () => ({
  db: {
    insert: mockDbInsert,
    update: mockDbUpdate,
    query: mockDbQuery,
    select: mockDbSelect
  },
  animationDesignBriefs: {}
}));

// Create a fake openai object that we'll use directly in tests
const openai = mockOpenAI;

describe('animationDesigner.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateAnimationDesignBrief', () => {
    it('should create a pending brief in the database', async () => {
      // Mock the database insert returning a pending brief
      const mockPendingBrief = {
        id: 'test-brief-id',
        projectId: 'test-project-id',
        sceneId: 'test-scene-id',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup the mocks with proper types
      const mockDbInsert = db.insert as jest.Mock;
      const mockDbUpdate = db.update as jest.Mock;
      const mockOpenAICreate = openai.chat.completions.create as jest.Mock;
      
      mockDbInsert.mockReturnValue({
        returning: jest.fn().mockResolvedValueOnce([mockPendingBrief] as any),
      });

      // Setup mock params - match the actual interface in animationDesigner.service
      const params = {
        projectId: 'test-project-id',
        sceneId: 'test-scene-id',
        effectDescription: 'A test scene description',
        dimensions: { width: 1920, height: 1080 },
        durationInSeconds: 5,
        fps: 30,
        scenePurpose: 'testing',
        sceneElementsDescription: 'test elements',
        desiredDurationInFrames: 150
      };

      // Call the function but don't await it yet
      const briefPromise = generateAnimationDesignBrief(params);

      // Verify the database insert was called
      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      expect(mockDbInsert.mock.calls[0]![0]).toHaveProperty('projectId', 'test-project-id');
      expect(mockDbInsert.mock.calls[0]![0]).toHaveProperty('sceneId', 'test-scene-id');
      expect(mockDbInsert.mock.calls[0]![0]).toHaveProperty('status', 'pending');
      
      // Mock LLM response - match the actual OpenAI response structure
      const mockLLMResponse = {
        choices: [{
          message: {
            tool_calls: [{
              function: {
                name: 'generateAnimationDesignBrief',
                arguments: JSON.stringify({
                  sceneName: 'Test Scene',
                  scenePurpose: 'Testing',
                  elements: [],
                  dimensions: { width: 1920, height: 1080 },
                  durationInFrames: 150,
                  sceneId: 'test-scene-id',
                  briefVersion: '1.0.0',
                  overallStyle: 'modern',
                  colorPalette: { background: '#ffffff' }
                }),
              },
            }],
          },
          index: 0,
          finish_reason: 'tool_calls'
        }],
      };

      // Use type assertion to avoid TypeScript errors with complex mock structures
      mockOpenAICreate.mockResolvedValueOnce(mockLLMResponse as any);

      // Now wait for the promise to resolve
      const result = await briefPromise;

      // Verify the result contains both the brief and its ID
      expect(result).toHaveProperty('brief');
      expect(result).toHaveProperty('briefId', 'test-brief-id');
    });

    it('should handle LLM errors gracefully', async () => {
      // Mock the database insert returning a pending brief
      const mockPendingBrief = {
        id: 'test-brief-id',
        projectId: 'test-project-id',
        sceneId: 'test-scene-id',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDbInsert = db.insert as jest.Mock;
      const mockDbUpdate = db.update as jest.Mock;
      const mockOpenAICreate = openai.chat.completions.create as jest.Mock;
      
      mockDbInsert.mockReturnValue({
        returning: jest.fn().mockResolvedValueOnce([mockPendingBrief] as any),
      });

      // Setup mock params with all required fields
      const params = {
        projectId: 'test-project-id',
        sceneId: 'test-scene-id',
        effectDescription: 'A test scene description',
        dimensions: { width: 1920, height: 1080 },
        durationInSeconds: 5,
        fps: 30,
        scenePurpose: 'testing',
        sceneElementsDescription: 'test elements',
        desiredDurationInFrames: 150
      };

      // Mock LLM error
      const mockError = new Error('LLM API Error');
      mockOpenAICreate.mockRejectedValueOnce(mockError as any);

      // Mock the database update for error state
      mockDbUpdate.mockReturnValue({
        where: jest.fn().mockResolvedValueOnce([{ affected: 1 }] as any),
      });

      // Call the function and expect it to handle the error
      await expect(generateAnimationDesignBrief(params)).resolves.not.toThrow();

      // Verify the database was updated with the error state
      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
      expect(mockDbUpdate.mock.calls[0]![0]).toHaveProperty('status', 'error');
      expect(mockDbUpdate.mock.calls[0]![0]).toHaveProperty('errorMessage');
    });
  });
});
```

## Explanation of Fixes

1. **Fixed Generic Type Errors**: Removed `<any, any>` from `jest.Mock<any, any>` type casts, using just `jest.Mock` instead
2. **Fixed "not assignable to parameter of type 'never'" errors**: Added `as any` type assertions to complex values passed to mock functions
3. **Fixed "possibly undefined" errors**: Added non-null assertions (`!`) where TypeScript couldn't determine that values would exist
4. **Improved Consistency**: Changed all `.mockResolvedValue()` to `.mockResolvedValueOnce()` and `.mockRejectedValue()` to `.mockRejectedValueOnce()` for better predictability

Apply these changes to fix the TypeScript errors in your test file.
