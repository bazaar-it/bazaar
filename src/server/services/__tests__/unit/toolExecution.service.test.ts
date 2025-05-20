// src/server/services/__tests__/unit/toolExecution.service.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { TRPCError } from '@trpc/server';
import { Subject } from 'rxjs';
import { type Operation } from 'fast-json-patch';
import { ToolExecutionService, type ToolHandler, type ToolCallResponse } from '../../toolExecution.service';
import { StreamEventType } from '~/types/chat';
import { chatLogger, logChatTool } from '~/lib/logger';

// Mock dependencies
jest.mock('~/lib/logger', () => ({
  chatLogger: {
    error: jest.fn(),
  },
  logChatTool: jest.fn(),
}));

jest.mock('~/server/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('~/server/services/scenePlanner.service', () => ({
  handleScenePlan: jest.fn().mockResolvedValue({
    message: 'Scene plan handled successfully',
    patches: [{ op: 'add', path: '/scenes', value: [] }],
  }),
}));

jest.mock('~/server/services/componentGenerator.service', () => ({
  generateComponent: jest.fn().mockResolvedValue({
    jobId: 'test-job-id',
    effect: 'TestEffect',
  }),
}));

jest.mock('~/server/services/animationDesigner.service', () => ({
  generateAnimationDesignBrief: jest.fn().mockResolvedValue({
    brief: 'Test brief',
    briefId: 'test-brief-id',
  }),
}));

describe('ToolExecutionService', () => {
  let toolExecutionService: ToolExecutionService;
  const projectId = 'test-project-id';
  const userId = 'test-user-id';
  const assistantMessageId = 'test-assistant-message-id';

  beforeEach(() => {
    toolExecutionService = new ToolExecutionService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with default tools registered', () => {
      // We can verify the default tools are registered by trying to execute them
      // This is an indirect test of constructor functionality
      const toolNames = [
        'applyJsonPatch',
        'generateRemotionComponent',
        'planVideoScenes'
      ];
      
      for (const toolName of toolNames) {
        // @ts-ignore - Accessing private property for testing
        expect(toolExecutionService.toolHandlers[toolName]).toBeDefined();
      }
    });
  });

  describe('registerTool', () => {
    it('registers a custom tool handler', async () => {
      const testToolHandler: ToolHandler = async () => ({
        message: 'Test tool executed',
      });

      toolExecutionService.registerTool('testTool', testToolHandler);

      // Execute the tool to verify it was registered
      const result = await toolExecutionService.executeTool(
        'testTool',
        projectId,
        userId,
        {},
        assistantMessageId
      );

      expect(result.message).toBe('Test tool executed');
      expect(result.success).toBe(true);
    });

    it('overwrites an existing tool handler', async () => {
      const originalHandler: ToolHandler = async () => ({
        message: 'Original handler',
      });

      const newHandler: ToolHandler = async () => ({
        message: 'New handler',
      });

      toolExecutionService.registerTool('testTool', originalHandler);
      toolExecutionService.registerTool('testTool', newHandler);

      const result = await toolExecutionService.executeTool(
        'testTool',
        projectId,
        userId,
        {},
        assistantMessageId
      );

      expect(result.message).toBe('New handler');
    });
  });

  describe('executeTool', () => {
    it('executes a registered tool and returns success response', async () => {
      const testToolHandler: ToolHandler = async () => ({
        message: 'Test tool executed successfully',
      });

      toolExecutionService.registerTool('testTool', testToolHandler);

      const result = await toolExecutionService.executeTool(
        'testTool',
        projectId,
        userId,
        { param: 'value' },
        assistantMessageId
      );

      expect(result).toEqual({
        message: 'Test tool executed successfully',
        success: true,
      });
      expect(logChatTool).toHaveBeenCalledWith(
        chatLogger,
        assistantMessageId, 
        'testTool', 
        'Executing tool call'
      );
    });

    it('returns an error for unknown tools', async () => {
      const result = await toolExecutionService.executeTool(
        'nonExistentTool',
        projectId,
        userId,
        {},
        assistantMessageId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
      expect(logChatTool).toHaveBeenCalledWith(
        chatLogger,
        assistantMessageId, 
        'nonExistentTool', 
        'Unknown tool call',
        expect.any(Object)
      );
    });

    it('handles errors thrown by tool handlers', async () => {
      const errorHandler: ToolHandler = async () => {
        throw new Error('Test error');
      };

      toolExecutionService.registerTool('errorTool', errorHandler);

      const result = await toolExecutionService.executeTool(
        'errorTool',
        projectId,
        userId,
        {},
        assistantMessageId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(chatLogger.error).toHaveBeenCalledWith(
        assistantMessageId,
        expect.stringContaining('Error executing tool errorTool')
      );
    });

    it('passes emitter to the tool handler when provided', async () => {
      let receivedEmitter: Subject<any> | undefined;
      
      const testToolHandler: ToolHandler = async (
        _projectId, 
        _userId, 
        _args, 
        _assistantMessageId, 
        emitter
      ) => {
        receivedEmitter = emitter;
        return { message: 'Test complete' };
      };

      toolExecutionService.registerTool('emitterTool', testToolHandler);
      
      const testEmitter = new Subject<{type: StreamEventType; [key: string]: any}>();
      
      await toolExecutionService.executeTool(
        'emitterTool',
        projectId,
        userId,
        {},
        assistantMessageId,
        testEmitter
      );

      expect(receivedEmitter).toBe(testEmitter);
    });

    it('logs execution time', async () => {
      const slowToolHandler: ToolHandler = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { message: 'Slow tool completed' };
      };

      toolExecutionService.registerTool('slowTool', slowToolHandler);

      await toolExecutionService.executeTool(
        'slowTool',
        projectId,
        userId,
        {},
        assistantMessageId
      );

      expect(logChatTool).toHaveBeenCalledWith(
        chatLogger,
        assistantMessageId,
        'slowTool',
        'Executed in',
        expect.objectContaining({ duration: expect.any(Number) })
      );
    });
  });

  describe('handleApplyJsonPatch', () => {
    // We're testing a private method using public interfaces
    
    it('applies valid JSON patch operations', async () => {
      const operations: Operation[] = [
        { op: 'replace', path: '/test', value: 'new value' }
      ];

      const result = await toolExecutionService.executeTool(
        'applyJsonPatch',
        projectId,
        userId,
        { operations, explanation: 'Test patch' },
        assistantMessageId
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test patch');
      expect(result.patches).toEqual(operations);
    });

    it('uses default message when no explanation is provided', async () => {
      const operations: Operation[] = [
        { op: 'replace', path: '/test', value: 'new value' }
      ];

      const result = await toolExecutionService.executeTool(
        'applyJsonPatch',
        projectId,
        userId,
        { operations },
        assistantMessageId
      );

      expect(result.message).toContain('Applied 1 patch operations');
    });

    it('rejects empty operations array', async () => {
      const result = await toolExecutionService.executeTool(
        'applyJsonPatch',
        projectId,
        userId,
        { operations: [] },
        assistantMessageId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No patch operations provided');
    });

    it('rejects invalid operations', async () => {
      const result = await toolExecutionService.executeTool(
        'applyJsonPatch',
        projectId,
        userId,
        { operations: 'not-an-array' },
        assistantMessageId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });
  });

  describe('handleGenerateComponent', () => {
    it('generates a component from effect description', async () => {
      const result = await toolExecutionService.executeTool(
        'generateRemotionComponent',
        projectId,
        userId,
        { effectDescription: 'A spinning logo with particles' },
        assistantMessageId
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('generating a custom');
      expect(result.message).toContain('TestEffect');
    });

    it('rejects missing effect description', async () => {
      const result = await toolExecutionService.executeTool(
        'generateRemotionComponent',
        projectId,
        userId,
        { },
        assistantMessageId
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing or invalid effect description');
    });

    it('logs component generation details', async () => {
      await toolExecutionService.executeTool(
        'generateRemotionComponent',
        projectId,
        userId,
        { effectDescription: 'Test effect' },
        assistantMessageId
      );

      expect(logChatTool).toHaveBeenCalledWith(
        chatLogger,
        assistantMessageId,
        'generateRemotionComponent',
        expect.stringContaining('Generating component'),
        undefined
      );

      expect(logChatTool).toHaveBeenCalledWith(
        chatLogger,
        assistantMessageId,
        'generateRemotionComponent',
        expect.stringContaining('Generated component'),
        expect.any(Object)
      );
    });
  });

  describe('handlePlanScenes', () => {
    const mockEmitter = new Subject<{type: StreamEventType; [key: string]: any}>();
    const validScenePlan = {
      scenes: [
        {
          id: 'scene1',
          description: 'Test scene',
          durationInSeconds: 5,
          effectType: 'TestEffect'
        }
      ]
    };

    it('processes a valid scene plan', async () => {
      const result = await toolExecutionService.executeTool(
        'planVideoScenes',
        projectId,
        userId,
        validScenePlan,
        assistantMessageId,
        mockEmitter
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Scene plan handled successfully');
      expect(result.patches).toEqual([{ op: 'add', path: '/scenes', value: [] }]);
    });

    it('rejects invalid scene plans', async () => {
      const result = await toolExecutionService.executeTool(
        'planVideoScenes',
        projectId,
        userId,
        { invalid: 'plan' },
        assistantMessageId,
        mockEmitter
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid scene plan format');
    });

    it('requires an emitter for scene planning', async () => {
      const result = await toolExecutionService.executeTool(
        'planVideoScenes',
        projectId,
        userId,
        validScenePlan,
        assistantMessageId,
        // No emitter provided
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Emitter is required');
    });

    it('logs scene validation issues', async () => {
      const invalidScene = {
        scenes: [
          {
            // Missing id
            description: 'Invalid scene',
            // Missing duration
            effectType: 'TestEffect'
          }
        ]
      };

      await toolExecutionService.executeTool(
        'planVideoScenes',
        projectId,
        userId,
        invalidScene,
        assistantMessageId,
        mockEmitter
      );

      // Check if validation issues were logged
      expect(logChatTool).toHaveBeenCalledWith(
        chatLogger,
        assistantMessageId,
        'planVideoScenes',
        expect.stringContaining('Scene at index 0 is missing an ID'),
        undefined
      );

      expect(logChatTool).toHaveBeenCalledWith(
        chatLogger,
        assistantMessageId,
        'planVideoScenes',
        expect.stringContaining('has invalid duration'),
        undefined
      );
    });
  });
});
