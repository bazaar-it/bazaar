// src/server/services/__tests__/llm.service.test.ts
import { describe, it, expect } from '@jest/globals';
import { LLMService } from '../llm.service';

const mockCreate = jest.fn();
const mockClient: any = {
  chat: { completions: { create: mockCreate } }
};

describe('LLMService', () => {
  it('delegates to OpenAI client', async () => {
    mockCreate.mockResolvedValue('stream');
    const svc = new LLMService(mockClient);
    const stream = await svc.streamChat([]);
    expect(stream).toBe('stream');
    expect(mockCreate).toHaveBeenCalled();
  });
});
