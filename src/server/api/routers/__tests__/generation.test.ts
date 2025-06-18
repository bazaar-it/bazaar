// src/server/api/routers/__tests__/generation.test.ts
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { generationRouter } from '../generation';
import { brainOrchestrator } from '~/server/services/brain/orchestrator';
import { db } from '~/server/db';
import { analytics } from '~/lib/utils/analytics';
import { analyzeDuration } from '~/lib/utils/codeDurationExtractor';
import { TRPCError } from '@trpc/server';
import type { OrchestrationOutput } from '~/server/services/brain/orchestrator';

// Mock dependencies
jest.mock('~/server/services/brain/orchestrator');
jest.mock('~/server/db', () => ({
  db: {
    query: {
      projects: {
        findFirst: jest.fn()
      },
      scenes: {
        findMany: jest.fn()
      },
      messages: {
        findMany: jest.fn()
      }
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'new-message-id' }])
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    }),
    transaction: jest.fn().mockImplementation(async (cb) => cb(db))
  }
}));
jest.mock('~/lib/utils/analytics');
jest.mock('~/lib/utils/codeDurationExtractor');

// Helper to create mock context
const createMockContext = (userId = 'test-user-id') => ({
  session: {
    user: {
      id: userId,
      email: 'test@example.com'
    }
  }
});

// Helper to create mock caller
const createCaller = (ctx: any) => {
  const router = generationRouter;
  return {
    generateScene: (input: any) => router.generateScene({ input, ctx } as any)
  };
};

describe('generationRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    (db.query.projects.findFirst as jest.Mock).mockResolvedValue({
      id: 'test-project-id',
      userId: 'test-user-id',
      name: 'Test Project'
    });

    (db.query.scenes.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'scene-1',
        name: 'Scene1',
        code: 'const Scene1 = () => <div>Scene 1</div>;',
        duration: 3,
        order: 0
      }
    ]);

    (db.query.messages.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Create a scene',
        projectId: 'test-project-id'
      }
    ]);

    (analyzeDuration as jest.Mock).mockReturnValue({
      sceneDuration: 3,
      hasVideo: false
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateScene', () => {
    it('should generate a new scene successfully', async () => {
      const mockOrchestrationOutput: OrchestrationOutput = {
        success: true,
        operation: 'create',
        message: 'Created a new scene with particles',
        scenes: [{
          sceneId: 'new-scene-id',
          sceneName: 'ParticleScene',
          sceneCode: 'const ParticleScene = () => <div>Particles</div>;',
          duration: 3,
          layoutJson: JSON.stringify({ elements: [] }),
          reasoning: 'Added particle effects'
        }]
      };

      (brainOrchestrator.processUserInput as jest.Mock).mockResolvedValue(mockOrchestrationOutput);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.generateScene({
        projectId: 'test-project-id',
        userMessage: 'Add a scene with particles'
      });

      expect(result.success).toBe(true);
      expect(result.scenes).toHaveLength(1);
      expect(result.scenes[0].name).toBe('ParticleScene');
      expect(result.message).toContain('particles');
      
      // Verify brain orchestrator was called correctly
      expect(brainOrchestrator.processUserInput).toHaveBeenCalledWith({
        chatHistory: expect.any(Array),
        currentScenes: expect.any(Array),
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 3,
        userPrompt: 'Add a scene with particles',
        imageUrls: undefined
      });

      // Verify analytics tracking
      expect(analytics.track).toHaveBeenCalledWith({
        userId: 'test-user-id',
        event: 'Scene Generated',
        properties: expect.objectContaining({
          projectId: 'test-project-id',
          operation: 'create',
          sceneCount: 1
        })
      });
    });

    it('should handle scene editing', async () => {
      const mockOrchestrationOutput: OrchestrationOutput = {
        success: true,
        operation: 'edit',
        message: 'Updated the text in Scene1',
        scenes: [{
          sceneId: 'scene-1',
          sceneName: 'Scene1',
          sceneCode: 'const Scene1 = () => <div>Updated Text</div>;',
          duration: 3
        }]
      };

      (brainOrchestrator.processUserInput as jest.Mock).mockResolvedValue(mockOrchestrationOutput);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.generateScene({
        projectId: 'test-project-id',
        userMessage: 'Change the text to say Updated Text',
        sceneId: 'scene-1'
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('edit');
      expect(result.scenes[0].code).toContain('Updated Text');
    });

    it('should handle scene deletion', async () => {
      const mockOrchestrationOutput: OrchestrationOutput = {
        success: true,
        operation: 'delete',
        message: 'Deleted Scene1',
        deletedSceneId: 'scene-1',
        scenes: []
      };

      (brainOrchestrator.processUserInput as jest.Mock).mockResolvedValue(mockOrchestrationOutput);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.generateScene({
        projectId: 'test-project-id',
        userMessage: 'Delete Scene1'
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.deletedSceneId).toBe('scene-1');
    });

    it('should handle user context with image URLs', async () => {
      const mockOrchestrationOutput: OrchestrationOutput = {
        success: true,
        operation: 'create',
        message: 'Created scene from image',
        scenes: [{
          sceneId: 'image-scene-id',
          sceneName: 'ImageScene',
          sceneCode: 'const ImageScene = () => <div>Image Scene</div>;',
          duration: 5
        }]
      };

      (brainOrchestrator.processUserInput as jest.Mock).mockResolvedValue(mockOrchestrationOutput);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.generateScene({
        projectId: 'test-project-id',
        userMessage: 'Create a scene from this image',
        userContext: {
          imageUrls: ['https://example.com/image.jpg']
        }
      });

      expect(result.success).toBe(true);
      
      // Verify orchestrator received image URLs
      expect(brainOrchestrator.processUserInput).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: ['https://example.com/image.jpg']
        })
      );
    });

    it('should handle clarification needed responses', async () => {
      const mockOrchestrationOutput: OrchestrationOutput = {
        success: false,
        error: 'clarification_needed',
        message: 'Which scene would you like to edit?',
        scenes: []
      };

      (brainOrchestrator.processUserInput as jest.Mock).mockResolvedValue(mockOrchestrationOutput);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.generateScene({
        projectId: 'test-project-id',
        userMessage: 'Change the color'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('clarification_needed');
      expect(result.message).toContain('Which scene');
    });

    it('should handle workflow operations', async () => {
      const mockOrchestrationOutput: OrchestrationOutput = {
        success: true,
        operation: 'workflow',
        message: 'Created multiple scenes',
        scenes: [
          {
            sceneId: 'scene-1',
            sceneName: 'TitleScene',
            sceneCode: 'const TitleScene = () => <div>Title</div>;',
            duration: 2
          },
          {
            sceneId: 'scene-2',
            sceneName: 'ContentScene',
            sceneCode: 'const ContentScene = () => <div>Content</div>;',
            duration: 3
          }
        ]
      };

      (brainOrchestrator.processUserInput as jest.Mock).mockResolvedValue(mockOrchestrationOutput);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      const result = await caller.generateScene({
        projectId: 'test-project-id',
        userMessage: 'Create a title scene and a content scene'
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('workflow');
      expect(result.scenes).toHaveLength(2);
    });

    it('should throw error for unauthorized project access', async () => {
      (db.query.projects.findFirst as jest.Mock).mockResolvedValue(null);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await expect(
        caller.generateScene({
          projectId: 'invalid-project-id',
          userMessage: 'Create a scene'
        })
      ).rejects.toThrow('Project not found or access denied');
    });

    it('should handle orchestrator errors gracefully', async () => {
      (brainOrchestrator.processUserInput as jest.Mock).mockRejectedValue(
        new Error('Orchestrator failed')
      );

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await expect(
        caller.generateScene({
          projectId: 'test-project-id',
          userMessage: 'Create a scene'
        })
      ).rejects.toThrow('Generation failed');
    });

    it('should save messages to database', async () => {
      const mockOrchestrationOutput: OrchestrationOutput = {
        success: true,
        operation: 'create',
        message: 'Created scene',
        scenes: [{
          sceneId: 'new-scene',
          sceneName: 'NewScene',
          sceneCode: 'const NewScene = () => <div>New</div>;',
          duration: 3
        }]
      };

      (brainOrchestrator.processUserInput as jest.Mock).mockResolvedValue(mockOrchestrationOutput);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await caller.generateScene({
        projectId: 'test-project-id',
        userMessage: 'Create a new scene'
      });

      // Verify user message was saved
      expect(db.insert).toHaveBeenCalledWith(expect.anything());
      expect((db.insert as jest.Mock).mock.calls[0][0]).toBe(require('~/server/db/schema').messages);
    });

    it('should calculate total video duration correctly', async () => {
      (db.query.scenes.findMany as jest.Mock).mockResolvedValue([
        { id: 'scene-1', duration: 3 },
        { id: 'scene-2', duration: 5 },
        { id: 'scene-3', duration: 2 }
      ]);

      const mockOrchestrationOutput: OrchestrationOutput = {
        success: true,
        operation: 'create',
        message: 'Created scene',
        scenes: [{
          sceneId: 'new-scene',
          sceneName: 'NewScene',
          sceneCode: 'const NewScene = () => <div>New</div>;',
          duration: 4
        }]
      };

      (brainOrchestrator.processUserInput as jest.Mock).mockResolvedValue(mockOrchestrationOutput);

      const ctx = createMockContext();
      const caller = createCaller(ctx);

      await caller.generateScene({
        projectId: 'test-project-id',
        userMessage: 'Add another scene'
      });

      // Verify orchestrator received correct total duration
      expect(brainOrchestrator.processUserInput).toHaveBeenCalledWith(
        expect.objectContaining({
          videoDuration: 10 // 3 + 5 + 2
        })
      );
    });
  });
});