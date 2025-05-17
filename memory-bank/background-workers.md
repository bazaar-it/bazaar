# Background Worker Analysis and Optimization Plan

This document outlines the background workers in the Bazaar-Vid application that perform polling, their impact on database load, and a plan to optimize their behavior.

## Identified Polling Workers

Based on codebase analysis, the following workers are primary contributors to database load via polling:

1.  **`CodeGenWorker`**
    *   **File**: `src/server/cron/codeGenWorker.ts`
    *   **Function**: `startCodeGenWorker()` using `setInterval()`
    *   **Purpose**: Polls the database for component jobs with status `queued_for_generation`. It then processes these jobs through an AI model for code generation and updates their status in the database.
    *   **Key DB Interaction**: `SELECT` jobs by status, `UPDATE` job status and code.
    *   **Default Polling Interval**: Determined by `POLL_INTERVAL_MS` in the file (typically 5-10 seconds if not overridden by `.env`).

2.  **`BuildWorker`**
    *   **File**: `src/server/cron/buildWorker.ts`
    *   **Function**: `startBuildWorker()` using `setInterval()`
    *   **Purpose**: Polls the database for component jobs that have AI-generated code (status `generated` or `queued_for_build`). It builds/bundles this code, uploads artifacts to R2, and updates the job status and R2 URL in the database.
    *   **Key DB Interaction**: `SELECT` jobs by status, `UPDATE` job status and `outputUrl`.
    *   **Default Polling Interval**: Determined by `POLL_INTERVAL_MS` in the file.

3.  **`TaskProcessor` (A2A Service)**
    *   **File**: `src/server/services/a2a/taskProcessor.service.ts`
    *   **Function**: `TaskProcessor.start()` using `setInterval()`
    *   **Purpose**: Manages the lifecycle of Agent-to-Agent (A2A) tasks. It polls for pending A2A tasks, orchestrates agent workflows, and updates task progress in the database.
    *   **Key DB Interaction**: `SELECT` A2A tasks by status, `UPDATE` task status, results, and related artifacts.
    *   **Default Polling Interval**: Determined by `this.POLL_INTERVAL_MS` in the class.

## Other `setInterval` Users (Lower Impact or Non-Polling)

*   **`EventBufferService` (`src/server/services/eventBuffer.service.ts`)**: Uses `setInterval` for a `cleanup()` method (e.g., every 60 seconds). Its impact on the DB depends on whether `cleanup()` involves DB writes. If so, it could be a minor periodic load.
*   **`SSEManagerService` (`src/server/services/a2a/sseManager.service.ts`)**: Uses `setInterval` for SSE heartbeats. This is unlikely to cause significant DB load unless heartbeats are logged to the DB, which is not standard practice.

## Problems Caused by Current Polling

*   **High Database Load**: Frequent, concurrent polling from multiple workers can overwhelm the database, especially on plans with rate limits (like Neon's free tier).
*   **Rate Limiting**: Leads to errors like "You've exceeded the rate limit," affecting not just workers but also user-facing operations (e.g., login).
*   **Inefficiency**: Workers query the DB even if there's no new work.

## Optimization Plan: Smarter Polling

The following improvements will be implemented for `CodeGenWorker`, `BuildWorker`, and `TaskProcessor`:

1.  **Respect Environment Variables for Control**:
    *   Ensure all workers honor `DISABLE_BACKGROUND_WORKERS` from `.env.local`. If true, the worker should not start its polling loop.
    *   Use `env.WORKER_POLLING_INTERVAL` (for cron workers) and `env.TASK_PROCESSOR_POLLING_INTERVAL` (for A2A task processor) if these values are set in `.env.local`. Fall back to a sensible default (e.g., 15-30 seconds) if not set.

2.  **Implement Exponential Backoff**:
    *   When a polling query returns no jobs/tasks, the worker will increase its wait time for the *next* polling interval (e.g., double it, up to a maximum like 5 minutes).
    *   The interval resets to the configured base when work is found.
    *   This significantly reduces queries during idle periods.

3.  **Staggered Worker Start Times**:
    *   Introduce a small, random delay (e.g., 0 to 5 seconds) before each worker starts its initial polling loop. This helps prevent all workers from querying the database at the exact same millisecond, especially on application startup.

4.  **Clear Logging**: Add clear log messages indicating the active polling interval, when backoff is engaged/disengaged, and if a worker is disabled via environment variable.

## Future Considerations (Long-Term)

*   **Transition to Message Queues**: For a more robust and scalable solution, replace polling with a message queue system (e.g., Redis Streams, BullMQ, RabbitMQ).
*   **Database Eventing/Notifications**: Explore if Neon or Drizzle can support push-based notifications for new data, reducing the need for active polling.

This plan aims to significantly reduce unnecessary database load, making the application more stable and performant, while setting the stage for further architectural improvements.
