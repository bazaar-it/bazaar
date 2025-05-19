// /memory-bank/sprints/sprint24/logging_investigation_and_strategy.md
# BAZAAR-261: Logging Investigation and Strategy Documentation

This document outlines the investigation into the current logging practices within the Bazaar-Vid application, identifies key issues, and will serve as a basis for proposing a sustainable logging strategy. Its goal is to address the concerns raised in ticket BAZAAR-261.

## 1. Current Logging Setup & Mechanisms

Based on an initial review of `src/lib/logger.ts`:

### 1.1. Core Logging Libraries/Utilities
- **Winston:** The primary logging library used is `winston`.
- **Multiple Logger Instances:** The system defines and exports multiple specialized Winston logger instances. Key examples include:
    - `logger`: General purpose application logger.
    - `a2aLogger`: Dedicated logger for the Agent-to-Agent (A2A) system, with custom logging methods for A2A events (e.g., `taskCreate`, `agentReceive`, `agentProcess`).
    - `componentsLogger`: For component generation/worker related logs.
    - Other specialized loggers: `chatLogger`, `authLogger`, `pageLogger`, `apiLogger`, `cronLogger`, `workerLogger`, `dbLogger`, `toolsLogger`, `agentLogger`, `modelsLogger`, `componentLogger` (distinct from `componentsLogger`), `scenePlannerLogger`, `buildLogger`, `animationDesignerLogger`.
- **Server vs. Client Distinction:** Logging behavior differs:
    - **Server-Side:** More comprehensive, utilizes multiple transports.
    - **Client-Side:** Simpler, typically logs to the browser console only.

### 1.2. Configuration
- **Log Levels:** Configurable, with defaults like 'debug' for file transports and 'info' for console on the server. Client-side defaults to 'info'.
- **Log Formats:**
    - `consoleFormat`: For console output. Includes colorization, timestamp, log level, message, and stringified metadata.
    - `fileFormat`: For file output. Includes timestamp and outputs the entire log entry as JSON (good for structured data).
- **A2A Specific File Transport:** `src/lib/logger.ts` contains a function `initializeA2AFileTransport()` and a flag `a2aFileTransportInitialized` to guard against duplicate initialization. This suggests A2A logs can be written to dedicated files in addition to other transports.

## 2. Log Output Locations & Formats

### 2.1. Console Logging
- **Server-Side:** Logs to the console using `consoleFormat`.
- **Client-Side:** Logs to the browser's console using `consoleFormat`.

### 2.2. File-based Logging (e.g., `/logs` directory)
- **Server-Side Only:** Uses `winston-daily-rotate-file` for file logging.
- **Default Directory:** `process.cwd()/logs`. Specific subdirectories are often used (e.g., `logs/error`, `logs/combined`, `logs/components`, `logs/a2a`).
- **Directory Creation:** The logger script actively creates these directories if they don't exist (`fs.mkdirSync`).
- **Rotation:** Files are rotated daily, with settings for max size (e.g., '20m') and max files (e.g., '14d').
- **Format:** JSON, as per `fileFormat`.

### 2.2.1. A2A File Logging
- **Purpose:** To provide a dedicated file log for A2A system activities, separate from the main application logs.
- **Mechanism:** Adds a `DailyRotateFile` transport specifically to the `a2aLogger` instance.
    - Log files are stored in `logs/a2a-system/a2a-%DATE%.log`.
    - Uses the same `fileFormat` (JSON) as other file logs.
- **Singleton Initialization:** The function includes a guard (`isA2AFileTransportInitialized`) to ensure the transport is added only once, preventing duplicate log entries or errors if called multiple times.
- **Invocation:**
    - Called within `initializeAgents()` in `src/server/services/a2a/initializeAgents.ts`.
    - Called within `initializeAgentsPatched()` in `src/server/services/a2a/initializeAgentsPatched.ts`.
    - Called at the module level in `src/server/api/routers/a2a-test.ts` (when the test API route is loaded).
    - This ensures A2A file logging is set up when A2A agents are initialized or A2A test functionalities are engaged.

### 2.3. "Log Agent" on Port 3002

**The Log Agent is a self-contained microservice located within the `src/scripts/log-agent/` directory of the main Bazaar-Vid application. This directory contains not only the client-side integration code but also the full server implementation for the Log Agent service.**

- **Service Implementation:**
    - **`src/scripts/log-agent/server.ts`**: Likely the main entry point for the Log Agent's web server that listens on port 3002 and handles API endpoints like `/ingest`, `/qna`, `/issues`, etc.
    - **`src/scripts/log-agent/package.json`**: Defines dependencies and run scripts for the Log Agent service.
        - **Type:** ES Module (`"type": "module"`).
        - **Main entry point:** `dist/server.js` (after TypeScript compilation).
        - **Key Dependencies:** `express`, `redis`, `openai`, `bullmq` (for job queues), `axios`, `opossum` (circuit breaker).
        - **Run Scripts:**
            - `npm run build` (compiles TypeScript using `tsc`).
            - `npm run start` (runs `node dist/server.js`).
            - `npm run dev` (watches for changes, rebuilds, and restarts the server).
    - **`src/scripts/log-agent/server.ts` Structure:**
        - **Framework:** Express.js application.
        - **Middleware:** Uses `express-prom-bundle` for Prometheus metrics and `express.json` for body parsing.
        - **Core Services Used:**
            - `redisService`: Manages all interactions with Redis (log storage, run IDs, issues).
            - `openaiService`: Handles communication with the OpenAI API for log analysis.
            - `workerService`: Manages asynchronous processing of log batches (likely using BullMQ).
        - **Key API Endpoints:**
            - `GET /health`: Health check.
            - `GET /metrics`: Prometheus metrics.
            - `POST /ingest`: Receives log batches from the main application's Winston transport. Queues batches for processing via `workerService`.
            - `POST /qna`: Accepts natural language queries, retrieves relevant logs from Redis, and uses `openaiService` for analysis.
            - `GET /raw`: Allows fetching raw logs from Redis with filtering and pagination.
            - `GET /issues`: Allows fetching detected issues from Redis with filtering and pagination.
            - `POST /control/clear`: Clears logs for the previous run and initiates a new run, managing run IDs in Redis.
        - **Graceful Shutdown:** Implemented to close services and connections properly.
    - **`Dockerfile` & `docker-compose.yml`**: Indicate the service is designed to be containerized and run with Docker.
    - **`src/scripts/log-agent/services/`**: Likely contains the core business logic for the service (Redis interactions, OpenAI API calls, log processing algorithms).

- **Integration:** Server-side loggers (`logger`, `a2aLogger`, `componentsLogger`) in the main Bazaar-Vid application are configured with an additional transport via `addLogAgentTransport` (from `src/scripts/log-agent/integration.ts`).
- **Purpose:** This transport sends logs to the Log Agent service. The service is not just a simple log collector but a more sophisticated system for log aggregation, analysis, and issue detection.
- **Service URL:** Defaults to `http://localhost:3002` (configurable via `LOG_AGENT_PORT` env var).
- **Communication:** The `addLogAgentTransport` function uses `axios` to send batched logs via HTTP POST to the Log Agent service. The actual transport mechanism is likely defined in `src/scripts/log-agent/logger-transport.ts`.
    - **`LogAgentTransport` Class (in `src/scripts/log-agent/logger-transport.ts`):**
        - Extends `winston-transport`.
        - **Batching:** Logs are buffered and sent in batches to the Log Agent's `/ingest` endpoint (e.g., `http://localhost:3002/ingest`).
            - Flushed when buffer size reaches `batchSize` (default 50) or on a `batchInterval` (default 5 seconds).
        - **Payload:** Sends a `LogBatch` object containing an array of `LogEntry` objects, `runId`, `source`, and a batch `timestamp`.
        - **Error Handling:** Logs errors to console and can invoke an `onError` callback if sending fails.
        - **Dynamic `runId`:** Supports changing `runId` via a `setRunId` method, flushing old logs before switching.
        - **Graceful Shutdown:** `close()` method ensures pending logs are flushed.
- **Metadata Sent:**
    - `source`: Identifies the origin of the logs (e.g., 'main-app', 'a2a-system', 'components-worker', 'bazaar-app' as a general default).
    - `runId`: A unique identifier for each application run, used to segregate logs. Defaults to 'latest' but can be managed.
- **Enhanced Logger Functionality:** The `addLogAgentTransport` function augments the Winston logger instance with a `logAgent` property, providing methods to interact with the Log Agent service:
    - `logAgent.startNewRun(customRunId?: string)`: Instructs the Log Agent to clear previous data and start a new logging session under a new (or provided) `runId`.
    - `logAgent.setRunId(runId: string)`: Allows changing the `runId` for the current transport.
    - `logAgent.askQuestion(query: string)`: Sends a natural language query to a `/qna` endpoint on the Log Agent for log analysis (leveraging OpenAI).
    - `logAgent.getIssues()`: Fetches detected issues from an `/issues` endpoint on the Log Agent.
- **Log Agent Service Configuration (from `src/scripts/log-agent/config.ts`):**
    - **Redis Backend:** Uses Redis (default `redis://localhost:6379`, prefix `logagent:`) for temporary storage of logs, issues, etc., with a default TTL of 24 hours.
    - **OpenAI Integration:** Can use an OpenAI model (default `gpt-3.5-turbo`) for log analysis if an API key (`OPENAI_API_KEY`) is provided.
    - **Asynchronous Worker:** Has settings for worker concurrency and max jobs, suggesting asynchronous processing of logs or analysis tasks.
    - **Pattern Detection:** Configurable `issueThreshold` (minimum count for an issue) and `debounceWindow` (time to wait before notifying) for identifying recurring problems.
    - **Server Settings:** Includes `bodyLimit` for incoming log batches and `maxLines` per batch.

## 3. Project-Specific Logging Behavior

*(To be filled in after investigation...)*

### 3.1. Project 1 (Standard Functionality) Logging
*(e.g., `chatOrchestration.service.ts`)*

### 3.2. Project 2 (A2A System) Logging
*(e.g., `TaskProcessor`, agents, `evaluation-dashboard`)*
    -   Observed Log Spam

## 4. Running the System for Log Observation

To accurately observe the logging behavior of the Bazaar-Vid application's A2A system (Project 2), the `scripts/startup-with-a2a.sh` script should be used. This script orchestrates the startup of the Log Agent, the A2A Task Processor, and the main Next.js application with specific configurations for A2A development.

For observing standard functionality (Project 1), a simple `npm run dev` in the project root might suffice, but the Log Agent would still need to be running if server-side logging to it is desired.

### 4.1. Running the A2A System with `startup-with-a2a.sh`

1.  **Ensure Prerequisites:**
    *   A `.env.local` file should exist in the project root (`/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid`) if OpenAI integration for the Log Agent is desired (the script tries to pass `OPENAI_API_KEY` and `MAX_TOKENS` from it).
    *   Ensure `tsx` is available globally or as a project dependency if not already handled by the environment setup.

2.  **Execute the script from the project root directory:**
    ```bash
    cd /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid
    ./scripts/startup-with-a2a.sh
    ```

3.  **What the script does:**
    *   **Sets External Log Directories:** Creates directories like `/tmp/bazaar-logs`, `/tmp/a2a-logs` and sets environment variables (`LOG_DIR`, `A2A_LOG_DIR`) to point to them. This is done to prevent log file changes from triggering Next.js Hot Module Replacement (HMR).
    *   **Sets Environment Variables:** Configures various environment variables for A2A stability and functionality (e.g., `USE_MESSAGE_BUS=true`, `TASK_PROCESSOR_STARTUP_DELAY`, HMR-related polling variables).
    *   **Starts Log Agent Service:**
        - Navigates to `src/scripts/log-agent`.
        - Runs `tsx --tsconfig tsconfig.json server.ts` directly (not `npm run dev` from its `package.json`).
        - Redirects Log Agent's `stderr` to `/tmp/log_agent_error.log`.
        - Runs in the background.
        - The Log Agent will listen on `http://localhost:3002` (default).
    *   **Starts A2A Task Processor:**
        - Runs `npm run dev:task-processor-patched` in the background.
    *   **Starts Main Next.js Application:**
        - Runs `npm run dev:no-restart` in the foreground.
        - The main application will typically run on `http://localhost:3000`.
    *   **Cleanup:** Traps `SIGINT` and `SIGTERM` to gracefully shut down all started processes.

### 4.2. Observing Logs (when using `startup-with-a2a.sh`)

Once the script has started all services:

1.  **Interact with the Bazaar-Vid application**, particularly A2A features (e.g., via `/test/evaluation-dashboard` or other A2A test pages).
2.  **Check File Logs (in `/tmp/` directory as configured by the script):**
    - Main application logs: `/tmp/combined-logs/combined-%DATE%.log`, `/tmp/error-logs/error-%DATE%.log`, etc.
    - A2A specific logs: `/tmp/a2a-logs/a2a-%DATE%.log`.
3.  **Check Log Agent Output & Errors:**
    - The console output of the `startup-with-a2a.sh` script will show startup messages from the Log Agent.
    - Check `/tmp/log_agent_error.log` for any errors from the Log Agent service.
    - You can query the Log Agent's API endpoints:
        - Raw logs: `http://localhost:3002/raw?runId=latest`
        - Detected issues: `http://localhost:3002/issues?runId=latest`
4.  **Observe Browser Console:** Check the browser's developer console for client-side logs or errors.
5.  **Task Processor Logs:** The `npm run dev:task-processor-patched` command will have its own console output, which should be monitored if A2A task processing issues are suspected.

This setup provides a more accurate environment for diagnosing A2A logging issues, including log spam and HMR interactions.

## 5. Identified Issues and Pain Points

Based on initial observation of the system running via `scripts/startup-with-a2a.sh`:

*   **Critical: Database Connection Exhaustion (NeonDB Errors):**
    *   Symptoms: Numerous `NeonDbError: Server error (HTTP status 500): {"message":"Failed to acquire permit to connect to the database. Too many database connection attempts are currently ongoing."}` and `{"message":"Control plane request failed"}`.
    *   Impact: Prevents data loading/saving, causes page errors (HTTP 404s for project pages), tRPC call failures (e.g., `project.create`), and errors in background workers (`BuildWorker`, `CodeGenWorker`).
    *   Suspected Cause: Likely linked to frequent re-initializations (see below), where new DB connections are made without closing old ones, quickly depleting the connection pool.

*   **High: Frequent Re-initializations of Services & Log Spam (HMR Suspected):**
    *   Symptoms: Repeated log blocks for:
        - `Logger initialization with: LOG_DIR=/tmp/bazaar-logs...`
        - `Integrating Log Agent Transport with runId: ...`
        - `Initializing Neon database connection`
        - `A2A File transport initialized in NORMAL mode with logs at: /tmp/a2a-logs`
        - `Registered agent: CoordinatorAgent` (and other agents)
    *   Impact: Floods the console, making it hard to follow specific events. Very likely contributes directly to the database connection exhaustion.
    *   Suspected Cause: Next.js Hot Module Replacement (HMR) re-executing server-side initialization code frequently.

*   **Medium: A2A System Log Verbosity ("Spam"):**
    *   Symptoms: High volume of generic A2A logs:
        - Many `[info]: null {"a2a": true}` entries.
        - Frequent `[info]: system {"a2a": true}` messages without specific context.
        - `[ROUTE_DEBUG]` messages are numerous during general observation.
    *   Impact: Makes it difficult to find relevant A2A operational logs amidst the noise. Contributes to the overall feeling of log spam.

*   **Low: Inconsistent A2A Agent Status:**
    *   Symptoms: `ScenePlannerAgent` status in `[ROUTE_DEBUG]` logs flipping between `FOUND ✅` and `MISSING ❌`.
    *   Impact: Could indicate instability in agent registration or be an artifact of HMR re-initializations.

## 6. Proposed Logging Strategy Enhancements (To be populated)

- (Example) Granular log levels for A2A components.
- (Example) Structured logging for easier querying in the Log Agent.
- (Example) Review log retention policies.
