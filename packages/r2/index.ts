//packages/r2/index.ts
import { 
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { env } from "../../src/env.js";
import logger from '../../src/lib/utils/logger';
import { URL } from "url"; // For creating URL object for EndpointV2

// R2 configuration from environment variables
const r2Endpoint: import("@aws-sdk/types").EndpointV2 = {
  url: new URL(env.R2_ENDPOINT),
};

const s3Client = new S3Client({
  region: "auto",
  endpoint: r2Endpoint, // Use EndpointV2 object
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET_NAME = env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = env.R2_PUBLIC_URL;

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  etag?: string;
}

/**
 * Upload a file to Cloudflare R2 storage
 * Adapted from buildCustomComponent.ts S3 upload patterns
 */
export async function uploadFile(
  key: string,
  data: Buffer | Uint8Array | string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { 
    contentType = 'application/octet-stream',
    cacheControl = 'public, max-age=31536000', // 1 year cache for immutable content
    metadata = {}
  } = options;

  logger.info(`[R2] Uploading file to key: ${key}`, { 
    size: data.length,
    contentType 
  });

  try {
    // Check if file already exists (deduplication)
    const exists = await fileExists(key);
    if (exists) {
      logger.info(`[R2] File already exists, skipping upload: ${key}`);
      return {
        key,
        url: getPublicUrl(key),
        size: data.length,
      };
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: data,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: metadata,
    });

    const result = await s3Client.send(command);
    const url = getPublicUrl(key);

    logger.info(`[R2] Upload successful for key: ${key}`, { 
      url,
      etag: result.ETag 
    });

    return {
      key,
      url,
      size: data.length,
      etag: result.ETag,
    };

  } catch (error) {
    logger.error(`[R2] Upload failed for key: ${key}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Check if a file exists in R2 storage
 * Uses HeadObjectCommand for efficient existence check
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // Re-throw other errors (permissions, network, etc.)
    throw error;
  }
}

/**
 * Get file metadata from R2 storage
 */
export async function getFileMetadata(key: string): Promise<{
  size: number;
  lastModified: Date;
  contentType: string;
  etag: string;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const result = await s3Client.send(command);
    
    return {
      size: result.ContentLength || 0,
      lastModified: result.LastModified || new Date(),
      contentType: result.ContentType || 'application/octet-stream',
      etag: result.ETag || '',
    };
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Generate a public URL for an R2 object
 * Uses the configured R2_PUBLIC_URL from environment
 */
export function getPublicUrl(key: string): string {
  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL environment variable is not configured');
  }
  
  // Ensure key doesn't start with slash
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  
  // Ensure public URL doesn't end with slash
  const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
  
  return `${baseUrl}/${cleanKey}`;
}

/**
 * Generate a deterministic key for scene bundles
 * Format: projects/{projectId}/scenes/{sceneId}/{hash}.js
 */
export function generateSceneKey(projectId: string, sceneId: string, hash: string): string {
  return `projects/${projectId}/scenes/${sceneId}/${hash}.js`;
}

/**
 * Upload a scene bundle to R2 with proper naming and metadata
 */
export async function uploadSceneBundle(
  projectId: string,
  sceneId: string,
  bundleData: Buffer,
  hash: string
): Promise<UploadResult> {
  const key = generateSceneKey(projectId, sceneId, hash);
  
  return uploadFile(key, bundleData, {
    contentType: 'application/javascript',
    cacheControl: 'public, max-age=31536000, immutable', // Immutable content
    metadata: {
      projectId,
      sceneId,
      hash,
      uploadedAt: new Date().toISOString(),
    },
  });
}

/**
 * Health check for R2 connectivity
 * Useful for startup validation
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // Try to list objects in the bucket (with limit 1 for efficiency)
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'health-check-non-existent-key',
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    // 404 is expected for health check, other errors indicate problems
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return true; // R2 is accessible
    }
    
    logger.error('[R2] Health check failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
}
