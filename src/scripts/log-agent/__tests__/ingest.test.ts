// src/scripts/log-agent/__tests__/ingest.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { app } from '../server';
import type { LogBatch } from '../types';
import http from 'http';

// Mock worker service
jest.mock('../services/worker.service.js', () => ({
  workerService: {
    addLogBatch: jest.fn().mockResolvedValue('job-123'),
    getMetrics: jest.fn(),
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

describe('/ingest endpoint', () => {
  it('queues log batch and returns 202', async () => {
    const batch: LogBatch = {
      runId: 'test-run',
      source: 'test-source',
      entries: [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'hello world',
          runId: 'test-run',
          source: 'test-source',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });

    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.jobId).toBe('job-123');
    expect(json.runId).toBe('test-run');
  });

  it('rejects invalid batch', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});
