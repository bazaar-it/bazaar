// src/scripts/log-agent/server.ts

import * as dotenv from 'dotenv';
import express from 'express';
import * as promBundle from 'express-prom-bundle';
import { config, generateRunId } from './config.js';
import { redisService } from './services/redis.service.js';
import { openaiService } from './services/openai.service.js';
import { workerService } from './services/worker.service.js';
import { LogBatch, LogEntry, QnaRequest, ClearRequest } from './types.js';

// Load environment variables
dotenv.config();

// Create Express app
export const app = express();

// Setup Prometheus metrics
const metricsMiddleware = promBundle.default({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { app: 'log-agent' },
  promClient: {
    collectDefaultMetrics: {
      timestamps: true,
    },
  },
});

// Add middleware
app.use(metricsMiddleware);
app.use(express.json({ limit: config.server.bodyLimit }));

// Add basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      worker: await workerService.getMetrics(),
      openai: openaiService.getMetrics(),
    };
    
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Log ingestion endpoint
app.post('/ingest', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const batch = req.body as LogBatch;
    
    // Validate batch
    if (!batch || !batch.entries || !batch.runId || !batch.source) {
      return res.status(400).json({ error: 'Invalid log batch format' });
    }
    
    // Check line count
    if (batch.entries.length > config.server.maxLines) {
      return res.status(400).json({
        error: `Batch exceeds maximum line count (${config.server.maxLines})`,
        retry: true,
      });
    }
    
    // Queue for processing
    const jobId = await workerService.addLogBatch(batch);
    
    const processingTime = Date.now() - startTime;
    
    return res.status(202).json({
      message: `Batch of ${batch.entries.length} logs queued for processing`,
      runId: batch.runId,
      source: batch.source,
      jobId,
      processingTime,
    });
  } catch (error: any) {
    console.error('Error processing log batch:', error);
    
    return res.status(500).json({
      error: 'Failed to process log batch',
      message: error.message,
    });
  }
});

// Log querying endpoint
app.post('/qna', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const request = req.body as QnaRequest;
    
    // Validate request
    if (!request || !request.query) {
      return res.status(400).json({ error: 'Invalid QnA request format' });
    }
    
    // Default to 'latest' if runId not provided
    const runId = request.runId || 'latest';
    
    // Get logs for analysis
    const { logs } = await redisService.getLogs(
      runId,
      undefined, // All sources
      undefined, // No filter
      config.openai.maxTokens // Limit logs to avoid token limits
    );
    
    if (logs.length === 0) {
      return res.status(404).json({
        error: 'No logs found for the specified runId',
        runId,
      });
    }
    
    // Analyze with OpenAI
    const response = await openaiService.analyzeLogs(
      { ...request, runId },
      logs
    );
    
    const processingTime = Date.now() - startTime;
    
    // Return analysis
    return res.status(200).json({
      ...response,
      logCount: logs.length,
      processingTime,
    });
  } catch (error: any) {
    console.error('Error analyzing logs:', error);
    
    return res.status(500).json({
      error: 'Failed to analyze logs',
      message: error.message,
    });
  }
});

// Get raw logs endpoint
app.get('/raw', async (req, res) => {
  try {
    const runId = req.query.runId as string || 'latest';
    const source = req.query.source as string | undefined;
    const filter = req.query.filter as string | undefined;
    const limit = parseInt(req.query.limit as string || '100', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    
    // Get logs
    const result = await redisService.getLogs(
      runId,
      source,
      filter,
      limit,
      offset
    );
    
    return res.status(200).json({
      logs: result.logs,
      total: result.total,
      runId,
      source: source || 'all',
      filter: filter || null,
      limit,
      offset,
      hasMore: result.total > offset + result.logs.length,
    });
  } catch (error: any) {
    console.error('Error fetching raw logs:', error);
    
    return res.status(500).json({
      error: 'Failed to fetch logs',
      message: error.message,
    });
  }
});

// Get issues endpoint
app.get('/issues', async (req, res) => {
  try {
    const runId = req.query.runId as string || 'latest';
    const source = req.query.source as string | undefined;
    const level = req.query.level as string | undefined;
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    
    // Get issues
    const result = await redisService.getIssues(
      runId,
      source,
      level,
      limit,
      offset
    );
    
    return res.status(200).json({
      issues: result.issues,
      total: result.total,
      runId,
      source: source || 'all',
      level: level || 'all',
      limit,
      offset,
      hasMore: result.total > offset + result.issues.length,
    });
  } catch (error: any) {
    console.error('Error fetching issues:', error);
    
    return res.status(500).json({
      error: 'Failed to fetch issues',
      message: error.message,
    });
  }
});

// Clear logs and start new run
app.post('/control/clear', async (req, res) => {
  try {
    const request = req.body as ClearRequest || {};
    
    // Get (optional) previous runId before starting new run
    const previousRunId = await redisService.getLatestRun();
    
    // Clear previous run if it exists
    if (previousRunId) {
      await redisService.clearRun(previousRunId);
    }
    
    // Start new run
    const newRun = await redisService.startNewRun(
      request.newRunId || generateRunId(),
      request.callback
    );
    
    // Reset OpenAI metrics for the new run
    openaiService.resetMetrics();
    
    return res.status(200).json({
      message: 'Started new log run',
      previousRunId: newRun.previousRunId,
      newRunId: newRun.newRunId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error clearing logs:', error);
    
    return res.status(500).json({
      error: 'Failed to clear logs',
      message: error.message,
    });
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.info('Shutting down gracefully...');
  
  try {
    // Close workers first
    await workerService.close();
    
    // Then close Redis connection
    await redisService.close();
    
    console.info('Shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server if not running under Jest
if (!process.env.JEST_WORKER_ID) {
  const PORT = config.port;
  app.listen(PORT, () => {
    console.info(`✅ Log Agent server running on port ${PORT}`);
    console.info(`📊 Metrics available at http://localhost:${PORT}/metrics`);
    console.info(`🚦 Health check at http://localhost:${PORT}/health`);
  });
}
