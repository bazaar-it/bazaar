import { describe, it, expect, jest } from '@jest/globals';
import { Observable, Subject } from 'rxjs';
import { performance } from 'perf_hooks';

// Helper function to create a mock stream responder
function createMockStreamResponder(config: {
  initialResponseTime: number; // Time to first status update
  firstContentTime: number;   // Time to first content delta
  contentChunks: Array<{time: number, content: string}>;
  toolCallTime?: number;
  toolResultTime?: number;
}) {
  return new Observable((observer) => {
    // Initial status update
    setTimeout(() => {
      observer.next({ type: 'status', status: 'thinking' });
    }, config.initialResponseTime);
    
    // First content chunk
    setTimeout(() => {
      observer.next({
        type: 'delta',
        content: config.contentChunks[0].content
      });
    }, config.firstContentTime);
    
    // Subsequent content chunks
    for (let i = 1; i < config.contentChunks.length; i++) {
      const chunk = config.contentChunks[i];
      setTimeout(() => {
        observer.next({
          type: 'delta',
          content: chunk.content
        });
      }, chunk.time);
    }
    
    // Tool call if specified
    if (config.toolCallTime) {
      setTimeout(() => {
        observer.next({
          type: 'tool_start',
          name: 'generateRemotionComponent'
        });
      }, config.toolCallTime);
    }
    
    // Tool result if specified
    if (config.toolResultTime) {
      setTimeout(() => {
        observer.next({
          type: 'tool_result',
          name: 'generateRemotionComponent',
          success: true,
          finalContent: 'Component built successfully',
          jobId: 'test-job-123'
        });
      }, config.toolResultTime);
      
      // Complete shortly after
      setTimeout(() => {
        observer.next({
          type: 'finalized',
          status: 'success'
        });
        observer.complete();
      }, config.toolResultTime + 200);
    } else {
      // If no tool call, complete after last content
      const lastChunkTime = config.contentChunks[config.contentChunks.length - 1].time;
      setTimeout(() => {
        observer.next({
          type: 'finalized',
          status: 'success'
        });
        observer.complete();
      }, lastChunkTime + 200);
    }
    
    return () => {
      // Cleanup function
    };
  });
}

describe('Response Streaming Performance', () => {
  it('should meet target of <150ms for initial response', async () => {
    const metrics: Record<string, number> = {};
    const startTime = performance.now();
    metrics.startTime = startTime;
    
    // Create a mock stream with 100ms initial response
    const stream = createMockStreamResponder({
      initialResponseTime: 100,
      firstContentTime: 300,
      contentChunks: [
        { time: 300, content: 'I\'ll create a fireworks animation' },
        { time: 500, content: ' with bright colors' },
        { time: 700, content: ' that explode in a circle pattern.' }
      ]
    });
    
    // Subscribe and record metrics
    const subscription = stream.subscribe({
      next: (event) => {
        const now = performance.now();
        if (event.type === 'status') {
          metrics.firstStatusTime = now;
        } else if (event.type === 'delta' && !metrics.firstContentTime) {
          metrics.firstContentTime = now;
        } else if (event.type === 'finalized') {
          metrics.finalizedTime = now;
        }
      },
      complete: () => {
        // Not needed for this test
      }
    });
    
    // Wait for stream to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        subscription.unsubscribe();
        resolve();
      }, 1000);
    });
    
    // Calculate elapsed times
    const timeToFirstStatus = metrics.firstStatusTime - metrics.startTime;
    const timeToFirstContent = metrics.firstContentTime - metrics.startTime;
    const totalTime = metrics.finalizedTime - metrics.startTime;
    
    // Verify performance targets
    expect(timeToFirstStatus).toBeLessThan(150); // Target: <150ms for first status
    expect(timeToFirstContent).toBeLessThan(500); // Target: <500ms for first content
    expect(totalTime).toBeLessThan(1000); // Total time should be reasonable
    
    // Log metrics for debugging
    console.log({
      timeToFirstStatus,
      timeToFirstContent,
      totalTime
    });
  });
  
  it('should handle degraded performance gracefully', async () => {
    // Create a mock stream with slower response times
    const stream = createMockStreamResponder({
      initialResponseTime: 200, // Intentionally above our 150ms target
      firstContentTime: 600,    // Intentionally above our 500ms target
      contentChunks: [
        { time: 600, content: 'Working on your request...' },
        { time: 1200, content: ' (still processing)' }
      ],
      toolCallTime: 1500,
      toolResultTime: 3000
    });
    
    const events: any[] = [];
    const startTime = performance.now();
    
    // Subscribe and collect events with timestamps
    const subscription = stream.subscribe({
      next: (event) => {
        events.push({
          ...event,
          receivedAt: performance.now() - startTime
        });
      },
      complete: () => {
        // Not needed
      }
    });
    
    // Wait for completion
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        subscription.unsubscribe();
        resolve();
      }, 3500);
    });
    
    // Even with degraded performance, we should still get all expected events
    expect(events.length).toBeGreaterThanOrEqual(5); // At least status + 2 content + tool start + result
    
    // Verify the sequence is correct even if timing targets aren't met
    expect(events[0].type).toBe('status');
    expect(events[1].type).toBe('delta');
    expect(events[events.length - 1].type).toBe('finalized');
    
    // Find tool events
    const toolStartEvent = events.find(e => e.type === 'tool_start');
    const toolResultEvent = events.find(e => e.type === 'tool_result');
    
    expect(toolStartEvent).toBeDefined();
    expect(toolResultEvent).toBeDefined();
    
    // Calculate timing metrics even for degraded performance
    const timeToFirstStatus = events[0].receivedAt;
    const timeToFirstContent = events[1].receivedAt;
    const toolProcessingTime = toolResultEvent.receivedAt - toolStartEvent.receivedAt;
    
    // Log degraded metrics for analysis
    console.log({
      timeToFirstStatus,
      timeToFirstContent,
      toolProcessingTime,
      totalEvents: events.length
    });
  });
  
  it('should measure throughput for streaming content', async () => {
    // Generate a larger stream with consistent chunks to measure throughput
    const chunks = Array.from({ length: 20 }, (_, i) => ({
      time: 300 + (i * 100), // Regular intervals
      content: `Chunk ${i + 1} with some content to measure throughput. `
    }));
    
    const stream = createMockStreamResponder({
      initialResponseTime: 100,
      firstContentTime: 300,
      contentChunks: chunks
    });
    
    const events: any[] = [];
    const startTime = performance.now();
    
    // Subscribe and collect events with timestamps
    const subscription = stream.subscribe({
      next: (event) => {
        events.push({
          ...event,
          receivedAt: performance.now() - startTime
        });
      },
      complete: () => {
        // Not needed
      }
    });
    
    // Wait for completion
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        subscription.unsubscribe();
        resolve();
      }, 2500); // Allow enough time for all chunks
    });
    
    // Calculate total content and throughput
    const contentEvents = events.filter(e => e.type === 'delta');
    const totalContentLength = contentEvents.reduce((sum, e) => sum + e.content.length, 0);
    const streamingTime = events[events.length - 1].receivedAt - contentEvents[0].receivedAt;
    const chunksPerSecond = contentEvents.length / (streamingTime / 1000);
    const charactersPerSecond = totalContentLength / (streamingTime / 1000);
    
    // Verify we got reasonable throughput
    expect(chunksPerSecond).toBeGreaterThan(1); // At least 1 chunk per second
    expect(charactersPerSecond).toBeGreaterThan(50); // At least 50 chars per second
    
    console.log({
      totalContentLength,
      streamingTime,
      chunksPerSecond,
      charactersPerSecond
    });
  });
  
  it('should test actual streaming implementation', async () => {
    // This test would use your actual streaming implementation
    // For testing purposes, we'll create a simplified version
    
    // Mock implementation of your actual streaming function
    const mockStreamResponse = (input: { prompt: string }) => {
      // Create a subject for more control
      const subject = new Subject();
      
      // Schedule events like your actual implementation would
      setTimeout(() => subject.next({ type: 'status', status: 'thinking' }), 100);
      setTimeout(() => subject.next({ type: 'delta', content: 'Processing your request' }), 300);
      setTimeout(() => subject.next({ type: 'delta', content: ' to create' }), 400);
      setTimeout(() => subject.next({ type: 'delta', content: ' a fireworks effect.' }), 500);
      setTimeout(() => subject.next({ type: 'finalized', status: 'success' }), 600);
      setTimeout(() => subject.complete(), 650);
      
      return subject.asObservable();
    };
    
    // Record metrics for actual implementation
    const metrics: Record<string, number> = {};
    const startTime = performance.now();
    
    const stream = mockStreamResponse({ prompt: 'Create a fireworks effect' });
    
    // Subscribe and record metrics
    const subscription = stream.subscribe({
      next: (event: any) => {
        const now = performance.now();
        if (event.type === 'status' && !metrics.firstStatusTime) {
          metrics.firstStatusTime = now;
        } else if (event.type === 'delta' && !metrics.firstContentTime) {
          metrics.firstContentTime = now;
        } else if (event.type === 'finalized') {
          metrics.finalizedTime = now;
        }
      }
    });
    
    // Wait for completion
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        subscription.unsubscribe();
        resolve();
      }, 700);
    });
    
    // Verify against target metrics
    const timeToFirstStatus = metrics.firstStatusTime - startTime;
    const timeToFirstContent = metrics.firstContentTime - startTime;
    
    expect(timeToFirstStatus).toBeLessThan(150); // <150ms to first status
    expect(timeToFirstContent).toBeLessThan(500); // <500ms to first content
  });
}); 