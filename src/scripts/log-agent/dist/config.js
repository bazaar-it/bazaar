import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
const DEFAULT_CONFIG = {
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
export const config = DEFAULT_CONFIG;
// Helper function to generate a unique runId
export function generateRunId() {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
// Helper function to get Redis keys for various data
export const redisKeys = {
    logs: (runId, source) => `${config.redis.prefix}logs:${runId}:${source}`,
    issues: (runId) => `${config.redis.prefix}issues:${runId}`,
    callback: (runId) => `${config.redis.prefix}callback:${runId}`,
    latestRun: () => `${config.redis.prefix}latest_run`,
};
