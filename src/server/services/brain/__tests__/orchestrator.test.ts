// src/server/services/brain/__tests__/orchestrator.test.ts
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { BrainOrchestrator } from '../orchestrator';
import { AIClientService } from '~/server/services/ai/aiClient.service';
import { conversationalResponseService } from '~/server/services/ai/conversationalResponse.service';
import { sceneRepositoryService } from '~/server/services/brain/sceneRepository.service';
import { projectMemoryService } from '~/server/services/data/projectMemory.service';
import { ContextBuilderService } from '../contextBuilder.service';
import { 
  addSceneTool, 
  editSceneTool, 
  deleteSceneTool,
  analyzeImageTool,
  createSceneFromImageTool,
  changeDurationTool
} from '~/server/services/mcp/tools';
import { ToolName } from '~/lib/types/ai/brain.types';
import type { OrchestrationInput, OrchestrationOutput } from '../orchestrator';

// Mock all dependencies
jest.mock('~/server/services/ai/aiClient.service');
jest.mock('~/server/services/ai/conversationalResponse.service');
jest.mock('~/server/services/brain/sceneRepository.service');
jest.mock('~/server/services/data/projectMemory.service');
jest.mock('../contextBuilder.service');
jest.mock('~/server/services/mcp/tools');
jest.mock('~/server/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'mock-id' }])
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({})
      })
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    })
  }
}));

describe('BrainOrchestrator', () => {
  let orchestrator: BrainOrchestrator;
  
  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new BrainOrchestrator();
    
    // Setup default mock behaviors
    (AIClientService.prototype.generateContent as jest.Mock).mockResolvedValue({
      success: true,
      content: JSON.stringify({
        success: true,
        toolName: ToolName.AddScene,
        reasoning: 'User wants to add a new scene'
      })
    });
    
    (conversationalResponseService.generateResponse as jest.Mock).mockResolvedValue({
      response: 'I\'ll help you create that scene'
    });
    
    (sceneRepositoryService.saveIteration as jest.Mock).mockResolvedValue(undefined);
    (projectMemoryService.saveMemory as jest.Mock).mockResolvedValue(undefined);
    
    (ContextBuilderService.prototype.buildContext as jest.Mock).mockResolvedValue({
      userPrompt: 'Create a scene with particles',
      conversationHistory: [],
      projectConfig: {},
      currentScenes: []
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processUserInput', () => {
    it('should process a simple scene addition request', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Add a scene with floating particles'
      };

      (addSceneTool.handler as jest.Mock).mockResolvedValue({
        success: true,
        sceneId: 'new-scene-id',
        sceneName: 'ParticleScene',
        sceneCode: 'const ParticleScene = () => { return <div>Particles</div>; }',
        duration: 3,
        chatResponse: 'I\'ve added a particle scene for you'
      });

      const result = await orchestrator.processUserInput(input);

      expect(result.success).toBe(true);
      expect(result.message).toContain('particle scene');
      expect(result.operation).toBe('create');
      expect(result.scenes).toHaveLength(1);
      expect(result.scenes[0].sceneId).toBe('new-scene-id');
    });

    it('should handle scene editing with complexity detection', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [{
          id: 'existing-scene-id',
          name: 'TextScene',
          code: 'const TextScene = () => <div>Hello</div>;',
          duration: 5
        }],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Change the text to say Goodbye'
      };

      (AIClientService.prototype.generateContent as jest.Mock).mockResolvedValue({
        success: true,
        content: JSON.stringify({
          success: true,
          toolName: ToolName.EditScene,
          targetSceneId: 'existing-scene-id',
          editComplexity: 'surgical',
          reasoning: 'Simple text change'
        })
      });

      (editSceneTool.handler as jest.Mock).mockResolvedValue({
        success: true,
        sceneId: 'existing-scene-id',
        sceneName: 'TextScene',
        sceneCode: 'const TextScene = () => <div>Goodbye</div>;',
        duration: 5,
        chatResponse: 'I\'ve updated the text for you'
      });

      const result = await orchestrator.processUserInput(input);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('edit');
      expect(result.scenes[0].sceneCode).toContain('Goodbye');
    });

    it('should handle scene deletion requests', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [{
          id: 'scene-to-delete',
          name: 'UnwantedScene',
          code: 'const UnwantedScene = () => <div>Delete me</div>;',
          duration: 3
        }],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Delete the UnwantedScene'
      };

      (AIClientService.prototype.generateContent as jest.Mock).mockResolvedValue({
        success: true,
        content: JSON.stringify({
          success: true,
          toolName: ToolName.DeleteScene,
          targetSceneId: 'scene-to-delete',
          reasoning: 'User wants to delete UnwantedScene'
        })
      });

      (deleteSceneTool.handler as jest.Mock).mockResolvedValue({
        success: true,
        deletedSceneId: 'scene-to-delete',
        chatResponse: 'I\'ve deleted the scene'
      });

      const result = await orchestrator.processUserInput(input);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.deletedSceneId).toBe('scene-to-delete');
    });

    it('should handle workflow execution for complex requests', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Create a title scene and then add a transition effect'
      };

      (AIClientService.prototype.generateContent as jest.Mock).mockResolvedValue({
        success: true,
        content: JSON.stringify({
          success: true,
          workflow: [
            { toolName: ToolName.AddScene, context: 'Create title scene' },
            { toolName: ToolName.AddScene, context: 'Add transition effect' }
          ],
          reasoning: 'Multi-step workflow needed'
        })
      });

      let callCount = 0;
      (addSceneTool.handler as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          success: true,
          sceneId: `scene-${callCount}`,
          sceneName: callCount === 1 ? 'TitleScene' : 'TransitionScene',
          sceneCode: `const Scene${callCount} = () => <div>Scene ${callCount}</div>;`,
          duration: 3,
          chatResponse: `Added scene ${callCount}`
        });
      });

      const result = await orchestrator.processUserInput(input);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('workflow');
      expect(result.scenes).toHaveLength(2);
      expect(addSceneTool.handler).toHaveBeenCalledTimes(2);
    });

    it('should handle image analysis for image-based requests', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Create a scene from this image',
        imageUrls: ['https://example.com/image.jpg']
      };

      (AIClientService.prototype.generateContent as jest.Mock).mockResolvedValue({
        success: true,
        content: JSON.stringify({
          success: true,
          toolName: ToolName.CreateSceneFromImage,
          reasoning: 'User wants to create scene from image'
        })
      });

      (analyzeImageTool.handler as jest.Mock).mockResolvedValue({
        success: true,
        imageFacts: {
          description: 'A beautiful sunset',
          colors: ['orange', 'red', 'purple'],
          objects: ['sun', 'clouds', 'horizon']
        }
      });

      (createSceneFromImageTool.handler as jest.Mock).mockResolvedValue({
        success: true,
        sceneId: 'image-scene-id',
        sceneName: 'SunsetScene',
        sceneCode: 'const SunsetScene = () => <div>Sunset</div>;',
        duration: 5,
        chatResponse: 'Created scene from your sunset image'
      });

      const result = await orchestrator.processUserInput(input);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('create');
      expect(result.scenes[0].sceneName).toBe('SunsetScene');
    });

    it('should handle duration change requests', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [{
          id: 'scene-id',
          name: 'AnimatedScene',
          code: 'const AnimatedScene = () => <div>Animation</div>;',
          duration: 3
        }],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Make the animation 5 seconds long'
      };

      (AIClientService.prototype.generateContent as jest.Mock).mockResolvedValue({
        success: true,
        content: JSON.stringify({
          success: true,
          toolName: ToolName.ChangeDuration,
          targetSceneId: 'scene-id',
          requestedDurationSeconds: 5,
          reasoning: 'User wants to change duration to 5 seconds'
        })
      });

      (changeDurationTool.handler as jest.Mock).mockResolvedValue({
        success: true,
        sceneId: 'scene-id',
        sceneName: 'AnimatedScene',
        sceneCode: 'const AnimatedScene = () => <div>Animation</div>;',
        duration: 5,
        chatResponse: 'Updated duration to 5 seconds'
      });

      const result = await orchestrator.processUserInput(input);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('edit');
      expect(result.scenes[0].duration).toBe(5);
    });

    it('should handle errors gracefully', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Add a scene'
      };

      (AIClientService.prototype.generateContent as jest.Mock).mockRejectedValue(
        new Error('AI service error')
      );

      const result = await orchestrator.processUserInput(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process request');
      expect(result.message).toContain('understand your request');
    });

    it('should handle clarification needed scenarios', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [
          { id: 'scene1', name: 'Scene1', code: '', duration: 3 },
          { id: 'scene2', name: 'Scene2', code: '', duration: 3 }
        ],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Change the text'
      };

      (AIClientService.prototype.generateContent as jest.Mock).mockResolvedValue({
        success: true,
        content: JSON.stringify({
          success: false,
          needsClarification: true,
          clarificationQuestion: 'Which scene would you like to edit?'
        })
      });

      const result = await orchestrator.processUserInput(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('clarification_needed');
      expect(result.message).toContain('Which scene');
    });
  });

  describe('analyzeIntent', () => {
    it('should correctly identify tool from user intent', async () => {
      const input: OrchestrationInput = {
        chatHistory: [],
        currentScenes: [],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Add a text animation that fades in'
      };

      (AIClientService.prototype.generateContent as jest.Mock).mockResolvedValue({
        success: true,
        content: JSON.stringify({
          success: true,
          toolName: ToolName.AddScene,
          reasoning: 'User wants to add a text animation'
        })
      });

      const result = await orchestrator['analyzeIntent'](input);

      expect(result.success).toBe(true);
      expect(result.toolName).toBe(ToolName.AddScene);
      expect(result.reasoning).toContain('text animation');
    });
  });

  describe('buildContextPacket', () => {
    it('should build comprehensive context for decision making', async () => {
      const input: OrchestrationInput = {
        chatHistory: [
          { role: 'user', content: 'Make it blue' },
          { role: 'assistant', content: 'I\'ll make it blue' }
        ],
        currentScenes: [{
          id: 'scene1',
          name: 'ColorScene',
          code: 'const ColorScene = () => <div style={{color: "red"}}>Text</div>;',
          duration: 3
        }],
        projectId: 'test-project-id',
        userId: 'test-user-id',
        videoDuration: 10,
        userPrompt: 'Now make it green'
      };

      const contextPacket = await orchestrator.buildContextPacket(input);

      expect(contextPacket).toHaveProperty('userPrompt', 'Now make it green');
      expect(contextPacket).toHaveProperty('conversationHistory');
      expect(contextPacket.conversationHistory).toHaveLength(2);
      expect(contextPacket).toHaveProperty('currentScenes');
      expect(contextPacket.currentScenes).toHaveLength(1);
    });
  });
});