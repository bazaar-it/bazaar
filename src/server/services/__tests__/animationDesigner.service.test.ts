// src/server/services/__tests__/animationDesigner.service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { generateAnimationDesignBrief } from '../animationDesigner.service';
import { db } from '~/server/db';
import { animationDesignBriefs } from '~/server/db/schema';

// Define types for our mocks
type MockDB = {
  insert: jest.Mock;
  update: jest.Mock;
  query: jest.Mock;
  select: jest.Mock;
};

type MockOpenAI = {
  chat: {
    completions: {
      create: jest.Mock;
    };
  };
};

// Mock the OpenAI client
jest.mock('~/server/lib/openai/client', () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }
}));

// Mock the database
jest.mock('~/server/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({ returning: jest.fn() }),
    update: jest.fn().mockReturnValue({ where: jest.fn() }),
    query: jest.fn(),
    select: jest.fn().mockReturnValue({ where: jest.fn() })
  },
  animationDesignBriefs: {}
}));

// Import mocked modules (after mocking)
import { openai } from '~/server/lib/openai/client';

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
        returning: jest.fn().mockResolvedValue([mockPendingBrief]),
      });

      // Setup mock params - match the actual interface in animationDesigner.service
      const params = {
        projectId: 'test-project-id',
        sceneId: 'test-scene-id',
        effectDescription: 'A test scene description',
        dimensions: { width: 1920, height: 1080 },
        durationInSeconds: 5,
        fps: 30,
        // Add these required fields to match the AnimationBriefGenerationParams interface
        scenePurpose: 'testing',
        sceneElementsDescription: 'test elements',
        desiredDurationInFrames: 150
      };

      // Call the function but don't await it yet
      const briefPromise = generateAnimationDesignBrief(params);

      // Verify the database insert was called
      expect(mockDbInsert).toHaveBeenCalled();
      
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
                  // Include required fields from the brief schema
                  sceneId: 'test-scene-id',
                  briefVersion: '1.0.0',
                  overallStyle: 'modern',
                  colorPalette: { background: '#ffffff' }
                }),
              },
            }],
          },
        }],
      };

      mockOpenAICreate.mockResolvedValue(mockLLMResponse);

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
        returning: jest.fn().mockResolvedValue([mockPendingBrief]),
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
      mockOpenAICreate.mockRejectedValue(mockError);

      // Mock the database update for error state
      mockDbUpdate.mockReturnValue({
        where: jest.fn().mockResolvedValue([{ affected: 1 }]),
      });

      // Call the function and expect it to handle the error
      await expect(generateAnimationDesignBrief(params)).resolves.not.toThrow();

      // Verify the database was updated with the error state
      expect(mockDbUpdate).toHaveBeenCalled();
      
      if (mockDbUpdate.mock.calls.length > 0) {
        const updateCall = mockDbUpdate.mock.calls[0];
        expect(updateCall[1]).toHaveProperty('status', 'error');
        expect(updateCall[1]).toHaveProperty('errorMessage');
      }
    });
  });
});
