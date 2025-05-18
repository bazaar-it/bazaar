import { Queue, Worker, QueueEvents } from 'bullmq';
import { config } from '../config.js';
import { redisService } from './redis.service.js';
import { patternService } from './pattern.service.js';
import { notificationService } from './notification.service.js';
// Redis connection options
const redisConnection = {
    host: new URL(config.redis.url).hostname,
    port: parseInt(new URL(config.redis.url).port || '6379', 10),
};
/**
 * Worker service for background processing
 * Uses BullMQ for job queues and workers
 */
export class WorkerService {
    // Queue for processing log batches
    logQueue;
    // Queue for processing detected issues
    issueQueue;
    // Workers for processing jobs
    logWorker;
    issueWorker;
    // Queue events for handling jobs
    logQueueEvents;
    issueQueueEvents;
    // Metrics
    metrics = {
        logsProcessed: 0,
        issuesDetected: 0,
        notificationsSent: 0,
    };
    constructor() {
        // Create queues
        this.logQueue = new Queue('log-processing', {
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
        this.issueQueue = new Queue('issue-processing', {
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
        this.logWorker = new Worker('log-processing', this.processLogBatch.bind(this), {
            connection: redisConnection,
            concurrency: config.worker.concurrency,
            maxStalledCount: 3,
        });
        this.issueWorker = new Worker('issue-processing', this.processIssue.bind(this), {
            connection: redisConnection,
            concurrency: config.worker.concurrency,
            maxStalledCount: 3,
        });
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
    setupEventHandlers() {
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
    async addLogBatch(batch) {
        const job = await this.logQueue.add('process-batch', { batch });
        return job.id;
    }
    /**
     * Process a log batch job
     * @param job The log batch job
     */
    async processLogBatch(job) {
        const { batch } = job.data;
        // Skip empty batches
        if (!batch.entries.length)
            return;
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
    async processIssue(job) {
        const { issue, isNew } = job.data;
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
    async close() {
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
