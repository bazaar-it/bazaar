import { describe, it, expect } from '@jest/globals';
import { analyzePrompt, type PromptInsight } from './promptInspector';

describe('promptInspector', () => {
  describe('analyzePrompt', () => {
    // High-specificity test cases (4 tests)
    it('should classify high specificity for prompts with 2+ technical tokens', () => {
      const result = analyzePrompt('Create an animation with interpolate and spring effects');
      expect(result.specificity).toBe('high');
      expect(result.patternHint).toBeUndefined();
    });

    it('should classify high specificity for prompts with duration and visual properties', () => {
      const result = analyzePrompt('Make it fade for 3 seconds');
      expect(result.specificity).toBe('high');
      expect(result.requestedDurationSec).toBe(3);
      expect(result.patternHint).toBeUndefined();
    });

    it('should classify high specificity for CSS-heavy prompts', () => {
      const result = analyzePrompt('Set backgroundColor to blue and add borderRadius with padding');
      expect(result.specificity).toBe('high');
      expect(result.patternHint).toBeUndefined();
    });

    it('should classify high specificity for animation-specific prompts', () => {
      const result = analyzePrompt('Use translateX and rotateY transforms with opacity changes');
      expect(result.specificity).toBe('high');
      expect(result.patternHint).toBeUndefined();
    });

    // Low-specificity test cases (4 tests)
    it('should classify low specificity for vague prompts', () => {
      const result = analyzePrompt('cool bounce animation');
      expect(result.specificity).toBe('low');
      expect(result.patternHint).toBeDefined();
    });

    it('should classify low specificity and detect bounce pattern', () => {
      const result = analyzePrompt('make something bounce around');
      expect(result.specificity).toBe('low');
      expect(result.patternHint).toBe('bounce');
    });

    it('should classify low specificity and detect spin pattern', () => {
      const result = analyzePrompt('spinning logo animation');
      expect(result.specificity).toBe('low');
      expect(result.patternHint).toBe('spin');
    });

    it('should classify low specificity and detect fade pattern', () => {
      const result = analyzePrompt('text that appears slowly');
      expect(result.specificity).toBe('low');
      expect(result.patternHint).toBe('fade');
    });

    // Edge cases (2 tests)
    it('should handle empty prompts gracefully', () => {
      const result = analyzePrompt('');
      expect(result.specificity).toBe('low');
      expect(result.requestedDurationSec).toBeUndefined();
      expect(result.patternHint).toBeUndefined();
    });

    it('should extract duration correctly from various formats', () => {
      const testCases = [
        { prompt: 'animate for 5 seconds', expected: 5 },
        { prompt: 'make it last 10 sec', expected: 10 },
        { prompt: 'duration of 2s', expected: 2 },
        { prompt: 'no duration specified', expected: undefined },
      ];

      testCases.forEach(({ prompt, expected }) => {
        const result = analyzePrompt(prompt);
        expect(result.requestedDurationSec).toBe(expected);
      });
    });
  });
}); 