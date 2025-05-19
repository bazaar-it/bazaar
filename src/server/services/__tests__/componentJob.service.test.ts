// src/server/services/__tests__/componentJob.service.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { saveCheckpoint, loadCheckpoint } from '../componentJob.service';
import { db } from '~/server/db';
import { customComponentJobs } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

// simple in-memory job id for test
const testJobId = '00000000-0000-4000-8000-000000000001';

beforeEach(async () => {
  await db.delete(customComponentJobs).where(eq(customComponentJobs.id, testJobId));
  await db.insert(customComponentJobs).values({ id: testJobId, projectId: testJobId, effect: 'test' });
});

describe('componentJob.service checkpoint helpers', () => {
  it('saves and loads checkpoint data', async () => {
    await saveCheckpoint(testJobId, { foo: 'bar' }, 'step1');
    const data = await loadCheckpoint(testJobId);
    expect(data).toEqual({ foo: 'bar' });
  });
});
