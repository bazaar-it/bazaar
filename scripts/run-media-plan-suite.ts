import '~/env';

import { randomUUID } from 'crypto';
import { exit } from 'process';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

import { orchestrator } from '~/brain/orchestratorNEW';
import { db } from '~/server/db';
import { messages, projects, scenes } from '~/server/db/schema';

if (typeof fetch === 'undefined') {
  const polyfill = await import('node-fetch');
  (globalThis as any).fetch = polyfill.default as typeof fetch;
  (globalThis as any).Headers = polyfill.Headers;
  (globalThis as any).Request = polyfill.Request;
  (globalThis as any).Response = polyfill.Response;
}

type SkipPlanPolicy = 'fail' | 'warn' | 'ignore';

interface CLIOptions {
  mode: 'cases' | 'prod';
  projectId?: string;
  userId?: string;
  casesFile: string;
  limit: number;
  execute: boolean;
  output?: string;
  focusFile?: string;
  focusIds?: string[];
  skipPlanPolicy: SkipPlanPolicy;
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
  expectedImageDirectives?: any;
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
    imageDirectives?: any;
    sourceMap?: Array<{ url: string; sources: string[]; details?: string[] }>;
    skippedPlan?: number;
  };
  mediaPlanDebug?: {
    plan?: any;
    sourceMap?: Array<{ url: string; sources: string[]; details?: string[] }>;
    plannedImages?: string[];
    plannedVideos?: string[];
    attachments?: { images: string[]; videos: string[] };
    mappedDirectives?: any;
    skippedPlanUrls?: string[];
  };
  latencyMs?: number;
}

interface SuiteRunReport {
  total: number;
  processed: number;
  skippedRequestCount: number;
  skippedPlanHits: number;
  skippedRequests: Array<{
    requestId: string;
    skipCount: number;
    foreignProjects: string[];
  }>;
  skippedProjectBreakdown: Record<string, number>;
}

const EMPTY_REPORT: SuiteRunReport = {
  total: 0,
  processed: 0,
  skippedRequestCount: 0,
  skippedPlanHits: 0,
  skippedRequests: [],
  skippedProjectBreakdown: {},
};

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

  let skipPlanPolicy: SkipPlanPolicy = 'fail';
  const policyRaw = take('skip-plan-policy')?.toLowerCase();
  if (policyRaw === 'warn' || policyRaw === 'ignore' || policyRaw === 'fail') {
    skipPlanPolicy = policyRaw;
  }
  if (takeBool('allow-skipped-plan') || takeBool('allowSkippedPlan')) {
    skipPlanPolicy = 'warn';
  }
  if (takeBool('ignore-skipped-plan') || takeBool('ignoreSkippedPlan')) {
    skipPlanPolicy = 'ignore';
  }

  return {
    mode,
    projectId: take('project'),
    userId: take('user'),
    casesFile: take('cases') ?? 'scripts/data/media-plan-use-cases.json',
    limit: takeNumber('limit', 10),
    execute: takeBool('execute'),
    output: take('output'),
    focusFile: take('focus'),
    skipPlanPolicy,
  };
}

function extractProjectIdFromUrl(url?: string | null) {
  if (!url) return null;
  const match = url.match(/projects\/([0-9a-fA-F-]+)/);
  return match?.[1] ?? null;
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
    mediaPlanDebug: summary.mediaPlanDebug,
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

async function runCaseSuite(opts: CLIOptions): Promise<SuiteRunReport> {
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
  let processed = 0;
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

    processed += 1;
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
      expectedImageDirectives: (testCase as any).expectedImageDirectives,
      attachments: {
        images: imageUrls.length,
        videos: videoUrls.length,
        audio: audioUrls.length,
      },
      latencyMs,
    };

    summary.resolvedMedia = {
      images: response.result?.toolContext?.imageUrls?.length || 0,
      videos: response.result?.toolContext?.videoUrls?.length || 0,
      imageAction: response.result?.toolContext?.imageAction ?? null,
      suppressed: false,
      imageDirectives: response.result?.toolContext?.imageDirectives,
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
      if (testCase.expectedImageAction === 'mixed') {
        const directives = summary.resolvedMedia?.imageDirectives;
        const hasEmbed = Array.isArray(directives) && directives.some((d: any) => d?.action === 'embed');
        const hasRecreate = Array.isArray(directives) && directives.some((d: any) => d?.action === 'recreate');
        summary.imageActionMatch = hasEmbed && hasRecreate;
      } else {
        summary.imageActionMatch = summary.imageAction === testCase.expectedImageAction;
      }
      if (!summary.imageActionMatch) {
        imageActionMismatches += 1;
        console.warn(
          `    ⚠️  imageAction mismatch – expected ${testCase.expectedImageAction}, got ${summary.imageAction ?? 'null'}`
        );
        if (summary.resolvedMedia?.imageDirectives) {
          console.warn('       ↳ resolved imageDirectives:', summary.resolvedMedia.imageDirectives);
        }
      }
    }

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

  return {
    ...EMPTY_REPORT,
    total: cases.length,
    processed,
  };
}

async function runProdSample(opts: CLIOptions): Promise<SuiteRunReport> {
  const focusIds = opts.focusIds?.map((id) => id.replace(/^PROD-/, ''));
  if (focusIds?.length) {
    console.log(`\n🧪 Replaying ${focusIds.length} targeted prod prompts (focus mode)`);
  } else {
    console.log(`\n🧪 Sampling ${opts.limit} real prompts from production DB (image uploads)`);
  }

  let query = db
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
    .innerJoin(projects, eq(projects.id, messages.projectId));

  if (focusIds?.length) {
    query = query.where(inArray(messages.id, focusIds));
  } else {
    query = query.where(sql`${messages.imageUrls} IS NOT NULL`);
  }

  query = query.orderBy(desc(messages.createdAt));

  if (!focusIds?.length) {
    query = query.limit(opts.limit);
  }

  const rows = await query;

  if (focusIds?.length) {
    const foundIds = new Set(rows.map((row) => row.id));
    const missing = focusIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      console.warn(`    ⚠️  ${missing.length} focus IDs missing from latest DB snapshot`, missing);
    }
    rows.sort((a, b) => {
      const aIndex = focusIds.indexOf(a.id);
      const bIndex = focusIds.indexOf(b.id);
      return aIndex - bIndex;
    });
  }

  let index = 0;
  let processed = 0;
  let skippedRequestCount = 0;
  let skippedPlanHits = 0;
  const skippedRequests: SuiteRunReport['skippedRequests'] = [];
  const skippedProjectCounts = new Map<string, number>();

  for (const row of rows) {
    index += 1;
    if (!row.userId) {
      console.warn(`    ⚠️  Skipping message ${row.id} because project has no userId`);
      continue;
    }
    processed += 1;
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

    if (response.mediaPlanDebug) {
      summary.mediaPlanDebug = {
        plan: response.mediaPlanDebug.plan,
        sourceMap: response.mediaPlanDebug.sourceMap,
        plannedImages: response.mediaPlanDebug.plannedImages,
        plannedVideos: response.mediaPlanDebug.plannedVideos,
        attachments: response.mediaPlanDebug.attachments,
        mappedDirectives: response.mediaPlanDebug.mappedDirectives,
        skippedPlanUrls: response.mediaPlanDebug.skippedPlanUrls,
      };
      if (summary.resolvedMedia) {
        summary.resolvedMedia.sourceMap = response.mediaPlanDebug.sourceMap;
        summary.resolvedMedia.imageDirectives = response.result?.toolContext?.imageDirectives ?? response.mediaPlanDebug.mappedDirectives;
        summary.resolvedMedia.skippedPlan = response.mediaPlanDebug.skippedPlanUrls?.length || 0;
      }
    }

    const skipCount = summary.resolvedMedia?.skippedPlan ?? 0;
    if (skipCount > 0) {
      skippedRequestCount += 1;
      skippedPlanHits += skipCount;
      const foreignProjects = new Set<string>();
      const sourceEntries = summary.resolvedMedia?.sourceMap ?? [];
      for (const entry of sourceEntries) {
        const isCrossProject = entry.sources?.includes('plan-skipped');
        const isUnlinked = entry.sources?.includes('plan-unlinked');
        if (!isCrossProject && !isUnlinked) continue;

        const detailProject = entry.details?.find((d) =>
          d.startsWith('skipped-project:') || d.startsWith('unlinked-project:')
        )?.split(':')[1];
        const inferredProject = detailProject ?? extractProjectIdFromUrl(entry.url);
        const key = inferredProject ?? (isUnlinked ? 'requires-linking' : 'unknown');

        foreignProjects.add(key);
        skippedProjectCounts.set(
          key,
          (skippedProjectCounts.get(key) ?? 0) + 1
        );
      }
      const projectsArray = Array.from(foreignProjects);
      skippedRequests.push({ requestId, skipCount, foreignProjects: projectsArray });
    }

    printSummary('prod', summary);
    persistSummary(opts.output, summary);
    console.log('');
  }

  const breakdown = Object.fromEntries(skippedProjectCounts.entries());

  if (processed > 0) {
    if (skippedRequestCount > 0) {
      console.log(
        `🚫  Cross-project media skipped in ${skippedRequestCount}/${processed} requests (total hits: ${skippedPlanHits}).`
      );
      console.log('     Projects:', Object.keys(breakdown).length ? breakdown : 'unknown');
    } else {
      console.log('✅  No cross-project media reuse detected.');
    }
    console.log('');
  }

  return {
    total: rows.length,
    processed,
    skippedRequestCount,
    skippedPlanHits,
    skippedRequests,
    skippedProjectBreakdown: breakdown,
  };
}

async function main() {
  const opts = parseArgs();

  if (opts.focusFile) {
    try {
      const focusArg = opts.focusFile;
      let idList: string[] = [];
      if (fs.existsSync(focusArg)) {
        const raw = fs.readFileSync(focusArg, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          idList = parsed.map((id) => String(id));
        } else {
          console.warn('⚠️  Focus file did not contain an array; ignoring.');
        }
      } else {
        idList = focusArg
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
      }

      if (idList.length) {
        opts.focusIds = idList.map((id) => id.replace(/^PROD-/, ''));
      }
    } catch (err) {
      console.warn('⚠️  Failed to parse focus IDs:', err);
    }
  }

  const report = opts.mode === 'cases' ? await runCaseSuite(opts) : await runProdSample(opts);

  if (opts.mode === 'prod' && report.skippedRequestCount > 0) {
    const message = `Detected ${report.skippedPlanHits} plan-skipped media hits across ${report.skippedRequestCount} requests.`;
    if (opts.skipPlanPolicy === 'fail') {
      console.error(`❌  ${message}`);
      if (report.skippedRequests.length) {
        console.error('    Sample requests:', report.skippedRequests.slice(0, 5));
      }
      exit(1);
    }
    if (opts.skipPlanPolicy === 'warn') {
      console.warn(`⚠️  ${message}`);
      if (report.skippedRequests.length) {
        console.warn('    Sample requests:', report.skippedRequests.slice(0, 5));
      }
    }
  }

  console.log('✅ Done.');
}

main().catch((err) => {
  console.error('Failed to run media-plan suite:', err);
  exit(1);
});
