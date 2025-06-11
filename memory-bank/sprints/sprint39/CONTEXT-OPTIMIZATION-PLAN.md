# Sprint 39: Context Building Optimization Plan

## Executive Summary

The current context building system rebuilds the entire project context for every user prompt, causing significant performance overhead (70+ seconds for operations that should take 5-10 seconds). This plan outlines a comprehensive optimization strategy to reduce context building overhead by 80-90% while maintaining the system's intelligence.

## Current Performance Bottlenecks

### 1. **Excessive Database Queries**
- **Problem**: 5+ separate DB queries for every prompt
- **Impact**: 500-1000ms overhead per request
- **Queries**:
  ```
  1. Fetch all scenes (buildContextPacket)
  2. Get user preferences (contextBuilder) 
  3. Get scene relationships (contextBuilder)
  4. Get image analyses (contextBuilder)
  5. Re-query scenes for timeline (contextBuilder)
  ```

### 2. **Over-Building Context**
- **Problem**: Full context built for trivial operations
- **Example**: "make text yellow" triggers full project analysis
- **Impact**: 2-3 seconds of unnecessary processing

### 3. **Ineffective Caching**
- **Problem**: Cache key includes scene count → invalidated on every change
- **Current**: `${projectId}-${userId}-${storyboardSoFar.length}`
- **Result**: <5% cache hit rate during active editing

### 4. **Redundant Processing**
- **Problem**: Same data fetched and processed multiple times
- **Example**: Scenes queried in orchestrator AND contextBuilder
- **Impact**: 2x database load

## Optimization Strategy

### Phase 1: Operation Classification (Week 1)

#### 1.1 Define Operation Types
```typescript
enum OperationType {
  TRIVIAL = 'trivial',      // "make text yellow", "change duration"
  MODERATE = 'moderate',    // "add scene", "delete scene"  
  COMPLEX = 'complex',      // "rearrange timeline", "apply style to all"
  ANALYTICAL = 'analytical' // "what scenes do I have?", "summarize video"
}
```

#### 1.2 Context Requirements Matrix
| Operation Type | Needs Scenes | Needs Preferences | Needs History | Needs Analysis |
|---------------|--------------|-------------------|---------------|----------------|
| TRIVIAL       | Current only | No                | Last 2 msgs   | No             |
| MODERATE      | All scenes   | Yes               | Last 5 msgs   | No             |
| COMPLEX       | All scenes   | Yes               | Full history  | Yes            |
| ANALYTICAL    | All scenes   | Yes               | Full history  | Yes            |

#### 1.3 Implementation
```typescript
// In orchestrator.ts
private classifyOperation(prompt: string, toolName?: string): OperationType {
  // Quick classification based on prompt patterns and selected tool
  if (toolName === 'editScene' && this.isTrivialEdit(prompt)) {
    return OperationType.TRIVIAL;
  }
  // ... more classification logic
}
```

### Phase 2: Tiered Context Building (Week 1-2)

#### 2.1 Light Context (For TRIVIAL operations)
```typescript
interface LightContext {
  currentScene?: Scene;        // Only if editing
  lastUserMessage: string;     // For immediate context
  projectId: string;
}

// Build time target: <50ms
async buildLightContext(input: OrchestrationInput): Promise<LightContext> {
  // Single query if scene ID provided
  // No preferences, no history analysis
}
```

#### 2.2 Standard Context (For MODERATE operations)
```typescript
interface StandardContext extends LightContext {
  allScenes: Scene[];          // Full scene list
  userPreferences: UserPreferences; // Cached preferences
  recentMessages: Message[];   // Last 5 messages
}

// Build time target: <200ms
async buildStandardContext(input: OrchestrationInput): Promise<StandardContext> {
  // Optimized single query for scenes + preferences
  // Use cached preferences when possible
}
```

#### 2.3 Full Context (For COMPLEX/ANALYTICAL)
```typescript
// Current implementation - but optimized
// Build time target: <500ms with caching
```

### Phase 3: Database Optimization (Week 2)

#### 3.1 Combined Query Pattern
```typescript
// Replace 5 queries with 1-2 optimized queries
async getProjectContextData(projectId: string) {
  // Use PostgreSQL CTEs or multiple result sets
  const result = await db.execute(sql`
    WITH project_scenes AS (
      SELECT * FROM scenes WHERE project_id = ${projectId}
    ),
    project_preferences AS (
      SELECT * FROM project_memory 
      WHERE project_id = ${projectId} 
      AND memory_type = 'user_preference'
    )
    SELECT 
      (SELECT json_agg(ps.*) FROM project_scenes ps) as scenes,
      (SELECT json_object_agg(pp.memory_key, pp.memory_value) 
       FROM project_preferences pp) as preferences
  `);
  
  return result;
}
```

#### 3.2 Materialized Views (Optional)
```sql
-- For frequently accessed project summaries
CREATE MATERIALIZED VIEW project_context_summary AS
SELECT 
  project_id,
  COUNT(DISTINCT scene_id) as scene_count,
  json_object_agg(memory_key, memory_value) as preferences,
  MAX(updated_at) as last_updated
FROM scenes 
LEFT JOIN project_memory USING (project_id)
GROUP BY project_id;

-- Refresh on scene/preference changes
```

### Phase 4: Smart Caching Strategy (Week 2-3)

#### 4.1 Component-Level Caching
```typescript
class SmartContextCache {
  // Cache individual components, not entire contexts
  private sceneCache = new TTLCache<string, Scene[]>(10 * 60 * 1000);
  private preferenceCache = new TTLCache<string, UserPreferences>(30 * 60 * 1000);
  private analysisCache = new TTLCache<string, SceneAnalysis>(15 * 60 * 1000);
  
  // Granular invalidation
  invalidateScenes(projectId: string) {
    this.sceneCache.delete(projectId);
    // Don't invalidate preferences or analysis
  }
}
```

#### 4.2 Predictive Cache Warming
```typescript
// After scene operations, warm cache for likely next operations
async warmCacheAfterOperation(projectId: string, operation: string) {
  if (operation === 'addScene') {
    // User likely to edit the new scene next
    // Pre-fetch scene list in background
    setTimeout(() => this.cacheProjectScenes(projectId), 100);
  }
}
```

### Phase 5: Implementation Plan (Week 3-4)

#### 5.1 Incremental Rollout
1. **Day 1-2**: Implement operation classification
2. **Day 3-4**: Build light context path for trivial edits
3. **Day 5-7**: Test and measure performance improvements
4. **Week 2**: Implement database optimizations
5. **Week 3**: Deploy smart caching
6. **Week 4**: Full system optimization and testing

#### 5.2 Metrics & Monitoring
```typescript
// Add performance tracking
interface ContextMetrics {
  operationType: OperationType;
  contextBuildTime: number;
  cacheHit: boolean;
  dbQueryCount: number;
  totalOperationTime: number;
}

// Log metrics for analysis
private logContextMetrics(metrics: ContextMetrics) {
  console.log('[ContextOptimization]', {
    ...metrics,
    improvement: this.calculateImprovement(metrics)
  });
}
```

## Expected Outcomes

### Performance Targets
| Operation | Current Time | Target Time | Improvement |
|-----------|--------------|-------------|-------------|
| Trivial Edit | 70s | 5s | 93% |
| Add Scene | 70s | 10s | 86% |
| Complex Edit | 70s | 15s | 79% |
| Full Analysis | 70s | 20s | 71% |

### System Benefits
1. **User Experience**: Near-instant responses for simple edits
2. **Server Load**: 80% reduction in database queries
3. **Scalability**: Can handle 10x more concurrent users
4. **Cost**: Reduced LLM token usage for simple operations

## Migration Strategy

### Backward Compatibility
```typescript
// Gradual migration with feature flags
const useOptimizedContext = process.env.OPTIMIZED_CONTEXT === 'true';

if (useOptimizedContext) {
  const opType = this.classifyOperation(input.prompt);
  switch(opType) {
    case OperationType.TRIVIAL:
      context = await this.buildLightContext(input);
      break;
    // ... etc
  }
} else {
  // Fall back to current implementation
  context = await this.buildContextPacket(...);
}
```

### Rollback Plan
- Feature flags for instant rollback
- Parallel metrics collection
- A/B testing with select users

## Testing Strategy

### Unit Tests
```typescript
describe('Context Optimization', () => {
  test('trivial edits use light context', async () => {
    const input = { prompt: 'make text blue' };
    const spy = jest.spyOn(orchestrator, 'buildLightContext');
    await orchestrator.processUserInput(input);
    expect(spy).toHaveBeenCalled();
  });
  
  test('light context completes in <50ms', async () => {
    const start = Date.now();
    await orchestrator.buildLightContext(input);
    expect(Date.now() - start).toBeLessThan(50);
  });
});
```

### Load Testing
- Simulate 100 concurrent "make text yellow" operations
- Measure database connection pool usage
- Monitor memory consumption

## Risk Mitigation

### Potential Risks
1. **Under-contextualization**: Some operations might need more context than classified
   - **Mitigation**: Conservative classification initially, monitor and adjust

2. **Cache Coherency**: Component caches might get out of sync
   - **Mitigation**: Clear cache relationships, eventual consistency model

3. **Complexity**: System becomes more complex
   - **Mitigation**: Clear documentation, extensive logging, gradual rollout

## Success Metrics

### Week 1 Goals
- [ ] Operation classification implemented
- [ ] Light context path working for trivial edits
- [ ] 50% performance improvement for simple edits

### Week 2 Goals
- [ ] Database queries optimized
- [ ] Cache hit rate >60% for repeat operations
- [ ] 75% overall performance improvement

### Week 3 Goals
- [ ] Full optimization deployed
- [ ] 85% performance improvement achieved
- [ ] System stable under load

### Week 4 Goals
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for production deployment

## Next Steps

1. **Immediate**: Create `operation-classifier.ts` service
2. **Day 1**: Implement classification logic
3. **Day 2**: Build light context pathway
4. **Day 3**: Begin testing with simple edits
5. **Day 4**: Measure and iterate

## Conclusion

This optimization plan will transform the context building system from a monolithic, one-size-fits-all approach to an intelligent, tiered system that provides exactly the context needed for each operation. The expected 80-90% performance improvement will make the system feel instant for most user operations while maintaining the intelligence needed for complex tasks.