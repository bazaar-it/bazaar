// src/server/services/__tests__/componentGenerator.service.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { generateComponent, updateComponentStatus } from '../componentGenerator.service';
import { db, customComponentJobs } from '~/server/db';
import { type AnimationDesignBrief } from '~/lib/schemas/animationDesignBrief.schema';
import { processComponentJob } from '~/server/workers/generateComponentCode';

// Define types for our mocks
type MockDB = {
  insert: jest.Mock;
  update: jest.Mock;
  query: jest.Mock;
  select: jest.Mock;
};

// Mock the database operations
jest.mock('~/server/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({ returning: jest.fn() }),
    update: jest.fn().mockReturnValue({ where: jest.fn() }),
    query: jest.fn(),
    select: jest.fn().mockReturnValue({ where: jest.fn() }),
  },
  customComponentJobs: { id: 'id', projectId: 'projectId' },
}));

// Mock the uuid generator
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-job-id'),
}));

// Mock the worker that processes the component job
jest.mock('~/server/workers/generateComponentCode', () => ({
  processComponentJob: jest.fn().mockResolvedValue(undefined),
}));

// Mock for processComponentJob
const mockProcessComponentJob = processComponentJob as jest.Mock;

describe('componentGenerator.service', () => {
  let mockDb: MockDB;
  const mockBriefId = 'test-brief-id';
  const mockProjectId = 'test-project-id';
  const mockSceneId = 'test-scene-id';
  const mockPlaceholderSceneId = 'test-placeholder-id';
  const mockComponentJobId = 'test-job-id';

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Get the mocked db instance
    mockDb = (db as unknown) as MockDB;

    // Mock the returning function for db.insert
    mockDb.insert.mockReturnValue({
      returning: jest.fn().mockResolvedValue([{
        id: mockComponentJobId,
        projectId: mockProjectId,
        sceneId: mockSceneId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }])
    });

    // Mock the where function for db.update
    mockDb.update.mockReturnValue({
      where: jest.fn().mockResolvedValue([{
        affected: 1
      }])
    });

    // Mock the where function for db.select
    mockDb.select.mockReturnValue({
      where: jest.fn().mockResolvedValue([{
        id: mockComponentJobId,
        projectId: mockProjectId,
        sceneId: mockSceneId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }])
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateComponent', () => {
    it('should create a component job and process it', async () => {
      // Define a valid AnimationDesignBrief that matches the schema
      const mockAnimationDesignBrief: AnimationDesignBrief = {
        briefVersion: '1.0.0',
        sceneId: mockSceneId,
        scenePurpose: 'product feature highlight',
        overallStyle: 'energetic',
        durationInFrames: 90,
        dimensions: { width: 1920, height: 1080 },
        colorPalette: {
          background: '#000000',
          primary: '#FFFFFF',
          secondary: '#AAAAAA',
          accent: '#FF0000',
          textPrimary: '#FFFFFF',
          textSecondary: '#DDDDDD',
        },
        typography: {
          defaultFontFamily: 'Arial',
          heading1: {
            fontFamily: 'Arial',
            fontSize: 48,
            fontWeight: 'bold',
          },
          body: {
            fontFamily: 'Roboto',
            fontSize: 24,
          }
        },
        audioTracks: [],
        elements: [{
          elementId: 'titleText',
          elementType: 'text',
          content: 'Welcome to Our Product',
          initialLayout: {
            x: 100,
            y: 200,
            opacity: 1,
            rotation: 0,
            scale: 1,
            width: 400,
            height: 100
          },
          animations: [{
            animationId: 'fadeIn',
            animationType: 'fadeIn',
            startAtFrame: 0,
            durationInFrames: 30,
            trigger: 'onLoad',
            delayInFrames: 0,
            easing: 'easeInOutSine',
            propertiesAnimated: [{
              property: 'opacity',
              from: 0,
              to: 1
            }]
          }]
        }]
      };

      // Call the function under test
      const result = await generateComponent({
        briefId: mockBriefId,
        designBrief: mockAnimationDesignBrief,
        projectId: mockProjectId,
        placeholderSceneId: mockPlaceholderSceneId,
      });

      // Assertions
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockDb.insert).toHaveBeenCalledWith(customComponentJobs);
      expect(mockDb.insert.mock.calls[0][1]).toMatchObject({
        projectId: mockProjectId,
        sceneId: mockSceneId,
        placeholderSceneId: mockPlaceholderSceneId,
        status: 'pending',
        designBriefId: mockBriefId,
      });

      expect(processComponentJob).toHaveBeenCalledTimes(1);
      expect(processComponentJob).toHaveBeenCalledWith(expect.objectContaining({
        jobId: mockComponentJobId,
        projectId: mockProjectId,
        sceneId: mockSceneId,
        briefId: mockBriefId,
      }));

      expect(result).toEqual({
        jobId: mockComponentJobId,
        status: 'pending',
      });
    });

    it('should throw an error if the component job creation fails', async () => {
      // Mock a database error
      mockDb.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      // Define a valid AnimationDesignBrief that matches the schema
      const mockAnimationDesignBrief: AnimationDesignBrief = {
        briefVersion: '1.0.0',
        sceneId: mockSceneId,
        scenePurpose: 'product feature highlight',
        overallStyle: 'energetic',
        durationInFrames: 90,
        dimensions: { width: 1920, height: 1080 },
        colorPalette: {
          background: '#000000',
          primary: '#FFFFFF',
          secondary: '#AAAAAA',
          accent: '#FF0000',
          textPrimary: '#FFFFFF',
          textSecondary: '#DDDDDD',
        },
        typography: {
          defaultFontFamily: 'Arial',
        },
        audioTracks: [],
        elements: []
      };

      // Call the function under test and expect it to throw
      await expect(generateComponent({
        briefId: mockBriefId,
        designBrief: mockAnimationDesignBrief,
        projectId: mockProjectId,
        placeholderSceneId: mockPlaceholderSceneId,
      })).rejects.toThrow('Database error');

      // Verify that processComponentJob was not called
      expect(processComponentJob).not.toHaveBeenCalled();
    });
  });

  describe('updateComponentStatus', () => {
    it('should update the status of a component job', async () => {
      // Call the function under test
      await updateComponentStatus({
        jobId: mockComponentJobId,
        status: 'complete',
        errorMessage: undefined,
      });

      // Assertions
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockDb.update).toHaveBeenCalledWith(customComponentJobs);
      expect(mockDb.update.mock.calls[0][1]).toEqual({
        status: 'complete',
        errorMessage: undefined,
        updatedAt: expect.any(Date),
      });
    });

    it('should update the status of a component job with an error message', async () => {
      // Call the function under test
      await updateComponentStatus({
        jobId: mockComponentJobId,
        status: 'error',
        errorMessage: 'Something went wrong',
      });

      // Assertions
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockDb.update).toHaveBeenCalledWith(customComponentJobs);
      expect(mockDb.update.mock.calls[0][1]).toEqual({
        status: 'error',
        errorMessage: 'Something went wrong',
        updatedAt: expect.any(Date),
      });
    });

    it('should throw an error if the component job update fails', async () => {
      // Mock a database error
      mockDb.update.mockImplementation(() => {
        throw new Error('Database error');
      });

      // Call the function under test and expect it to throw
      await expect(updateComponentStatus({
        jobId: mockComponentJobId,
        status: 'complete',
      })).rejects.toThrow('Database error');
    });
  });
});

describe('componentGenerator.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateComponent', () => {
    it('should create a component generation job in the database', async () => {
      // Mock the database insert returning a job
      const mockJob = {
        id: 'test-job-id',
        projectId: 'test-project-id',
        effect: 'TestScene',
        status: 'pending',
        statusMessageId: 'test-message-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db.insert as any).mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockJob]),
      });

      // Setup mock brief
      const brief: AnimationDesignBrief = {
        sceneId: 'test-scene-id',
        sceneName: 'Test Scene',
        scenePurpose: 'Testing the component generator',
        overallStyle: 'minimal',
        dimensions: { width: 1920, height: 1080 },
        durationInFrames: 150,
        fps: 30,
        elements: [
          {
            elementId: 'title',
            elementType: 'text',
            content: 'Hello World',
            initialLayout: {
              x: 960,
              y: 540,
              width: 400,
              height: 100,
              opacity: 1
            },
            animations: [
              {
                animationId: 'fadeIn',
                animationType: 'fadeIn',
                startAtFrame: 0,
                durationInFrames: 30,
                delayInFrames: 0,
                easing: 'easeInOut',
                trigger: 'onLoad',
                propertiesAnimated: [
                  {
                    property: 'opacity',
                    from: 0,
                    to: 1
                  }
                ]
              }
            ]
          }
        ],
        colorPalette: {
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
        },
        audioTracks: [],
      };

      // Call the generateComponent function
      const result = await generateComponent(
        'test-project-id',
        brief,
        'test-message-id',
        5,
        30,
        'test-scene-id',
        'test-user-id',
        'test-brief-id'
      );

      // Verify the database insert was called with the expected data
      expect(db.insert).toHaveBeenCalledWith(customComponentJobs);
      const insertCall = (db.insert as any).mock.calls[0];
      expect(insertCall[0]).toBe(customComponentJobs);
      expect(insertCall[1]).toHaveProperty('values');
      
      // Verify the worker was called to process the job
      expect(processComponentJob).toHaveBeenCalledWith('test-job-id');
      
      // Verify the result has the expected structure
      expect(result).toHaveProperty('jobId', 'test-job-id');
      expect(result).toHaveProperty('effect');
      expect(result).toHaveProperty('componentMetadata');
      expect(result.componentMetadata).toHaveProperty('durationInFrames', 150);
      expect(result.componentMetadata).toHaveProperty('fps', 30);
      expect(result.componentMetadata).toHaveProperty('width', 1920);
      expect(result.componentMetadata).toHaveProperty('height', 1080);
    });

    it('should generate a detailed prompt from the AnimationDesignBrief', async () => {
      // Mock the database insert returning a job
      (db.insert as any).mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-job-id' }]),
      });

      // Setup a minimal brief
      const brief: AnimationDesignBrief = {
        sceneId: 'test-scene-id',
        sceneName: 'Test Scene',
        scenePurpose: 'Testing the prompt generation',
        overallStyle: 'minimal',
        dimensions: { width: 1920, height: 1080 },
        durationInFrames: 150,
        fps: 30,
        elements: []
      };

      // Call generateComponent
      await generateComponent(
        'test-project-id',
        brief,
        'test-message-id'
      );

      // Verify the insert was called with a job containing a prompt
      const insertCall = (db.insert as any).mock.calls[0];
      const jobData = insertCall[1].values;
      
      // Check that the prompt is constructed properly
      expect(jobData.metadata).toHaveProperty('prompt');
      const prompt = jobData.metadata.prompt;
      
      // Check key elements that should be in the prompt
      expect(prompt).toContain('ROLE: You are an Expert Remotion Developer');
      expect(prompt).toContain('COMPONENT NAME');
      expect(prompt).toContain('Test Scene');
      expect(prompt).toContain('BOILERPLATE STRUCTURE');
      expect(prompt).toContain('import { AbsoluteFill, useCurrentFrame, useVideoConfig');
      expect(prompt).toContain('ANIMATION IMPLEMENTATION');
      
      // Even with no elements, it should have guidelines
      expect(prompt).toContain('CODE QUALITY & PERFORMANCE GUIDELINES');
    });
  });

  describe('updateComponentStatus', () => {
    it('should update the status of a component job', async () => {
      // Mock the database update
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ affected: 1 }]),
      });

      // Call updateComponentStatus
      await updateComponentStatus('test-job-id', 'success', db, 'https://example.com/output');

      // Verify the database update was called with correct params
      expect(db.update).toHaveBeenCalledWith(customComponentJobs);
      const updateCall = (db.update as any).mock.calls[0];
      expect(updateCall[0]).toBe(customComponentJobs);
      
      const setCall = (db.update as any)().set.mock.calls[0];
      expect(setCall[0]).toHaveProperty('status', 'success');
      expect(setCall[0]).toHaveProperty('outputUrl', 'https://example.com/output');
      expect(setCall[0]).toHaveProperty('updatedAt');
    });

    it('should handle error status with error message', async () => {
      // Mock the database update
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ affected: 1 }]),
      });

      // Call updateComponentStatus with error
      await updateComponentStatus('test-job-id', 'error', db, undefined, 'Failed to generate component');

      // Verify the database update included the error message
      const setCall = (db.update as any)().set.mock.calls[0];
      expect(setCall[0]).toHaveProperty('status', 'error');
      expect(setCall[0]).toHaveProperty('errorMessage', 'Failed to generate component');
    });
  });
});
