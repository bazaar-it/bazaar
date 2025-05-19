// /memory-bank/sprints/sprint24/project1-ticket-analysis.md
# Project 1 Ticket Breakdown

This document expands on the three Project 1 tickets for Sprint 24. It collects information from `overview.md`, `project1-standard-workflow.md`, `project1_current_vs_ideal.md`, and `tickets.md` to outline implementation steps, trade‑offs, and testing considerations.

## BAZAAR-243: Refactor `chatOrchestration.service.ts`

**Goal:** Reduce the monolithic nature of `src/server/services/chatOrchestration.service.ts` and improve maintainability.

### Proposed Approach

1. **Extract LLM Communication**
   - Create `LLMService` under `src/server/services/llm/` to manage OpenAI calls.
   - Encapsulate streaming logic and retry handling.
   - Provide a simple interface `streamChat(projectId, messages)` returning an async iterator of chunks.

2. **Separate Tool Execution**
   - Move `handleApplyJsonPatch`, `handleGenerateComponent`, and `handlePlanScenes` into their own files within `src/server/services/tools/`.
   - Each tool handler should expose a single function and contain its own validation and logging.

3. **Scene Planning and Component Generation Flows**
   - Introduce `ScenePlanningService` and `ComponentGenerationService` to wrap `scenePlanner.service.ts` and `componentGenerator.service.ts` respectively.
   - `chatOrchestration.service.ts` becomes an orchestrator that calls these services via clear interfaces.

4. **Backward Compatibility**
   - Maintain current export names (`processUserMessage`, `handleClientReconnection`).
   - Keep SSE event structure in `src/types/chat.ts` unchanged while refactoring internals.

5. **Improved Error Handling**
   - Standardize error objects returned by all services.
   - Use a top‑level error handler in `processUserMessage` to convert internal errors into structured `EventType.ERROR` events.

6. **Testing**
   - Unit tests for each new service (LLM, tool handlers, scene planning, component generation) using Jest and mocking OpenAI calls.
   - Integration test for `processUserMessage` verifying streaming behaviour and tool execution order.
   - Ensure existing tests continue to pass (backwards compatibility).

### Trade‑offs & Considerations

- Splitting the file introduces more modules but improves clarity and enables targeted testing.
- Need to ensure streaming performance is not affected; keep the SSE emitter logic lightweight.
- Developers must update imports as services are relocated.

## BAZAAR-244: Implement Error Recovery for Component Generation Pipeline

**Goal:** Allow component generation (via `componentGenerator.service.ts` and workers) to resume after failures.

### Proposed Approach

1. **Checkpointing**
   - Extend the `customComponentJobs` table (`src/server/db/schema.ts`) with fields `checkpointData JSON` and `lastStep TEXT`.
   - At key steps (brief generation, code generation, build), persist progress and any intermediate artefacts.
   - Provide helper methods `saveCheckpoint(jobId, data)` and `loadCheckpoint(jobId)` in a new `componentJob.service.ts`.

2. **Retry with Backoff**
   - Wrap worker invocations (`generateComponentCode.ts`, `buildCustomComponent.ts`) with an exponential backoff utility.
   - Record retry count and failure reason in the job record.

3. **Manual Resumption**
   - Expose a tRPC procedure `components.resumeGeneration(jobId)` that loads the checkpoint and restarts processing.
   - UI button in the project editor to trigger this procedure for failed jobs.

4. **Detailed Error Context**
   - Include fields `errorMessage`, `stack`, and `failedStep` on job records.
   - When emitting SSE updates, attach these details for visibility in the UI.

5. **Tests**
   - Unit tests for checkpoint helpers.
   - Integration test simulating a failure during `generateComponentCode.ts` and verifying resume behaviour.
   - Ensure old jobs without checkpoints still process successfully (migration path).

### Trade‑offs & Considerations

- Checkpoint data increases DB storage but greatly aids reliability.
- Backoff delays may slow overall processing; choose sensible defaults (e.g., 1s, 2s, 4s).
- Manual resume should verify that the component code is still valid with the latest project state.

## BAZAAR-245: Enhance Real‑Time Feedback During Processing

**Goal:** Provide more granular and reliable SSE updates when generating components.

### Proposed Approach

1. **More Frequent Updates**
   - Emit status events at the start and completion of each step: brief generation, code generation, build, and upload.
   - Include progress percentages when possible (e.g., 0‑100% of build output processed).

2. **Detailed Stage Information**
   - Extend `StreamEvent` in `src/types/chat.ts` with an optional `stage` field describing the current processing phase.
   - Use `sceneStatus` events for scene planning steps and new `componentStage` events for component generation.

3. **Reconnection Support**
   - Leverage `eventBuffer.service.ts` to store recent events (already used for reconnection) and ensure component events are added to the buffer.
   - When `handleClientReconnection` is invoked, replay missed component events as well.

4. **UI Elements**
   - Update `PreviewPanel.tsx` and `ChatPanel.tsx` to display stage progress and show a resume option if connection drops.
   - Consider a small "progress" bar or toast notifications per component job.

5. **Integration Tests**
   - Test SSE event ordering and reconnection by simulating network interruptions in Jest using `@testing-library/react` and mocked event sources.
   - Validate that progress indicators in the UI reflect the final job state.

### Trade‑offs & Considerations

- More SSE events may increase network traffic but provide a better user experience.
- Ensure event buffering is bounded to avoid memory growth (respect `EventBufferConfig.maxBufferSize`).
- UI changes require coordination with design to maintain simplicity.

## Summary

Implementing these tickets lays the groundwork for a cleaner Project 1 architecture. Refactoring the orchestration service enables isolated testing and easier maintenance. Checkpointing and resumption make the component pipeline robust against failures. Improved SSE updates give users clearer insight into processing progress. Together these changes align Project 1 with the best practices outlined in the sprint documentation.
