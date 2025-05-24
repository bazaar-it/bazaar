import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { analyzePrompt } from './promptInspector';
import { getTemplateSnippet } from './getTemplateSnippet';

// Mock OpenAI for integration tests
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

// Mock the generation router logic
const mockGenerateSceneCode = async (input: {
  projectId: string;
  userPrompt: string;
  sceneId?: string;
}) => {
  const { userPrompt, sceneId } = input;
  
  // Check for @scene(id) edit pattern
  const editMatch = /^@scene\(([^)]+)\)\s+([\s\S]*)$/.exec(userPrompt);
  const isEditMode = !!editMatch;
  const editInstruction = editMatch ? editMatch[2] : userPrompt;
  
  // Analyze prompt
  const insight = analyzePrompt(isEditMode ? editInstruction! : userPrompt);
  
  // Get template snippet for low specificity
  let templateSnippet: string | null = null;
  if (!isEditMode && insight.specificity === 'low') {
    templateSnippet = getTemplateSnippet(insight.patternHint);
  }
  
  // Build messages array (simplified)
  const messages = [
    {
      role: 'system',
      content: isEditMode 
        ? 'You are editing an existing component...'
        : insight.specificity === 'high'
          ? 'Follow user specs exactly...'
          : 'Generate engaging animation...'
    }
  ];
  
  // Add template snippet if available
  if (templateSnippet) {
    messages.push({ role: 'assistant', content: templateSnippet });
  }
  
  messages.push({ role: 'user', content: editInstruction || userPrompt });
  
  // Mock OpenAI response
  const mockCode = isEditMode 
    ? `// Edited component for: ${editInstruction}`
    : `// Generated component for: ${userPrompt}`;
    
  return {
    code: mockCode,
    sceneId: sceneId || 'new-scene-id',
    insight,
    templateSnippet,
    isEdit: isEditMode,
    messages, // Return for testing
  };
};

describe('BAZAAR-302 Smoke Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test A: High-specificity prompt', () => {
    it('should not inject template snippets for high-specificity prompts', async () => {
      const highSpecPrompt = 'Create animation with interpolate and spring effects using translateX and opacity';
      
      const result = await mockGenerateSceneCode({
        projectId: 'test-project',
        userPrompt: highSpecPrompt,
      });
      
      // Assert no snippet was injected
      expect(result.templateSnippet).toBeNull();
      expect(result.insight.specificity).toBe('high');
      
      // Assert messages array structure
      expect(result.messages).toHaveLength(2); // system + user only
      expect(result.messages[0]?.content).toContain('Follow user specs exactly');
      expect(result.messages[1]?.content).toBe(highSpecPrompt);
    });
  });

  describe('Test B: Low-specificity prompt', () => {
    it('should inject template snippets for vague prompts', async () => {
      const lowSpecPrompt = 'cool bounce animation';
      
      const result = await mockGenerateSceneCode({
        projectId: 'test-project',
        userPrompt: lowSpecPrompt,
      });
      
      // Assert snippet was injected
      expect(result.insight.specificity).toBe('low');
      expect(result.templateSnippet).toBeDefined();
      
      // Assert messages array structure
      expect(result.messages).toHaveLength(3); // system + assistant (snippet) + user
      expect(result.messages[0]?.content).toContain('Generate engaging animation');
      expect(result.messages[1]?.content).toBe(result.templateSnippet);
      expect(result.messages[2]?.content).toBe(lowSpecPrompt);
    });
  });

  describe('Test C: Edit flow', () => {
    it('should handle @scene(id) edit commands correctly', async () => {
      const editPrompt = '@scene(test-scene-123) make it red';
      
      const result = await mockGenerateSceneCode({
        projectId: 'test-project',
        userPrompt: editPrompt,
        sceneId: 'test-scene-123',
      });
      
      // Assert edit mode was detected
      expect(result.isEdit).toBe(true);
      expect(result.sceneId).toBe('test-scene-123');
      
      // Assert no template snippets in edit mode
      expect(result.templateSnippet).toBeNull();
      
      // Assert messages array structure for edit
      expect(result.messages).toHaveLength(2); // system (edit) + user only
      expect(result.messages[0]?.content).toContain('You are editing an existing component');
      expect(result.messages[1]?.content).toBe('make it red');
      
      // Assert generated code reflects edit
      expect(result.code).toContain('make it red');
    });
  });

  describe('Integration: Prompt analysis and template retrieval', () => {
    it('should correctly analyze prompts and retrieve appropriate templates', () => {
      // Test various prompt patterns
      const testCases = [
        {
          prompt: 'bounce ball',
          expectedSpecificity: 'low',
          expectedPattern: 'bounce',
        },
        {
          prompt: 'spinning wheel animation',
          expectedSpecificity: 'low',
          expectedPattern: 'spin',
        },
        {
          prompt: 'text that fade in slowly',
          expectedSpecificity: 'low',
          expectedPattern: 'fade',
        },
        {
          prompt: 'use interpolate with spring config and translateX transform',
          expectedSpecificity: 'high',
          expectedPattern: undefined,
        },
      ];

      testCases.forEach(({ prompt, expectedSpecificity, expectedPattern }) => {
        const insight = analyzePrompt(prompt);
        expect(insight.specificity).toBe(expectedSpecificity);
        expect(insight.patternHint).toBe(expectedPattern);
        
        if (expectedPattern) {
          const snippet = getTemplateSnippet(expectedPattern);
          expect(snippet).toBeDefined();
          expect(snippet!.length).toBeLessThanOrEqual(200);
        }
      });
    });
  });
}); 