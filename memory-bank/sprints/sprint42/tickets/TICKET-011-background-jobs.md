# TICKET-011: Background Job Processing

## Overview
Heavy operations should not block user responses. Implement a job queue system for video rendering and other time-consuming tasks.

## Current State

### Problem Areas
1. **Video rendering blocks responses** - Users wait for completion
2. **No progress visibility** - Users don't know how long operations will take
3. **Failed operations lost** - No retry mechanism
4. **Resource intensive** - Heavy tasks impact main app performance

## Implementation Plan

### Step 1: Job Queue Infrastructure

Create `/src/lib/jobs/queue.ts`:
```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection for BullMQ
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Job queues
export const videoQueue = new Queue('video-rendering', { connection });
export const storageQueue = new Queue('storage-upload', { connection });
export const eventQueue = new Queue('event-processing', { connection });

// Queue events for monitoring
export const videoQueueEvents = new QueueEvents('video-rendering', { connection });

// Job types
export interface VideoRenderJob {
  projectId: string;
  sceneIds: string[];
  outputFormat: 'mp4' | 'webm' | 'gif';
  resolution: '1080p' | '720p' | '480p';
  userId: string;
}

export interface StorageUploadJob {
  localPath: string;
  remotePath: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface EventProcessingJob {
  eventType: string;
  payload: any;
  timestamp: Date;
}
```

### Step 2: Job Processors

Create `/src/lib/jobs/workers/videoWorker.ts`:
```typescript
import { Worker, Job } from 'bullmq';
import { renderVideo } from '~/server/services/video/renderer';
import { db } from '~/server/db';
import { videoRenders } from '~/server/db/schema';

export function createVideoWorker() {
  return new Worker<VideoRenderJob>(
    'video-rendering',
    async (job: Job<VideoRenderJob>) => {
      const { projectId, sceneIds, outputFormat, resolution, userId } = job.data;
      
      // Update job progress
      await job.updateProgress(10);
      
      try {
        // Create render record
        const [render] = await db.insert(videoRenders).values({
          projectId,
          userId,
          status: 'processing',
          format: outputFormat,
          resolution,
          createdAt: new Date(),
        }).returning();
        
        // Fetch scenes
        await job.updateProgress(20);
        const scenes = await db.query.scenes.findMany({
          where: inArray(scenes.id, sceneIds),
          orderBy: [asc(scenes.order)],
        });
        
        // Render video
        await job.updateProgress(30);
        const result = await renderVideo({
          scenes,
          format: outputFormat,
          resolution,
          onProgress: async (progress) => {
            // Scale progress from 30-90%
            const scaledProgress = 30 + (progress * 0.6);
            await job.updateProgress(scaledProgress);
          },
        });
        
        // Upload to storage
        await job.updateProgress(90);
        const uploadJob = await storageQueue.add('upload-video', {
          localPath: result.filePath,
          remotePath: `videos/${projectId}/${render.id}.${outputFormat}`,
          contentType: `video/${outputFormat}`,
          metadata: {
            projectId,
            renderId: render.id,
          },
        });
        
        // Wait for upload
        await uploadJob.waitUntilFinished(videoQueueEvents);
        
        // Update render record
        await job.updateProgress(95);
        await db.update(videoRenders)
          .set({
            status: 'completed',
            url: `https://cdn.bazaar-vid.com/videos/${projectId}/${render.id}.${outputFormat}`,
            completedAt: new Date(),
          })
          .where(eq(videoRenders.id, render.id));
        
        await job.updateProgress(100);
        
        return {
          renderId: render.id,
          url: result.url,
          duration: result.duration,
        };
        
      } catch (error) {
        // Update render record with error
        await db.update(videoRenders)
          .set({
            status: 'failed',
            error: error.message,
            failedAt: new Date(),
          })
          .where(eq(videoRenders.projectId, projectId));
        
        throw error;
      }
    },
    {
      connection,
      concurrency: 2, // Process 2 videos at a time
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    }
  );
}

// Storage worker
export function createStorageWorker() {
  return new Worker<StorageUploadJob>(
    'storage-upload',
    async (job: Job<StorageUploadJob>) => {
      const { localPath, remotePath, contentType, metadata } = job.data;
      
      // Upload to R2
      const result = await r2.upload({
        path: remotePath,
        file: await fs.readFile(localPath),
        contentType,
        metadata,
      });
      
      // Clean up local file
      await fs.unlink(localPath);
      
      return { url: result.url };
    },
    {
      connection,
      concurrency: 5,
    }
  );
}
```

### Step 3: Job Scheduling API

Update `/src/server/api/routers/generation.ts`:
```typescript
import { videoQueue } from '~/lib/jobs/queue';
import { UniversalResponse } from '~/lib/types/api/universal';

// Add render endpoint
renderVideo: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    sceneIds: z.array(z.string()).optional(),
    format: z.enum(['mp4', 'webm', 'gif']).default('mp4'),
    resolution: z.enum(['1080p', '720p', '480p']).default('1080p'),
  }))
  .mutation(async ({ input, ctx }): Promise<UniversalResponse<{ jobId: string }>> => {
    try {
      // Queue the job
      const job = await videoQueue.add('render-video', {
        projectId: input.projectId,
        sceneIds: input.sceneIds || await getAllSceneIds(input.projectId),
        outputFormat: input.format,
        resolution: input.resolution,
        userId: ctx.userId,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false, // Keep for status tracking
      });
      
      return {
        success: true,
        data: { jobId: job.id },
        meta: {
          requestId: generateRequestId(),
          timestamp: new Date(),
          operation: 'video.render.start',
        },
      };
    } catch (error) {
      return createErrorResponse(error, 'video.render.start');
    }
  }),

// Get job status
getJobStatus: publicProcedure
  .input(z.object({ jobId: z.string() }))
  .query(async ({ input }): Promise<UniversalResponse<JobStatus>> => {
    const job = await videoQueue.getJob(input.jobId);
    
    if (!job) {
      return createErrorResponse(
        new Error('Job not found'),
        'job.status.get',
        'JOB_NOT_FOUND'
      );
    }
    
    const state = await job.getState();
    const progress = job.progress;
    
    return {
      success: true,
      data: {
        id: job.id,
        state,
        progress: typeof progress === 'number' ? progress : 0,
        result: job.returnvalue,
        error: job.failedReason,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      },
      meta: {
        requestId: generateRequestId(),
        timestamp: new Date(),
        operation: 'job.status.get',
      },
    };
  }),
```

### Step 4: Progress Tracking UI

Create `/src/components/jobs/JobProgress.tsx`:
```typescript
import { api } from '~/trpc/react';
import { useEffect, useState } from 'react';
import { Progress } from '~/components/ui/progress';

interface JobProgressProps {
  jobId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function JobProgress({ jobId, onComplete, onError }: JobProgressProps) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  
  // Poll for status
  const { data } = api.generation.getJobStatus.useQuery(
    { jobId },
    {
      refetchInterval: (data) => {
        if (!data?.success) return false;
        const state = data.data.state;
        // Stop polling when complete or failed
        return state === 'completed' || state === 'failed' ? false : 1000;
      },
    }
  );
  
  useEffect(() => {
    if (data?.success) {
      setStatus(data.data);
      
      if (data.data.state === 'completed' && onComplete) {
        onComplete(data.data.result);
      } else if (data.data.state === 'failed' && onError) {
        onError(data.data.error || 'Unknown error');
      }
    }
  }, [data, onComplete, onError]);
  
  if (!status) {
    return <div>Loading job status...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {getStatusMessage(status.state)}
        </span>
        <span className="text-sm text-gray-500">
          {status.progress}%
        </span>
      </div>
      
      <Progress value={status.progress} className="h-2" />
      
      {status.state === 'failed' && (
        <div className="text-sm text-red-600">
          Error: {status.error}
        </div>
      )}
      
      {status.state === 'completed' && status.result?.url && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-600">✓ Complete</span>
          <a
            href={status.result.url}
            download
            className="text-sm text-blue-600 hover:underline"
          >
            Download Video
          </a>
        </div>
      )}
    </div>
  );
}

function getStatusMessage(state: string): string {
  switch (state) {
    case 'waiting':
      return 'Waiting in queue...';
    case 'active':
      return 'Processing video...';
    case 'completed':
      return 'Video ready!';
    case 'failed':
      return 'Processing failed';
    default:
      return 'Unknown status';
  }
}
```

### Step 5: Background Event Processing

Create `/src/lib/jobs/workers/eventWorker.ts`:
```typescript
export function createEventWorker() {
  return new Worker<EventProcessingJob>(
    'event-processing',
    async (job: Job<EventProcessingJob>) => {
      const { eventType, payload, timestamp } = job.data;
      
      switch (eventType) {
        case 'scene.created':
          await processSceneCreated(payload);
          break;
          
        case 'project.analyzed':
          await processProjectAnalyzed(payload);
          break;
          
        case 'user.upgraded':
          await processUserUpgraded(payload);
          break;
          
        default:
          console.warn(`Unknown event type: ${eventType}`);
      }
    },
    {
      connection,
      concurrency: 10, // Process many events in parallel
    }
  );
}

// Helper to queue events
export async function queueEvent(
  eventType: string,
  payload: any
): Promise<void> {
  await eventQueue.add(eventType, {
    eventType,
    payload,
    timestamp: new Date(),
  }, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

// Use in router
async function createScene(input: CreateSceneInput) {
  // ... create scene ...
  
  // Queue event (non-blocking)
  queueEvent('scene.created', {
    sceneId: scene.id,
    projectId: scene.projectId,
    userId: ctx.userId,
  }).catch(error => {
    console.error('Failed to queue event:', error);
    // Don't fail the request
  });
  
  return scene;
}
```

### Step 6: Job Dashboard

Create `/src/app/admin/jobs/page.tsx`:
```tsx
export default function JobsDashboard() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('video-rendering');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Background Jobs</h1>
      
      {/* Queue Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <QueueCard
          name="Video Rendering"
          queue="video-rendering"
          stats={queues.find(q => q.name === 'video-rendering')}
          selected={selectedQueue === 'video-rendering'}
          onClick={() => setSelectedQueue('video-rendering')}
        />
        <QueueCard
          name="Storage Upload"
          queue="storage-upload"
          stats={queues.find(q => q.name === 'storage-upload')}
          selected={selectedQueue === 'storage-upload'}
          onClick={() => setSelectedQueue('storage-upload')}
        />
        <QueueCard
          name="Event Processing"
          queue="event-processing"
          stats={queues.find(q => q.name === 'event-processing')}
          selected={selectedQueue === 'event-processing'}
          onClick={() => setSelectedQueue('event-processing')}
        />
      </div>
      
      {/* Job List */}
      <JobList queue={selectedQueue} />
    </div>
  );
}

function QueueCard({ name, queue, stats, selected, onClick }: QueueCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border rounded cursor-pointer transition-colors",
        selected ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
      )}
    >
      <h3 className="font-medium mb-2">{name}</h3>
      {stats ? (
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Active:</span>
            <span className="font-medium">{stats.active}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Waiting:</span>
            <span className="font-medium">{stats.waiting}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Failed:</span>
            <span className="font-medium text-red-600">{stats.failed}</span>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Loading...</div>
      )}
    </div>
  );
}
```

## Testing Plan

### 1. Job Queue Tests
```typescript
describe('Job Queue', () => {
  it('processes video render jobs', async () => {
    const job = await videoQueue.add('test-render', {
      projectId: 'test-123',
      sceneIds: ['scene-1', 'scene-2'],
      outputFormat: 'mp4',
      resolution: '1080p',
      userId: 'user-123',
    });
    
    const completed = await job.waitUntilFinished(videoQueueEvents);
    expect(completed.url).toContain('.mp4');
  });
  
  it('retries failed jobs with backoff', async () => {
    let attempts = 0;
    
    const worker = new Worker('test-queue', async () => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
      return { success: true };
    });
    
    const job = await testQueue.add('retry-test', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 100 },
    });
    
    const result = await job.waitUntilFinished();
    expect(attempts).toBe(3);
    expect(result.success).toBe(true);
  });
});
```

### 2. Progress Tracking Tests
```typescript
it('reports accurate progress', async () => {
  const progressUpdates: number[] = [];
  
  videoQueueEvents.on('progress', ({ jobId, data }) => {
    progressUpdates.push(data);
  });
  
  await processVideoJob(mockJob);
  
  expect(progressUpdates).toEqual(
    expect.arrayContaining([10, 20, 30, 50, 70, 90, 95, 100])
  );
});
```

## Success Criteria

- [ ] API responses return in < 500ms (jobs queued, not processed)
- [ ] Video rendering happens in background
- [ ] Progress updates every second
- [ ] Failed jobs retry 3 times with exponential backoff
- [ ] Job status dashboard shows real-time stats

## Dependencies

- BullMQ for job queuing
- Redis for job storage
- Worker processes for job execution

## Time Estimate

- Queue infrastructure: 1 hour
- Video worker: 1.5 hours
- Progress tracking: 1 hour
- Job dashboard: 0.5 hours
- **Total: 4 hours**