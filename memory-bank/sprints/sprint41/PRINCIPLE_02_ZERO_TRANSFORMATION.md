# Principle 02: Zero Transformation

## The Principle
**Use database field names everywhere.** No mapping, no transformation, no translation layers.

## Why This Matters
1. **Performance**: No CPU cycles wasted on field mapping
2. **Debugging**: What you see is what's stored
3. **Type Safety**: One source of truth for types
4. **Simplicity**: No mental model translation

## Current Violation
```typescript
// ❌ WRONG: Field transformation
// Tool returns
{ sceneCode: "..." }

// Database expects
{ tsxCode: "..." }

// Requires mapping layer
const dbData = {
  tsxCode: toolResult.sceneCode // Unnecessary!
}
```

## Correct Implementation
```typescript
// ✅ RIGHT: Direct match
// Tool returns
{ tsxCode: "..." }

// Database stores
{ tsxCode: "..." }

// Direct save
await db.insert(scenes).values(toolResult);
```

## Field Names to Standardize
- `tsxCode` (not sceneCode, code, or componentCode)
- `layoutJson` (not layout, layoutData, or sceneLayout)
- `createdAt` (not created, timestamp, or createdDate)
- `projectId` (not project, project_id, or projectID)

## How to Fix
1. Update all type definitions to match DB schema
2. Change tool outputs to use DB field names
3. Remove all mapping functions
4. Update tests to expect DB field names

## Benefits
- Zero runtime overhead
- Clearer data flow
- Fewer bugs from mismatched fields
- Easier onboarding (one set of names to learn)

## Success Criteria
- grep for "sceneCode" returns 0 results
- No field mapping functions exist
- Types match database schema exactly
- Direct pass-through from tools to DB