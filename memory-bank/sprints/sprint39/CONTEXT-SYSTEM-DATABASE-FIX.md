# Context System Database Fix

## Issue
The context builder is failing because:
1. It was calling `projectMemoryService.storeUserPreference()` which doesn't exist
2. The actual method is `projectMemoryService.saveMemory()`

## Fix Applied
Updated `contextBuilder.service.ts` to use the correct method:
```typescript
// OLD (incorrect)
await projectMemoryService.storeUserPreference(projectId, key, value, confidence);

// NEW (correct)
await projectMemoryService.saveMemory({
  projectId,
  memoryType: 'user_preference',
  memoryKey: key,
  memoryValue: String(value),
  confidence: 0.8
});
```

## Database Requirements
The context system requires these tables:
- `project_memory` - Stores user preferences and context
- `image_analysis` - Stores image analysis results

## Migration Check
These migrations add the required tables:
- `0023_add_project_memory_tables.sql`

## To Fix the Error
Run the database migrations:
```bash
npm run db:migrate
```

This will create the missing tables and the context system will work properly.

## What These Tables Do
1. **project_memory**: Stores learned user preferences
   - Animation speed preferences
   - Style preferences (minimal, detailed)
   - Duration preferences
   - Any other learned patterns

2. **image_analysis**: Stores async image analysis results
   - Color palettes
   - Typography analysis
   - Mood detection
   - Layout analysis

The context builder uses these to provide rich context to the AI for better scene generation.