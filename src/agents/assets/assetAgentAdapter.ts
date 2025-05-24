// src/agents/assets/assetAgentAdapter.ts

import { randomUUID } from 'crypto';
import { type StorageAdapter, type StorageLocation } from './storageAdapter';
import { logger } from '~/lib/logger';

/** The storyboard schema's Asset shape */
export interface StoryboardAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'lottie' | '3d';
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
  externalUrls?: string[];
  visionExtracted?: string[];
}

export async function collectAssets(
  hints: AssetHints,
  storage: StorageAdapter,
): Promise<AssetCatalog> {
  const assets: AssetCatalog = [];

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

  if (hints.externalUrls) {
    for (const url of hints.externalUrls) {
      try {
        const loc = await storage.importExternal(url);
        assets.push(await toStoryboardAsset(loc));
      } catch (err) {
        logger.warn('External asset import failed', { url, err });
      }
    }
  }

  if (hints.visionExtracted) {
    for (const url of hints.visionExtracted) {
      if (assets.some(a => a.url === url)) continue;
      const loc = await storage.importExternal(url).catch(() => null);
      if (loc) assets.push(await toStoryboardAsset(loc));
    }
  }

  return assets;
}

async function toStoryboardAsset(loc: StorageLocation): Promise<StoryboardAsset> {
  const [typeMain] = loc.contentType.split('/');
  let assetType: StoryboardAsset['type'] = 'image';

  switch (typeMain) {
    case 'image':
      assetType = 'image';
      break;
    case 'video':
      assetType = 'video';
      break;
    case 'audio':
      assetType = 'audio';
      break;
    case 'model':
      assetType = '3d';
      break;
    default:
      if (loc.contentType.includes('lottie') || loc.path.endsWith('.json')) {
        assetType = 'lottie';
      }
  }

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

interface MediaMeta { width?: number; height?: number; duration?: number }
async function probeMedia(url: string): Promise<MediaMeta> {
  if (/\.(png|jpe?g|gif|webp)$/i.exec(url)) {
    const buffer = await fetch(url).then(r => r.arrayBuffer()).catch(() => null);
    if (!buffer) return {};
    const sharpMod = await import('sharp');
    const meta = await sharpMod.default(Buffer.from(buffer)).metadata();
    return { width: meta.width, height: meta.height };
  }
  return {};
}
