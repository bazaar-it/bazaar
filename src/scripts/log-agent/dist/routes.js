// src/scripts/log-agent/routes.js
import { Router } from 'express';
import { redisService } from './services/redis.service.js';
import { openaiService } from './services/openai.service.js';
import { workerService } from './services/worker.service.js';
import { generateRunId } from './config.js';
const router = Router();
// Add basic health check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Add metrics endpoint
router.get('/metrics', async (req, res) => {
    try {
        const metricsData = {
            worker: await workerService.getMetrics(),
            openai: openaiService.getMetrics(),
        };
        res.status(200).json(metricsData);
    }
    catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});
// Log ingestion endpoint
router.post('/ingest', async (req, res) => {
    console.log('[LOG_AGENT_INGESTION] Received POST request to /ingest');
    const startTime = Date.now();
    try {
        const batch = req.body;
        console.log('[LOG_AGENT_INGESTION] Batch received:', JSON.stringify(batch, null, 2).substring(0, 500));
        if (!batch || !batch.entries || !batch.runId || !batch.source) {
            return res.status(400).json({ error: 'Invalid log batch format' });
        }
        // Additional validation can be added here
        const jobId = await workerService.addLogBatch(batch);
        const processingTime = Date.now() - startTime;
        return res.status(202).json({
            message: `Batch of ${batch.entries.length} logs queued for processing`,
            runId: batch.runId,
            source: batch.source,
            jobId,
            processingTime,
        });
    }
    catch (error) {
        console.error('Error processing log batch:', error);
        return res.status(500).json({
            error: 'Failed to process log batch',
            message: error.message,
        });
    }
});
// Log querying endpoint
router.post('/qna', async (req, res) => {
    const startTime = Date.now();
    try {
        const requestBody = req.body;
        if (!requestBody || !requestBody.query) {
            return res.status(400).json({ error: 'Invalid QnA request format' });
        }
        const runId = requestBody.runId || 'latest';
        const { logs } = await redisService.getLogs(runId, undefined, undefined, requestBody.maxTokens);
        if (logs.length === 0) {
            return res.status(404).json({
                error: 'No logs found for the specified runId',
                runId,
            });
        }
        const responseData = await openaiService.analyzeLogs({ ...requestBody, runId }, logs);
        const processingTime = Date.now() - startTime;
        return res.status(200).json({
            ...responseData,
            logCount: logs.length,
            processingTime,
        });
    }
    catch (error) {
        console.error('Error analyzing logs:', error);
        return res.status(500).json({
            error: 'Failed to analyze logs',
            message: error.message,
        });
    }
});
// Get raw logs endpoint
router.get('/raw', async (req, res) => {
    try {
        const runId = req.query.runId || 'latest';
        const source = req.query.source;
        const filter = req.query.filter;
        const limit = parseInt(req.query.limit || '100', 10);
        const offset = parseInt(req.query.offset || '0', 10);
        const result = await redisService.getLogs(runId, source, filter, limit, offset);
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
    }
    catch (error) {
        console.error('Error fetching raw logs:', error);
        return res.status(500).json({
            error: 'Failed to fetch logs',
            message: error.message,
        });
    }
});
// Get issues endpoint
router.get('/issues', async (req, res) => {
    try {
        const runId = req.query.runId || 'latest';
        const source = req.query.source;
        const level = req.query.level;
        const limit = parseInt(req.query.limit || '50', 10);
        const offset = parseInt(req.query.offset || '0', 10);
        const result = await redisService.getIssues(runId, source, level, limit, offset);
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
    }
    catch (error) {
        console.error('Error fetching issues:', error);
        return res.status(500).json({
            error: 'Failed to fetch issues',
            message: error.message,
        });
    }
});
// Clear logs and start new run
router.post('/control/clear', async (req, res) => {
    try {
        const requestBody = req.body || {};
        const previousRunId = await redisService.getLatestRun();
        if (previousRunId) {
            await redisService.clearRun(previousRunId);
        }
        const newRun = await redisService.startNewRun(requestBody.newRunId || generateRunId(), requestBody.callback);
        openaiService.resetMetrics();
        return res.status(200).json({
            message: 'Started new log run',
            previousRunId: newRun.previousRunId,
            newRunId: newRun.newRunId,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error clearing logs:', error);
        return res.status(500).json({
            error: 'Failed to clear logs',
            message: error.message,
        });
    }
});
export default router;
