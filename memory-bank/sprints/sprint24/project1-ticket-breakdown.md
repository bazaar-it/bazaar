// /memory-bank/sprints/sprint24/project1-ticket-breakdown.md
# Project 1 - Detailed Ticket Breakdown for Sprint 24

This document expands the Project 1 tickets defined in `tickets.md`. It provides step-by-step guidance, key considerations, and testing recommendations so the team can implement each task with minimal uncertainty.

## BAZAAR-243: Refactor chatOrchestration.service.ts

### Goal
Break the large `chatOrchestration.service.ts` into composable services while keeping the existing API surface for callers.

### Implementation Outline
- **Extract LLM communication**
  - Create `LLMService` (`src/server/services/llm.service.ts`) handling prompt assembly and streaming interaction with OpenAI.
  - Move token accounting and model selection logic here.
- **Introduce ToolExecutionService**
  - Dedicated module responsible for executing tool calls returned by the LLM.
  - Should dispatch to existing helpers such as `componentGenerator.service.ts` and `scenePlanner.service.ts`.
- **Separate orchestration flows**
  - Scene planning and component generation should become distinct functions invoked by the main service.
  - `processUserMessage` becomes a thin coordinator calling `LLMService` and `ToolExecutionService`.
- **Improve error handling**
  - Wrap each stage in `try/catch` and emit structured errors via SSE.
  - Use typed error classes to distinguish user facing errors from system errors.
- **Maintain backward compatibility**
  - Keep exported function names and parameters the same.
  - Add deprecation comments for any internal helpers that will be removed later.

### Key Considerations & Trade-offs
- Smaller services improve testability but introduce more files and dependency wiring.
- Streaming responses must remain uninterrupted; carefully manage async flows when splitting modules.
- Ensure database transactions remain consistent across new service boundaries.

### Testing Approach
- Unit tests for `LLMService` mocking OpenAI responses.
- Unit tests for `ToolExecutionService` verifying correct dispatch to tools.
- Integration test for `processUserMessage` covering streaming flow and SSE emission.
- Regression tests to prove existing consumers (e.g., `chat.sendMessage`) behave identically.

### Affected Areas
- `src/server/services/chatOrchestration.service.ts`
- New files under `src/server/services/`
- Test suites under `src/server/services/__tests__/`

## BAZAAR-244: Implement error recovery for component generation pipeline

### Goal
Allow component generation to resume from the last successful step after a failure.

### Implementation Outline
- **Persist generation stages**
  - Extend `customComponentJobs` table with fields such as `lastSuccessfulStep`, `errorContext`, and timestamps for each step.
  - Update `componentGenerator.service.ts` to write progress after code generation, build, and validation steps.
- **Retry and backoff logic**
  - Add a `retryCount` and `nextRetryAt` field to the job record.
  - Implement exponential backoff when reprocessing failed jobs.
- **Manual resume capability**
  - Expose a procedure (e.g., `customComponent.resumeJob(jobId)`) that loads state and continues from the recorded step.
  - Emit detailed SSE messages so the UI can surface recovery options.
- **Detailed error context**
  - Capture worker errors, stack traces, and LLM responses for troubleshooting.
  - Store this context in a structured JSON column.

### Key Considerations & Trade-offs
- Additional DB writes may impact performance; ensure writes are batched or transactionally safe.
- Consider how long intermediate build artifacts should persist (cleanup policy).
- Backward compatibility requires a migration script for the new columns with defaults.

### Testing Approach
- Unit tests simulating failures at each stage and verifying job status updates.
- Integration test running the full pipeline with induced failures and a manual resume.
- Tests for retry backoff timing using mocked timers.

### Affected Areas
- `src/server/services/componentGenerator.service.ts`
- Worker scripts in `src/server/workers/`
- Database schema and migration files

## BAZAAR-245: Enhance real-time feedback during processing

### Goal
Provide users with clearer insight into long running operations by emitting more granular SSE events and supporting reconnection.

### Implementation Outline
- **Fine-grained progress events**
  - Define consistent event types (e.g., `component.build.start`, `component.build.complete`).
  - Emit events from `componentGenerator.service.ts` and related workers at each significant step.
- **Reconnection support**
  - Persist the last sent event ID for each SSE stream.
  - When a client reconnects with `Last-Event-ID`, resume emitting from the next event.
- **UI updates**
  - Update the editor interface to show current stage, percentage complete, and allow retry when failures occur.
  - Provide visual indicators (spinners, progress bars) tied to the new events.
- **Integration tests for connection interruptions**
  - Simulate network drops in tests to ensure the client receives remaining events after reconnecting.

### Key Considerations & Trade-offs
- More frequent events increase network chatter but greatly improve perceived responsiveness.
- Reconnection logic must avoid duplicate side effects; ensure idempotent handlers on the client.

### Testing Approach
- Unit tests for the SSE manager verifying event buffering and resend on reconnect.
- Integration tests using mocked EventSource clients to mimic disconnects.
- UI tests validating progress updates in the browser (can be done with Playwright or Cypress in the future).

### Affected Areas
- `src/server/services/eventBuffer.service.ts`
- `src/server/services/componentGenerator.service.ts`
- Client-side SSE handling in editor components

---

With these detailed tasks, the team can systematically tackle Project 1 improvements in Sprint 24. Each ticket now includes concrete steps, considerations, and testing plans to reduce ambiguity and accelerate implementation.

