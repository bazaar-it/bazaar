/**
 * GitHub Component Video Generation Service
 * Integrates component discovery with video generation pipeline
 */

import type { ComponentShowcaseRequest, ComponentVideoJob } from '~/lib/types/github.types';
import { db } from '~/server/db';
import { componentShowcaseEntries } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { GitHubComponentAnalyzerTool } from '~/brain/tools/github-component-analyzer';
import { generateComponentShowcaseVideo } from './showcase-video-generator.service';

// Simple in-memory queue for component videos (similar to changelog queue)
interface ComponentVideoJob {
  id: string;
  data: ComponentShowcaseRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

class ComponentVideoQueue {
  private jobs: Map<string, ComponentVideoJob> = new Map();
  private processing = false;
  
  /**
   * Add a component video job to the queue
   */
  async enqueue(data: ComponentShowcaseRequest): Promise<string> {
    const jobId = crypto.randomUUID();
    
    const job: ComponentVideoJob = {
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
   * Process a single component video job
   */
  private async processJob(job: ComponentVideoJob) {
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing component video job ${job.id}`);
    
    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();
      
      // Update database status
      await db.update(componentShowcaseEntries)
        .set({ 
          status: 'processing',
          updatedAt: new Date(),
        })
        .where(eq(componentShowcaseEntries.jobId, job.id));
      
      // Analyze the component using GitHub Component Analyzer
      console.log(`[${requestId}] Analyzing component: ${job.data.componentName}`);
      const analyzer = new GitHubComponentAnalyzerTool();
      
      // Extract component reference from the name
      const componentRef = analyzer.extractComponentReference(job.data.componentName);
      if (!componentRef) {
        throw new Error(`Could not parse component name: ${job.data.componentName}`);
      }
      
      // Analyze the component from GitHub
      const componentContext = await analyzer.analyze(
        'webhook', // Use webhook as user ID for now
        componentRef,
        job.data.accessToken
      );
      
      if (!componentContext) {
        throw new Error(`Component '${job.data.componentName}' not found in repository ${job.data.repository}`);
      }
      
      // Generate the showcase video
      console.log(`[${requestId}] Generating ${job.data.triggerType} video...`);
      const result = await generateComponentShowcaseVideo({
        componentContext,
        triggerType: job.data.triggerType,
        repository: job.data.repository,
        format: 'landscape', // Default format
        duration: job.data.triggerType === 'demo' ? 20 : 15, // Demos are longer
      });
      
      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();
      
      // Update database with video results and component analysis
      await db.update(componentShowcaseEntries)
        .set({
          status: 'completed',
          componentPath: componentContext.filePath,
          componentFramework: componentContext.framework,
          componentStructure: {
            name: componentContext.componentName,
            structure: componentContext.structure,
            repository: componentContext.repository,
            filePath: componentContext.filePath,
          },
          componentStyles: {
            styles: componentContext.styles,
            content: componentContext.content,
          },
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          gifUrl: result.gifUrl,
          videoDuration: result.duration,
          videoFormat: result.format,
          generatedCode: result.generatedCode, // Store the generated Remotion code
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(componentShowcaseEntries.jobId, job.id));
      
      console.log(`[${requestId}] Component video completed: ${result.videoUrl}`);
      
      // TODO: Comment on GitHub PR with video link
      await this.notifyGitHub(job.data, result);
      
    } catch (error) {
      console.error(`[${requestId}] Error processing component video job:`, error);
      
      // Update job status
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Update database status
      await db.update(componentShowcaseEntries)
        .set({
          status: 'failed',
          errorMessage: job.error,
          updatedAt: new Date(),
        })
        .where(eq(componentShowcaseEntries.jobId, job.id));
    }
  }
  
  /**
   * Notify GitHub with the generated component video
   */
  private async notifyGitHub(request: ComponentShowcaseRequest, result: any) {
    console.log(`TODO: Comment on PR #${request.prNumber} with ${request.triggerType} video ${result.videoUrl}`);
    // TODO: Use GitHub API to comment on PR with the video link
    // This would require implementing GitHub App installation token generation
  }
  
  /**
   * Get job status
   */
  getJob(jobId: string): ComponentVideoJob | undefined {
    return this.jobs.get(jobId);
  }
}

// Singleton instance
const componentVideoQueue = new ComponentVideoQueue();

/**
 * Queue a component showcase video generation job
 */
export async function queueComponentVideo(request: {
  repository: string;
  componentName: string;
  triggerType: 'showcase' | 'demo';
  accessToken: string;
  prNumber: number;
  requester: {
    username: string;
    avatar: string;
    url: string;
  };
}): Promise<string> {
  const componentRequest: ComponentShowcaseRequest = {
    repository: request.repository,
    componentName: request.componentName,
    triggerType: request.triggerType,
    accessToken: request.accessToken,
    prNumber: request.prNumber,
    requester: request.requester,
  };
  
  // Store initial record in database
  const entryId = crypto.randomUUID();
  const jobId = await componentVideoQueue.enqueue(componentRequest);
  
  await db.insert(componentShowcaseEntries).values({
    id: entryId,
    repository: request.repository,
    componentName: request.componentName,
    triggerType: request.triggerType,
    prNumber: request.prNumber,
    requesterUsername: request.requester.username,
    requesterAvatar: request.requester.avatar,
    requesterUrl: request.requester.url,
    jobId,
    status: 'queued',
  });
  
  return jobId;
}

/**
 * Get component video job status
 */
export function getComponentJobStatus(jobId: string) {
  return componentVideoQueue.getJob(jobId);
}