Below is a fully-typed AssetAgentAdapter scaffold that matches the conventions we used for the Scene and Style agents:
	•	single public function collectAssets()
	•	provider-agnostic StorageAdapter (so you can swap Cloudflare R2, S3 or local disk)
	•	light media-probe helpers (width/height, duration) stubbed for later ffprobe/Limbo WASM integration
	•	outputs an AssetCatalog ready to drop into the Storyboard under scene.assets[]

File location suggestion: src/agents/assets/assetAgentAdapter.ts

⸻


/* ------------------------------------------------------------------
 * Asset Agent — gathers user-supplied & remote media, stores them
 * consistently and returns storyboard-ready metadata.
 *
 *  Responsibilities
 *   1. Accept upload handles / external URLs from the Prompt Orchestrator
 *   2. Ensure each asset is stored in our canonical bucket (or verified)
 *   3. Extract basic metadata (dimensions, duration, mime)
 *   4. Produce an AssetCatalog for StoryboardBuilder
 * ------------------------------------------------------------------ */

import { randomUUID } from "crypto";
import { StorageAdapter, StorageLocation } from "./storageAdapter";
import { logger } from "../shared/logger";

/* ------------------------------------------------------------------ */
/* 1. Public types                                                    */
/* ------------------------------------------------------------------ */

/** The storyboard schema’s Asset[]  shape (copied to stay in sync) */
export interface StoryboardAsset {
  id: string;
  type: "image" | "video" | "audio" | "lottie" | "3d";
  url: string;
  alt?: string;
  startTime?: number;
  duration?: number;
  loop?: boolean;
  dimensions?: { width: number; height: number };
}

export type AssetCatalog = StoryboardAsset[];

/** Inputs coming from UI / Orchestrator */
export interface AssetHints {
  uploadedFiles?: Array<{ tmpPath: string; filename: string; mime: string }>;
  externalUrls?: string[];          // user pasted URLs we need to copy / verify
  visionExtracted?: string[];       // e.g. from <img src=...> found in a repo readme
  // Future: drive / dropbox connectors, etc.
}

/* ------------------------------------------------------------------ */
/* 2. Top-level API                                                   */
/* ------------------------------------------------------------------ */

export async function collectAssets(
  hints: AssetHints,
  storage: StorageAdapter,
): Promise<AssetCatalog> {
  const assets: AssetCatalog = [];

  /* 2.1 handle uploaded files ------------------------------------ */
  if (hints.uploadedFiles) {
    for (const file of hints.uploadedFiles) {
      const loc = await storage.uploadFile({
        localPath: file.tmpPath,
        contentType: file.mime,
        originalFilename: file.filename,
      });

      assets.push(await toStoryboardAsset(loc));
    }
  }

  /* 2.2 handle external URLs ------------------------------------- */
  if (hints.externalUrls) {
    for (const url of hints.externalUrls) {
      try {
        const loc = await storage.importExternal(url);
        assets.push(await toStoryboardAsset(loc));
      } catch (err) {
        logger.warn("External asset import failed", { url, err });
      }
    }
  }

  /* 2.3 vision-extracted refs (best-effort) ----------------------- */
  if (hints.visionExtracted) {
    for (const url of hints.visionExtracted) {
      // skip if already included
      if (assets.some(a => a.url === url)) continue;

      const loc = await storage.importExternal(url).catch(() => null);
      if (loc) assets.push(await toStoryboardAsset(loc));
    }
  }

  return assets;
}

/* ------------------------------------------------------------------ */
/* 3. Conversion helper                                               */
/* ------------------------------------------------------------------ */

async function toStoryboardAsset(loc: StorageLocation): Promise<StoryboardAsset> {
  // crude mime sniff
  const [typeMain] = loc.contentType.split("/");
  let assetType: StoryboardAsset["type"] = "image";

  switch (typeMain) {
    case "image": assetType = "image"; break;
    case "video": assetType = "video"; break;
    case "audio": assetType = "audio"; break;
    case "model": assetType = "3d";    break;
    default:
      if (loc.contentType.includes("lottie") || loc.path.endsWith(".json"))
        assetType = "lottie";
  }

  // run lightweight metadata probe (stub below)
  const meta = await probeMedia(loc.publicUrl).catch(() => ({}));

  return {
    id: randomUUID(),
    type: assetType,
    url: loc.publicUrl,
    alt: loc.originalFilename,
    duration: meta.duration,
    dimensions: meta.width ? { width: meta.width, height: meta.height } : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* 4. Storage adapter interface                                      */
/* ------------------------------------------------------------------ */

export interface UploadParams {
  localPath: string;
  contentType: string;
  originalFilename: string;
}

export interface StorageLocation {
  bucket: string;
  path: string;             // /assets/…
  publicUrl: string;
  contentType: string;
  originalFilename: string;
}

export interface StorageAdapter {
  uploadFile(p: UploadParams): Promise<StorageLocation>;
  importExternal(url: string): Promise<StorageLocation>;
}

/* ------------------------------------------------------------------ */
/* 5. Tiny media-probe helper                                         */
/* ------------------------------------------------------------------ */

interface MediaMeta { width?: number; height?: number; duration?: number }
async function probeMedia(url: string): Promise<MediaMeta> {
  // --- PLACEHOLDER ---------------------------------------------
  //  👇 swap in ffprobe-wasm or fast image-size once infra is ready
  //  For images we can HEAD the file and use sharp(metadata)
  //  For video/audio we need ffprobe or bark meta.
  // --------------------------------------------------------------
  if (url.match(/\.(png|jpe?g|gif|webp)$/i)) {
    const buffer = await fetch(url).then(r => r.arrayBuffer()).catch(() => null);
    if (!buffer) return {};
    const sharpMod = await import("sharp");
    const meta = await sharpMod.default(Buffer.from(buffer)).metadata();
    return { width: meta.width, height: meta.height };
  }
  return {};
}


⸻

Usage example inside the Prompt Orchestrator

import { collectAssets } from "@/agents/assets/assetAgentAdapter";
import { r2Storage }   from "@/services/storage/r2Adapter";

const hints: AssetHints = {
  uploadedFiles,
  externalUrls,
  visionExtracted,
};

const catalog = await collectAssets(hints, r2Storage);
/* catalog → [
  { id:"…", type:"image", url:"https://cdn…/hero.png", dimensions:{w:1920,h:1080}},
  …
] */

Why the agent stays “thin”
	•	No business rules about where assets are used; it only ensures they are safe, deduped, and enriched with minimal metadata.
	•	Stateless – any heavy processing (e.g., transcoding, colour palettes) can happen in a later worker without blocking the storyboard assembly.
	•	Swappable storage – the same interface lets you move from Cloudflare R2 to S3 or an on-prem bucket by swapping r2Adapter.ts.

⸻

Next steps
	1.	Implement a real r2Adapter (StorageAdapter) using @cloudflare/workers-types or the MinIO SDK.
	2.	Replace probeMedia with a proper WASM ffprobe or Sharp pipeline.
	3.	Wire the resulting AssetCatalog into the StoryboardBuilder so every scene can reference assets via their id or direct url.