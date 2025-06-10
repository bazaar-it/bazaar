// src/server/services/mcp/tools/__tests__/addScene.test.ts
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { AddSceneTool } from '../addScene';
import { sceneBuilderService } from '~/server/services/generation/sceneBuilder.service';
import { conversationalResponseService } from '~/server/services/ai/conversationalResponse.service';
import { db } from '~/server/db';

// Mock dependencies
jest.mock('~/server/services/generation/sceneBuilder.service');
jest.mock('~/server/services/ai/conversationalResponse.service');
jest.mock('~/server/db', () => ({
  db: {
    query: {
      scenes: {
        findMany: jest.fn(),
        findFirst: jest.fn()
      }
    },
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([])
    })
  }
}));

describe('AddSceneTool', () => {
  let addSceneTool: AddSceneTool;

  beforeEach(() => {
    jest.clearAllMocks();
    addSceneTool = new AddSceneTool();

    // Setup default mock behaviors
    (sceneBuilderService.generateTwoStepCode as jest.Mock).mockResolvedValue({
      code: 'export default function Scene1() { return <div>Test Scene</div>; }',
      name: 'Scene 1',
      duration: 3,
      reasoning: 'Created a test scene',
      layoutJson: { elements: [{ type: 'text', content: 'Test Scene' }] }
    });

    (conversationalResponseService.generateResponse as jest.Mock).mockResolvedValue({
      response: 'I\'ve created a new scene for you with the requested content.'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handler', () => {
    it('should create a new scene successfully', async () => {
      const input = {
        userPrompt: 'Create a scene with floating particles',
        projectId: 'test-project-id',
        sceneNumber: 1
      };

      const result = await addSceneTool.handler(input);

      expect(result.success).toBe(true);
      expect(result.sceneCode).toContain('Scene1');
      expect(result.sceneName).toBe('Scene 1');
      expect(result.duration).toBe(3);
      expect(result.chatResponse).toContain('created a new scene');
      
      // Verify service calls
      expect(sceneBuilderService.generateTwoStepCode).toHaveBeenCalledWith({
        userPrompt: input.userPrompt,
        projectId: input.projectId,
        sceneNumber: input.sceneNumber,
        previousSceneJson: undefined,
        visionAnalysis: undefined
      });
    });

    it('should use previous scene JSON for consistency', async () => {
      const previousScene = {
        id: 'prev-scene-id',
        layoutJson: JSON.stringify({ theme: 'dark', colors: ['blue', 'purple'] })
      };

      (db.query.scenes.findMany as jest.Mock).mockResolvedValue([previousScene]);

      const input = {
        userPrompt: 'Add another scene similar to the previous one',
        projectId: 'test-project-id',
        sceneNumber: 2
      };

      await addSceneTool.handler(input);

      expect(sceneBuilderService.generateTwoStepCode).toHaveBeenCalledWith({
        userPrompt: input.userPrompt,
        projectId: input.projectId,
        sceneNumber: input.sceneNumber,
        previousSceneJson: previousScene.layoutJson,
        visionAnalysis: undefined
      });
    });

    it('should handle vision analysis data', async () => {
      const visionAnalysis = {
        description: 'A sunset scene',
        colors: ['orange', 'red'],
        objects: ['sun', 'clouds']
      };

      const input = {
        userPrompt: 'Create a scene from this image',
        projectId: 'test-project-id',
        visionAnalysis
      };

      await addSceneTool.handler(input);

      expect(sceneBuilderService.generateTwoStepCode).toHaveBeenCalledWith({
        userPrompt: input.userPrompt,
        projectId: input.projectId,
        sceneNumber: undefined,
        previousSceneJson: undefined,
        visionAnalysis
      });
    });

    it('should replace welcome scene when replaceWelcomeScene is true', async () => {
      const welcomeScene = {
        id: 'welcome-scene-id',
        name: 'WelcomeScene'
      };

      (db.query.scenes.findFirst as jest.Mock).mockResolvedValue(welcomeScene);

      const input = {
        userPrompt: 'Create a title scene',
        projectId: 'test-project-id',
        replaceWelcomeScene: true
      };

      const result = await addSceneTool.handler(input);

      expect(result.success).toBe(true);
      expect(result.replacedWelcomeScene).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });

    it('should handle scene generation failure', async () => {
      (sceneBuilderService.generateTwoStepCode as jest.Mock).mockRejectedValue(
        new Error('Generation failed')
      );

      const input = {
        userPrompt: 'Create a scene',
        projectId: 'test-project-id'
      };

      const result = await addSceneTool.handler(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to generate scene');
    });

    it('should handle missing project ID', async () => {
      const input = {
        userPrompt: 'Create a scene',
        projectId: ''
      };

      const result = await addSceneTool.handler(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project ID is required');
    });

    it('should provide context from storyboard', async () => {
      const storyboard = [
        { name: 'Scene1', code: 'const Scene1 = () => <div>First</div>;' },
        { name: 'Scene2', code: 'const Scene2 = () => <div>Second</div>;' }
      ];

      const input = {
        userPrompt: 'Add a conclusion scene',
        projectId: 'test-project-id',
        storyboardSoFar: storyboard,
        sceneNumber: 3
      };

      await addSceneTool.handler(input);

      // Verify that the scene builder receives proper context
      expect(sceneBuilderService.generateTwoStepCode).toHaveBeenCalledWith({
        userPrompt: expect.stringContaining('conclusion scene'),
        projectId: input.projectId,
        sceneNumber: 3,
        previousSceneJson: undefined,
        visionAnalysis: undefined
      });
    });

    it('should handle conversational response generation failure gracefully', async () => {
      (conversationalResponseService.generateResponse as jest.Mock).mockRejectedValue(
        new Error('Response generation failed')
      );

      const input = {
        userPrompt: 'Create a scene',
        projectId: 'test-project-id'
      };

      const result = await addSceneTool.handler(input);

      // Should still succeed even if conversational response fails
      expect(result.success).toBe(true);
      expect(result.chatResponse).toContain('created your scene');
    });

    it('should validate input schema', async () => {
      const invalidInput = {
        // Missing required fields
        sceneNumber: 1
      };

      await expect(addSceneTool.validateInput(invalidInput as any)).rejects.toThrow();
    });

    it('should handle progress callbacks if provided', async () => {
      const progressCallback = jest.fn();
      const toolWithProgress = new AddSceneTool();
      (toolWithProgress as any).onProgress = progressCallback;

      const input = {
        userPrompt: 'Create a scene',
        projectId: 'test-project-id'
      };

      await toolWithProgress.handler(input);

      // Progress callback should be called during generation
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('getPreviousSceneJson', () => {
    it('should retrieve previous scene JSON when available', async () => {
      const previousScene = {
        id: 'prev-scene-id',
        layoutJson: JSON.stringify({ theme: 'dark' })
      };

      (db.query.scenes.findMany as jest.Mock).mockResolvedValue([previousScene]);

      const result = await (addSceneTool as any).getPreviousSceneJson('test-project-id');

      expect(result).toBe(previousScene.layoutJson);
      expect(db.query.scenes.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Array),
        limit: 1
      });
    });

    it('should return undefined when no previous scene exists', async () => {
      (db.query.scenes.findMany as jest.Mock).mockResolvedValue([]);

      const result = await (addSceneTool as any).getPreviousSceneJson('test-project-id');

      expect(result).toBeUndefined();
    });
  });
});