// /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/server/services/__tests__/animationDesigner.service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { animationDesignBriefs } from '~/server/db/schema';
import type { AnimationDesignBrief } from '~/lib/schemas/animationDesignBrief.schema';
import { 
  createDrizzleMock, 
  createOpenAIToolCallResponse
} from '~/tests/utils/mockingHelpers';

// Create mocks for the database
const { 
  mockDb, 
  mockDbInsert, 
  mockDbUpdate, 
  mockDbQuery, 
  mockDbSelect 
} = createDrizzleMock();

// Define types for the mock return values to avoid type errors
type DbRowResult = { id: string };
type DbUpdateResult = { affected: number };
type OpenAIResponse = ReturnType<typeof createOpenAIToolCallResponse>;
type OpenAIError = Error;

// Global variable to hold the OpenAI mock for use in tests
let mockOpenAICreate: jest.Mock;

// Setup mock function before importing modules that use it
mockOpenAICreate = jest.fn();

// Mock the neon database driver
jest.mock('@neondatabase/serverless', () => {
  return {
    neon: jest.fn(() => ({})),
    neonConfig: {
      fetchConnectionCache: true
    }
  };
});

// Mock drizzle-orm
jest.mock('drizzle-orm/neon-http', () => ({
  drizzle: jest.fn(() => mockDb)
}));

// Mock the database module
jest.mock('~/server/db', () => ({
  db: mockDb
}));

// Mock OpenAI at the package level
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate
        }
      }
    })),
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate
        }
      }
    }))
  };
});

// Mock the OpenAI client module
jest.mock('~/server/lib/openai/client', () => {
  return {
    __esModule: true,
    openaiClient: {
      chat: {
        completions: {
          create: mockOpenAICreate
        }
      }
    },
    default: {
      chat: {
        completions: {
          create: mockOpenAICreate
        }
      }
    }
  };
});

// Mock the env file
jest.mock('~/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-api-key',
    DATABASE_URL: 'postgres://test:test@test.test:5432/testdb'
  }
}));

// Now we can import the module we want to test
import { generateAnimationDesignBrief, type AnimationBriefGenerationParams } from '../animationDesigner.service';

describe('animationDesigner.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations for database calls
    // Type-safe implementation of database mocks using our defined types
    mockDbInsert.mockImplementation(() => {
      return {
        values: jest.fn().mockImplementation(() => {
          return {
            returning: jest.fn().mockImplementation(() => {
              // Use explicit Promise typing to avoid 'never' type errors
              return Promise.resolve<DbRowResult[]>([
                { id: 'test-brief-id' }
              ]);
            })
          };
        })
      };
    });
    
    mockDbUpdate.mockImplementation(() => {
      return {
        set: jest.fn().mockImplementation(() => {
          return {
            where: jest.fn().mockImplementation(() => {
              // Use explicit Promise typing to avoid 'never' type errors
              return Promise.resolve<DbUpdateResult[]>([
                { affected: 1 }
              ]);
            })
          };
        })
      };
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateAnimationDesignBrief', () => {
    it('should create a pending brief in the database', async () => {
      // Setup valid input parameters
      const params: AnimationBriefGenerationParams = {
        projectId: 'test-project-id',
        sceneId: 'test-scene-id',
        scenePurpose: 'test scene purpose',
        sceneElementsDescription: 'A scene with various elements',
        desiredDurationInFrames: 150,
        dimensions: { width: 1920, height: 1080 }
      };

      // Mock a successful OpenAI response using our helper
      const briefData = {
        sceneId: 'test-scene-id',
        scenePurpose: 'test scene purpose',
        overallStyle: 'modern',
        durationInFrames: 150,
        dimensions: { width: 1920, height: 1080 },
        colorPalette: { background: '#ffffff' },
        elements: [{ 
          elementId: 'el-1',
          elementType: 'text',
          content: 'Hello world'
        }]
      };
      
      // Mock the OpenAI API response using the helper from mockingHelpers
      const mockedResponse = createOpenAIToolCallResponse('create_animation_design_brief', briefData);
      mockOpenAICreate.mockResolvedValue(mockedResponse);

      // Call the function
      const result = await generateAnimationDesignBrief(params);

      // Verify the result contains both the brief and its ID
      expect(result).toHaveProperty('brief');
      expect(result).toHaveProperty('briefId', 'test-brief-id');
      
      // Verify database was called with correct parameters
      expect(mockDbInsert).toHaveBeenCalled();
      // Verify OpenAI was called
      expect(mockOpenAICreate).toHaveBeenCalled();
      // Verify the update happened to mark it as complete
      expect(mockDbUpdate).toHaveBeenCalled();
    });

    it('should handle LLM errors gracefully', async () => {
      // Valid input parameters
      const params: AnimationBriefGenerationParams = {
        projectId: 'test-project-id',
        sceneId: 'test-scene-id',
        scenePurpose: 'test scene purpose',
        sceneElementsDescription: 'A scene with various elements',
        desiredDurationInFrames: 150,
        dimensions: { width: 1920, height: 1080 }
      };

      // Mock an OpenAI error
      const mockError = new Error('OpenAI API Error');
      mockOpenAICreate.mockRejectedValue(mockError);

      // Call the function and expect it to handle the error
      const result = await generateAnimationDesignBrief(params);

      // It should return a fallback brief
      expect(result).toHaveProperty('brief');
      expect(result).toHaveProperty('briefId', 'test-brief-id');
      
      // Verify update was called to mark as error
      expect(mockDbUpdate).toHaveBeenCalled();
      const setMock = mockDbUpdate.mock.calls[0]?.[0];
      if (setMock) {
        expect(setMock).toHaveProperty('status', 'error');
        expect(setMock).toHaveProperty('errorMessage');
      }
    });
  });
});

// Helper functions to improve type-safety in tests
function getTypedMockCall(mock: jest.Mock) {
  return mock.mock.calls;
}

function expectTypedMockCall(mockCalls: any[], index: number, expected: Record<string, any>) {
  expect(mockCalls[index]).toEqual(expect.objectContaining(expected));
}
