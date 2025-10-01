# Assistant Message Consistency Deep Dive (2025-09-30)

## Summary
Assistant messages in ChatPanelG routinely change after a manual refresh because the system hands different content to the UI at several points in the pipeline. Right after a generation completes, the client renders the LLM's `decision.chatResponse`. Seconds later, the server overwrites that same database row with a standardized `formatSceneOperationMessage` string, and subsequent syncs replace the optimistic client copy with the new text. The dedup logic in `videoState.syncDbMessages` keys on content instead of ID, so the competing strings briefly coexist in local state and get filtered in ad-hoc ways. Result: users see one assistant response initially, a different one after refresh, and occasional duplicate bubbles during the sync window.

## What we observed
- tRPC `generateScene` returns `context.chatResponse` (raw LLM text) even though it immediately stores a sanitized version and later replaces the DB content with `formatSceneOperationMessage`.
- `ChatPanelG` calls `addAssistantMessage(projectId, assistantMessageId, aiResponse)` using that `context.chatResponse`, so the local store shows the raw LLM message first.
- `messageService.createMessage` writes `safeChat` to `bazaar-vid_message`. After the tool executes, `generateScene` calls `db.update(messages).set({ content: betterMessage })` with the formatted operation string.
- `syncDbMessages` always seeds the merged list with the DB records, then re-adds any client messages whose content does not match. Because the text changes, both versions are kept (same UUID, different content) until the component-level `uniqueMessages` filter tosses the duplicate by ID.
- Database rows show the overwrite in practice:
  - `1ed05135-b85e-4e99-9a59-9f2695ade0f1` — content is the long LLM answer (starts "I'll build a multi-scene hero video…"), `createdAt` 17:55, `updatedAt` 17:59 (post-tool update).
  - `5675ef20-17b9-4668-9fbf-99aff37a0463` — final content "Created \"Https://cluely.com\"", `updatedAt` ~29 seconds after creation.

## Pipeline with competing sources of truth
1. **SSE route (`/api/generate-stream`)** persists the user message and emits `ready`.
2. **Client mutation** invokes `generateScene`. On success it:
   - pulls `assistantMessageId` from the response,
   - adds an optimistic assistant message with `context.chatResponse` (LLM text), and marks it success.
3. **Server mutation (`generateScene`)** simultaneously:
   - sanitizes the LLM text (`safeChat`) and stores it in the DB (source #2),
   - after the tool runs, builds `betterMessage = formatSceneOperationMessage(...)` and updates the same row (source #3),
   - returns the original `decision.chatResponse` to the client (source #1).
4. **Sync loop (`syncDbMessages`)** merges DB + client messages. Because the payloads differ, both versions survive the merge until the component filters duplicates strictly by ID.
5. **Manual refresh** reloads from DB only, so users now see the standardized `formatSceneOperationMessage` text instead of the earlier LLM paragraph.

## Why the assistant feels erratic
- The UI renders whichever version it receives last; there is no single canonical message body.
- Optimistic updates lag the DB overwrite, so the bubble can flip content once the sync runs.
- `syncDbMessages` does not trust IDs; it dedups by 50-character content windows, so any wording change produces transient duplicates and status mismatches.
- Streaming flows (website-to-video) introduce a fourth variant: locally generated UUIDs with incremental chunks that are never persisted, compounding confusion when refreshed.

## Impact
- Users see different assistant messages before/after refresh and during long generations, eroding trust.
- Duplicate entries with identical timestamps surface while syncing, making the chat feel noisy.
- Status fields oscillate (`pending` → `success` → `pending`) because the optimistic copy never receives the final update payload.

## Recommendations
1. **Decide on the authoritative message body.** Either return the formatted string to the client or stop rewriting the DB record. If we want the operation summary, expose it directly in the mutation response (`context.chatResponse = betterMessage`) so the optimistic message matches what persists.
2. **Prefer ID-based reconciliation.** Update `syncDbMessages` to prioritize DB entries by ID and drop/merge optimistic twins regardless of content differences.
3. **Surface streaming vs persisted messages explicitly.** For website-to-video, tag the temporary UUIDs so `syncDbMessages` can discard them once the real DB message arrives.
4. **Audit status transitions.** Ensure we call `updateMessage` with the final status/content when the mutation resolves so the optimistic copy mirrors DB state even before the sync.

## Next steps
- Align on which message variant we want users to see (LLM narrative vs standardized summary).
- Implement ID-first reconciliation in `videoState.syncDbMessages` and add telemetry for message overwrite timing.
- Once the behavior is confirmed, update ChatPanelG to render a "pending" bubble until the reconciled message arrives, reducing visual flips.
