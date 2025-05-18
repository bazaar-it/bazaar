// src/scripts/log-agent/services/redis.service.ts
import { createClient, type RedisClientType } from 'redis';
import { config, redisKeys, generateRunId } from '../config.js';
import { LogEntry, Issue, LogBatch } from '../types.js';

// Create a shared Redis client instance
const client = createClient({
  url: config.redis.url,
});

// Connect to Redis
client.on('error', (err: Error) => console.error('Redis Client Error:', err));
client.connect().catch((err: Error) => {
  console.error('Failed to connect to Redis:', err);
  process.exit(1);
});

/**
 * Redis service for the Log Agent
 * Handles storage and retrieval of logs and issues
 */
export class RedisService {
  // Use the shared client for short operations
  private readonly client = client;

  /**
   * Create a duplicate isolated Redis connection for long-running operations
   * @returns A new Redis client with an isolated connection
   */
  createIsolatedClient() {
    const isolatedClient = client.duplicate();
    isolatedClient.connect().catch((err: Error) => {
      console.error('Failed to connect isolated Redis client:', err);
    });
    return isolatedClient;
  }

  /**
   * Store a batch of logs in Redis
   * @param batch The batch of logs to store
   * @returns The number of logs stored
   */
  async storeLogs(batch: LogBatch): Promise<number> {
    if (!batch.entries.length) return 0;
    
    const key = redisKeys.logs(batch.runId, batch.source);
    
    // Push all log entries as JSON strings in a single operation
    const logStrings = batch.entries.map(log => JSON.stringify(log));
    
    await this.client.rPush(key, logStrings);
    await this.client.expire(key, config.redis.ttl);
    
    // Update the latest run ID
    await this.updateLatestRun(batch.runId);
    
    return batch.entries.length;
  }

  /**
   * Retrieve logs from Redis
   * @param runId The run ID to retrieve logs for
   * @param source Optional source filter
   * @param filter Optional regex filter
   * @param limit Maximum number of logs to retrieve
   * @param offset Starting position for retrieval
   * @returns Array of log entries and total count
   */
  async getLogs(
    runId: string, 
    source?: string, 
    filter?: string, 
    limit = 100, 
    offset = 0
  ): Promise<{ logs: LogEntry[]; total: number }> {
    // If runId is 'latest', get the most recent runId
    if (runId === 'latest') {
      const latestRunId = await this.getLatestRun();
      if (!latestRunId) {
        return { logs: [], total: 0 };
      }
      runId = latestRunId;
    }
    
    // Get all keys for this runId
    let keys: string[];
    if (source) {
      keys = [redisKeys.logs(runId, source)];
    } else {
      const pattern = redisKeys.logs(runId, '*');
      keys = await this.client.keys(pattern);
    }
    
    if (keys.length === 0) {
      return { logs: [], total: 0 };
    }
    
    // Pipeline for efficient batch operations
    const pipeline = this.client.multi();
    
    // Get total counts for all keys
    keys.forEach(key => {
      pipeline.lLen(key);
    });
    
    // Get logs from each key with pagination
    keys.forEach(key => {
      pipeline.lRange(key, offset, offset + limit - 1);
    });
    
    // Execute all commands
    const results = await pipeline.exec();
    if (!results) {
      return { logs: [], total: 0 };
    }
    
    // Process results
    const counts = results.slice(0, keys.length) as number[];
    const logArrays = results.slice(keys.length) as string[][];
    
    // Calculate total logs
    const total = counts.reduce((sum, count) => sum + count, 0);
    
    // Flatten and parse all logs
    let allLogs: LogEntry[] = [];
    logArrays.forEach(logArray => {
      const parsedLogs = logArray
        .map(logStr => {
          try {
            return JSON.parse(logStr) as LogEntry;
          } catch (e) {
            console.error('Failed to parse log entry:', e);
            return null;
          }
        })
        .filter((log): log is LogEntry => log !== null);
      
      allLogs = [...allLogs, ...parsedLogs];
    });
    
    // Apply regex filter if provided
    if (filter && filter.trim() !== '') {
      try {
        const regex = new RegExp(filter, 'i');
        allLogs = allLogs.filter(log => 
          regex.test(log.message) || 
          (log.metadata && regex.test(JSON.stringify(log.metadata)))
        );
      } catch (e) {
        console.error('Invalid regex filter:', e);
      }
    }
    
    // Sort by timestamp
    allLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return {
      logs: allLogs.slice(0, limit),
      total,
    };
  }

  /**
   * Store an issue in Redis
   * @param issue The issue to store
   * @returns Whether the issue was newly created or updated
   */
  async storeIssue(issue: Issue): Promise<{ isNew: boolean; count: number }> {
    const key = redisKeys.issues(issue.runId);
    
    // Get existing issues
    const existingIssuesStr = await this.client.get(key);
    const issues: Issue[] = existingIssuesStr ? JSON.parse(existingIssuesStr) : [];
    
    // Check if issue already exists
    const existingIndex = issues.findIndex(i => i.fingerprint === issue.fingerprint);
    
    if (existingIndex >= 0) {
      // Update existing issue
      const existingIssue = issues[existingIndex];
      issues[existingIndex] = {
        ...existingIssue,
        count: existingIssue.count + 1,
        lastSeen: issue.lastSeen,
        // Keep the original notified status
        notified: existingIssue.notified,
        notifiedAt: existingIssue.notifiedAt,
      };
      
      await this.client.set(key, JSON.stringify(issues), {
        EX: config.redis.ttl,
      });
      
      return { isNew: false, count: issues[existingIndex].count };
    } else {
      // Add new issue
      issues.push(issue);
      
      await this.client.set(key, JSON.stringify(issues), {
        EX: config.redis.ttl,
      });
      
      return { isNew: true, count: 1 };
    }
  }

  /**
   * Get issues from Redis
   * @param runId The run ID to retrieve issues for
   * @param source Optional source filter
   * @param level Optional severity level filter
   * @param limit Maximum number of issues to retrieve
   * @param offset Starting position for retrieval
   * @returns Array of issues and total count
   */
  async getIssues(
    runId: string,
    source?: string,
    level?: string,
    limit = 50,
    offset = 0
  ): Promise<{ issues: Issue[]; total: number }> {
    // If runId is 'latest', get the most recent runId
    if (runId === 'latest') {
      const latestRunId = await this.getLatestRun();
      if (!latestRunId) {
        return { issues: [], total: 0 };
      }
      runId = latestRunId;
    }
    
    const key = redisKeys.issues(runId);
    
    // Get issues
    const issuesStr = await this.client.get(key);
    if (!issuesStr) {
      return { issues: [], total: 0 };
    }
    
    let issues: Issue[] = JSON.parse(issuesStr);
    
    // Apply filters
    if (source) {
      issues = issues.filter(issue => issue.source === source);
    }
    
    if (level) {
      issues = issues.filter(issue => issue.level === level);
    }
    
    // Sort by count (descending) and then by lastSeen (most recent first)
    issues.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
    
    return {
      issues: issues.slice(offset, offset + limit),
      total: issues.length,
    };
  }

  /**
   * Mark an issue as notified
   * @param runId The run ID
   * @param fingerprint The issue fingerprint
   * @returns Whether the update was successful
   */
  async markIssueNotified(runId: string, fingerprint: string): Promise<boolean> {
    const key = redisKeys.issues(runId);
    
    // Get existing issues
    const existingIssuesStr = await this.client.get(key);
    if (!existingIssuesStr) return false;
    
    const issues: Issue[] = JSON.parse(existingIssuesStr);
    
    // Find and update the issue
    const index = issues.findIndex(i => i.fingerprint === fingerprint);
    if (index === -1) return false;
    
    issues[index].notified = true;
    issues[index].notifiedAt = new Date().toISOString();
    
    await this.client.set(key, JSON.stringify(issues), {
      EX: config.redis.ttl,
    });
    
    return true;
  }

  /**
   * Store a callback URL for a run ID
   * @param runId The run ID
   * @param callbackUrl The callback URL for notifications
   */
  async storeCallback(runId: string, callbackUrl: string): Promise<void> {
    const key = redisKeys.callback(runId);
    await this.client.set(key, callbackUrl, {
      EX: config.redis.ttl,
    });
  }

  /**
   * Get the callback URL for a run ID
   * @param runId The run ID
   * @returns The callback URL or null if not found
   */
  async getCallback(runId: string): Promise<string | null> {
    const key = redisKeys.callback(runId);
    return await this.client.get(key);
  }

  /**
   * Clear all logs and issues for a run ID
   * @param runId The run ID to clear
   * @returns Whether the operation was successful
   */
  async clearRun(runId: string): Promise<boolean> {
    try {
      // Get all keys for this runId
      const logPattern = redisKeys.logs(runId, '*');
      const logKeys = await this.client.keys(logPattern);
      
      // Add issue and callback keys
      const issueKey = redisKeys.issues(runId);
      const callbackKey = redisKeys.callback(runId);
      
      // Delete all keys in a pipeline
      if (logKeys.length > 0 || issueKey || callbackKey) {
        const pipeline = this.client.multi();
        
        logKeys.forEach((key: string) => {
          pipeline.del(key);
        });
        
        pipeline.del(issueKey);
        pipeline.del(callbackKey);
        
        await pipeline.exec();
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing run:', error);
      return false;
    }
  }

  /**
   * Update the latest run ID
   * @param runId The run ID to set as latest
   */
  async updateLatestRun(runId: string): Promise<void> {
    const key = redisKeys.latestRun();
    await this.client.set(key, runId, {
      EX: config.redis.ttl,
    });
  }

  /**
   * Get the latest run ID
   * @returns The latest run ID or null if not found
   */
  async getLatestRun(): Promise<string | null> {
    const key = redisKeys.latestRun();
    return await this.client.get(key);
  }

  /**
   * Start a new run, optionally with a specific ID
   * @param newRunId Optional custom run ID
   * @param callbackUrl Optional callback URL for notifications
   * @returns Object with previous and new run IDs
   */
  async startNewRun(newRunId?: string, callbackUrl?: string): Promise<{ previousRunId: string | null; newRunId: string }> {
    // Get the current latest run ID
    const previousRunId = await this.getLatestRun();
    
    // Generate or use provided run ID
    const runId = newRunId || generateRunId();
    
    // Set as the latest run
    await this.updateLatestRun(runId);
    
    // Store callback URL if provided
    if (callbackUrl) {
      await this.storeCallback(runId, callbackUrl);
    }
    
    return {
      previousRunId,
      newRunId: runId,
    };
  }

  /**
   * Close the Redis connection gracefully
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Export singleton instance
export const redisService = new RedisService(); 