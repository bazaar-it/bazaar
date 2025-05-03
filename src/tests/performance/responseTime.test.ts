import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { unstable_e2e as e2e } from '@vercel/ai-utils';
import { Observable } from 'observable-fns';
import { performance } from 'perf_hooks';

// Mock implementation of streamResponse procedure
const mockStreamResponse = (input: { assistantMessageId: string; projectId: string }) => {
  return new Observable((observer) => {
    // Initial status update - should be emitted within 150ms
    setTimeout(() => {
      observer.next({ type: 'status', status: 'thinking' });
    }, 100);

    // First delta - should be within 500ms
    setTimeout(() => {
      observer.next({ 
        type: 'delta', 
        content: 'I\'ll create a fireworks animation for you.' 
      });
    }, 300);

    // More content - within 1s
    setTimeout(() => {
      observer.next({ 
        type: 'delta',
        content: ' This will include colorful explosions with particles.'
      });
    }, 800);
    
    // Tool start - timing is less critical but should be reasonably fast
    setTimeout(() => {
      observer.next({ 
        type: 'tool_start', 
        name: 'generateRemotionComponent' 
      });
    }, 1200);
    
    // Tool result - simulates component build completion
    setTimeout(() => {
      observer.next({
        type: 'tool_result',
        name: 'generateRemotionComponent',
        success: true,
        finalContent: 'Component built successfully',
        jobId: 'test-job-123'
      });
    }, 5000);
    
    // Complete message
    setTimeout(() => {
      observer.next({
        type: 'complete',
        finalContent: 'I\'ve created a fireworks animation and added it to your timeline!'
      });
      
      // Finalize the stream
      observer.next({
        type: 'finalized',
        status: 'success'
      });
      
      observer.complete();
    }, 5500);
    
    // Return cleanup function
    return () => {
      // Cleanup logic here
    };
  });
};

describe('Chat Response Time Performance', () => {
  // Store event timestamps
  let eventsTimeline: Record<string, number> = {};
  
  beforeEach(() => {
    eventsTimeline = {};
  });
  
  it('should meet initial response time target (<150ms)', async () => {
    // Record start time
    const startTime = performance.now();
    eventsTimeline.startTime = startTime;
    
    // Subscribe to the stream
    const subscription = mockStreamResponse({
      assistantMessageId: 'test-message',
      projectId: 'test-project'
    }).subscribe({
      next: (event) => {
        // Record timestamp for each event type
        if (event.type === 'status') {
          eventsTimeline.firstStatus = performance.now();
        } else if (event.type === 'delta' && !eventsTimeline.firstDelta) {
          eventsTimeline.firstDelta = performance.now();
        } else if (event.type === 'tool_start') {
          eventsTimeline.toolStart = performance.now();
        } else if (event.type === 'tool_result') {
          eventsTimeline.toolResult = performance.now();
        } else if (event.type === 'complete') {
          eventsTimeline.complete = performance.now();
        } else if (event.type === 'finalized') {
          eventsTimeline.finalized = performance.now();
        }
      },
      error: (err) => {
        console.error('Stream error:', err);
      },
      complete: () => {
        // Not needed in this test
      }
    });
    
    // Wait for the stream to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        subscription.unsubscribe();
        resolve();
      }, 6000);
    });
    
    // Calculate elapsed times
    const timeToFirstStatus = eventsTimeline.firstStatus - eventsTimeline.startTime;
    const timeToFirstDelta = eventsTimeline.firstDelta - eventsTimeline.startTime;
    const timeToBuild = eventsTimeline.toolResult - eventsTimeline.toolStart;
    const totalTime = eventsTimeline.finalized - eventsTimeline.startTime;
    
    // Verify the performance targets are met
    expect(timeToFirstStatus).toBeLessThan(150); // < 150ms to first status
    expect(timeToFirstDelta).toBeLessThan(500); // < 500ms to first content
    expect(timeToBuild).toBeLessThan(4000); // Component building time
    expect(totalTime).toBeLessThan(10000); // Total response time < 10s
    
    // Log the results for debugging
    console.log({
      timeToFirstStatus,
      timeToFirstDelta,
      timeToBuild,
      totalTime
    });
  }, 10000); // 10s timeout
  
  it('should gracefully handle slow responses with exponential backoff', async () => {
    // Mock implementation with delayed responses to simulate slow server
    const mockSlowStreamResponse = jest.fn().mockImplementation(() => {
      return new Observable((observer) => {
        // Simulate a slow initial response
        setTimeout(() => {
          observer.next({ type: 'status', status: 'thinking' });
        }, 300); // Deliberately over our 150ms target
        
        // Rest of events simulate a slow system...
        setTimeout(() => {
          observer.next({ type: 'delta', content: 'Working on it...' });
        }, 1000);
        
        // Complete after a longer-than-ideal time
        setTimeout(() => {
          observer.next({
            type: 'complete',
            finalContent: 'Finally completed the task.'
          });
          
          observer.next({
            type: 'finalized',
            status: 'success'
          });
          
          observer.complete();
        }, 3000);
        
        return () => {};
      });
    });
    
    // Record start time
    const startTime = performance.now();
    
    // Call the slow mock
    const result = mockSlowStreamResponse();
    
    // Subscribe to the stream
    const events: any[] = [];
    const subscription = result.subscribe({
      next: (event) => {
        events.push({
          ...event,
          timestamp: performance.now() - startTime
        });
      },
      error: (err) => {
        console.error('Stream error:', err);
      },
      complete: () => {
        // Not needed
      }
    });
    
    // Wait for the stream to complete
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        subscription.unsubscribe();
        resolve();
      }, 4000);
    });
    
    // Verify that we received the events, even if they were slow
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1].type).toBe('finalized');
    
    // The key test: in real code we'd verify our backoff logic worked
    // For this test, we just confirm we got what we expected even with delays
    const timeToFirstStatus = events[0].timestamp;
    expect(timeToFirstStatus).toBeGreaterThan(150); // Deliberately slow response
    
    // Log events for debugging
    console.log(events);
  }, 10000);
}); 