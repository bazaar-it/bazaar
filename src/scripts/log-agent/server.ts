// @ts-nocheck
// src/scripts/log-agent/server.ts

import * as dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import * as promBundle from 'express-prom-bundle';
import { config, generateRunId } from './config.js';
import { redisService } from './services/redis.service.js';
import { openaiService } from './services/openai.service.js';
import { workerService } from './services/worker.service.js';
import { type LogBatch, type QnaRequest, type ClearRequest } from './types.js';

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

// DO NOT Register external routes - define them directly below
// app.use(routes);

// Add basic health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metricsData = {
      worker: await workerService.getMetrics(),
      openai: openaiService.getMetrics(),
    };
    res.status(200).json(metricsData);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Log ingestion endpoint
app.post('/ingest', async (req: Request, res: Response) => {
  console.log('[LOG_AGENT_INGESTION] Received POST request to /ingest'); 
  const startTime = Date.now();
  try {
    const batch = req.body as LogBatch;
    console.log('[LOG_AGENT_INGESTION] Batch received:', JSON.stringify(batch, null, 2).substring(0, 500)); 
    if (!batch?.entries || !batch.runId || !batch.source) {
      return res.status(400).json({ error: 'Invalid log batch format' });
    }
    if (batch.entries.length > config.server.maxLines) {
      return res.status(400).json({
        error: `Batch exceeds maximum line count (${config.server.maxLines})`,
        retry: true,
      });
    }
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
app.post('/qna', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const requestBody = req.body as QnaRequest;
    if (!requestBody?.query) {
      return res.status(400).json({ error: 'Invalid QnA request format' });
    }
    const runId = requestBody.runId || 'latest';
    const { logs } = await redisService.getLogs(
      runId,
      undefined, 
      undefined, 
      config.openai.maxTokens
    );
    if (logs.length === 0) {
      return res.status(404).json({
        error: 'No logs found for the specified runId',
        runId,
      });
    }
    const responseData = await openaiService.analyzeLogs(
      { ...requestBody, runId },
      logs
    );
    const processingTime = Date.now() - startTime;
    return res.status(200).json({
      ...responseData,
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
app.get('/raw', async (req: Request, res: Response) => {
  try {
    const runId = req.query.runId as string || 'latest';
    const source = req.query.source as string | undefined;
    const filter = req.query.filter as string | undefined;
    const limit = parseInt(req.query.limit as string || '100', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
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
app.get('/issues', async (req: Request, res: Response) => {
  try {
    const runId = req.query.runId as string || 'latest';
    const source = req.query.source as string | undefined;
    const level = req.query.level as string | undefined;
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
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
app.post('/control/clear', async (req: Request, res: Response) => {
  try {
    const requestBody = req.body as ClearRequest || {};
    const previousRunId = await redisService.getLatestRun();
    if (previousRunId) {
      await redisService.clearRun(previousRunId);
    }
    const newRun = await redisService.startNewRun(
      requestBody.newRunId || generateRunId(),
      requestBody.callback
    );
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
  console.info('🚦 Shutting down Log Agent server gracefully...');
  try {
    console.log('Stopping worker service...');
    await workerService.close();
    console.log('Closing Redis connections...');
    await redisService.close();
    console.info('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

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
