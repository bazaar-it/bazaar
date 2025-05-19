// src/server/services/__tests__/toolExecution.service.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { handleApplyJsonPatch } from '../toolExecution.service';
import { db, patches } from '~/server/db';

jest.mock('~/server/db', () => ({
  db: { insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({}) }) },
  patches: {}
}));

describe('handleApplyJsonPatch', () => {
  it('throws on invalid ops', async () => {
    await expect(handleApplyJsonPatch('p', [] as any)).rejects.toThrow();
  });
});
