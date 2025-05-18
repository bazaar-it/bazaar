// src/scripts/log-agent/__tests__/qna.test.ts
import { describe, it, expect, beforeAll, afterAll, jest, beforeEach } from '@jest/globals';
import { app } from '../server';
import type { LogEntry } from '../types';
import http from 'http';

const mockGetLogs = jest.fn();
const mockAnalyzeLogs = jest.fn();

jest.mock('../services/redis.service.js', () => ({
  redisService: {
    getLogs: mockGetLogs,
    getLatestRun: jest.fn(),
  },
}));

jest.mock('../services/openai.service.js', () => ({
  openaiService: {
    analyzeLogs: mockAnalyzeLogs,
    getMetrics: jest.fn(),
    resetMetrics: jest.fn(),
  },
}));

jest.mock('../services/worker.service.js', () => ({
  workerService: {
    getMetrics: jest.fn(),
    addLogBatch: jest.fn(),
  },
}));

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address() as any;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('/qna endpoint', () => {
  it('returns analysis for provided logs', async () => {
    const logs: LogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'hello',
        runId: 'abc',
        source: 'test',
      },
    ];
    mockGetLogs.mockResolvedValue({ logs, total: logs.length });
    mockAnalyzeLogs.mockResolvedValue({
      answer: 'analysis',
      runId: 'abc',
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
    });

    const res = await fetch(`${baseUrl}/qna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'what', runId: 'abc' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.answer).toBe('analysis');
    expect(json.logCount).toBe(1);
  });

  it('returns 404 when no logs are found', async () => {
    mockGetLogs.mockResolvedValue({ logs: [], total: 0 });

    const res = await fetch(`${baseUrl}/qna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test', runId: 'abc' }),
    });

    expect(res.status).toBe(404);
  });
});
