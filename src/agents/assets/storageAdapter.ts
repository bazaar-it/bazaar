// src/agents/assets/storageAdapter.ts
export interface UploadParams {
  localPath: string;
  contentType: string;
  originalFilename: string;
}

export interface StorageLocation {
  bucket: string;
  path: string;
  publicUrl: string;
  contentType: string;
  originalFilename: string;
}

export interface StorageAdapter {
  uploadFile(p: UploadParams): Promise<StorageLocation>;
  importExternal(url: string): Promise<StorageLocation>;
}

/**
 * Simple local disk adapter used for development and testing.
 * Files are copied to the /tmp/assets directory and served from there.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'crypto';

const BASE_DIR = path.join(process.cwd(), 'tmp', 'assets');

export class LocalDiskAdapter implements StorageAdapter {
  async uploadFile(p: UploadParams): Promise<StorageLocation> {
    await fs.mkdir(BASE_DIR, { recursive: true });
    const id = randomUUID();
    const ext = path.extname(p.originalFilename);
    const filename = `${id}${ext}`;
    const dest = path.join(BASE_DIR, filename);
    await fs.copyFile(p.localPath, dest);
    return {
      bucket: 'local',
      path: dest,
      publicUrl: `file://${dest}`,
      contentType: p.contentType,
      originalFilename: p.originalFilename,
    };
  }

  async importExternal(url: string): Promise<StorageLocation> {
    await fs.mkdir(BASE_DIR, { recursive: true });
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = await res.arrayBuffer();
    const id = randomUUID();
    const ext = path.extname(new URL(url).pathname) || '';
    const filename = `${id}${ext}`;
    const dest = path.join(BASE_DIR, filename);
    await fs.writeFile(dest, Buffer.from(buffer));
    return {
      bucket: 'local',
      path: dest,
      publicUrl: `file://${dest}`,
      contentType,
      originalFilename: filename,
    };
  }
}
