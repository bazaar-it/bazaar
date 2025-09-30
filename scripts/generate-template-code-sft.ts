import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";
import { Pool } from "pg";
import { z } from "zod";

import {
  getCanonicalTemplates,
  type CanonicalTemplate,
} from "../src/templates/metadata/canonical";
import type { VideoFormat } from "../src/lib/types/video/remotion-constants";
import { validateAndFixCode } from "../src/lib/utils/codeValidator";
import { sceneCompiler as sceneCompilerInstance } from "../src/server/services/compilation/scene-compiler.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_ROOT = path.resolve(__dirname, "../data/fine-tuning/template-code-generator");
const OVERRIDES_PATH = path.join(DATA_ROOT, "overrides.json");
const SYSTEM_PROMPT =
  "You are Bazaar's Remotion code generator. Respond with valid TSX only. Start with imports/const declarations and never add prose.";

const CURATED_PROMPT_PATHS = [
  path.resolve(
    __dirname,
    "../memory-bank/sprints/sprint119_template_routing/metadata_prompt_dataset.jsonl"
  ),
  path.resolve(
    __dirname,
    "../memory-bank/sprints/sprint119_template_routing/metadata_finetune_dataset.jsonl"
  ),
];

const LOCAL_TEMPLATE_CODE_OVERRIDES: Record<string, string> = {
  "pill-shaped-bar-chart": `const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

const HISTOGRAM_DATA = [
  { label: "512", value: 512 },
  { label: "240", value: 240 },
  { label: "480", value: 480, highlight: true },
  { label: "360", value: 360 },
  { label: "440", value: 440 },
  { label: "640", value: 640, highlight: true },
  { label: "420", value: 420 },
  { label: "360", value: 360 }
];

function HistogramChart({ frame, fps, width, height, progress }) {
  const maxValue = Math.max(...HISTOGRAM_DATA.map((item) => item.value));
  const chartWidth = Math.min(640, width * 0.7);
  const chartHeight = Math.min(420, height * 0.65);
  const barGap = 12;
  const barWidth = (chartWidth - barGap * (HISTOGRAM_DATA.length - 1) - 64) / HISTOGRAM_DATA.length;
  const visibleBars = Math.floor(progress * HISTOGRAM_DATA.length);

  return (
    <div
      style={{
        position: "absolute",
        left: (width - chartWidth) / 2,
        top: (height - chartHeight) / 2,
        width: chartWidth,
        height: chartHeight,
        backgroundColor: "#f8fafc",
        borderRadius: 24,
        padding: "32px 28px 36px",
        boxShadow: "0 40px 80px rgba(15, 23, 42, 0.12)",
        display: "flex",
        flexDirection: "column",
        gap: 32
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: 40,
            color: "#0f172a"
          }}
        >
          Metrics overview
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 16px",
            borderRadius: 999,
            background: "rgba(99, 102, 241, 0.12)",
            color: "#4338ca",
            fontFamily: "Inter",
            fontWeight: 600
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#4338ca"
            }}
          />
          <span>Pill shaped bar chart</span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 16
        }}
      >
        <div
          style={{
            height: "70%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between"
          }}
        >
          {HISTOGRAM_DATA.map((entry, index) => {
            const baseHeight = interpolate(entry.value, [0, maxValue], [24, chartHeight * 0.65]);
            const staggerFrame = frame - index * 6;
            const animation = index < visibleBars
              ? spring({ frame: staggerFrame, fps, config: { damping: 14, stiffness: 120 } })
              : index === visibleBars
              ? interpolate(progress * HISTOGRAM_DATA.length - visibleBars, [0, 1], [0, 1])
              : 0;
            const displayHeight = Math.max(0, Math.min(1, animation)) * baseHeight;
            const highlight = entry.highlight === true;

            return (
              <div
                key={entry.label}
                style={{
                  width: barWidth,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12
                }}
              >
                <div
                  style={{
                    width: barWidth,
                    height: displayHeight,
                    background: highlight ? "linear-gradient(160deg, #6366f1, #8b5cf6)" : "#cbd5f5",
                    borderRadius: barWidth / 2,
                    position: "relative",
                    transition: "height 0.3s ease"
                  }}
                >
                  {highlight && displayHeight > 60 ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 12,
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.32)"
                      }}
                    />
                  ) : null}
                </div>
                <div
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 600,
                    fontSize: 16,
                    color: "#1f2937"
                  }}
                >
                  {entry.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const durationInFrames = 150;

export default function PillShapedBarChart() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = Math.min(frame / 120, 1);

  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)" }}>
      <HistogramChart
        frame={frame}
        fps={fps}
        width={width}
        height={height}
        progress={Math.max(0, progress)}
      />
    </AbsoluteFill>
  );
}`,
};

const overridesSchema = z
  .object({
    additionalPrompts: z
      .array(
        z.object({
          templateId: z.string(),
          prompt: z.string().min(1),
          notes: z.string().optional(),
        })
      )
      .default([]),
  })
  .default({ additionalPrompts: [] });

type Overrides = z.infer<typeof overridesSchema>;

type DatasetMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DatasetMeta = {
  templateId: string;
  dbId: string;
  duration: number;
  supportedFormats: VideoFormat[];
  promptVariant: string;
};

type DatasetEntry = {
  messages: DatasetMessage[];
  meta: DatasetMeta;
};

type SerializedDatasetEntry = {
  messages: DatasetMessage[];
};

type DatasetMetaEntry = {
  meta: DatasetMeta;
};

type PromptVariant = {
  id: string;
  prompt: string;
};

type CuratedPromptMap = Map<string, string[]>;

function loadCanonicalDbTemplates(): CanonicalTemplate[] {
  return getCanonicalTemplates().filter((template) => template.source.type === "db");
}

async function loadOverrides(): Promise<Overrides> {
  try {
    const raw = await fs.readFile(OVERRIDES_PATH, "utf-8");
    return overridesSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { additionalPrompts: [] };
    }
    throw error;
  }
}

function normalizePrompt(rawPrompt: string): string {
  const trimmed = rawPrompt.trim();
  if (!trimmed) return trimmed;

  const formatMatch = trimmed.match(/^format:(landscape|portrait|square)\s*(.*)$/i);
  if (formatMatch) {
    const remainder = formatMatch[2].trim();
    if (!remainder) {
      return formatMatch[1].charAt(0).toUpperCase() + formatMatch[1].slice(1);
    }
    const capitalized = remainder.charAt(0).toUpperCase() + remainder.slice(1);
    return capitalized;
  }

  if (!/[A-Z]/.test(trimmed.charAt(0))) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return trimmed;
}

async function loadCuratedPrompts(): Promise<CuratedPromptMap> {
  const promptSets = new Map<string, Set<string>>();

  for (const promptPath of CURATED_PROMPT_PATHS) {
    try {
      const fileContents = await fs.readFile(promptPath, "utf-8");
      const lines = fileContents.split(/\r?\n/).filter((line) => line.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          let templateId: string | undefined;
          let prompt: string | undefined;

          if (typeof parsed === "object" && parsed !== null) {
            if (typeof parsed.expected_template_id === "string" && typeof parsed.prompt === "string") {
              templateId = parsed.expected_template_id;
              prompt = normalizePrompt(parsed.prompt);
            } else if (Array.isArray(parsed.messages)) {
              const userMessage = parsed.messages.find((message: any) => message?.role === "user");
              const assistantMessage = parsed.messages.find((message: any) => message?.role === "assistant");
              if (typeof assistantMessage?.content === "string" && typeof userMessage?.content === "string") {
                templateId = assistantMessage.content.trim();
                prompt = normalizePrompt(userMessage.content);
              }
            }
          }

          if (!templateId || !prompt) {
            continue;
          }

          if (!promptSets.has(templateId)) {
            promptSets.set(templateId, new Set<string>());
          }
          promptSets.get(templateId)?.add(prompt);
        } catch (error) {
          console.warn(`Skipping malformed JSONL line in ${promptPath}:`, error);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      // Missing file is fine; continue to next path.
    }
  }

  const curatedMap: CuratedPromptMap = new Map();
  for (const [templateId, prompts] of promptSets.entries()) {
    const list = Array.from(prompts.values()).filter((entry) => entry.length > 0);
    if (list.length > 0) {
      curatedMap.set(templateId, list);
    }
  }

  return curatedMap;
}

async function fetchDbCode(dbIds: string[]): Promise<Map<string, string>> {
  if (dbIds.length === 0) {
    return new Map();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to fetch template code. Set it before running the generator."
    );
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  try {
    const { rows } = await pool.query<{
      id: string;
      tsx_code: string | null;
    }>(
      'SELECT id::text, tsx_code FROM "public"."bazaar-vid_templates" WHERE id = ANY($1)',
      [dbIds]
    );
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.tsx_code) {
        map.set(row.id, row.tsx_code.trimEnd());
      }
    }
    return map;
  } finally {
    await pool.end();
  }
}

async function sanitizeTemplateCode(params: {
  template: CanonicalTemplate;
  rawCode: string;
  verbose?: boolean;
}): Promise<string | null> {
  const { template, rawCode, verbose } = params;
  const trimmed = rawCode.trim();

  if (!trimmed) {
    if (verbose) {
      console.warn(`Skipping ${template.id}: template code is empty after trim.`);
    }
    return null;
  }

  const validation = validateAndFixCode(trimmed);
  const candidate = (validation.fixedCode ?? trimmed).trim();

  if (!candidate) {
    if (verbose) {
      console.warn(`Skipping ${template.id}: validator returned empty code.`);
    }
    return null;
  }

  if (!validation.isValid && verbose) {
    const errorSummary = validation.errors
      .filter((error) => error.severity === "error")
      .map((error) => error.message)
      .join("; ");
    console.warn(
      `Validator reported remaining issues for ${template.id}: ${errorSummary || "unknown errors"}`
    );
  }

  try {
    const compileResult = await sceneCompilerInstance.compileScene(candidate, {
      projectId: `template-sft-${template.id.slice(0, 8)}`,
      sceneId: template.id,
      existingScenes: [],
    });

    if (!compileResult.success) {
      if (verbose) {
        console.warn(
          `Scene compiler reported failure for ${template.id}: ${compileResult.compilationError || compileResult.error || "unknown error"}`
        );
      }
      return null;
    }

    const sanitized = (compileResult.tsxCode ?? candidate).trim();
    if (!sanitized) {
      if (verbose) {
        console.warn(`Scene compiler returned empty TSX for ${template.id}.`);
      }
      return null;
    }

    return sanitized;
  } catch (error) {
    if (verbose) {
      console.error(`Failed to sanitize template ${template.id}:`, error);
    }
    return null;
  }
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function formatList(values: string[] | undefined, limit = 3): string | undefined {
  if (!values || values.length === 0) return undefined;
  const unique = uniq(values.map((value) => value.trim()).filter(Boolean)).slice(0, limit);
  if (unique.length === 0) return undefined;
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  const head = unique.slice(0, -1).join(", ");
  const tail = unique[unique.length - 1];
  return `${head}, and ${tail}`;
}

function formatDuration(duration: number): string {
  const seconds = Math.round((duration / 30) * 10) / 10;
  return `${seconds} seconds (${duration} frames)`;
}

function buildBasePrompt(template: CanonicalTemplate): string {
  const description = template.descriptions[0] ?? template.primaryUse;
  const styles = formatList(template.styles, 3);
  const animations = formatList(template.animations, 3);
  const elements = formatList(template.elements, 4);
  const colors = formatList(template.colors, 3);
  const useCases = formatList(template.useCases, 3);

  const sections: string[] = [];
  sections.push(`Need a ${formatLabel} Remotion scene for ${template.primaryUse.toLowerCase()}.`);
  if (description) {
    sections.push(description.endsWith(".") ? description : `${description}.`);
  }
  if (useCases) {
    sections.push(`This should work well for ${useCases}.`);
  }
  if (elements) {
    sections.push(`Include ${elements}.`);
  }
  if (animations) {
    sections.push(`Animate with ${animations}.`);
  }
  if (styles) {
    sections.push(`Keep the style ${styles}.`);
  }
  if (colors) {
    sections.push(`Palette should lean on ${colors}.`);
  }
  sections.push(`Keep it around ${formatDuration(template.duration)}.`);

  return sections.join(" ");
}

function buildUserPhrasePrompt(template: CanonicalTemplate, phrase: string): string {
  const styles = formatList(template.styles, 2);
  const elements = formatList(template.elements, 3);
  const animations = formatList(template.animations, 2);

  const sections: string[] = [];
  sections.push(phrase.charAt(0).toUpperCase() + phrase.slice(1));
  if (styles) {
    sections.push(`Leaning into a ${styles} look.`);
  }
  if (elements) {
    sections.push(`Make sure we show ${elements}.`);
  }
  if (animations) {
    sections.push(`Use ${animations} for motion.`);
  }
  sections.push(`Target duration: ${formatDuration(template.duration)}.`);

  return sections.join(" ");
}

function buildPromptVariants(
  template: CanonicalTemplate,
  overrides: Overrides,
  curatedPrompts: CuratedPromptMap
): PromptVariant[] {
  const variants: PromptVariant[] = [];
  const seen = new Set<string>();

  const addVariant = (id: string, prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    variants.push({ id, prompt: trimmed });
    seen.add(trimmed);
  };

  const curatedList = curatedPrompts.get(template.id);
  if (curatedList && curatedList.length > 0) {
    addVariant("curated-1", curatedList[0]);
  }

  if (variants.length === 0) {
    addVariant("base", buildBasePrompt(template));

    const userPhrases = uniq(template.userPhrases).slice(0, 2);
    for (const [index, phrase] of userPhrases.entries()) {
      const prompt = buildUserPhrasePrompt(template, phrase);
      addVariant(`phrase-${index + 1}`, prompt);
    }
  }

  const manual = overrides.additionalPrompts
    .filter((entry) => entry.templateId === template.id)
    .map((entry, index) => ({ id: `override-${index + 1}`, prompt: entry.prompt }));

  manual.forEach((variant) => addVariant(variant.id, variant.prompt));

  return variants;
}

function createDatasetEntry(
  template: CanonicalTemplate,
  dbId: string,
  code: string,
  variant: PromptVariant
): DatasetEntry {
  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: variant.prompt },
      { role: "assistant", content: code },
    ],
    meta: {
      templateId: template.id,
      dbId,
      duration: template.duration,
      supportedFormats: template.supportedFormats,
      promptVariant: variant.id,
    },
  };
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function computeSplitCounts(total: number): { train: number; validation: number; test: number } {
  if (total <= 0) return { train: 0, validation: 0, test: 0 };
  if (total === 1) return { train: 1, validation: 0, test: 0 };
  if (total === 2) return { train: 1, validation: 0, test: 1 };

  let train = Math.floor(total * 0.8);
  let validation = Math.floor(total * 0.1);
  let test = total - train - validation;

  if (validation === 0) {
    validation = 1;
    train = Math.max(0, train - 1);
  }

  if (test === 0) {
    test = 1;
    if (train > 0) {
      train -= 1;
    } else if (validation > 1) {
      validation -= 1;
    }
  }

  const remainder = total - (train + validation + test);
  if (remainder > 0) {
    train += remainder;
  } else if (remainder < 0) {
    const adjustment = Math.min(train, -remainder);
    train -= adjustment;
    const stillRemaining = total - (train + validation + test);
    if (stillRemaining < 0) {
      validation = Math.max(0, validation + stillRemaining);
    }
  }

  return { train, validation, test };
}

async function writeJsonl<T>(
  filePath: string,
  entries: DatasetEntry[],
  serializer: (entry: DatasetEntry) => T
): Promise<void> {
  const lines = entries.map((entry) => JSON.stringify(serializer(entry)));
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf-8");
}

async function prepareOutputDir(baseDir: string): Promise<string> {
  let attempt = baseDir;
  let suffix = 1;

  while (true) {
    try {
      const stats = await fs.stat(attempt);
      if (!stats.isDirectory()) {
        attempt = `${baseDir}-${suffix}`;
        suffix += 1;
        continue;
      }

      const entries = await fs.readdir(attempt);
      if (entries.length === 0) {
        return attempt;
      }

      attempt = `${baseDir}-${suffix}`;
      suffix += 1;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await fs.mkdir(attempt, { recursive: true });
        return attempt;
      }
      throw error;
    }
  }
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .option("--tag <tag>", "dataset version tag", "v1")
    .option("--seed <seed>", "deterministic shuffle seed", "119")
    .option("--limit <number>", "limit number of templates processed", (value) => parseInt(value, 10))
    .option("--dry-run", "print sample output without writing files")
    .option("--verbose", "log detailed information while generating");

  program.parse(process.argv);
  const options = program.opts<{
    tag: string;
    seed: string;
    limit?: number;
    dryRun?: boolean;
    verbose?: boolean;
  }>();

  const canonicalTemplates = loadCanonicalDbTemplates();
  const templates = typeof options.limit === "number" ? canonicalTemplates.slice(0, options.limit) : canonicalTemplates;

  if (templates.length === 0) {
    console.warn("No canonical DB templates found. Nothing to generate.");
    return;
  }

  const overrides = await loadOverrides();
  const curatedPrompts = await loadCuratedPrompts();
  const dbIds = templates
    .map((template) => (template.source.type === "db" ? template.source.dbId : undefined))
    .filter((value): value is string => Boolean(value));

  const dbCodeMap = await fetchDbCode(dbIds);

  const missing: string[] = [];
  const fallbackTemplates: string[] = [];
  const sanitizerFailures: string[] = [];
  const datasetEntries: DatasetEntry[] = [];

  for (const template of templates) {
    const dbSource = template.source.type === "db" ? template.source.dbId : undefined;
    if (!dbSource) continue;

    let code = dbCodeMap.get(dbSource);
    if (!code) {
      const overrideCode = LOCAL_TEMPLATE_CODE_OVERRIDES[template.id];
      if (overrideCode) {
        code = overrideCode;
      } else {
        missing.push(`${template.id} (${dbSource})`);
        continue;
      }
    }

    const sanitizedCode = await sanitizeTemplateCode({
      template,
      rawCode: code,
      verbose: options.verbose,
    });

    if (!sanitizedCode) {
      sanitizerFailures.push(`${template.id} (${dbSource})`);
      continue;
    }

    const hasCuratedPrompts = curatedPrompts.has(template.id);
    const variants = buildPromptVariants(template, overrides, curatedPrompts);
    if (variants.length === 0) {
      if (options.verbose) {
        console.warn(`Skipping ${template.id}: no prompt variants.`);
      }
      continue;
    }

    if (!hasCuratedPrompts) {
      fallbackTemplates.push(template.id);
    }

    for (const variant of variants) {
      const entry = createDatasetEntry(template, dbSource, sanitizedCode, variant);
      datasetEntries.push(entry);
    }
  }

  if (missing.length > 0) {
    console.warn("Warning: missing TSX code for templates:");
    missing.forEach((item) => console.warn(`  - ${item}`));
  }

  if (sanitizerFailures.length > 0) {
    console.warn("Sanitizer failed for templates:");
    sanitizerFailures.forEach((item) => console.warn(`  - ${item}`));
  }

  if (options.verbose && fallbackTemplates.length > 0) {
    console.log("Fallback prompts used for templates (no curated entries found):");
    fallbackTemplates.forEach((templateId) => console.log(`  - ${templateId}`));
  }

  if (datasetEntries.length === 0) {
    console.warn("No dataset entries generated. Aborting.");
    return;
  }

  const rng = createRng(Number.parseInt(options.seed, 10) || 119);
  const shuffled = shuffle(datasetEntries, rng);
  const { train, validation, test } = computeSplitCounts(shuffled.length);

  const trainEntries = shuffled.slice(0, train);
  const validationEntries = shuffled.slice(train, train + validation);
  const testEntries = shuffled.slice(train + validation, train + validation + test);

  if (options.dryRun) {
    console.log(`Dry run: generated ${shuffled.length} examples`);
    console.log(`  train=${trainEntries.length}, validation=${validationEntries.length}, test=${testEntries.length}`);
    shuffled.slice(0, 2).forEach((entry, index) => {
      console.log(`\nExample ${index + 1} (template: ${entry.meta.templateId}, variant: ${entry.meta.promptVariant})`);
      console.log(JSON.stringify(entry, null, 2));
    });
    return;
  }

  const desiredOutputDir = path.join(DATA_ROOT, options.tag);
  const outputDir = await prepareOutputDir(desiredOutputDir);
  if (outputDir !== desiredOutputDir) {
    console.log(
      `Output directory ${desiredOutputDir} already exists with data; writing sanitized dataset to ${outputDir}.`
    );
  }

  const toMessagesOnly = (entry: DatasetEntry): SerializedDatasetEntry => ({
    messages: entry.messages,
  });

  const toMetaOnly = (entry: DatasetEntry): DatasetMetaEntry => ({
    meta: entry.meta,
  });

  await writeJsonl(path.join(outputDir, "train.jsonl"), trainEntries, toMessagesOnly);
  await writeJsonl(path.join(outputDir, "validation.jsonl"), validationEntries, toMessagesOnly);
  await writeJsonl(path.join(outputDir, "test.jsonl"), testEntries, toMessagesOnly);

  await writeJsonl(path.join(outputDir, "train.meta.jsonl"), trainEntries, toMetaOnly);
  await writeJsonl(path.join(outputDir, "validation.meta.jsonl"), validationEntries, toMetaOnly);
  await writeJsonl(path.join(outputDir, "test.meta.jsonl"), testEntries, toMetaOnly);

  const stats = {
    generatedAt: new Date().toISOString(),
    tag: options.tag,
    seed: options.seed,
    totals: {
      all: shuffled.length,
      train: trainEntries.length,
      validation: validationEntries.length,
      test: testEntries.length,
    },
    templatesProcessed: templates.length,
    uniqueTemplatesCovered: uniq(shuffled.map((entry) => entry.meta.templateId)).length,
    missingTemplates: missing,
    sanitizerFailures,
  };

  await fs.writeFile(path.join(outputDir, "stats.json"), `${JSON.stringify(stats, null, 2)}\n`, "utf-8");

  console.log(`✅ Dataset written to ${outputDir}`);
  console.log(
    `   train: ${trainEntries.length} | validation: ${validationEntries.length} | test: ${testEntries.length}`
  );
}

main().catch((error) => {
  console.error("❌ Failed to generate template code dataset", error);
  process.exit(1);
});
