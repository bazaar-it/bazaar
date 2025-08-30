/**
 * Long-Running Task Service
 * Handles operations that exceed Vercel's timeout limits
 * Uses a polling-based architecture with progress tracking
 */

import { db } from '~/server/db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface LongRunningTask {
  id: string;
  projectId: string;
  userId: string;
  type: 'generation' | 'export' | 'bulk_operation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

class LongRunningTaskService {
  private tasks: Map<string, LongRunningTask> = new Map();

  /**
   * Start a new long-running task
   * Returns immediately with a task ID for polling
   */
  async createTask(params: {
    projectId: string;
    userId: string;
    type: LongRunningTask['type'];
    metadata?: Record<string, any>;
  }): Promise<string> {
    const taskId = randomUUID();
    
    const task: LongRunningTask = {
      id: taskId,
      projectId: params.projectId,
      userId: params.userId,
      type: params.type,
      status: 'pending',
      progress: 0,
      metadata: params.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(taskId, task);
    
    // In production, store in database
    // await db.insert(longRunningTasks).values(task);
    
    return taskId;
  }

  /**
   * Process task in background (called by worker/cron)
   */
  async processTask(taskId: string, processor: (task: LongRunningTask) => Promise<void>): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    try {
      task.status = 'processing';
      task.updatedAt = new Date();
      
      // Execute the actual processing
      await processor(task);
      
      task.status = 'completed';
      task.progress = 100;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      task.updatedAt = new Date();
      this.tasks.set(taskId, task);
    }
  }

  /**
   * Update task progress (called during processing)
   */
  async updateProgress(taskId: string, progress: number, metadata?: Partial<LongRunningTask>): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = Math.min(100, Math.max(0, progress));
    task.updatedAt = new Date();
    
    if (metadata) {
      Object.assign(task, metadata);
    }
    
    this.tasks.set(taskId, task);
  }

  /**
   * Get task status (for polling)
   */
  async getTaskStatus(taskId: string): Promise<LongRunningTask | null> {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Clean up old completed/failed tasks
   */
  async cleanupOldTasks(olderThanHours: number = 24): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.updatedAt < cutoff
      ) {
        this.tasks.delete(taskId);
      }
    }
  }
}

export const longRunningTaskService = new LongRunningTaskService();