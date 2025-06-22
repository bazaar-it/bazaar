# Unused Features in Context System

## User Preferences - The Ghost Feature

### The Shocking Truth
After deep analysis, I found that **USER_PREFERENCES ARE NEVER WRITTEN**:

1. **No Write Code Exists**: 
   - `getUserPreferences()` exists to read
   - No code anywhere calls `saveMemory()` with `USER_PREFERENCE` type
   - The feature is 100% read-only from an empty table

2. **Always Returns Empty**:
   ```typescript
   // This ALWAYS returns {}
   const userPreferences = await projectMemoryService.getUserPreferences(projectId);
   ```

3. **Database Queries for Nothing**:
   - Every context build queries the projectMemory table
   - Filters for USER_PREFERENCE type
   - Returns 0 rows
   - Builds empty object
   - Passes to Brain which ignores it

### Why This Exists
Classic case of "we might need it someday":
- Developer thought "AI should learn user preferences"
- Built complete infrastructure
- Never implemented the actual preference extraction
- Left the dead code in production

## Image Analysis - The Abandoned Feature

### Another Ghost Feature
The `imageAnalysis` table and related code is completely unused:

1. **Async Analysis Never Runs**:
   ```typescript
   async startAsyncImageAnalysis(params) {
     // Generate a trace ID
     const traceId = `img-analysis-${Date.now()}...`;
     
     // Fire and forget - analysis happens in background
     // In a real implementation, this would queue a job
     // For now, we'll just log it
     console.log('[ProjectMemory] Queued async image analysis:', {...});
     
     return traceId;
   }
   ```
   **That's it!** Just logs and returns. No actual analysis.

2. **saveImageFacts() Never Called**:
   - Method exists to save analysis results
   - But since analysis never runs, it's never called
   - Table remains empty

3. **getProjectImageAnalyses() Returns Empty**:
   - Queries empty table every time
   - Returns `[]`
   - Passed to context, ignored by Brain

### The Original Vision
Comments suggest the plan was:
1. User uploads image
2. Background job analyzes for colors, mood, layout
3. Results stored for future reference
4. Brain uses this for consistency

**Reality**: None of this was implemented.

## Scene Relationships - Another Dead Feature

The projectMemory table has a `SCENE_RELATIONSHIP` type that:
- Has a getter method `getSceneRelationships()`
- Is never written to
- Is never queried in context building
- Represents another abandoned idea

## The Cost of Ghost Features

### Per Request Cost
1. **Database Queries**: 2 unnecessary queries (preferences + analyses)
2. **Network Time**: ~20ms of latency
3. **CPU Time**: Building empty objects
4. **Memory**: Storing empty structures
5. **Tokens**: ~170 tokens of empty data

### Development Cost
1. **Complexity**: ProjectMemoryService with unused methods
2. **Database Schema**: Tables that serve no purpose
3. **Maintenance**: Developers afraid to delete "might be important"
4. **Confusion**: New developers wondering what preferences are

## Why These Features Failed

### User Preferences
- **Too Abstract**: What preferences to track?
- **No Clear Use Case**: How would they improve generation?
- **No Extraction Logic**: Who decides what's a preference?

### Image Analysis
- **Over-Engineered**: Async job system for simple need
- **Wrong Focus**: Tools are already multimodal
- **Complexity**: Background jobs for marginal benefit

## The Real Need vs The Built Solution

### What Users Need
"Make scene 2 look like scene 1"

### What Was Built
- Complex preference tracking system (unused)
- Async image analysis pipeline (unused)  
- Scene relationship storage (unused)
- Memory expiration system (unused)

### What Should Have Been Built
Pass scene 1's code to the edit tool.

## Recommendation

Delete all of it:
1. Remove `userPreferences` from context
2. Remove `imageAnalyses` from context  
3. Delete `projectMemoryService` entirely
4. Drop the unused database tables
5. Use those saved tokens for actual scene code

The system would be faster, simpler, and more useful without these ghost features.