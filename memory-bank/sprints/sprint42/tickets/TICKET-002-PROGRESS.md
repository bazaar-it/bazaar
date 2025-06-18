# TICKET-002 Progress: Universal Response Format

## Status: ✅ COMPLETED

## Summary
Successfully implemented a universal response format that standardizes ALL API responses across the system, making it impossible to return inconsistent data structures.

## Completed Tasks

### 1. Created UniversalResponse Type Definition ✅
**File**: `/src/lib/types/api/universal.ts` (Lines 1-96)
- Defined the core `UniversalResponse<T>` interface (lines 13-42)
- Created standardized `Operation` type (lines 45-53)
- Created `Entity` type (line 56)
- Implemented comprehensive `ErrorCode` enum (lines 59-81)
- Added type guards:
  - `isSuccessResponse` (lines 84-86)
  - `isErrorResponse` (lines 88-90)
- Created specialized response types (lines 93-96):
  - `SceneCreateResponse`
  - `SceneUpdateResponse`
  - `SceneDeleteResponse`
  - `SceneListResponse`

### 2. Created ResponseBuilder Helper Class ✅
**File**: `/src/lib/api/response-helpers.ts` (Lines 1-168)
- Built fluent API for creating consistent responses:
  - `ResponseBuilder` class (lines 18-123)
  - `success()` method (lines 30-48)
  - `error()` method (lines 53-78)
  - `withContext()` method (lines 83-95)
- Implemented request ID generation using crypto.randomUUID() (lines 4-12)
  - Initially considered nanoid, but per user feedback, used built-in crypto instead
- Added execution time tracking (lines 107-109)
- Created `getErrorCode()` helper function (lines 128-145)
- Implemented retryable error logic (lines 114-122)
- Added `logResponse()` helper for consistent logging (lines 150-168)

### 3. Created Client-Side Response Handler ✅
**File**: `/src/lib/api/client.ts` (Lines 1-144)
- Built `handleUniversalResponse` function for consistent client handling (lines 17-56)
- Added helper functions for extracting context data:
  - `getSuggestions()` - Extract AI suggestions (lines 61-63)
  - `getChatResponse()` - Extract chat messages (lines 68-70)
  - `getReasoning()` - Extract AI reasoning (lines 75-77)
- Implemented error handling utilities:
  - `isRetryableError()` - Check if error can be retried (lines 82-84)
  - `getRequestIdFromError()` - Extract request ID (lines 89-91)
- Added `formatExecutionTime()` for display formatting (lines 96-101)
- Included comprehensive example usage in comments (lines 103-144)

### 4. Created Example Router Implementation ✅
**File**: `/src/server/api/routers/generation.universal.ts` (Lines 1-390)
- Demonstrated UniversalResponse usage in real endpoints:
  - `generateScene` mutation (lines 121-308)
  - `removeScene` mutation (lines 313-389)
- Showed proper error handling patterns with try-catch blocks
- Implemented context enrichment (lines 278-284):
  - AI reasoning from brain decision
  - Chat response for user
  - Suggestions for next actions
- Maintained backward compatibility with existing tools
- Note: Line 77 still uses `existingCode` - to be fixed in TICKET-003

### 5. Created Comprehensive Test Suite ✅
**File**: `/src/lib/api/__tests__/universal-response.test.ts` (Lines 1-384)
- Full coverage of ResponseBuilder class (lines 17-120):
  - Success response creation
  - Error response creation
  - Context enrichment
  - Execution time tracking
- Tested all client-side handlers (lines 144-310):
  - `handleUniversalResponse` with success/error cases
  - Helper function tests (getSuggestions, getChatResponse, etc.)
  - Error callback and throw behavior
- Verified type guards work correctly (lines 312-383):
  - `isSuccessResponse` type guard
  - `isErrorResponse` type guard
- Tested error code detection (lines 122-142)
- Ensured consistent request ID generation with mocked crypto.randomUUID

## Key Decisions

1. **No External Dependencies**: Used crypto.randomUUID() instead of nanoid
2. **Backward Compatibility**: Example router shows how to wrap existing tools
3. **Type Safety**: Heavy use of TypeScript generics and type guards
4. **Consistent Field Names**: Always returns `tsxCode` (never code/existingCode)

## Benefits Achieved

1. **Consistency**: Every API response follows the same format
2. **Traceability**: Request IDs enable debugging across the stack
3. **Rich Context**: Responses can include reasoning and suggestions
4. **Type Safety**: TypeScript ensures correct usage
5. **Error Handling**: Standardized error codes and retry logic

## Integration Points

The UniversalResponse format integrates with:
- Database-generated types (TICKET-001)
- Future pure function tools (TICKET-003)
- Router-based DB operations (TICKET-004)
- Brain context building (TICKET-005)

## Example Usage

```typescript
// In router
const response = new ResponseBuilder();
try {
  const scene = await createScene(input);
  return response
    .success(scene, 'scene.create', 'scene', [scene.id])
    .withContext({
      reasoning: 'Created based on user prompt',
      suggestions: ['Edit the scene', 'Add another scene']
    });
} catch (error) {
  return response.error(
    getErrorCode(error),
    error.message,
    'scene.create',
    'scene'
  );
}

// In client
const scene = handleUniversalResponse(response, {
  onSuccess: (data, res) => {
    const suggestions = getSuggestions(res);
    showSuggestions(suggestions);
  },
  onError: (error) => {
    if (error.retryable) showRetryButton();
  }
});
```

## Next Steps

With UniversalResponse complete, the system now has:
- Consistent API responses ✅
- Request tracing ✅
- Rich error information ✅
- Context for AI decisions ✅

Ready to proceed with TICKET-003: Refactor Tools to Pure Functions