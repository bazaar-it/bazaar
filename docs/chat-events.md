// docs/chat-events.md
# Chat Stream Events

This document lists the Server Sent Event (SSE) payloads emitted by `chat.ts` / `chatStream.ts`.

| Event type | Shape | Emitted by | Typical cadence |
|-----------|-------|------------|-----------------|
| `delta` | `{content:string}` | OpenAI stream loop | ≤ 1 token |
| `tool_start` | `{name:string}` | router | once per tool |
| `sceneStatus` | `{sceneId,status,jobId}` | build worker | ~3 per scene |
| `finalized` | `{status}` | router | once |

These events are mirrored in `src/types/chat-events.ts` so both front-end and server share typings.
