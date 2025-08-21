// API Key Rotation Service
// Manages multiple API keys with health tracking and automatic rotation

interface APIKey {
  key: string;
  provider: 'anthropic' | 'openai';
  name: string;
  isHealthy: boolean;
  lastUsed: number;
  requestCount: number;
  errorCount: number;
  rateLimitHits: number;
  lastError?: {
    timestamp: number;
    error: string;
    status?: number;
  };
}

interface APIKeyHealth {
  key: string;
  health: number; // 0-100
  status: 'healthy' | 'degraded' | 'unhealthy';
  recommendation: string;
}

export class APIKeyRotationService {
  private static instance: APIKeyRotationService;
  private apiKeys: Map<string, APIKey[]> = new Map();
  private currentIndex: Map<string, number> = new Map();
  
  // Health thresholds
  private readonly ERROR_RATE_THRESHOLD = 0.1; // 10% error rate
  private readonly RATE_LIMIT_THRESHOLD = 5; // 5 rate limit hits
  private readonly COOLDOWN_PERIOD = 300000; // 5 minutes
  
  private constructor() {
    this.initializeKeys();
  }
  
  static getInstance(): APIKeyRotationService {
    if (!APIKeyRotationService.instance) {
      APIKeyRotationService.instance = new APIKeyRotationService();
    }
    return APIKeyRotationService.instance;
  }
  
  // Initialize API keys from environment variables
  private initializeKeys(): void {
    // Anthropic keys
    const anthropicKeys: APIKey[] = [];
    
    // Primary key
    if (process.env.ANTHROPIC_API_KEY) {
      anthropicKeys.push({
        key: process.env.ANTHROPIC_API_KEY,
        provider: 'anthropic',
        name: 'Primary',
        isHealthy: true,
        lastUsed: 0,
        requestCount: 0,
        errorCount: 0,
        rateLimitHits: 0,
      });
    }
    
    // Additional keys (ANTHROPIC_API_KEY_2, ANTHROPIC_API_KEY_3, etc.)
    for (let i = 2; i <= 5; i++) {
      const key = process.env[`ANTHROPIC_API_KEY_${i}`];
      if (key) {
        anthropicKeys.push({
          key,
          provider: 'anthropic',
          name: `Key ${i}`,
          isHealthy: true,
          lastUsed: 0,
          requestCount: 0,
          errorCount: 0,
          rateLimitHits: 0,
        });
      }
    }
    
    if (anthropicKeys.length > 0) {
      this.apiKeys.set('anthropic', anthropicKeys);
      this.currentIndex.set('anthropic', 0);
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[APIKeyRotation] Initialized ${anthropicKeys.length} Anthropic API keys`);
      }
    }
    
    // OpenAI keys
    const openaiKeys: APIKey[] = [];
    
    if (process.env.OPENAI_API_KEY) {
      openaiKeys.push({
        key: process.env.OPENAI_API_KEY,
        provider: 'openai',
        name: 'Primary',
        isHealthy: true,
        lastUsed: 0,
        requestCount: 0,
        errorCount: 0,
        rateLimitHits: 0,
      });
    }
    
    // Additional OpenAI keys
    for (let i = 2; i <= 5; i++) {
      const key = process.env[`OPENAI_API_KEY_${i}`];
      if (key) {
        openaiKeys.push({
          key,
          provider: 'openai',
          name: `Key ${i}`,
          isHealthy: true,
          lastUsed: 0,
          requestCount: 0,
          errorCount: 0,
          rateLimitHits: 0,
        });
      }
    }
    
    if (openaiKeys.length > 0) {
      this.apiKeys.set('openai', openaiKeys);
      this.currentIndex.set('openai', 0);
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[APIKeyRotation] Initialized ${openaiKeys.length} OpenAI API keys`);
      }
    }
  }
  
  // Get next healthy API key using round-robin with health checks
  getNextKey(provider: 'anthropic' | 'openai'): string | null {
    const keys = this.apiKeys.get(provider);
    if (!keys || keys.length === 0) {
      console.error(`[APIKeyRotation] No API keys configured for ${provider}`);
      return null;
    }
    
    // Try to find a healthy key
    let attempts = 0;
    while (attempts < keys.length) {
      const currentIdx = this.currentIndex.get(provider) || 0;
      const key = keys[currentIdx];
      
      // Move to next key for next request
      this.currentIndex.set(provider, (currentIdx + 1) % keys.length);
      attempts++;
      
      // Skip if key is undefined (shouldn't happen but being safe)
      if (!key) {
        continue;
      }
      
      // Check if key is healthy and not in cooldown
      if (this.isKeyHealthy(key)) {
        key.lastUsed = Date.now();
        key.requestCount++;
        console.log(`[APIKeyRotation] Using ${provider} ${key.name}`);
        return key.key;
      }
      
      console.log(`[APIKeyRotation] Skipping unhealthy ${provider} ${key.name}`);
    }
    
    // All keys are unhealthy, try to find the least unhealthy one
    console.warn(`[APIKeyRotation] All ${provider} keys are unhealthy, using least problematic`);
    const leastUnhealthy = this.findLeastUnhealthyKey(keys);
    if (leastUnhealthy) {
      leastUnhealthy.lastUsed = Date.now();
      leastUnhealthy.requestCount++;
      return leastUnhealthy.key;
    }
    
    return null;
  }
  
  // Check if a key is healthy
  private isKeyHealthy(key: APIKey): boolean {
    // Check explicit health flag
    if (!key.isHealthy) {
      // Check if cooldown period has passed
      if (key.lastError && Date.now() - key.lastError.timestamp > this.COOLDOWN_PERIOD) {
        key.isHealthy = true;
        key.errorCount = 0;
        key.rateLimitHits = 0;
        console.log(`[APIKeyRotation] ${key.provider} ${key.name} recovered from cooldown`);
      } else {
        return false;
      }
    }
    
    // Check error rate
    if (key.requestCount > 10) {
      const errorRate = key.errorCount / key.requestCount;
      if (errorRate > this.ERROR_RATE_THRESHOLD) {
        return false;
      }
    }
    
    // Check rate limit hits
    if (key.rateLimitHits >= this.RATE_LIMIT_THRESHOLD) {
      return false;
    }
    
    return true;
  }
  
  // Find the least unhealthy key when all are problematic
  private findLeastUnhealthyKey(keys: APIKey[]): APIKey | null {
    return keys.reduce((best, current) => {
      // Prioritize keys that haven't been used recently
      const bestAge = Date.now() - best.lastUsed;
      const currentAge = Date.now() - current.lastUsed;
      
      // Prioritize keys with lower error rates
      const bestErrorRate = best.requestCount > 0 ? best.errorCount / best.requestCount : 0;
      const currentErrorRate = current.requestCount > 0 ? current.errorCount / current.requestCount : 0;
      
      if (currentAge > bestAge && currentErrorRate <= bestErrorRate) {
        return current;
      }
      
      return best;
    });
  }
  
  // Record successful request
  recordSuccess(provider: 'anthropic' | 'openai', apiKey: string): void {
    const keys = this.apiKeys.get(provider);
    const key = keys?.find(k => k.key === apiKey);
    
    if (key) {
      // Success can help recover health
      if (!key.isHealthy && key.lastError && 
          Date.now() - key.lastError.timestamp > 60000) { // 1 minute
        key.isHealthy = true;
        console.log(`[APIKeyRotation] ${provider} ${key.name} marked healthy after success`);
      }
    }
  }
  
  // Record error for a specific key
  recordError(provider: 'anthropic' | 'openai', apiKey: string, error: any): void {
    const keys = this.apiKeys.get(provider);
    const key = keys?.find(k => k.key === apiKey);
    
    if (key) {
      key.errorCount++;
      key.lastError = {
        timestamp: Date.now(),
        error: error.message || 'Unknown error',
        status: error.status,
      };
      
      // Check if this is a rate limit error
      if (error.status === 429 || error.status === 529) {
        key.rateLimitHits++;
        
        if (key.rateLimitHits >= this.RATE_LIMIT_THRESHOLD) {
          key.isHealthy = false;
          console.error(`[APIKeyRotation] ${provider} ${key.name} marked unhealthy due to rate limits`);
        }
      }
      
      // Check overall error rate
      const errorRate = key.errorCount / key.requestCount;
      if (errorRate > this.ERROR_RATE_THRESHOLD && key.requestCount > 10) {
        key.isHealthy = false;
        console.error(`[APIKeyRotation] ${provider} ${key.name} marked unhealthy due to error rate`);
      }
    }
  }
  
  // Get health status of all keys
  getKeysHealth(): Record<string, APIKeyHealth[]> {
    const health: Record<string, APIKeyHealth[]> = {};
    
    for (const [provider, keys] of this.apiKeys) {
      health[provider] = keys.map(key => {
        const errorRate = key.requestCount > 0 ? key.errorCount / key.requestCount : 0;
        const healthScore = this.calculateHealthScore(key);
        
        return {
          key: key.name,
          health: healthScore,
          status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy',
          recommendation: this.getHealthRecommendation(key, healthScore),
        };
      });
    }
    
    return health;
  }
  
  // Calculate health score (0-100)
  private calculateHealthScore(key: APIKey): number {
    let score = 100;
    
    // Deduct for error rate
    if (key.requestCount > 0) {
      const errorRate = key.errorCount / key.requestCount;
      score -= errorRate * 100;
    }
    
    // Deduct for rate limit hits
    score -= key.rateLimitHits * 10;
    
    // Deduct if explicitly unhealthy
    if (!key.isHealthy) {
      score -= 50;
    }
    
    // Deduct for recent errors
    if (key.lastError && Date.now() - key.lastError.timestamp < this.COOLDOWN_PERIOD) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  // Get health recommendation
  private getHealthRecommendation(key: APIKey, healthScore: number): string {
    if (healthScore >= 80) {
      return 'Key is healthy and functioning normally';
    }
    
    if (key.rateLimitHits >= this.RATE_LIMIT_THRESHOLD) {
      return 'Key is being rate limited. Consider adding more keys or reducing request rate.';
    }
    
    if (key.errorCount > 0) {
      const errorRate = key.errorCount / key.requestCount;
      if (errorRate > this.ERROR_RATE_THRESHOLD) {
        return `High error rate (${(errorRate * 100).toFixed(1)}%). Check API key validity and permissions.`;
      }
    }
    
    if (!key.isHealthy && key.lastError) {
      const timeAgo = Math.floor((Date.now() - key.lastError.timestamp) / 1000);
      return `Key in cooldown after error. Will retry in ${300 - timeAgo}s.`;
    }
    
    return 'Key is experiencing issues';
  }
  
  // Force mark a key as healthy/unhealthy (for admin use)
  setKeyHealth(provider: 'anthropic' | 'openai', keyName: string, isHealthy: boolean): boolean {
    const keys = this.apiKeys.get(provider);
    const key = keys?.find(k => k.name === keyName);
    
    if (key) {
      key.isHealthy = isHealthy;
      if (isHealthy) {
        key.errorCount = 0;
        key.rateLimitHits = 0;
        key.lastError = undefined;
      }
      console.log(`[APIKeyRotation] ${provider} ${keyName} manually set to ${isHealthy ? 'healthy' : 'unhealthy'}`);
      return true;
    }
    
    return false;
  }
  
  // Get statistics
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [provider, keys] of this.apiKeys) {
      const totalRequests = keys.reduce((sum, k) => sum + k.requestCount, 0);
      const totalErrors = keys.reduce((sum, k) => sum + k.errorCount, 0);
      const healthyKeys = keys.filter(k => this.isKeyHealthy(k)).length;
      
      stats[provider] = {
        totalKeys: keys.length,
        healthyKeys,
        unhealthyKeys: keys.length - healthyKeys,
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) + '%' : '0%',
        keys: keys.map(k => ({
          name: k.name,
          healthy: this.isKeyHealthy(k),
          requests: k.requestCount,
          errors: k.errorCount,
          rateLimitHits: k.rateLimitHits,
          lastUsed: k.lastUsed ? new Date(k.lastUsed).toISOString() : 'Never',
        })),
      };
    }
    
    return stats;
  }
}

// Export singleton instance
export const apiKeyRotation = APIKeyRotationService.getInstance();