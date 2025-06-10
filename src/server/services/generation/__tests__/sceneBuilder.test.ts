// src/server/services/generation/__tests__/sceneBuilder.test.ts
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { SceneBuilderService } from '../sceneBuilder.service';
import { layoutGeneratorService } from '../layoutGenerator.service';
import { codeGeneratorService } from '../codeGenerator.service';
import { analyzeDuration } from '~/lib/utils/codeDurationExtractor';

// Mock dependencies
jest.mock('../layoutGenerator.service');
jest.mock('../codeGenerator.service');
jest.mock('~/lib/utils/codeDurationExtractor');
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-1234-5678-9012-345678901234')
}));

describe('SceneBuilderService', () => {
  let sceneBuilder: SceneBuilderService;

  beforeEach(() => {
    jest.clearAllMocks();
    sceneBuilder = new SceneBuilderService();
    
    // Setup default mock behaviors
    (layoutGeneratorService.generateLayout as jest.Mock).mockResolvedValue({
      success: true,
      layoutJson: {
        elements: [
          { type: 'text', content: 'Hello World', style: { color: 'blue' } }
        ],
        animations: {
          type: 'fade-in',
          duration: 3
        }
      },
      reasoning: 'Created a simple text layout with fade-in animation'
    });

    (codeGeneratorService.generateCodeFromLayout as jest.Mock).mockResolvedValue({
      success: true,
      code: `
export default function Scene1_mocku() {
  return (
    <AbsoluteFill style={{ backgroundColor: 'white' }}>
      <h1 style={{ color: 'blue' }}>Hello World</h1>
    </AbsoluteFill>
  );
}`,
      reasoning: 'Generated React component from layout'
    });

    (analyzeDuration as jest.Mock).mockReturnValue({
      sceneDuration: 3,
      hasVideo: false
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateTwoStepCode', () => {
    it('should generate scene code through two-step pipeline', async () => {
      const input = {
        userPrompt: 'Create a scene with blue text that says Hello World',
        projectId: 'test-project-id',
        sceneNumber: 1
      };

      const result = await sceneBuilder.generateTwoStepCode(input);

      expect(result).toMatchObject({
        code: expect.stringContaining('Scene1_mocku'),
        name: 'Scene 1',
        duration: 3,
        reasoning: expect.any(String),
        layoutJson: expect.objectContaining({
          elements: expect.any(Array),
          animations: expect.any(Object)
        })
      });

      // Verify the pipeline flow
      expect(layoutGeneratorService.generateLayout).toHaveBeenCalledWith({
        userPrompt: input.userPrompt,
        previousSceneJson: undefined,
        uniqueFunctionName: 'Scene1_mocku',
        visionAnalysis: undefined
      });

      expect(codeGeneratorService.generateCodeFromLayout).toHaveBeenCalledWith({
        layoutJson: expect.any(Object),
        functionName: 'Scene1_mocku'
      });

      expect(analyzeDuration).toHaveBeenCalledWith(expect.stringContaining('Scene1_mocku'));
    });

    it('should handle scene generation with previous scene context', async () => {
      const previousSceneJson = {
        elements: [{ type: 'text', content: 'Previous Scene' }]
      };

      const input = {
        userPrompt: 'Add another scene similar to the previous one',
        projectId: 'test-project-id',
        sceneNumber: 2,
        previousSceneJson: JSON.stringify(previousSceneJson)
      };

      await sceneBuilder.generateTwoStepCode(input);

      expect(layoutGeneratorService.generateLayout).toHaveBeenCalledWith({
        userPrompt: input.userPrompt,
        previousSceneJson: input.previousSceneJson,
        uniqueFunctionName: 'Scene2_mocku',
        visionAnalysis: undefined
      });
    });

    it('should handle vision analysis data', async () => {
      const visionAnalysis = {
        description: 'A beautiful sunset',
        colors: ['orange', 'red', 'purple'],
        objects: ['sun', 'clouds']
      };

      const input = {
        userPrompt: 'Create a scene based on this image',
        projectId: 'test-project-id',
        sceneNumber: 1,
        visionAnalysis
      };

      await sceneBuilder.generateTwoStepCode(input);

      expect(layoutGeneratorService.generateLayout).toHaveBeenCalledWith({
        userPrompt: input.userPrompt,
        previousSceneJson: undefined,
        uniqueFunctionName: 'Scene1_mocku',
        visionAnalysis
      });
    });

    it('should generate unique function names for each scene', async () => {
      const input1 = {
        userPrompt: 'First scene',
        projectId: 'test-project-id',
        sceneNumber: 1
      };

      const input2 = {
        userPrompt: 'Second scene',
        projectId: 'test-project-id',
        sceneNumber: 2
      };

      const result1 = await sceneBuilder.generateTwoStepCode(input1);
      const result2 = await sceneBuilder.generateTwoStepCode(input2);

      expect(result1.code).toContain('Scene1_mocku');
      expect(result2.code).toContain('Scene2_mocku');
      expect(result1.name).toBe('Scene 1');
      expect(result2.name).toBe('Scene 2');
    });

    it('should handle layout generation failure', async () => {
      (layoutGeneratorService.generateLayout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to generate layout'
      });

      const input = {
        userPrompt: 'Create a scene',
        projectId: 'test-project-id'
      };

      await expect(sceneBuilder.generateTwoStepCode(input)).rejects.toThrow('Layout generation failed');
    });

    it('should handle code generation failure', async () => {
      (codeGeneratorService.generateCodeFromLayout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to generate code'
      });

      const input = {
        userPrompt: 'Create a scene',
        projectId: 'test-project-id'
      };

      await expect(sceneBuilder.generateTwoStepCode(input)).rejects.toThrow('Code generation failed');
    });

    it('should calculate duration from generated code', async () => {
      (analyzeDuration as jest.Mock).mockReturnValue({
        sceneDuration: 5,
        hasVideo: true
      });

      const input = {
        userPrompt: 'Create a 5 second animation',
        projectId: 'test-project-id'
      };

      const result = await sceneBuilder.generateTwoStepCode(input);

      expect(result.duration).toBe(5);
      expect(analyzeDuration).toHaveBeenCalledWith(expect.any(String));
    });

    it('should include debug information in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const input = {
        userPrompt: 'Create a scene',
        projectId: 'test-project-id'
      };

      const result = await sceneBuilder.generateTwoStepCode(input);

      expect(result.debug).toBeDefined();
      expect(result.debug).toHaveProperty('timing');

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors gracefully and provide meaningful error messages', async () => {
      (layoutGeneratorService.generateLayout as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const input = {
        userPrompt: 'Create a scene',
        projectId: 'test-project-id'
      };

      await expect(sceneBuilder.generateTwoStepCode(input)).rejects.toThrow();
    });

    it('should properly format the final code with correct function name', async () => {
      const mockCode = `
export default function TestFunction() {
  return <div>Test</div>;
}`;

      (codeGeneratorService.generateCodeFromLayout as jest.Mock).mockResolvedValue({
        success: true,
        code: mockCode,
        reasoning: 'Generated test code'
      });

      const input = {
        userPrompt: 'Create a test scene',
        projectId: 'test-project-id',
        sceneNumber: 3
      };

      const result = await sceneBuilder.generateTwoStepCode(input);

      expect(result.code).toContain('Scene3_mocku');
      expect(result.code).not.toContain('TestFunction');
    });
  });
});