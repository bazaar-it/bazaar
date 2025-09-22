# 2025-09-22 – Asset Context Scope Split

## Problem
- `ContextBuilder` merges project-linked assets with the user’s entire upload library when constructing `mediaLibrary`.
- Intent analyzer sees those user-only assets as drop-in ready, so media plans reference them.
- `MediaPlanService` guardrail then flags many URLs as `plan-skipped` because they are not linked to the active project, leaving generations under-specified.

## Decision
- Limit `mediaLibrary` to *project-linked* assets; expose user-wide uploads separately as `userLibrary` metadata so prompts can mention them without promising immediate reuse.
- Teach the media-plan resolver to resolve IDs only from the project set; user-library items require linking before use.
- Update prompt copy so LLM knows to request linking/clarification when only user-library matches exist.

## Tasks
1. Split `ContextPacket` types: `mediaLibrary.project` vs `mediaLibrary.userLibrary`.
2. Adjust context builder to populate the new structure (project assets primary, user uploads secondary).
3. Update intent analyzer prompt to note that user-library assets are available on request but not yet linked.
4. Update media-plan resolver to map tokens to URLs using the project subset only and flag user-library references for clarification.
5. Ensure Media Panel behaviour remains unchanged (still shows full user library).
6. Re-run suite (once env allows) to confirm reduced `plan-skipped` count.

## Open Questions
- Should resolver auto-link when the same user owns the asset? Leaving as manual follow-up.
- Do we need a per-asset flag for "link pending"? Might add if prompts need more nuance after observing new behaviour.
