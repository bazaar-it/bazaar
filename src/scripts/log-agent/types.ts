/**
 * Core types for the Log Agent service
 */

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  taskId?: string;
  agentId?: string;
  runId: string;
  metadata?: Record<string, any>;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'silly';

export interface LogBatch {
  entries: LogEntry[];
  runId: string;
  source: string;
  timestamp?: string;
}

export interface Issue {
  fingerprint: string;
  type: string;
  level: LogLevel;
  summary: string;
  source: string;
  count: number;
  firstSeen: string; // ISO string
  lastSeen: string; // ISO string
  notified: boolean;
  notifiedAt?: string; // ISO string for debouncing
  runId: string;
  relatedLogs?: string[]; // Array of log indices for context
}

export interface LogPattern {
  id: string;
  name: string;
  regex: RegExp;
  level: LogLevel;
  type: string;
  fingerprint: (match: RegExpMatchArray, log: LogEntry) => string;
  summary: (match: RegExpMatchArray, log: LogEntry) => string;
}

export interface QnaRequest {
  query: string;
  runId: string;
  maxTokens?: number;
}

export interface QnaResponse {
  question: string;
  answer: string;
  runId: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface RawLogsRequest {
  runId: string;
  source?: string;
  filter?: string;
  limit?: number;
  offset?: number;
}

export interface RawLogsResponse {
  logs: LogEntry[];
  total: number;
  runId: string;
  hasMore: boolean;
}

export interface IssuesRequest {
  runId: string;
  source?: string;
  level?: LogLevel;
  limit?: number;
  offset?: number;
}

export interface IssuesResponse {
  issues: Issue[];
  total: number;
  runId: string;
  hasMore: boolean;
}

export interface ClearRequest {
  newRunId?: string; // Optional custom runId
  callback?: string; // Optional callback URL for notifications
}

export interface ClearResponse {
  previousRunId?: string;
  newRunId: string;
  timestamp: string; // ISO string
}

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
  question?: string;
}

export interface MetricsData {
  logsIngested: number;
  issuesDetected: number;
  openaiTokensPrompt: number;
  openaiTokensCompletion: number;
  ingestLatency: number[];
  qnaLatency: number[];
}

export interface NotificationPayload {
  issue: Issue;
  runId: string;
  timestamp: string;
}

export interface IssueRecord {
  id: string;
  fingerprint: string;
  message: string;
  level: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  runId: string;
  source: string;
  meta?: Record<string, any>;
}

export interface QnaResponse {
  question: string;
  answer: string;
  context?: string;
}

export interface LogAgentConfig {
  redisUrl: string;
  port: number;
  openaiApiKey?: string;
  openaiModel?: string;
  maxTokens?: number;
  issueThreshold?: number;
} 