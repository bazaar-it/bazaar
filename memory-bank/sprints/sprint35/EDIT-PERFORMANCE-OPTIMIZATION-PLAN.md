# Edit Performance Optimization Plan

## Current Performance: 60+ seconds ❌
## Target Performance: 15-20 seconds ✅

## Root Cause Analysis

### 1. Context Building Overhead (30-40% of time)
The ContextBuilder rebuilds EVERYTHING from scratch on every request:
- Fetches ALL scenes from database
- Loops through ALL scenes multiple times
- Manual text parsing for preferences
- No caching or persistence

### 2. Not Using ProjectMemoryService
Despite having a fully implemented memory system, ContextBuilder uses:
- In-memory Map() instead of persistent storage
- Manual preference extraction instead of AI-powered analysis
- No cross-session learning

## Immediate Optimizations (Quick Wins)

### 1. Fix ContextBuilder to Use ProjectMemoryService

```typescript
// contextBuilder.service.ts
import { projectMemoryService } from '../data/projectMemory.service';

private async getUserPreferences(projectId: string): Promise<UserPreferences> {
  // Use persistent storage instead of in-memory cache
  const dbPreferences = await projectMemoryService.getUserPreferences(projectId);
  
  // Convert to expected format
  return dbPreferences.reduce((acc, pref) => {
    acc[pref.key] = pref.value;
    return acc;
  }, {} as UserPreferences);
}

private async getSceneHistory(projectId: string): Promise<SceneHistory> {
  // Get from memory instead of rebuilding
  const relationships = await projectMemoryService.getSceneRelationships(projectId);
  
  return {
    previousScenes: [], // Only fetch if needed
    commonElements: relationships.map(r => r.relatedSceneId),
    stylePatterns: relationships.map(r => r.relationshipType),
    userFeedbackHistory: []
  };
}
```

### 2. Cache Context Between Requests

```typescript
// Add to ContextBuilder
private contextCache = new TTLCache<string, BuiltContext>(5 * 60 * 1000); // 5 min TTL

async buildContext(params): Promise<BuiltContext> {
  const cacheKey = `${params.projectId}-${params.userId}`;
  
  // Return cached context if fresh
  const cached = this.contextCache.get(cacheKey);
  if (cached && !this.hasSignificantChange(params, cached)) {
    console.log('[ContextBuilder] Using cached context');
    return cached;
  }
  
  // Build and cache
  const context = await this.buildFreshContext(params);
  this.contextCache.set(cacheKey, context);
  return context;
}
```

### 3. Lazy Load Scene Analysis

```typescript
// Only analyze scenes when needed
private async getCommonElements(projectId: string): Promise<string[]> {
  // Check memory first
  const stored = await projectMemoryService.getProjectMemory(
    projectId, 
    'SCENE_ANALYSIS'
  );
  
  if (stored && stored.confidence > 0.8) {
    return JSON.parse(stored.value);
  }
  
  // Only analyze if not in memory
  return this.analyzeScenes(projectId);
}
```

## Medium-Term Optimizations

### 1. Incremental Context Updates

Instead of rebuilding everything:
```typescript
// Track what changed
interface ContextDelta {
  newScenes?: string[];
  updatedPreferences?: Record<string, any>;
  newImages?: string[];
}

async updateContext(
  baseContext: BuiltContext, 
  delta: ContextDelta
): Promise<BuiltContext> {
  // Only update what changed
  if (delta.newScenes) {
    baseContext.sceneHistory.previousScenes.push(...delta.newScenes);
  }
  
  if (delta.updatedPreferences) {
    Object.assign(baseContext.userPreferences, delta.updatedPreferences);
  }
  
  return baseContext;
}
```

### 2. Parallel Processing

```typescript
// Current: Sequential
const scenes = await fetchScenes();
const prefs = await getPreferences();
const history = await getHistory();

// Optimized: Parallel
const [scenes, prefs, history] = await Promise.all([
  fetchScenes(),
  getPreferences(),
  getHistory()
]);
```

### 3. Smart Scene Analysis

```typescript
// Only analyze recent/relevant scenes
private async analyzeRelevantScenes(
  projectId: string, 
  editTarget: string
): Promise<SceneAnalysis> {
  // Get only the scene being edited + 2 most recent
  const relevantScenes = await db.select()
    .from(scenes)
    .where(
      or(
        eq(scenes.id, editTarget),
        sql`${scenes.order} >= (
          SELECT MAX(order) - 2 FROM ${scenes} 
          WHERE project_id = ${projectId}
        )`
      )
    );
  
  return this.extractPatterns(relevantScenes);
}
```

## Expected Performance Gains

### Before (60+ seconds):
- Context Building: 20-25s
- Tool Selection: 10-15s  
- Code Editing: 20-30s
- Response: 5s

### After Immediate Fixes (25-30 seconds):
- Context Building: 2-3s (cached/persistent)
- Tool Selection: 8-10s
- Code Editing: 15-20s
- Response: 2s

### After All Optimizations (15-20 seconds):
- Context Building: 1s (incremental)
- Tool Selection: 5s (optimized prompts)
- Code Editing: 10s (pre-warmed models)
- Response: 1s

## Implementation Priority

1. **Week 1**: Fix ContextBuilder to use ProjectMemoryService
2. **Week 1**: Add context caching between requests
3. **Week 2**: Implement lazy loading for scene analysis
4. **Week 3**: Add incremental updates
5. **Week 4**: Optimize parallel processing

## Testing & Validation

### Performance Benchmarks
```typescript
// Add timing to each stage
const metrics = {
  contextBuildTime: 0,
  toolSelectionTime: 0,
  codeEditTime: 0,
  totalTime: 0
};

// Log and track
console.log('[Performance]', metrics);
```

### A/B Testing
- Feature flag: `USE_OPTIMIZED_CONTEXT`
- Compare old vs new performance
- Track user satisfaction

## Conclusion

The 60+ second edit time is primarily due to rebuilding context from scratch on every request. By implementing persistent memory, caching, and incremental updates, we can achieve 3-4x performance improvement with minimal code changes.