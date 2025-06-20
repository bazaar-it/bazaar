# Duplicate Message Issue

## Problem Description
Chat messages sometimes appear duplicated in the UI - the same message appears twice with different styling (gray vs blue).

## Root Cause Analysis

### Message Flow
1. **User sends message** → ChatPanelG creates user message in VideoState
2. **ChatPanelG creates temporary assistant message** with ID format: `assistant-{timestamp}`
3. **Server processes request** and saves response to database with proper UUID
4. **Database sync occurs** → Both messages (temporary and database) appear because they have different IDs

### Current Deduplication Logic
The `syncDbMessages` function in `videoState.ts` attempts deduplication by:
- Comparing message IDs (exact match)
- Comparing content keys: `${isUser ? 'user' : 'assistant'}-${first50chars}`

However, this fails because:
- Temporary message: `id: "assistant-1750313970326"`
- Database message: `id: "782c580a-dc1d-4699-a1e9-f29930e81451"`
- Both have same content but different IDs

## Impact
- Visual duplication of assistant messages
- Confusing UX with same message appearing twice
- Inconsistent message styling (temporary vs synced)

## Proposed Solutions

### Option 1: Update Temporary Message ID
When the server response includes the real database message ID:
1. Update the temporary message's ID to match the database ID
2. This would allow exact ID matching during sync

### Option 2: Enhanced Deduplication
Improve the deduplication logic to:
1. Track temporary message IDs separately
2. Match temporary messages with database messages by timestamp + content
3. Replace temporary messages with database messages during sync

### Option 3: Prevent Temporary Messages
Instead of creating temporary assistant messages:
1. Show a loading indicator separately from the message list
2. Only add the assistant message once it's saved to the database
3. This eliminates the duplication entirely

## Related Code Locations
- Message creation: `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:209-215`
- Deduplication logic: `/src/stores/videoState.ts:340-424`
- Message sync: `WorkspaceContentAreaG.tsx:343`

## Temporary Workaround
Users can refresh the page to clear temporary messages and show only database-synced messages.