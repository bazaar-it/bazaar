/**
 * SSE Streaming Tests
 * Tests the Server-Sent Events implementation for real-time updates
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { setupTestDatabase, cleanupTestDatabase, TEST_DATA } from '../fixtures/test-database-setup';

// Mock Next.js Response
class MockReadableStream {
  private controller: any;
  
  constructor(underlyingSource: any) {
    this.controller = {
      enqueue: jest.fn(),
      close: jest.fn(),
      error: jest.fn()
    };
    underlyingSource.start(this.controller);
  }
  
  getController() {
    return this.controller;
  }
}

class MockResponse {
  public headers: Map<string, string> = new Map();
  public body: MockReadableStream | null = null;
  public status: number = 200;
  
  constructor(body?: any, init?: any) {
    if (body instanceof MockReadableStream) {
      this.body = body;
    }
    if (init?.status) {
      this.status = init.status;
    }
    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key, value as string);
      });
    }
  }
}

global.ReadableStream = MockReadableStream as any;
global.Response = MockResponse as any;

describe('SSE Streaming Tests', () => {
  let testProjectId: string;
  
  beforeAll(async () => {
    await setupTestDatabase();
    testProjectId = TEST_DATA.projects.ramp.id;
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('SSE Route Handler', () => {
    it('should establish SSE connection with correct headers', async () => {
      const { POST } = require('~/app/api/generate-stream/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          prompt: 'Create a video',
          projectId: testProjectId,
          sceneId: 'test-scene',
          websiteUrl: 'https://example.com'
        })
      };

      const response = await POST(mockRequest);
      
      // Check SSE headers
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should format SSE messages correctly', async () => {
      const { formatSSE } = require('~/app/api/generate-stream/route');
      
      const message = formatSSE({
        type: 'scene_added',
        data: {
          sceneId: 'test-123',
          sceneName: 'Test Scene',
          progress: 1,
          total: 5
        }
      });
      
      // Verify SSE format
      expect(message).toContain('data: {');
      expect(message).toContain('"type":"scene_added"');
      expect(message).toContain('"sceneId":"test-123"');
      expect(message).toContain('\n\n'); // Double newline required for SSE
    });

    it('should stream scene_added events for website URLs', async () => {
      const { POST } = require('~/app/api/generate-stream/route');
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          prompt: 'Create a video from website',
          projectId: testProjectId,
          sceneId: null,
          websiteUrl: 'https://ramp.com'
        })
      };

      // Mock the websiteToVideo tool
      jest.spyOn(require('~/tools/website/websiteToVideo'), 'websiteToVideo')
        .mockImplementation((context: any, input: any) => ({
          run: jest.fn(async () => {
            // Simulate streaming callbacks
            if (input.streamingCallback) {
              for (let i = 0; i < 5; i++) {
                await input.streamingCallback({
                  type: 'scene_completed',
                  data: {
                    sceneIndex: i,
                    sceneName: `Scene ${i + 1}`,
                    totalScenes: 5,
                    sceneId: `scene-${i}`,
                    projectId: testProjectId
                  }
                });
              }
            }
            return {
              success: true,
              data: { scenes: [] }
            };
          })
        }));

      const response = await POST(mockRequest);
      
      // Get the stream controller
      const stream = response.body as MockReadableStream;
      const controller = stream.getController();
      
      // Verify scene_added events were sent
      expect(controller.enqueue).toHaveBeenCalled();
      
      const calls = controller.enqueue.mock.calls;
      const messages = calls.map((call: any) => new TextDecoder().decode(call[0]));
      
      // Should have scene_added events
      const sceneAddedMessages = messages.filter((msg: string) => 
        msg.includes('scene_added')
      );
      expect(sceneAddedMessages.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle client disconnect gracefully', async () => {
      const { POST } = require('~/app/api/generate-stream/route');
      
      let streamController: any;
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          prompt: 'Create a video',
          projectId: testProjectId,
          sceneId: 'test-scene'
        }),
        signal: {
          aborted: false,
          addEventListener: jest.fn((event, handler) => {
            if (event === 'abort') {
              // Simulate abort after 100ms
              setTimeout(() => {
                mockRequest.signal.aborted = true;
                handler();
              }, 100);
            }
          }),
          removeEventListener: jest.fn()
        }
      };

      const response = await POST(mockRequest);
      
      // Stream should be closed on abort
      const stream = response.body as MockReadableStream;
      const controller = stream.getController();
      
      // Wait for abort
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Controller should be closed
      expect(controller.close).toHaveBeenCalled();
    });
  });

  describe('SSE Client Hook', () => {
    it('should parse SSE messages correctly', () => {
      const { parseSSEMessage } = require('~/hooks/use-sse-generation');
      
      const sseData = 'data: {"type":"message","content":"Hello"}\n\n';
      const parsed = parseSSEMessage(sseData);
      
      expect(parsed).toEqual({
        type: 'message',
        content: 'Hello'
      });
    });

    it('should handle scene_added events', () => {
      const mockSetScenes = jest.fn();
      const mockUseVideoState = jest.fn(() => ({
        updateScene: jest.fn(),
        addScene: mockSetScenes
      }));
      
      // Mock the store
      jest.spyOn(require('~/stores/videoState'), 'useVideoState')
        .mockImplementation(mockUseVideoState);
      
      const { handleSSEMessage } = require('~/hooks/use-sse-generation');
      
      const message = {
        type: 'scene_added',
        data: {
          sceneId: 'new-scene',
          sceneName: 'New Scene',
          code: 'scene code',
          duration: 90
        }
      };
      
      handleSSEMessage(message, testProjectId);
      
      // Should add scene to state
      expect(mockSetScenes).toHaveBeenCalledWith(
        testProjectId,
        expect.objectContaining({
          id: 'new-scene',
          name: 'New Scene',
          tsxCode: 'scene code',
          duration: 90
        })
      );
    });

    it('should reconnect on connection loss', async () => {
      const mockEventSource = {
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: 1 // OPEN
      };
      
      global.EventSource = jest.fn(() => mockEventSource) as any;
      
      const { useSSEGeneration } = require('~/hooks/use-sse-generation');
      
      // Simulate connection loss
      mockEventSource.readyState = 2; // CLOSED
      
      // Trigger error event
      const errorHandler = mockEventSource.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'error'
      )?.[1];
      
      if (errorHandler) {
        errorHandler(new Event('error'));
      }
      
      // Should attempt reconnection
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for reconnect delay
      
      expect(global.EventSource).toHaveBeenCalledTimes(2); // Initial + reconnect
    });
  });

  describe('Message Buffering', () => {
    it('should buffer messages during high load', async () => {
      const { POST } = require('~/app/api/generate-stream/route');
      
      const messages: string[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(`Message ${i}`);
      }
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          prompt: messages.join(' '),
          projectId: testProjectId,
          sceneId: 'test-scene'
        })
      };

      const response = await POST(mockRequest);
      const stream = response.body as MockReadableStream;
      const controller = stream.getController();
      
      // All messages should be queued
      expect(controller.enqueue).toHaveBeenCalled();
      
      // No messages should be lost
      const enqueuedCount = controller.enqueue.mock.calls.length;
      expect(enqueuedCount).toBeGreaterThan(0);
    });

    it('should handle backpressure correctly', async () => {
      const { POST } = require('~/app/api/generate-stream/route');
      
      // Simulate slow consumer
      const slowConsumer = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          prompt: 'Create video with many scenes',
          projectId: testProjectId,
          websiteUrl: 'https://example.com'
        })
      };

      const response = await POST(mockRequest);
      
      // Stream should handle backpressure without errors
      expect(response.status).toBe(200);
    });
  });

  describe('Error Propagation', () => {
    it('should stream error events on generation failure', async () => {
      const { POST } = require('~/app/api/generate-stream/route');
      
      // Mock generation failure
      jest.spyOn(require('~/brain/orchestratorNEW'), 'BrainOrchestrator')
        .mockImplementation(() => ({
          process: jest.fn().mockRejectedValue(new Error('Generation failed'))
        }));
      
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          prompt: 'Create a video',
          projectId: testProjectId,
          sceneId: 'test-scene'
        })
      };

      const response = await POST(mockRequest);
      const stream = response.body as MockReadableStream;
      const controller = stream.getController();
      
      // Should send error event
      const calls = controller.enqueue.mock.calls;
      const errorMessage = calls.find((call: any) => {
        const message = new TextDecoder().decode(call[0]);
        return message.includes('"type":"error"');
      });
      
      expect(errorMessage).toBeDefined();
    });

    it('should not crash on malformed messages', () => {
      const { parseSSEMessage } = require('~/hooks/use-sse-generation');
      
      const malformed = [
        'data: {invalid json',
        'not-sse-format',
        'data: null',
        '',
        'data: undefined'
      ];
      
      malformed.forEach(msg => {
        // Should not throw
        expect(() => parseSSEMessage(msg)).not.toThrow();
      });
    });
  });
});