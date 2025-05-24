//src/queues/publish.ts
import { Queue, Worker, Job, type ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';
import path from 'path';
import { bundleScene } from '@bundler/index';
import { uploadSceneBundle, fileExists, getPublicUrl, generateSceneKey } from '@r2/index';
import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import logger from '~/lib/logger';

// Load environment variables from the root .env.local
const projectRoot = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env.local') });

const REDIS_URL = process.env.REDIS_URL;

// In production, we strictly require REDIS_URL to be set
// In development, we can fall back to localhost
if (!REDIS_URL) {
  if (process.env.NODE_ENV === 'production') {
    const errorMsg = 'REDIS_URL environment variable is not set in production. Cannot initialize queue.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  } else {
    logger.warn('REDIS_URL environment variable is not set. Falling back to localhost for development.');
  }
}

// Define Redis connection options
// BullMQ can take a URL string directly or an options object.
// For more complex setups (like Redis Sentinel or Cluster), you'd use the object form.
const connection: ConnectionOptions = {
  host: new URL(REDIS_URL || 'redis://localhost:6379').hostname, // Default to localhost if not set
  port: parseInt(new URL(REDIS_URL || 'redis://localhost:6379').port || '6379'),
  // password: new URL(REDIS_URL).password, // if your Redis has a password
  // Add other options like db, tls, etc., if needed
};

const QUEUE_NAME = 'scene-publishing';

// Interface for the job data
export interface PublishJobData {
  sceneId: string;
  userId: string; // To check permissions or for logging
  scope?: 'scene' | 'storyboard'; // Future: support full storyboard publishing
}

// Interface for job result
export interface PublishJobResult {
  success: boolean;
  sceneId: string;
  publishedUrl?: string;
  hash?: string;
  size?: number;
  error?: string;
}

// Create the queue instance
// This instance is used to add jobs to the queue.
export const publishQueue = new Queue<PublishJobData, PublishJobResult>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: 'exponential',
      delay: 1000, // Initial delay of 1s, then 2s, 4s
    },
    removeOnComplete: true, // Remove job from queue once successfully completed
    removeOnFail: { count: 1000 }, // Keep last 1000 failed jobs for inspection
  },
});

logger.info(`Publish queue '${QUEUE_NAME}' initialized.`);

// Define the worker
// The worker processes jobs from the queue.
// It's good practice to run workers in a separate process/service in production.
if (process.env.RUN_WORKER === 'true') { // Only run worker if explicitly told to
  const publishWorker = new Worker<PublishJobData, PublishJobResult>(
    QUEUE_NAME,
    async (job: Job<PublishJobData, PublishJobResult>) => {
      const { sceneId, userId, scope = 'scene' } = job.data;
      
      logger.info(`[PublishWorker] Processing job ${job.id} for scene ${sceneId}`, { 
        userId, 
        scope 
      });

      try {
        // Update job progress
        await job.updateProgress(10);

        // 1. Get scene details from DB
        const scene = await db.query.scenes.findFirst({
          where: eq(scenes.id, sceneId),
          with: {
            project: true, // Include project for permission checking
          },
        });

        if (!scene) {
          throw new Error(`Scene ${sceneId} not found`);
        }

        // 2. Check permissions - ensure user owns the project
        if (scene.project.userId !== userId) {
          throw new Error(`User ${userId} does not have permission to publish scene ${sceneId}`);
        }

        await job.updateProgress(20);

        // 3. Bundle the scene using the bundler utility
        logger.info(`[PublishWorker] Bundling scene ${sceneId}`);
        const bundleResult = await bundleScene(scene.tsxCode, sceneId, {
          fullStoryboard: scope === 'storyboard', // Correct logic: true if scope is 'storyboard'
          minify: true,
          target: 'es2022',
        });

        await job.updateProgress(50);

        // 4. Check for deduplication - if hash already exists, skip upload
        const existingSceneWithSameHash = await db.query.scenes.findFirst({
          where: and(
            eq(scenes.publishedHash, bundleResult.hash),
            eq(scenes.projectId, scene.projectId) // Constrain to the same project
          ),
        });

        let uploadResult;
        if (existingSceneWithSameHash?.publishedUrl) {
          logger.info(`[PublishWorker] Bundle already exists with hash ${bundleResult.hash} for project ${scene.projectId}, reusing URL: ${existingSceneWithSameHash.publishedUrl}`);
          uploadResult = {
            key: existingSceneWithSameHash.publishedUrl.substring(existingSceneWithSameHash.publishedUrl.lastIndexOf('/') + 1), // Attempt to derive key from URL
            url: existingSceneWithSameHash.publishedUrl,
            size: bundleResult.size, // Use current bundle's size as it's the same content
          };
        } else if (existingSceneWithSameHash && !existingSceneWithSameHash.publishedUrl) {
          // Hash matches, but URL was null (e.g. previous failed R2 upload after bundle)
          // Check if the file actually exists on R2 before re-uploading
          const potentialKey = generateSceneKey(scene.projectId, sceneId, bundleResult.hash);
          logger.info(`[PublishWorker] Found matching hash ${bundleResult.hash} with null URL. Checking R2 for key: ${potentialKey}`);
          if (await fileExists(potentialKey)) {
            logger.info(`[PublishWorker] File ${potentialKey} exists on R2 despite null DB URL. Reusing.`);
            uploadResult = {
              key: potentialKey,
              url: getPublicUrl(potentialKey),
              size: bundleResult.size,
            };
          } else {
            logger.info(`[PublishWorker] File ${potentialKey} does not exist on R2. Proceeding with upload.`);
            uploadResult = await uploadSceneBundle(
              scene.projectId,
              sceneId,
              bundleResult.bytes,
              bundleResult.hash
            );
          }
        } else {
          // No existing scene with this hash in this project, or it had a URL. Proceed with upload.
          logger.info(`[PublishWorker] Uploading new scene bundle to R2 for project ${scene.projectId}`);
          uploadResult = await uploadSceneBundle(
            scene.projectId,
            sceneId,
            bundleResult.bytes,
            bundleResult.hash
          );
        }

        await job.updateProgress(80);

        // 6. Update scene status and published URL in the database
        await db.update(scenes)
          .set({
            publishedUrl: uploadResult.url,
            publishedHash: bundleResult.hash,
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(100);

        const result: PublishJobResult = {
          success: true,
          sceneId,
          publishedUrl: uploadResult.url,
          hash: bundleResult.hash,
          size: bundleResult.size,
        };

        logger.info(`[PublishWorker] Job ${job.id} for scene ${sceneId} completed successfully`, {
          url: uploadResult.url,
          hash: bundleResult.hash,
          size: bundleResult.size,
        });

        return result;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[PublishWorker] Job ${job.id} for scene ${sceneId} failed`, { 
          error: errorMessage,
          userId,
          scope 
        });

        // The error will be caught by BullMQ and the job will be marked as failed (and retried if attempts > 1)
        throw new Error(errorMessage); // Re-throw the error to ensure BullMQ handles it as a failure
      }
    },
    { 
      connection,
    }
  );

  publishWorker.on('completed', (job: Job<PublishJobData, PublishJobResult>, result: PublishJobResult) => {
    logger.info(`[PublishWorker] Job ${job.id} completed`, { result });
  });

  publishWorker.on('failed', (job: Job<PublishJobData, PublishJobResult> | undefined, err: Error) => {
    if (job) {
      logger.error(`[PublishWorker] Job ${job.id} failed`, { 
        error: err.message,
        data: job.data 
      });
    } else {
      logger.error(`[PublishWorker] A job failed`, { error: err.message });
    }
  });

  publishWorker.on('error', (err: Error) => {
    logger.error('[PublishWorker] Worker encountered an error', { error: err.message });
  });

  logger.info(`Publish worker for queue '${QUEUE_NAME}' started.`);

  // Graceful shutdown
  const gracefulShutdown = async () => {
    logger.info('Shutting down publish worker...');
    await publishWorker.close();
    logger.info('Publish worker shut down.');
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown); // kill
  process.on('SIGINT', gracefulShutdown);  // Ctrl+C
}

/**
 * Adds a scene publishing job to the queue.
 * @param data - The data for the publishing job.
 * @returns The added job instance.
 */
export async function addPublishJob(data: PublishJobData): Promise<Job<PublishJobData, PublishJobResult>> {
  const job = await publishQueue.add('publish-scene', data, {
    // Override default options if needed
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    // Add job timeout
    delay: 0, // Start immediately
  });
  
  logger.info(`[PublishQueue] Added job ${job.id} for scene ${data.sceneId}`, { 
    userId: data.userId,
    scope: data.scope 
  });
  
  return job;
}

/**
 * Get job status by job ID
 */
export async function getJobStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  result?: PublishJobResult;
  error?: string;
} | null> {
  try {
    const job = await publishQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress as number || 0;
    
    return {
      status: state,
      progress,
      result: job.returnvalue as PublishJobResult,
      error: job.failedReason,
    };
  } catch (error) {
    logger.error('[PublishQueue] Error getting job status', { 
      jobId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}
