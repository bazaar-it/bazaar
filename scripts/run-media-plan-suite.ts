import '~/env';

import { randomUUID } from 'crypto';
import { exit } from 'process';
import { asc, desc, eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

import { orchestrator } from '~/brain/orchestratorNEW';
import { db } from '~/server/db';
import { messages, projects, scenes } from '~/server/db/schema';

interface CLIOptions {
  mode: 'cases' | 'prod';
  projectId?: string;
  userId?: string;
  casesFile: string;
  limit: number;
  execute: boolean;
  output?: string;
}

interface CaseDefinition {
  id: number | string;
  title: string;
  prompt: string;
  projectId?: string;
  userId?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
  sceneIds?: string[];
  assetTags?: string[];
  expectedTool?: string;
  expectedImageAction?: string;
  requestedDurationFrames?: number;
  useLatestOnly?: boolean;
}

interface StructuredLogSummary {
  type: string;
  requestId?: string;
  tool?: string | null;
  reasoning?: string | null;
  needsClarification?: boolean;
  imageAction?: string | null;
  expectedTool?: string | null;
  expectedImageAction?: string | null;
  toolMatch?: boolean;
  imageActionMatch?: boolean;
  attachments?: {
    images: number;
    videos: number;
    audio: number;
  };
  resolvedMedia?: {
    images: number;
    videos: number;
    imageAction?: string | null;
    suppressed?: boolean;
  };
  latencyMs?: number;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const map = new Map<string, string[]>();

  const take = (key: string) => map.get(key)?.[0];
  const takeBool = (key: string) => map.get(key)?.some((v) => v === 'true' || v === '1' || v === '') ?? false;
  const takeNumber = (key: string, fallback: number) => {
    const raw = take(key);
    if (!raw) return fallback;
    const val = Number(raw);
    return Number.isFinite(val) ? val : fallback;
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token || !token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = args[i + 1];
    if (!map.has(key)) map.set(key, []);
    if (!next || next.startsWith('--')) {
      map.get(key)!.push('');
    } else {
      map.get(key)!.push(next);
      i += 1;
    }
  }

  const mode = (take('mode') as 'cases' | 'prod' | undefined) ?? 'cases';

  return {
    mode,
    projectId: take('project'),
    userId: take('user'),
    casesFile: take('cases') ?? 'scripts/data/media-plan-use-cases.json',
    limit: takeNumber('limit', 10),
    execute: takeBool('execute'),
    output: take('output'),
  };
}

async function fetchProjectScenes(projectId: string) {
  return await db
    .select({ id: scenes.id, name: scenes.name, tsxCode: scenes.tsxCode, duration: scenes.duration, order: scenes.order })
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(asc(scenes.order));
}

async function fetchProjectMessages(projectId: string) {
  return await db
    .select({
      role: messages.role,
      content: messages.content,
      imageUrls: messages.imageUrls,
      videoUrls: messages.videoUrls,
      audioUrls: messages.audioUrls,
    })
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(asc(messages.createdAt));
}

function printSummary(tag: string, summary: StructuredLogSummary) {
  const payload = {
    tag,
    requestId: summary.requestId,
    tool: summary.tool,
    reasoning: summary.reasoning,
    needsClarification: summary.needsClarification,
    imageAction: summary.imageAction,
    expectedTool: summary.expectedTool,
    expectedImageAction: summary.expectedImageAction,
    toolMatch: summary.toolMatch,
    imageActionMatch: summary.imageActionMatch,
    attachments: summary.attachments,
    resolvedMedia: summary.resolvedMedia,
    latencyMs: summary.latencyMs,
  };
  console.log(JSON.stringify(payload, null, 2));
}

function persistSummary(outputPath: string | undefined, summary: StructuredLogSummary) {
  if (!outputPath) return;
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(outputPath, JSON.stringify(summary) + '\n');
}

async function runCaseSuite(opts: CLIOptions) {
  if (!opts.projectId || !opts.userId) {
    console.warn('⚠️  cases mode: default --project/--user not supplied; ensure each case provides projectId/userId.');
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('cases mode is disabled when NODE_ENV=production. Run against dev/staging.');
    exit(1);
  }

  const filePath = path.resolve(opts.casesFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Cases file not found: ${filePath}`);
    exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const cases: CaseDefinition[] = JSON.parse(raw);

  console.log(`\n🧪 Running ${cases.length} image prompt cases (project ${opts.projectId})\n`);

  const cachedScenes = new Map<string, Awaited<ReturnType<typeof fetchProjectScenes>>>();
  const cachedChat = new Map<string, Awaited<ReturnType<typeof fetchProjectMessages>>>();

  let toolComparisons = 0;
  let toolMismatches = 0;
  let imageActionComparisons = 0;
  let imageActionMismatches = 0;

  let index = 0;
  for (const testCase of cases) {
    index += 1;
    const requestId = `CASE-${testCase.id}-${randomUUID()}`;

    const projectId = testCase.projectId ?? opts.projectId;
    const userId = testCase.userId ?? opts.userId;
    if (!projectId || !userId) {
      console.warn(`    ⚠️  Skipping case ${testCase.id} because projectId/userId missing.`);
      console.log('');
      continue;
    }

    if (!cachedScenes.has(projectId)) {
      cachedScenes.set(projectId, await fetchProjectScenes(projectId));
    }
    if (!cachedChat.has(projectId)) {
      cachedChat.set(projectId, await fetchProjectMessages(projectId));
    }

    const projectScenes = cachedScenes.get(projectId)!;
    const chatHistory = cachedChat.get(projectId)!;
    const sceneIdSet = new Set(projectScenes.map((s) => s.id));

    let imageUrls = testCase.imageUrls ?? [];
    if (testCase.useLatestOnly && imageUrls.length > 0) {
      const latest = imageUrls[imageUrls.length - 1];
      if (latest) {
        imageUrls = [latest];
      }
    }
    const videoUrls = testCase.videoUrls ?? [];
    const audioUrls = testCase.audioUrls ?? [];
    const sceneIds = testCase.sceneIds ?? [];

    if (testCase.sceneIds && testCase.sceneIds.length) {
      const missing = testCase.sceneIds.filter((id) => !sceneIdSet.has(id));
      if (missing.length) {
        console.warn(`    ⚠️  Skipping case because scene ids not found in project: ${missing.join(', ')}`);
        console.log('');
        continue;
      }
    }

    if (testCase.assetTags && testCase.assetTags.length) {
      console.warn('    ⚠️  Case references asset tags; ensure project assets exist or adjust case definition.');
    }

    const userContext: any = {
      imageUrls: imageUrls.length ? imageUrls : undefined,
      videoUrls: videoUrls.length ? videoUrls : undefined,
      audioUrls: audioUrls.length ? audioUrls : undefined,
      sceneUrls: sceneIds.length ? sceneIds : undefined,
    };

    if (testCase.requestedDurationFrames) {
      userContext.requestedDurationFrames = testCase.requestedDurationFrames;
    }

    console.log(`➡️  Case ${index}/${cases.length}: ${testCase.title}`);
    console.log(`    Prompt: ${testCase.prompt}`);

    const startTime = Date.now();

    const response = await orchestrator.processUserInput(
      {
        prompt: testCase.prompt,
        projectId,
        userId,
        storyboardSoFar: projectScenes,
        chatHistory,
        userContext,
      } as any,
      { requestId }
    );

    const latencyMs = Date.now() - startTime;

    const summary: StructuredLogSummary = {
      type: 'case-summary',
      requestId,
      tool: response.result?.toolName ?? response.toolUsed,
      reasoning: response.reasoning,
      needsClarification: response.needsClarification ?? false,
      imageAction: response.result?.toolContext?.imageAction ?? null,
      expectedTool: testCase.expectedTool ?? null,
      expectedImageAction: testCase.expectedImageAction ?? null,
      attachments: {
        images: imageUrls.length,
        videos: videoUrls.length,
        audio: audioUrls.length,
      },
      latencyMs,
    };

    if (testCase.expectedTool) {
      toolComparisons += 1;
      summary.toolMatch = summary.tool === testCase.expectedTool;
      if (!summary.toolMatch) {
        toolMismatches += 1;
        console.warn(
          `    ⚠️  Tool mismatch – expected ${testCase.expectedTool}, got ${summary.tool ?? 'null'}`
        );
      }
    }

    if (testCase.expectedImageAction) {
      imageActionComparisons += 1;
      summary.imageActionMatch = summary.imageAction === testCase.expectedImageAction;
      if (!summary.imageActionMatch) {
        imageActionMismatches += 1;
        console.warn(
          `    ⚠️  imageAction mismatch – expected ${testCase.expectedImageAction}, got ${summary.imageAction ?? 'null'}`
        );
      }
    }

    summary.resolvedMedia = {
      images: response.result?.toolContext?.imageUrls?.length || 0,
      videos: response.result?.toolContext?.videoUrls?.length || 0,
      imageAction: response.result?.toolContext?.imageAction ?? null,
      suppressed: false,
    };

    printSummary('case', summary);
    persistSummary(opts.output, summary);

    if (opts.execute && response?.result?.toolName && response?.result?.toolContext) {
      const { executeToolFromDecision } = await import('~/server/api/routers/generation/helpers');
      console.log('    Running tool execution…');
      const execResult = await executeToolFromDecision(
        { success: true, toolName: response.result.toolName, toolContext: response.result.toolContext },
        projectId,
        userId,
        projectScenes
      );
      console.log('    Execution summary:', {
        success: execResult.success,
        hasScene: execResult.scene?.id ?? execResult.scenes?.length,
      });
    }

    console.log('');
  }

  if (toolComparisons > 0 || imageActionComparisons > 0) {
    console.log('📊 Expectation summary:');
    if (toolComparisons > 0) {
      console.log(
        `    Tool matches: ${toolComparisons - toolMismatches}/${toolComparisons} (mismatches: ${toolMismatches})`
      );
    }
    if (imageActionComparisons > 0) {
      console.log(
        `    imageAction matches: ${imageActionComparisons - imageActionMismatches}/${imageActionComparisons} (mismatches: ${imageActionMismatches})`
      );
    }
    console.log('');
  }
}

async function runProdSample(opts: CLIOptions) {
  console.log(`\n🧪 Sampling ${opts.limit} real prompts from production DB (image uploads)`);

  const rows = await db
    .select({
      id: messages.id,
      projectId: messages.projectId,
      userId: projects.userId,
      content: messages.content,
      imageUrls: messages.imageUrls,
      videoUrls: messages.videoUrls,
      audioUrls: messages.audioUrls,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(projects, eq(projects.id, messages.projectId))
    .where(sql`${messages.imageUrls} IS NOT NULL`)
    .orderBy(desc(messages.createdAt))
    .limit(opts.limit);

  let index = 0;
  for (const row of rows) {
    index += 1;
    if (!row.userId) {
      console.warn(`    ⚠️  Skipping message ${row.id} because project has no userId`);
      continue;
    }
    const requestId = `PROD-${row.id}`;
    const projectScenes = await fetchProjectScenes(row.projectId);
    const chatHistory = await fetchProjectMessages(row.projectId);

    const imageUrls = (row.imageUrls ?? []).slice();
    const videoUrls = row.videoUrls ?? [];
    const audioUrls = row.audioUrls ?? [];

    const userContext: any = {
      imageUrls: imageUrls.length ? imageUrls : undefined,
      videoUrls: videoUrls.length ? videoUrls : undefined,
      audioUrls: audioUrls.length ? audioUrls : undefined,
    };

    console.log(`➡️  Prod sample ${index}/${rows.length} – message ${row.id}`);
    console.log(`    Project: ${row.projectId}`);
    console.log(`    Prompt: ${row.content}`);

    const startTime = Date.now();

    const response = await orchestrator.processUserInput(
      {
        prompt: row.content ?? '',
        projectId: row.projectId,
        userId: row.userId,
        storyboardSoFar: projectScenes,
        chatHistory,
        userContext,
      } as any,
      { requestId }
    );

    const latencyMs = Date.now() - startTime;

    const summary: StructuredLogSummary = {
      type: 'prod-summary',
      requestId,
      tool: response.result?.toolName ?? response.toolUsed,
      reasoning: response.reasoning,
      needsClarification: response.needsClarification ?? false,
      imageAction: response.result?.toolContext?.imageAction ?? null,
      attachments: {
        images: imageUrls.length,
        videos: videoUrls.length,
        audio: audioUrls.length,
      },
      resolvedMedia: {
        images: response.result?.toolContext?.imageUrls?.length || 0,
        videos: response.result?.toolContext?.videoUrls?.length || 0,
        imageAction: response.result?.toolContext?.imageAction ?? null,
        suppressed: false,
      },
      latencyMs,
    };

    printSummary('prod', summary);
    persistSummary(opts.output, summary);
    console.log('');
  }
}

async function main() {
  const opts = parseArgs();

  if (opts.mode === 'cases') {
    await runCaseSuite(opts);
  } else {
    await runProdSample(opts);
  }

  console.log('✅ Done.');
}

main().catch((err) => {
  console.error('Failed to run media-plan suite:', err);
  exit(1);
});
