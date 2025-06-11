# Sprint 39: Quick Wins for Immediate Performance Improvement

## Overview

While the full context optimization plan is comprehensive, here are immediate changes that can be implemented TODAY to get significant performance improvements with minimal risk.

## Quick Win #1: Skip Context for Scene Errors (30 min fix)

### The Problem
When the autofixer runs for broken scenes, it builds full context even though it just needs the broken scene's code.

### The Fix
```typescript
// In orchestrator.ts - Add this check early in processUserInput
if (input.userContext?.isAutoFix && input.userContext?.sceneId) {
  // Skip context building for auto-fix operations
  const directResult = await this.executeDirectFix(input);
  return directResult;
}

private async executeDirectFix(input: OrchestrationInput) {
  const fixTool = this.toolRegistry.getTool(ToolName.FixBrokenScene);
  return await fixTool.run({
    projectId: input.projectId,
    sceneId: input.userContext.sceneId,
    errorMessage: input.userContext.errorMessage,
    userPrompt: input.prompt
  });
}
```

### Impact
- Autofixes will run in 2-3 seconds instead of 70 seconds
- No risk - autofixer already has all context it needs

## Quick Win #2: Cache Preferences Aggressively (1 hour fix)

### The Problem
User preferences rarely change but are fetched from DB on every request.

### The Fix
```typescript
// In contextBuilder.service.ts
class ContextBuilderService {
  // Use a longer TTL for preferences (24 hours)
  private preferenceCache = new Map<string, {
    data: UserPreferences;
    timestamp: number;
  }>();
  
  private readonly PREFERENCE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  
  async getUserPreferencesOptimized(projectId: string, userId: string) {
    const cacheKey = `${projectId}-prefs`;
    const cached = this.preferenceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.PREFERENCE_TTL) {
      console.log('[ContextBuilder] ⚡ Preference cache hit');
      return cached.data;
    }
    
    // Only fetch if not cached
    const preferences = await projectMemoryService.getUserPreferences(projectId);
    this.preferenceCache.set(cacheKey, {
      data: preferences,
      timestamp: Date.now()
    });
    
    return preferences;
  }
}
```

### Impact
- Saves 100-200ms per request
- Preferences are rarely updated, so 24-hour cache is safe

## Quick Win #3: Parallel Database Queries (2 hour fix)

### The Problem
Multiple sequential database queries add up to 500-1000ms.

### The Fix
```typescript
// In buildContextPacket method
async buildContextPacket(...) {
  console.log(`Orchestrator: 🏗️ Building context packet for project: ${projectId}`);
  
  try {
    // Run all queries in parallel instead of sequential
    const [
      storyboardSoFar,
      dbPreferences,
      sceneRelationships,
      imageAnalyses
    ] = await Promise.all([
      // Query 1: Scenes
      db.select({...}).from(scenes).where(eq(scenes.projectId, projectId)),
      
      // Query 2: Preferences  
      projectMemoryService.getUserPreferences(projectId),
      
      // Query 3: Scene relationships (if needed)
      this.getSceneRelationships(projectId),
      
      // Query 4: Image analyses (if needed)
      this.getImageAnalyses(projectId)
    ]);
    
    // Now build context with all data available
    const contextBuilderResult = await this.contextBuilder.buildContext({
      projectId,
      userId,
      storyboardSoFar,
      // ... rest of params
    });
    
    return contextBuilderResult;
  } catch (error) {
    // ... error handling
  }
}
```

### Impact
- Reduces database query time from 500-1000ms to 150-300ms
- No change in functionality, just faster

## Quick Win #4: Skip Context for Simple Edits (3 hour fix)

### The Problem
"Make text yellow" operations don't need full project context.

### The Fix
```typescript
// In orchestrator.ts
private readonly SIMPLE_EDIT_PATTERNS = [
  /^(make|change|set)\s+(text|color|background)\s+/i,
  /^(increase|decrease|adjust)\s+(duration|speed|size)/i,
  /^move\s+(up|down|left|right)/i,
];

private isSimpleEdit(prompt: string): boolean {
  return this.SIMPLE_EDIT_PATTERNS.some(pattern => pattern.test(prompt));
}

async processUserInput(input: OrchestrationInput) {
  // ... existing code ...
  
  // Check if this is a simple edit
  if (this.isSimpleEdit(input.prompt) && input.userContext?.sceneId) {
    console.log("Orchestrator: ⚡ Fast path for simple edit");
    
    // Build minimal context
    const minimalContext = {
      projectId: input.projectId,
      targetSceneId: input.userContext.sceneId,
      lastUserMessage: input.prompt,
      userPreferences: {}, // Empty for simple edits
      sceneList: [], // Not needed
      isFirstScene: false,
      realSceneCount: 1 // Approximate
    };
    
    // Skip directly to tool execution
    const toolSelection = {
      success: true,
      toolName: 'editScene',
      reasoning: 'Simple edit operation detected',
      targetSceneId: input.userContext.sceneId,
      editComplexity: 'surgical'
    };
    
    return await this.executeSingleTool(input, toolSelection, minimalContext);
  }
  
  // ... continue with full context path for complex operations
}
```

### Impact
- Simple edits complete in 3-5 seconds instead of 70 seconds
- Covers 60-70% of user operations

## Quick Win #5: Remove Duplicate Scene Queries (1 hour fix)

### The Problem
Scenes are queried in `buildContextPacket` and then again in `contextBuilder.buildContext`.

### The Fix
```typescript
// In contextBuilder.service.ts
interface BuildContextInput {
  projectId: string;
  userId: string;
  storyboardSoFar: Scene[]; // Already provided!
  userMessage?: string;
  imageUrls?: string[];
  chatHistory?: Message[];
  skipSceneQuery?: boolean; // New flag
}

async buildContext(input: BuildContextInput): Promise<BuiltContext> {
  // Skip scene query if scenes already provided
  const realScenes = input.skipSceneQuery 
    ? input.storyboardSoFar 
    : await this.getRealScenes(input.projectId);
    
  // ... rest of method
}

// In orchestrator.ts buildContextPacket
const contextBuilderResult = await this.contextBuilder.buildContext({
  projectId,
  userId,
  storyboardSoFar: storyboardSoFar as any,
  userMessage: conversationHistory[conversationHistory.length - 1]?.content,
  imageUrls: currentImageUrls,
  chatHistory: conversationHistory,
  skipSceneQuery: true // ADD THIS
});
```

### Impact
- Saves 100-200ms per request
- Eliminates redundant database query

## Implementation Priority

1. **TODAY**: Implement Quick Wins #3 and #5 (Parallel queries + Remove duplicates)
   - Lowest risk, immediate 30-40% improvement

2. **TOMORROW**: Implement Quick Win #4 (Skip context for simple edits)  
   - Medium risk, 80-90% improvement for common operations

3. **THIS WEEK**: Implement Quick Wins #1 and #2 (Autofix + Cache)
   - Low risk, targeted improvements

## Measuring Success

Add this logging to track improvements:

```typescript
// In processUserInput
const startTime = Date.now();
const contextStartTime = Date.now();
const contextPacket = await this.buildContextPacket(...);
const contextTime = Date.now() - contextStartTime;

// ... rest of operation ...

const totalTime = Date.now() - startTime;
console.log(`[Performance] Operation: ${input.prompt.substring(0, 30)}...`);
console.log(`[Performance] Context build: ${contextTime}ms`);
console.log(`[Performance] Total time: ${totalTime}ms`);
console.log(`[Performance] Context %: ${((contextTime/totalTime)*100).toFixed(1)}%`);
```

## Expected Results

With just these quick wins:

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Simple Edit | 70s | 5s | 93% |
| Add Scene | 70s | 40s | 43% |
| Autofix | 70s | 3s | 96% |
| Complex Edit | 70s | 45s | 36% |

## Next Steps

1. Implement Quick Wins #3 and #5 first (parallel queries)
2. Test with "make text yellow" type commands
3. Monitor performance logs
4. Roll out remaining quick wins
5. Then proceed with full optimization plan

These quick wins provide immediate relief while the comprehensive optimization plan is implemented over the coming weeks.