// src/scripts/log-agent/config.js
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

/**
 * Generate a unique run ID for log grouping
 * @param {string} [prefix='run'] - Optional prefix for the run ID
 * @returns {string} Generated run ID
 */
export function generateRunId(prefix = 'run') {
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .slice(0, 12);
  
  const uuid = randomUUID().slice(0, 8);
  return `${prefix}-${timestamp}-${uuid}`;
}

/**
 * Configuration for the Log Agent
 */
export const config = {
  port: parseInt(process.env.LOG_AGENT_PORT || '3002', 10),
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: 'log-agent:',
    ttl: 60 * 60 * 24 * 7, // 7 days
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.MAX_TOKENS || '8000', 10),
    timeout: 60000, // 60 seconds
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
    maxJobsPerWorker: parseInt(process.env.MAX_JOBS_PER_WORKER || '1000', 10),
  },
  patterns: {
    issueThreshold: parseInt(process.env.ISSUE_THRESHOLD || '2', 10),
    debounceWindow: parseInt(process.env.ISSUE_DEBOUNCE_MS || '3600000', 10), // 1 hour
  },
  server: {
    bodyLimit: process.env.REQUEST_BODY_LIMIT || '5mb',
    maxLines: parseInt(process.env.MAX_LOG_LINES || '1000', 10),
  },
};
