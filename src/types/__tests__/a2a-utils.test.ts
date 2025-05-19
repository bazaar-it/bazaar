// src/types/__tests__/a2a-utils.test.ts
import { describe, it, expect } from '@jest/globals';
import { mapInternalToA2AState, mapA2AToInternalState, requiresUserInput } from '../a2a';

describe('A2A state helpers', () => {
  it('maps internal status to A2A state', () => {
    expect(mapInternalToA2AState('pending')).toBe('submitted');
    expect(mapInternalToA2AState('building')).toBe('working');
    expect(mapInternalToA2AState('complete')).toBe('completed');
    expect(mapInternalToA2AState('failed')).toBe('failed');
  });

  it('maps A2A state to internal status', () => {
    expect(mapA2AToInternalState('submitted')).toBe('pending');
    expect(mapA2AToInternalState('working')).toBe('generating');
    expect(mapA2AToInternalState('completed')).toBe('complete');
    expect(mapA2AToInternalState('failed')).toBe('failed');
    expect(mapA2AToInternalState('unknown')).toBe('pending');
  });

  it('detects states that require user input', () => {
    expect(requiresUserInput('input-required')).toBe(true);
    expect(requiresUserInput('working')).toBe(false);
  });
});
