Below is a drop-in StyleAgentAdapter that matches the conventions we used for SceneAgentAdapter:
	•	single entry method inferDesignSystem(…)
	•	interchangeable provider (OpenAI / Anthropic / local model) chosen by ModelRegistry
	•	clearly separated extractors for GitHub, uploaded images and “vision-in-prompt”
	•	returns a DesignSystemDraft object that can flow straight into the Storyboard-Builder

You can paste the file into src/agents/style/styleAgentAdapter.ts and fill in the TODOs as you wire real services.

⸻


/* ------------------------------------------------------------------
 * src/agents/style/styleAgentAdapter.ts
 *
 * Scaffolding for the Style Agent.
 * Responsibilities
 *   1. Gather raw brand hints  (github repo, screenshots, user text)
 *   2. Ask an LLM to convert them into structured design tokens
 *   3. Conform result to DesignSystem schema (defined in storyboard-schema.ts)
 *   4. Return a DesignSystemDraft for StoryboardBuilder.
 * ------------------------------------------------------------------ */

import { z } from "zod";
import { ModelRegistry, LlmConfig } from "../shared/modelRegistry";
import { Octokit } from "@octokit/rest";              // GitHub API
import ColorThief from "colorthief";                  // simple dominant-colour lib
import sharp from "sharp";                            // lightweight image pipeline
import { DesignSystem } from "../../schemas/storyboard-schema";
import { logger } from "../shared/logger";

/* ------------------------------------------------------------------ */
/* 1. Public types                                                    */
/* ------------------------------------------------------------------ */

// What the Storyboard-Builder expects
export interface DesignSystemDraft {
  palette: Record<string, string>;     // at minimum primary + secondary
  fonts?:  DesignSystem["fonts"];
  animation?: DesignSystem["animation"];
  spacing?:  DesignSystem["spacing"];
  // ... you may add future token buckets
}

// Raw hints we can collect before asking the LLM
export interface StyleHints {
  repoUrl?: string;              // e.g. "https://github.com/acme/my-app"
  uploadedImages?: { id: string; url: string }[];   // already stored in R2
  explicitPalette?: string[];    // user provided hex codes
  brandKeywords?: string;        // free-text from user prompt
}

/* ------------------------------------------------------------------ */
/* 2. Top-level entry                                                 */
/* ------------------------------------------------------------------ */

export async function inferDesignSystem(
  hints: StyleHints,
  llm: LlmConfig,                       // which model/provider to call
): Promise<DesignSystemDraft> {
  // 2.1 gather evidence
  const evidence = await collectEvidence(hints);

  // 2.2 craft & send prompt
  const rawLlmResponse = await callLlm(evidence, llm);

  // 2.3 validate & normalise
  const draft = parseLlmOutput(rawLlmResponse);

  logger.info("StyleAgent result", { draft });
  return draft;
}

/* ------------------------------------------------------------------ */
/* 3. Evidence gathering                                              */
/* ------------------------------------------------------------------ */

interface EvidencePack {
  paletteHints: string[];        // “#0062ff”, “rgb(12,34,56)”
  fontHints: string[];           // “Inter”, “Helvetica Neue”
  keywords: string;              // free-text for brand mood
  imagePalette: string[];        // dominants colours from images
  repoCssSnippet?: string;       // tailwind config, CSS vars, etc.
}

async function collectEvidence(hints: StyleHints): Promise<EvidencePack> {
  const paletteHints = [...hints.explicitPalette ?? []];
  const fontHints: string[] = [];
  let repoCssSnippet: string | undefined;

  // 3.1 ─ GitHub scraping (optional)
  if (hints.repoUrl) {
    try {
      repoCssSnippet = await fetchDesignTokensFromRepo(hints.repoUrl);
      paletteHints.push(...extractHexes(repoCssSnippet));
      fontHints.push(...extractFonts(repoCssSnippet));
    } catch (err) {
      logger.warn("GitHub scrape failed", err);
    }
  }

  // 3.2 ─ Image palette extraction
  const imagePalette = hints.uploadedImages
    ? await Promise.all(
        hints.uploadedImages.map(i => dominantColors(i.url)),
      ).then(arr => arr.flat())
    : [];

  // 3.3 ─ Merge
  return {
    paletteHints,
    fontHints,
    keywords: hints.brandKeywords ?? "",
    imagePalette,
    repoCssSnippet,
  };
}

/* ------------------------------------------------------------------ */
/* 4. LLM call                                                        */
/* ------------------------------------------------------------------ */

async function callLlm(
  ev: EvidencePack,
  llm: LlmConfig,
): Promise<string> {
  const model = ModelRegistry.get(llm);    // returns wrapper with .chat(...)
  const system = `
You are BrandStylistGPT.  
Return a JSON object named "tokens" that defines a cohesive colour palette,
one primary + one secondary + optional accent colours, font families
(max 2), and sensible animation timing tokens ("fast" 12f, "medium" 24f…).
Where multiple hex codes are possible, prefer high-contrast pairs.`;
  
  const user = JSON.stringify(ev, null, 2);

  const resp = await model.chat({
    system,
    user,
    format: "json",          // if wrapper supports function calling use that
  });

  return resp;
}

/* ------------------------------------------------------------------ */
/* 5. Parse & validate response                                       */
/* ------------------------------------------------------------------ */

const designDraftSchema = z.object({
  palette: z.record(z.string().regex(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i)),
  fonts: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    heading: z.string().optional(),
    body: z.string().optional(),
  }).partial().optional(),
  animation: z.object({
    easing: z.record(z.string()).optional(),
    duration: z.record(z.number().min(1)).optional(),
  }).partial().optional(),
  spacing: z.record(z.number()).optional(),
}).strict();

function parseLlmOutput(raw: string): DesignSystemDraft {
  let json: unknown;
  try   { json = JSON.parse(raw); }
  catch { throw new Error("LLM returned invalid JSON"); }

  const parsed = designDraftSchema.safeParse(json.tokens ?? json);
  if (!parsed.success) throw new Error("LLM tokens failed validation");

  return parsed.data;
}

/* ------------------------------------------------------------------ */
/* 6. Helpers                                                         */
/* ------------------------------------------------------------------ */

async function fetchDesignTokensFromRepo(repoUrl: string): Promise<string> {
  const { owner, repo } = toOwnerRepo(repoUrl);
  const octo = new Octokit();
  // naive: fetch tailwind.config.js or src/**/*.{css,scss}
  const file = await octo.repos.getContent({
    owner, repo,
    path: "tailwind.config.js",
  }).catch(() => null);

  if (file && "content" in file.data)
    return Buffer.from(file.data.content, "base64").toString("utf8");
  return "";
}

function toOwnerRepo(url: string) {
  const [, owner, repo] = /github\.com\/([^/]+)\/([^/]+)/.exec(url)!;
  return { owner, repo };
}

function extractHexes(text: string): string[] {
  return Array.from(new Set(text.match(/#([0-9a-f]{6}|[0-9a-f]{3})/gi) ?? []));
}
function extractFonts(text: string): string[] {
  return Array.from(
    new Set(
      text.match(
        /font-family:\s*['"]?([a-zA-Z0-9 \-_]+)['"]?/gi,
      )?.map(m => m.split(":")[1].trim()) ?? [],
    ),
  );
}

async function dominantColors(url: string): Promise<string[]> {
  // 5-colour palette; convert rgb to hex
  const buffer = await fetch(url).then(r => r.arrayBuffer());
  const resized = await sharp(Buffer.from(buffer)).resize(64).png().toBuffer();
  const palette = await ColorThief.getPalette(resized, 5);
  return palette.map(rgb =>
    "#" + rgb.map(c => c.toString(16).padStart(2, "0")).join(""),
  );
}


⸻

How it fits in the pipeline
	1.	Prompt Orchestrator collects repoUrl, uploadedImages[], explicitPalette[], brandKeywords, then calls:

const designDraft = await inferDesignSystem(hints, { provider:"openai", model:"gpt-4o" });

	2.	StoryboardBuilder merges that draft onto any existing tokens and validates with the AJV schema we wrote earlier.
	3.	ComponentGenerator receives brand-consistent colours & fonts in every storyboard snippet it sees, so scenes naturally align.

⸻

TODO hooks (marked in comments)
	•	Replace the naïve GitHub fetch with your organisation’s Git provider wrapper.
	•	Swap ColorThief for a faster WASM extractor if you care about cold-start times.
	•	Plug a true function-calling wrapper (model.chat({toolSchema,…})) once your ModelRegistry supports it.

With this scaffold the Style Agent stays stateless, swappable, and fully typed, mirroring the rest of your modular video factory.