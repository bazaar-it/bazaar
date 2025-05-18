// src/scripts/log-agent/config.ts
import dotenv from 'dotenv';

// Define LogAgentConfig interface directly in this file to avoid import issues
export interface LogAgentConfig {
  port: number;
  redis: {
    url: string;
    prefix: string;
    ttl: number; // In seconds
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    timeout: number; // In milliseconds
  };
  worker: {
    concurrency: number;
    maxJobsPerWorker: number;
  };
  patterns: {
    issueThreshold: number; // Min count before notification
    debounceWindow: number; // In milliseconds
  };
  server: {
    bodyLimit: string; // e.g., '200kb'
    maxLines: number; // Max lines per batch
  };
}

// Load environment variables
dotenv.config();

const DEFAULT_CONFIG: LogAgentConfig = {
  port: parseInt(process.env.LOG_AGENT_PORT || '3002', 10),
  redis: {
    url: process.env.LOG_AGENT_REDIS_URL || 'redis://localhost:6379',
    prefix: 'logagent:',
    ttl: 24 * 60 * 60, // 24 hours in seconds
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.LOG_AGENT_OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.LOG_AGENT_MAX_TOKENS || '7000', 10),
    timeout: parseInt(process.env.LOG_AGENT_OPENAI_TIMEOUT || '30000', 10),
  },
  worker: {
    concurrency: parseInt(process.env.LOG_AGENT_WORKER_CONCURRENCY || '3', 10),
    maxJobsPerWorker: parseInt(process.env.LOG_AGENT_MAX_JOBS_PER_WORKER || '50', 10),
  },
  patterns: {
    issueThreshold: parseInt(process.env.LOG_AGENT_ISSUE_THRESHOLD || '3', 10),
    debounceWindow: parseInt(process.env.LOG_AGENT_DEBOUNCE_WINDOW || '300000', 10), // 5 minutes
  },
  server: {
    bodyLimit: process.env.LOG_AGENT_BODY_LIMIT || '200kb',
    maxLines: parseInt(process.env.LOG_AGENT_MAX_LINES || '10000', 10),
  },
};

// Validate config
if (!DEFAULT_CONFIG.openai.apiKey) {
  console.warn('⚠️ No OpenAI API key found. LLM analysis will be unavailable.');
}

// Export configuration with validation
export const config: LogAgentConfig = DEFAULT_CONFIG;

// Helper function to generate a unique runId
export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Helper function to get Redis keys for various data
export const redisKeys = {
  logs: (runId: string, source: string) => `${config.redis.prefix}logs:${runId}:${source}`,
  issues: (runId: string) => `${config.redis.prefix}issues:${runId}`,
  callback: (runId: string) => `${config.redis.prefix}callback:${runId}`,
  latestRun: () => `${config.redis.prefix}latest_run`,
}; 