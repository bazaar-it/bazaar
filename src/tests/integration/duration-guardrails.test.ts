/**
 * Integration test: duration guardrails across trim, edit tool, and code editor
 *
 * Verifies:
 * 1) Trim updates duration
 * 2) Edit tool does NOT change duration unless explicitly requested
 * 3) Code editor does NOT change duration unless overwriteDuration=true
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
// NOTE: To avoid ESM parsing issues when RUN_E2E_TESTS is false, require heavy modules lazily inside RUN branch

type TestContext = {
  userId: string;
  projectId: string;
  apiKey: string;
  sessionToken: string;
  cleanup: () => Promise<void>;
};

// Mock the EDIT tool to avoid AI calls and control returned duration
jest.mock('~/tools/edit/edit', () => ({
  editTool: {
    run: jest.fn().mockResolvedValue({
      success: true,
      data: {
        // Minimal valid TSX for storage; not executed here
        tsxCode: 'export default function Scene_EditMock() { return null }',
        duration: 777,
        props: {},
      },
    }),
  },
}));

// Minimal starter TSX code with a declared duration for code-editor path
const BASE_TSX_240 = `
export default function Scene_Base() {
  const durationInFrames = 240;
  return null;
}
`.trim();

const CODE_TSX_999 = `
export default function Scene_CodeEdit() {
  const durationInFrames = 999;
  return null;
}
`.trim();

const RUN = process.env.RUN_E2E_TESTS === 'true';

(RUN ? describe : describe.skip)('Duration Guardrails', () => {
let ctx: TestContext;
let sceneId: string;
let db: any;
let scenesTable: any;
let executeToolFromDecision: any;
let createCaller: any;

  beforeAll(async () => {
    // Load real environment variables from .env.local for E2E
    // and override the jest env mock so DB uses real DATABASE_URL
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });

    // Ensure we have a DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required to run E2E tests');
    }

    // Reset modules and mock ~/env to return real process.env
    jest.resetModules();
    jest.doMock('~/env', () => ({ env: { ...process.env } }), { virtual: true });

    // Lazy-load heavy modules only when RUN=true (after env mock)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { db: _db } = require('~/server/db');
    db = _db;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    scenesTable = require('~/server/db/schema').scenes;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    executeToolFromDecision = require('~/server/api/routers/generation/helpers').executeToolFromDecision;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    createCaller = require('~/server/api/root').createCaller;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createTestContext } = require('../fixtures/test-database-setup');

    ctx = await createTestContext();
    const inserted = await db
      .insert(scenesTable)
      .values({
        projectId: ctx.projectId,
        order: 0,
        name: 'Scene 1',
        tsxCode: BASE_TSX_240,
        duration: 240,
        props: {},
      })
      .returning();
    sceneId = inserted[0]!.id as string;
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('Trim updates duration (240 -> 180)', async () => {
    const storyboard = [
      {
        id: sceneId,
        order: 0,
        name: 'Scene 1',
        duration: 240,
        tsxCode: BASE_TSX_240,
      },
    ];

    const decision = {
      success: true,
      toolName: 'trimScene' as const,
      toolContext: {
        userPrompt: 'make it 180 frames',
        targetSceneId: sceneId,
        // targetDuration may be populated by brain, but trim tool can parse from prompt
      },
      reasoning: 'test',
      chatResponse: 'test',
    };

    const result = await executeToolFromDecision(
      decision as any,
      ctx.projectId,
      ctx.userId,
      storyboard as any,
    );

    expect(result.success).toBe(true);

    const [updated] = await db
      .select()
      .from(scenesTable)
      .where(scenesTable.id.eq(sceneId));
    expect(updated!.duration).toBe(180);
  });

  it('Edit tool does NOT change duration unless requested', async () => {
    // First: Call editScene WITHOUT requestedDurationFrames; mocked tool suggests 777 -> should be ignored
    const storyboard = [
      {
        id: sceneId,
        order: 0,
        name: 'Scene 1',
        duration: 180, // current value after trim
        tsxCode: BASE_TSX_240,
      },
    ];

    const decisionNoDuration = {
      success: true,
      toolName: 'editScene' as const,
      toolContext: {
        userPrompt: 'minor visual tweak',
        targetSceneId: sceneId,
        // requestedDurationFrames: undefined (no explicit request)
      },
      reasoning: 'test',
      chatResponse: 'test',
    };

    const res1 = await executeToolFromDecision(
      decisionNoDuration as any,
      ctx.projectId,
      ctx.userId,
      storyboard as any,
    );

    expect(res1.success).toBe(true);
    let [afterEdit] = await db.select().from(scenesTable).where(scenesTable.id.eq(sceneId));
    expect(afterEdit!.duration).toBe(180); // unchanged

    // Second: Call editScene WITH requestedDurationFrames; mocked tool suggests 777 -> should be applied
    const decisionWithDuration = {
      ...decisionNoDuration,
      toolContext: {
        ...decisionNoDuration.toolContext,
        requestedDurationFrames: 777,
      },
    };

    const res2 = await executeToolFromDecision(
      decisionWithDuration as any,
      ctx.projectId,
      ctx.userId,
      storyboard as any,
    );
    expect(res2.success).toBe(true);
    ;
    [afterEdit] = await db.select().from(scenesTable).where(scenesTable.id.eq(sceneId));
    expect(afterEdit!.duration).toBe(777);
  });

  it('Code editor only changes duration when overwriteDuration=true', async () => {
    const caller = createCaller({
      db,
      session: {
        user: {
          id: ctx.userId,
          email: 'test@bazaar.test',
          // any other required fields can be added if needed
        },
      },
      headers: new Headers(),
    } as any);

    // Save code that declares 999 but DO NOT overwrite -> duration stays 777
    await caller.scenes.updateSceneCode({
      projectId: ctx.projectId,
      sceneId,
      code: CODE_TSX_999,
      // overwriteDuration: false (default)
    });
    let [afterCodeEdit] = await db.select().from(scenesTable).where(scenesTable.id.eq(sceneId));
    expect(afterCodeEdit!.duration).toBe(777);

    // Now explicitly overwrite -> duration becomes 999
    await caller.scenes.updateSceneCode({
      projectId: ctx.projectId,
      sceneId,
      code: CODE_TSX_999,
      overwriteDuration: true,
    });
    [afterCodeEdit] = await db.select().from(scenesTable).where(scenesTable.id.eq(sceneId));
    expect(afterCodeEdit!.duration).toBe(999);
  });
});
