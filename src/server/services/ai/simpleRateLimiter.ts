// Simple In-Memory Rate Limiter (No Redis Required)
// Provides basic rate limiting and queue management without external dependencies

interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: number;
  timestamp: number;
}

interface RateLimitState {
  requests: number;
  windowStart: number;
}

export class SimpleRateLimiter {
  private static instance: SimpleRateLimiter;
  
  // Rate limit states per provider
  private rateLimits: Map<string, RateLimitState> = new Map();
  
  // Request queues per provider
  private queues: Map<string, QueuedRequest<any>[]> = new Map();
  private processing: Map<string, boolean> = new Map();
  
  // Configuration
  private limits = {
    anthropic: { requests: 50, windowMs: 60000 }, // 50 requests per minute
    openai: { requests: 100, windowMs: 60000 }, // 100 requests per minute
  };
  
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly PROCESS_INTERVAL = 100; // Process queue every 100ms
  
  private constructor() {
    // Start queue processors
    this.startQueueProcessors();
  }
  
  static getInstance(): SimpleRateLimiter {
    if (!SimpleRateLimiter.instance) {
      SimpleRateLimiter.instance = new SimpleRateLimiter();
    }
    return SimpleRateLimiter.instance;
  }
  
  // Check if request can proceed immediately
  private canProceed(provider: string): boolean {
    const limit = this.limits[provider as keyof typeof this.limits];
    if (!limit) return true; // No limit configured
    
    const now = Date.now();
    const state = this.rateLimits.get(provider) || { requests: 0, windowStart: now };
    
    // Reset window if expired
    if (now - state.windowStart > limit.windowMs) {
      state.requests = 0;
      state.windowStart = now;
    }
    
    // Check if under limit
    if (state.requests < limit.requests) {
      state.requests++;
      this.rateLimits.set(provider, state);
      return true;
    }
    
    return false;
  }
  
  // Queue a request
  async queueRequest<T>(
    provider: string,
    execute: () => Promise<T>,
    options?: { priority?: number }
  ): Promise<T> {
    // Check queue size
    const queue = this.queues.get(provider) || [];
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error(`Request queue full for ${provider}. Please try again later.`);
    }
    
    // Try to execute immediately if possible
    if (this.canProceed(provider)) {
      try {
        return await execute();
      } catch (error) {
        // Re-throw error
        throw error;
      }
    }
    
    // Queue the request
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: Math.random().toString(36).substr(2, 9),
        execute,
        resolve,
        reject,
        priority: options?.priority || 0,
        timestamp: Date.now(),
      };
      
      // Add to queue
      queue.push(request);
      
      // Sort by priority (higher first) then by timestamp (older first)
      queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
      
      this.queues.set(provider, queue);
      
      console.log(`[RateLimiter] Request queued for ${provider}. Queue size: ${queue.length}`);
    });
  }
  
  // Process queues periodically
  private startQueueProcessors(): void {
    setInterval(() => {
      for (const provider of ['anthropic', 'openai']) {
        this.processQueue(provider);
      }
    }, this.PROCESS_INTERVAL);
  }
  
  // Process a single provider's queue
  private async processQueue(provider: string): Promise<void> {
    // Skip if already processing
    if (this.processing.get(provider)) return;
    
    const queue = this.queues.get(provider) || [];
    if (queue.length === 0) return;
    
    // Check if we can process a request
    if (!this.canProceed(provider)) return;
    
    // Get next request
    const request = queue.shift();
    if (!request) return;
    
    this.processing.set(provider, true);
    
    try {
      console.log(`[RateLimiter] Processing request for ${provider}. Remaining: ${queue.length}`);
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.processing.set(provider, false);
      this.queues.set(provider, queue);
    }
  }
  
  // Get queue statistics
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const provider of ['anthropic', 'openai']) {
      const queue = this.queues.get(provider) || [];
      const rateLimit = this.rateLimits.get(provider);
      const limit = this.limits[provider as keyof typeof this.limits];
      
      stats[provider] = {
        queueSize: queue.length,
        processing: this.processing.get(provider) || false,
        rateLimit: rateLimit ? {
          requests: rateLimit.requests,
          remaining: limit ? limit.requests - rateLimit.requests : 'N/A',
          resetsIn: rateLimit ? Math.max(0, (rateLimit.windowStart + limit.windowMs) - Date.now()) : 'N/A',
        } : null,
      };
    }
    
    return stats;
  }
  
  // Clear queue for a provider
  clearQueue(provider: string): void {
    const queue = this.queues.get(provider) || [];
    
    // Reject all pending requests
    for (const request of queue) {
      request.reject(new Error('Queue cleared'));
    }
    
    this.queues.set(provider, []);
    console.log(`[RateLimiter] Cleared queue for ${provider}`);
  }
  
  // Update rate limits
  updateLimits(provider: string, requests: number, windowMs: number): void {
    this.limits[provider as keyof typeof this.limits] = { requests, windowMs };
    console.log(`[RateLimiter] Updated limits for ${provider}: ${requests} requests per ${windowMs}ms`);
  }
}

// Export singleton instance
export const simpleRateLimiter = SimpleRateLimiter.getInstance();