# Deep Dive: Context System Cost Analysis

## The Real Cost of contextBuilder.buildContext()

### Database Query Count

When `contextBuilder.buildContext()` is called, here's the exact database cost:

1. **Scene Query** (1 query)
   ```typescript
   db.select({ id, name, order })
     .from(scenes)
     .where(eq(scenes.projectId, input.projectId))
   ```

2. **User Preferences Query** (1 query via projectMemoryService)
   ```typescript
   db.select()
     .from(projectMemory)
     .where(
       and(
         eq(projectMemory.projectId, projectId),
         eq(projectMemory.memoryType, MEMORY_TYPES.USER_PREFERENCE)
       )
     )
   ```

3. **Image Analyses Query** (1 query via projectMemoryService)
   ```typescript
   db.select()
     .from(imageAnalysis)
     .where(eq(imageAnalysis.projectId, projectId))
     .orderBy(desc(imageAnalysis.createdAt))
   ```

4. **Messages Query for Image Context** (1 query)
   ```typescript
   db.select()
     .from(messages)
     .where(eq(messages.projectId, input.projectId))
     .orderBy(desc(messages.sequence))
     .limit(20)
   ```

**Total: 4 database queries per context build**

### Parallel vs Sequential

The code uses `Promise.all()` for preferences and image analyses, so:
- Queries 1, 2+3, 4 run in sequence
- Actual time: ~3 sequential roundtrips to database

### Where Context Data Comes From

1. **chatHistory**: 
   - Source: `scene-operations.ts` fetches last 10 messages from database
   - Cost: Additional query in the router (not counted above)
   - Purpose: Passed to Brain for understanding conversation flow

2. **storyboardSoFar**:
   - Source: `scene-operations.ts` fetches all scenes with full TSX code
   - Contains: id, name, duration, order, tsxCode (but code not passed to context)
   - Purpose: Scene metadata for Brain decision making

3. **userPreferences**:
   - Source: `projectMemory` table where `memoryType = 'USER_PREFERENCE'`
   - Reality: **EMPTY** - No code ever writes user preferences!
   - Returns: Empty object `{}`

4. **imageAnalyses**:
   - Source: `imageAnalysis` table
   - Reality: **NEVER POPULATED** - The async analysis is logged but never executed
   - The `startAsyncImageAnalysis` method just logs and returns
   - Returns: Empty array `[]`

5. **conversationContext**:
   - Source: Simple string parsing of last 10 messages
   - Logic: Looks for keywords like "create", "edit", "color"
   - Returns: Generic strings like "Conversation about: scene creation, styling"

6. **imageContext**:
   - Source: Scans last 20 messages for metadata.imageUrls
   - Purpose: Track which images were uploaded when
   - Actually useful for "use the first image" references

## What Actually Gets Used

Looking at `intentAnalyzer.buildUserPrompt()`, here's what's actually used:

### USED ✓
1. **storyboard metadata** (names, IDs, order, duration)
2. **imageContext.conversationImages** (for image position tracking)
3. **conversationContext** (passed but minimal value)
4. **last5Messages** (passed to Brain in the prompt)
5. **current imageUrls** (if provided with current request)

### NEVER USED ✗
1. **userPreferences** - Built, passed, but never referenced
2. **imageAnalyses** - Built, passed, but never referenced
3. **sceneHistory** vs **sceneList** - Duplicate information
4. **pendingImageIds** - Always empty array

## The Conversation Summary Implementation

The `summarizeConversation` method is shockingly primitive:

```typescript
private summarizeConversation(chatHistory: Array<{role: string, content: string}>): string {
  // Only looks at last 10 messages
  // Only checks user messages
  // Only looks for exact keyword matches:
  if (message.content.includes('create') || message.content.includes('generate')) {
    topics.push('scene creation');
  }
  if (message.content.includes('edit') || message.content.includes('change')) {
    topics.push('scene editing');
  }
  if (message.content.includes('color') || message.content.includes('background')) {
    topics.push('styling');
  }
  
  // Returns: "Conversation about: scene creation, styling"
}
```

This provides almost no value to the AI and could be replaced with "User is creating scenes".

## Wasted Effort Analysis

### Time Cost (estimated)
- Scene query: ~10ms
- User preferences query: ~10ms (returns nothing)
- Image analyses query: ~10ms (returns nothing)
- Messages query: ~15ms
- Building context object: ~5ms
- **Total: ~50ms of mostly wasted time**

### Token Cost
The context packet adds approximately:
- userPreferences: `{}` - 20 tokens
- imageAnalyses: `[]` - 20 tokens
- conversationContext: ~30 tokens
- Duplicate scene data: ~100 tokens
- **Total: ~170 wasted tokens per request**

### Development Cost
- Complex service layer (projectMemoryService)
- Database tables that are never used
- Async patterns for features that don't exist
- Maintenance burden of unused code

## The Real Problem

The system spends effort building context that:
1. **Doesn't include what's needed**: Scene TSX code for cross-references
2. **Includes what's not needed**: Empty preferences, unused analyses
3. **Duplicates information**: sceneHistory vs sceneList
4. **Over-abstracts simple needs**: Complex memory system for nothing

## What Context Building Should Be

```typescript
async buildContext(input) {
  // 1. Get scenes WITH code when needed
  const scenes = await db.select().from(scenes)
    .where(eq(scenes.projectId, input.projectId));
  
  // 2. Get recent messages for image tracking
  const recentMessages = await getRecentMessages(input.projectId);
  
  // 3. Return only what's used
  return {
    scenes: scenes.map(s => ({
      id: s.id,
      name: s.name,
      tsxCode: shouldIncludeCode(input.prompt) ? s.tsxCode : undefined
    })),
    imageContext: extractImageContext(recentMessages),
    // That's it!
  };
}
```

## Conclusion

The context system is a perfect example of speculative generality:
- Built for imagined future needs
- Queries empty tables
- Passes unused data
- Missing actual requirements

Every request pays the cost of this over-engineering while basic features like "match the previous scene" don't work.