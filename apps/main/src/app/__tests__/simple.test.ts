import { describe, it, expect } from '@jest/globals';

describe('Jest Environment', () => {
  it('should run tests correctly', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should handle async tests', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
}); 