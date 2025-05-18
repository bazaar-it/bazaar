import { Queue, Worker, ConnectionOptions, QueueEvents } from 'bullmq';
import { config } from '../config.js';
import { LogBatch, LogEntry, Issue } from '../types.js';
import { redisService } from './redis.service.js';
import { patternService } from './pattern.service.js';
import { notificationService } from './notification.service.js';

// Define job types
interface LogBatchJob {
  batch: LogBatch;
}

interface IssueJob {
  issue: Issue;
  isNew: boolean;
}

// Redis connection options - use nested config properties
const redisConnection: ConnectionOptions = {
  host: new URL(config.redis.url).hostname,
  port: parseInt(new URL(config.redis.url).port || '6379', 10),
};

/**
 * Worker service for background processing
 * Uses BullMQ for job queues and workers
 */
export class WorkerService {
  // Queue for processing log batches
  private readonly logQueue: Queue<LogBatchJob>;
  
  // Queue for processing detected issues
  private readonly issueQueue: Queue<IssueJob>;
  
  // Workers for processing jobs
  private readonly logWorker: Worker<LogBatchJob>;
  private readonly issueWorker: Worker<IssueJob>;
  
  // Queue events for handling jobs
  private readonly logQueueEvents: QueueEvents;
  private readonly issueQueueEvents: QueueEvents;
  
  // Metrics
  private metrics = {
    logsProcessed: 0,
    issuesDetected: 0,
    notificationsSent: 0,
  };

  constructor() {
    // Create queues
    this.logQueue = new Queue<LogBatchJob>('log-processing', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
    
    this.issueQueue = new Queue<IssueJob>('issue-processing', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    });
    
    // Create workers
    this.logWorker = new Worker<LogBatchJob>(
      'log-processing',
      this.processLogBatch.bind(this),
      {
        connection: redisConnection,
        concurrency: config.worker.concurrency,
        maxStalledCount: 3,
      }
    );
    
    this.issueWorker = new Worker<IssueJob>(
      'issue-processing',
      this.processIssue.bind(this),
      {
        connection: redisConnection,
        concurrency: config.worker.concurrency,
        maxStalledCount: 3,
      }
    );
    
    // Create queue events
    this.logQueueEvents = new QueueEvents('log-processing', {
      connection: redisConnection,
    });
    
    this.issueQueueEvents = new QueueEvents('issue-processing', {
      connection: redisConnection,
    });
    
    // Handle events
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for worker events
   */
  private setupEventHandlers() {
    // Log worker events
    this.logWorker.on('completed', job => {
      console.debug(`Log batch job ${job.id} completed`);
    });
    
    this.logWorker.on('failed', (job, error) => {
      console.error(`Log batch job ${job?.id} failed:`, error);
    });
    
    // Issue worker events
    this.issueWorker.on('completed', job => {
      console.debug(`Issue job ${job.id} completed`);
    });
    
    this.issueWorker.on('failed', (job, error) => {
      console.error(`Issue job ${job?.id} failed:`, error);
    });
    
    // Handle worker errors
    this.logWorker.on('error', error => {
      console.error('Log worker error:', error);
    });
    
    this.issueWorker.on('error', error => {
      console.error('Issue worker error:', error);
    });
  }

  /**
   * Add a log batch to the processing queue
   * @param batch The log batch to process
   * @returns The job ID
   */
  async addLogBatch(batch: LogBatch): Promise<string> {
    const job = await this.logQueue.add('process-batch', { batch });
    return job.id as string;
  }

  /**
   * Process a log batch job
   * @param job The log batch job
   */
  private async processLogBatch(job: any): Promise<void> {
    const { batch } = job.data as LogBatchJob;
    
    // Skip empty batches
    if (!batch.entries.length) return;
    
    // Store logs in Redis
    await redisService.storeLogs(batch);
    
    // Process each log for pattern matching
    for (const log of batch.entries) {
      const issue = patternService.checkLog(log);
      
      // If an issue is detected, process it
      if (issue) {
        // Store or update issue in Redis
        const result = await redisService.storeIssue(issue);
        
        // Add to issue queue for notification
        await this.issueQueue.add('process-issue', {
          issue,
          isNew: result.isNew,
        });
        
        this.metrics.issuesDetected++;
      }
    }
    
    this.metrics.logsProcessed += batch.entries.length;
  }

  /**
   * Process an issue job
   * @param job The issue job
   */
  private async processIssue(job: any): Promise<void> {
    const { issue, isNew } = job.data as IssueJob;
    
    // Process for notification
    const notified = await notificationService.processIssue(issue, isNew);
    
    if (notified) {
      this.metrics.notificationsSent++;
    }
  }

  /**
   * Get worker queue metrics
   * @returns Processing metrics
   */
  async getMetrics() {
    const [logCounts, issueCounts] = await Promise.all([
      this.logQueue.getJobCounts(),
      this.issueQueue.getJobCounts(),
    ]);
    
    return {
      ...this.metrics,
      queues: {
        logs: logCounts,
        issues: issueCounts,
      },
    };
  }

  /**
   * Gracefully shutdown the workers
   */
  async close(): Promise<void> {
    console.info('Shutting down workers...');
    
    await Promise.all([
      this.logWorker.close(),
      this.issueWorker.close(),
      this.logQueueEvents.close(),
      this.issueQueueEvents.close(),
      this.logQueue.close(),
      this.issueQueue.close(),
    ]);
    
    console.info('Workers shut down successfully');
  }
}

// Export singleton instance
export const workerService = new WorkerService(); 