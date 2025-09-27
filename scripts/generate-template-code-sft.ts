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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_ROOT = path.resolve(__dirname, "../data/fine-tuning/template-code-generator");
const OVERRIDES_PATH = path.join(DATA_ROOT, "overrides.json");
const SYSTEM_PROMPT =
  "You are Bazaar's Remotion code generator. Respond with valid TSX only. Start with imports/const declarations and never add prose.";

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

type DatasetEntry = {
  messages: DatasetMessage[];
  meta: {
    templateId: string;
    dbId: string;
    duration: number;
    supportedFormats: VideoFormat[];
    promptVariant: string;
  };
};

type PromptVariant = {
  id: string;
  prompt: string;
};

const VIDEO_FORMAT_LABEL: Record<VideoFormat, string> = {
  landscape: "landscape (1920×1080)",
  portrait: "portrait (1080×1920)",
  square: "square (1080×1080)",
};

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
  const formatLabel = VIDEO_FORMAT_LABEL[template.supportedFormats[0] ?? "landscape"];
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
  const formatLabel = VIDEO_FORMAT_LABEL[template.supportedFormats[0] ?? "landscape"];
  const styles = formatList(template.styles, 2);
  const elements = formatList(template.elements, 3);
  const animations = formatList(template.animations, 2);

  const sections: string[] = [];
  sections.push(`${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} in ${formatLabel}.`);
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
  overrides: Overrides
): PromptVariant[] {
  const variants: PromptVariant[] = [];

  variants.push({ id: "base", prompt: buildBasePrompt(template) });

  const userPhrases = uniq(template.userPhrases).slice(0, 2);
  for (const [index, phrase] of userPhrases.entries()) {
    const prompt = buildUserPhrasePrompt(template, phrase);
    variants.push({ id: `phrase-${index + 1}`, prompt });
  }

  const manual = overrides.additionalPrompts
    .filter((entry) => entry.templateId === template.id)
    .map((entry, index) => ({ id: `override-${index + 1}`, prompt: entry.prompt }));

  variants.push(...manual);

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

async function writeJsonl(filePath: string, entries: DatasetEntry[]): Promise<void> {
  const lines = entries.map((entry) => JSON.stringify(entry));
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf-8");
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
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
  const dbIds = templates
    .map((template) => (template.source.type === "db" ? template.source.dbId : undefined))
    .filter((value): value is string => Boolean(value));

  const dbCodeMap = await fetchDbCode(dbIds);

  const missing: string[] = [];
  const datasetEntries: DatasetEntry[] = [];

  for (const template of templates) {
    const dbSource = template.source.type === "db" ? template.source.dbId : undefined;
    if (!dbSource) continue;

    const code = dbCodeMap.get(dbSource);
    if (!code) {
      missing.push(`${template.id} (${dbSource})`);
      continue;
    }

    const variants = buildPromptVariants(template, overrides);
    if (variants.length === 0) {
      if (options.verbose) {
        console.warn(`Skipping ${template.id}: no prompt variants.`);
      }
      continue;
    }

    for (const variant of variants) {
      const entry = createDatasetEntry(template, dbSource, code, variant);
      datasetEntries.push(entry);
    }
  }

  if (missing.length > 0) {
    console.warn("Warning: missing TSX code for templates:");
    missing.forEach((item) => console.warn(`  - ${item}`));
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

  const outputDir = path.join(DATA_ROOT, options.tag);
  await ensureDir(outputDir);

  await writeJsonl(path.join(outputDir, "train.jsonl"), trainEntries);
  await writeJsonl(path.join(outputDir, "validation.jsonl"), validationEntries);
  await writeJsonl(path.join(outputDir, "test.jsonl"), testEntries);

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
