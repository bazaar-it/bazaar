# TICKET-009: Implement Smart Caching - Implementation Guide

## Overview
Implement a smart caching layer to dramatically improve response times without adding complexity. Focus on caching frequently accessed data with intelligent invalidation strategies.

## Current State Analysis

### Pain Points
1. **Database Queries**: Every scene fetch hits the database
2. **AI Decisions**: Similar prompts trigger full AI processing
3. **Component Building**: Rebuilding components that haven't changed
4. **User Experience**: Perceived slowness in common operations

### Opportunities
1. **Scene Data**: Frequently accessed, infrequently changed
2. **AI Responses**: Similar prompts often generate similar results
3. **Built Components**: Can be cached after successful builds
4. **Project Metadata**: Rarely changes within a session

## Implementation Strategy

### 1. Caching Infrastructure

#### Redis Setup
```typescript
// src/lib/cache/redis.ts
import { Redis } from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Connection management
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
  // Graceful degradation - app works without cache
});
```

#### Cache Wrapper
```typescript
// src/lib/cache/CacheManager.ts
export class CacheManager {
  private static instance: CacheManager;
  private readonly defaultTTL = 3600; // 1 hour
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) return null;
      
      return JSON.parse(cached) as T;
    } catch (error) {
      // Log but don't throw - cache miss is not an error
      console.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }
  
  async set(
    key: string, 
    value: any, 
    ttl: number = this.defaultTTL
  ): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      // Log but don't throw - cache write failure shouldn't break app
      console.warn(`Cache set error for key ${key}:`, error);
    }
  }
  
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.warn(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }
}
```

### 2. Scene Data Caching

#### Cache Keys Strategy
```typescript
// src/lib/cache/keys.ts
export const CacheKeys = {
  // Scene-specific keys
  scene: (projectId: string, sceneId: string) => 
    `scene:${projectId}:${sceneId}`,
  
  // Project scenes list
  projectScenes: (projectId: string) => 
    `project:${projectId}:scenes`,
  
  // AI decision cache
  aiDecision: (prompt: string, context: string) => 
    `ai:decision:${hashPrompt(prompt + context)}`,
  
  // Built component cache
  builtComponent: (sceneId: string, version: string) => 
    `component:${sceneId}:${version}`,
  
  // User preferences
  userPreferences: (userId: string) => 
    `user:${userId}:preferences`,
};

// Simple hash function for consistent keys
function hashPrompt(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
```

#### Router Integration
```typescript
// src/server/api/routers/generation.ts
import { CacheManager } from '~/lib/cache/CacheManager';
import { CacheKeys } from '~/lib/cache/keys';

const cache = CacheManager.getInstance();

// Example: Get scene with caching
async function getSceneWithCache(
  projectId: string, 
  sceneId: string
): Promise<Scene | null> {
  // Try cache first
  const cacheKey = CacheKeys.scene(projectId, sceneId);
  const cached = await cache.get<Scene>(cacheKey);
  
  if (cached) {
    console.log(`Cache hit for scene ${sceneId}`);
    return cached;
  }
  
  // Cache miss - fetch from database
  console.log(`Cache miss for scene ${sceneId}`);
  const scene = await db.query.scenes.findFirst({
    where: eq(scenes.id, sceneId),
  });
  
  if (scene) {
    // Cache for 1 hour
    await cache.set(cacheKey, scene, 3600);
  }
  
  return scene;
}

// Invalidate cache on updates
async function updateScene(
  projectId: string,
  sceneId: string,
  updates: Partial<Scene>
): Promise<void> {
  // Update database
  await db.update(scenes)
    .set(updates)
    .where(eq(scenes.id, sceneId));
  
  // Invalidate related caches
  await Promise.all([
    cache.invalidate(CacheKeys.scene(projectId, sceneId)),
    cache.invalidate(CacheKeys.projectScenes(projectId)),
  ]);
}
```

### 3. AI Decision Caching

#### Smart Prompt Caching
```typescript
// src/server/services/ai/CachedBrain.ts
export class CachedBrain extends Brain {
  private cache = CacheManager.getInstance();
  
  async makeDecision(
    prompt: string,
    context: ProjectContext
  ): Promise<Decision> {
    // Create cache key from prompt + relevant context
    const contextKey = this.extractRelevantContext(context);
    const cacheKey = CacheKeys.aiDecision(prompt, contextKey);
    
    // Check cache for similar decisions
    const cached = await this.cache.get<Decision>(cacheKey);
    if (cached && this.isStillValid(cached, context)) {
      console.log('Using cached AI decision');
      return cached;
    }
    
    // Make fresh decision
    const decision = await super.makeDecision(prompt, context);
    
    // Cache for 30 minutes (shorter for AI decisions)
    await this.cache.set(cacheKey, decision, 1800);
    
    return decision;
  }
  
  private extractRelevantContext(context: ProjectContext): string {
    // Only include context that affects decisions
    return JSON.stringify({
      projectType: context.projectType,
      sceneCount: context.scenes.length,
      lastSceneType: context.scenes[context.scenes.length - 1]?.type,
    });
  }
  
  private isStillValid(cached: Decision, context: ProjectContext): boolean {
    // Validate cached decision is still applicable
    // e.g., if user deleted the scene being edited, cache is invalid
    if (cached.operation === 'edit' && cached.targetSceneId) {
      return context.scenes.some(s => s.id === cached.targetSceneId);
    }
    return true;
  }
}
```

### 4. Component Build Caching

#### Cache Built Components
```typescript
// src/server/services/generation/CachedComponentBuilder.ts
export class CachedComponentBuilder {
  private cache = CacheManager.getInstance();
  
  async buildComponent(
    sceneId: string,
    tsxCode: string,
    props: Record<string, any>
  ): Promise<BuildResult> {
    // Create version hash from code + props
    const version = this.createVersion(tsxCode, props);
    const cacheKey = CacheKeys.builtComponent(sceneId, version);
    
    // Check cache
    const cached = await this.cache.get<BuildResult>(cacheKey);
    if (cached) {
      console.log(`Using cached build for scene ${sceneId}`);
      return cached;
    }
    
    // Build component
    const result = await this.performBuild(tsxCode, props);
    
    // Cache successful builds for 24 hours
    if (result.success) {
      await this.cache.set(cacheKey, result, 86400);
    }
    
    return result;
  }
  
  private createVersion(code: string, props: any): string {
    const content = code + JSON.stringify(props);
    return require('crypto')
      .createHash('md5')
      .update(content)
      .digest('hex')
      .substring(0, 8);
  }
}
```

### 5. Cache Warming Strategy

#### Proactive Cache Loading
```typescript
// src/server/services/cache/CacheWarmer.ts
export class CacheWarmer {
  private cache = CacheManager.getInstance();
  
  async warmProjectCache(projectId: string): Promise<void> {
    console.log(`Warming cache for project ${projectId}`);
    
    // Load all project scenes
    const scenes = await db.query.scenes.findMany({
      where: eq(scenes.projectId, projectId),
      orderBy: [asc(scenes.order)],
    });
    
    // Cache scenes individually and as a list
    await Promise.all([
      // Individual scenes
      ...scenes.map(scene => 
        this.cache.set(
          CacheKeys.scene(projectId, scene.id),
          scene,
          3600
        )
      ),
      // Scene list
      this.cache.set(
        CacheKeys.projectScenes(projectId),
        scenes,
        3600
      ),
    ]);
    
    console.log(`Warmed cache with ${scenes.length} scenes`);
  }
  
  // Call on project open
  async onProjectOpen(projectId: string): Promise<void> {
    // Don't block - warm cache in background
    this.warmProjectCache(projectId).catch(error => {
      console.error('Cache warming failed:', error);
    });
  }
}
```

### 6. Cache Monitoring

#### Performance Metrics
```typescript
// src/lib/cache/CacheMetrics.ts
export class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private errors = 0;
  
  recordHit(): void {
    this.hits++;
  }
  
  recordMiss(): void {
    this.misses++;
  }
  
  recordError(): void {
    this.errors++;
  }
  
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }
  
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate: this.getHitRate(),
      uptime: process.uptime(),
    };
  }
  
  // Reset counters periodically
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
  }
}

// Add to cache manager
class CacheManager {
  private metrics = new CacheMetrics();
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) {
        this.metrics.recordMiss();
        return null;
      }
      
      this.metrics.recordHit();
      return JSON.parse(cached) as T;
    } catch (error) {
      this.metrics.recordError();
      return null;
    }
  }
}
```

## Implementation Steps

### Phase 1: Basic Infrastructure (Day 1 Morning)
1. **Redis Setup**
   - Add Redis to docker-compose
   - Configure connection with fallback
   - Test connection handling

2. **Cache Manager**
   - Implement singleton wrapper
   - Add graceful error handling
   - Create type-safe methods

### Phase 2: Scene Caching (Day 1 Afternoon)
1. **Cache Integration**
   - Add caching to scene queries
   - Implement invalidation on updates
   - Test cache hit rates

2. **Performance Testing**
   - Measure response time improvements
   - Verify cache invalidation works
   - Check memory usage

### Phase 3: AI Decision Caching (Day 2 Morning)
1. **Smart Caching Logic**
   - Implement prompt hashing
   - Add context extraction
   - Create validation rules

2. **Integration Testing**
   - Test with similar prompts
   - Verify context changes invalidate
   - Measure AI cost savings

### Phase 4: Monitoring & Optimization (Day 2 Afternoon)
1. **Metrics Dashboard**
   - Add cache statistics endpoint
   - Create monitoring UI
   - Set up alerts for low hit rates

2. **Performance Tuning**
   - Adjust TTL values based on usage
   - Optimize cache key patterns
   - Implement cache size limits

## Testing Strategy

### Unit Tests
```typescript
describe('CacheManager', () => {
  it('handles Redis connection failure gracefully', async () => {
    // Disconnect Redis
    await redis.disconnect();
    
    // Should return null, not throw
    const result = await cache.get('test-key');
    expect(result).toBeNull();
  });
  
  it('maintains high hit rate for repeated queries', async () => {
    const key = 'test-scene';
    const data = { id: '1', tsxCode: 'test' };
    
    // First call - miss
    await cache.get(key);
    
    // Set cache
    await cache.set(key, data);
    
    // Next 10 calls - hits
    for (let i = 0; i < 10; i++) {
      await cache.get(key);
    }
    
    const stats = cache.getStats();
    expect(stats.hitRate).toBeGreaterThan(90);
  });
});
```

### Integration Tests
```typescript
describe('Scene Caching Integration', () => {
  it('speeds up repeated scene fetches', async () => {
    const projectId = 'test-project';
    const sceneId = 'test-scene';
    
    // First fetch - slow
    const start1 = Date.now();
    await getSceneWithCache(projectId, sceneId);
    const time1 = Date.now() - start1;
    
    // Second fetch - fast
    const start2 = Date.now();
    await getSceneWithCache(projectId, sceneId);
    const time2 = Date.now() - start2;
    
    // Cache should be 10x faster
    expect(time2).toBeLessThan(time1 / 10);
  });
});
```

## Environment Configuration

### Development
```env
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_ENABLED=true
CACHE_TTL_SCENES=3600
CACHE_TTL_AI=1800
CACHE_TTL_COMPONENTS=86400
```

### Production
```env
REDIS_HOST=redis.prod.internal
REDIS_PORT=6379
REDIS_PASSWORD=secure-password
CACHE_ENABLED=true
CACHE_MAX_MEMORY=2gb
CACHE_EVICTION_POLICY=allkeys-lru
```

## Success Metrics

### Performance Targets
- **Cache Hit Rate**: > 90% for read operations
- **Response Time**: < 50ms for cached data
- **AI Cost Reduction**: 40% fewer API calls
- **Memory Usage**: < 500MB Redis memory

### Monitoring Dashboard
```typescript
// src/pages/api/admin/cache-stats.ts
export default async function handler(req, res) {
  const stats = cache.getStats();
  const info = await redis.info('memory');
  
  res.json({
    cache: stats,
    memory: parseRedisInfo(info),
    health: stats.hitRate > 80 ? 'healthy' : 'degraded',
  });
}
```

## Rollback Plan

### Feature Flags
```typescript
const CACHE_ENABLED = process.env.CACHE_ENABLED === 'true';

async function getSceneWithCache(projectId: string, sceneId: string) {
  if (!CACHE_ENABLED) {
    return getSceneFromDB(projectId, sceneId);
  }
  
  // Cache logic...
}
```

### Graceful Degradation
- Redis failure doesn't break app
- Cache misses fall back to database
- Monitoring alerts on degradation
- Easy disable via environment variable

## Next Steps

After implementing smart caching:
1. **Monitor real usage patterns** to optimize TTL values
2. **Add cache preloading** for common user journeys
3. **Implement distributed caching** for multi-instance deployments
4. **Create cache analytics** to identify optimization opportunities

## Key Decisions

1. **Redis over in-memory**: Persists across restarts, scales horizontally
2. **Graceful degradation**: App works without cache
3. **Conservative TTLs**: Start short, increase based on data
4. **Simple key patterns**: Easy to understand and debug
5. **Background operations**: Never block user requests for cache

This implementation provides significant performance improvements while maintaining system simplicity and reliability.