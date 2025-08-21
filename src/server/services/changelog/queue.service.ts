/**
 * Changelog Video Queue Service
 * Manages asynchronous video generation for GitHub changelogs
 */

import type { ChangelogVideoRequest, PRAnalysis } from '~/lib/types/github.types';
import { db } from '~/server/db';
import { changelogEntries } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateChangelogVideo } from './video-generator.service';

// Simple in-memory queue for MVP
// In production, use BullMQ or similar
interface QueueJob {
  id: string;
  data: ChangelogVideoRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

class ChangelogQueue {
  private jobs: Map<string, QueueJob> = new Map();
  private processing = false;
  
  /**
   * Add a job to the queue
   */
  async enqueue(data: ChangelogVideoRequest): Promise<string> {
    const jobId = crypto.randomUUID();
    
    const job: QueueJob = {
      id: jobId,
      data,
      status: 'pending',
      createdAt: new Date(),
    };
    
    this.jobs.set(jobId, job);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return jobId;
  }
  
  /**
   * Process jobs in the queue
   */
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (true) {
      // Find next pending job
      const pendingJob = Array.from(this.jobs.values())
        .find(job => job.status === 'pending');
      
      if (!pendingJob) {
        this.processing = false;
        break;
      }
      
      await this.processJob(pendingJob);
    }
  }
  
  /**
   * Process a single job
   */
  private async processJob(job: QueueJob) {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing changelog video job ${job.id}`);
    
    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();
      
      // Update database status
      const { prAnalysis } = job.data;
      await db.update(changelogEntries)
        .set({ 
          status: 'processing',
          updatedAt: new Date(),
        })
        .where(eq(changelogEntries.jobId, job.id));
      
      // Generate the video
      const result = await generateChangelogVideo(job.data);
      
      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      
      // Update database with video results
      await db.update(changelogEntries)
        .set({
          status: 'completed',
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          gifUrl: result.gifUrl,
          videoDuration: result.duration,
          videoFormat: result.format,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(changelogEntries.jobId, job.id));
      
      console.log(`[${requestId}] Changelog video completed: ${result.videoUrl}`);
      
      // TODO: Comment on GitHub PR with video link
      await this.notifyGitHub(prAnalysis, result);
      
    } catch (error) {
      console.error(`[${requestId}] Error processing job:`, error);
      
      // Update job status
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Update database status
      await db.update(changelogEntries)
        .set({
          status: 'failed',
          errorMessage: job.error,
          updatedAt: new Date(),
        })
        .where(eq(changelogEntries.jobId, job.id));
    }
  }
  
  /**
   * Notify GitHub with the generated video
   */
  private async notifyGitHub(prAnalysis: PRAnalysis, result: any) {
    try {
      const installationId = (prAnalysis as any)?.installationId as number | undefined;
      const { getInstallationOctokit } = await import('~/server/services/github/octokit-factory');
      const { getAppUrl } = await import('~/lib/utils/url');
      const appUrl = getAppUrl ? getAppUrl() : (process.env.NEXTAUTH_URL || 'https://bazaar.it');
      const shareUrl = `${appUrl}/share/${result.projectId}`; // Public share page
      const editUrl = `${appUrl}/projects/${result.projectId}/generate`;
      const owner = prAnalysis.repository.owner;
      const repo = prAnalysis.repository.name;
      const prNumber = prAnalysis.prNumber;

      const octokit = installationId
        ? await getInstallationOctokit(installationId)
        : new (await import('@octokit/rest')).Octokit({ auth: process.env.GITHUB_TOKEN });

      const body = [
        `🎬 Changelog video ready for PR #${prNumber}!`,
        '',
        `• Watch: ${result.videoUrl}`,
        `• Share: ${shareUrl} (public)`,
        `• Edit in Bazaar: ${editUrl} (login required)`,
      ].join('\n');

      await (octokit as any).issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
    } catch (e) {
      console.error('[ChangelogQueue] Failed to comment on PR:', e);
    }
  }
  
  /**
   * Get job status
   */
  getJob(jobId: string): QueueJob | undefined {
    return this.jobs.get(jobId);
  }
}

// Singleton instance
const queue = new ChangelogQueue();

/**
 * Queue a changelog video generation job
 */
export async function queueChangelogVideo(request: {
  prAnalysis: PRAnalysis;
  repository: string;
  style?: 'automatic' | 'feature' | 'fix' | 'announcement';
  format?: 'landscape' | 'square' | 'portrait';
  branding?: 'auto' | 'custom' | 'none';
}): Promise<string> {
  const videoRequest: ChangelogVideoRequest = {
    prAnalysis: request.prAnalysis,
    style: request.style || 'automatic',
    format: request.format || 'landscape',
    duration: 15, // Default 15 seconds
    branding: request.branding || 'auto',
  };
  
  return await queue.enqueue(videoRequest);
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string) {
  return queue.getJob(jobId);
}