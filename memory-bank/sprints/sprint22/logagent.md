# Log Agent Implementation Plan (Sprint 22)

## System Overview

A standalone log analysis service that:
- Runs on port 3002
- Ingests logs from Bazaar-Vid's Winston logger
- Stores logs in Redis with runId segmentation
- Analyzes logs using regex patterns and OpenAI
- Provides query endpoints for developers
- Notifies about detected issues

## Architecture

```
┌─────────────────┐      ┌───────────────┐      ┌─────────────────┐
│  Main App       │      │  Log Agent    │      │  Redis          │
│  (Bazaar-Vid)   │─────▶│  (Port 3002)  │◄────▶│  Storage        │
└─────────────────┘      └───────────────┘      └─────────────────┘
        │                        │                      ▲
        │                        │                      │
        ▼                        ▼                      │
┌─────────────────┐      ┌───────────────┐      ┌─────────────────┐
│  Winston        │      │  Express API  │      │  Analysis       │
│  Log Transport  │      │  Endpoints    │      │  Worker         │
└─────────────────┘      └───────────────┘      └─────────────────┘
                                │                      │
                                │                      │
                                ▼                      ▼
                         ┌───────────────┐      ┌─────────────────┐
                         │  CLI Tools    │      │  OpenAI         │
                         │  & Editor     │      │  API            │
                         │  Integration  │      └─────────────────┘
                         └───────────────┘
```

## Core Components

### 1. Log Agent Server (Express)
- HTTP API for log ingestion and querying
- Redis client for storage and retrieval
- OpenAI client for deep analysis
- Pattern matching for issue detection
- SSE endpoint for real-time updates

### 2. Log Transport
- Custom Winston transport 
- Batch processing to minimize overhead
- Automatic RunId management

### 3. Analysis Worker
- BullMQ worker processing logs asynchronously
- Pattern matching based on regex rules
- Issue fingerprinting and deduplication
- Notification system for detected issues

### 4. Developer Tools
- CLI commands for log queries and management
- Cursor/editor integration via tool endpoints
- RunId tracking through environment variables

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create the log-agent service directory structure
2. Set up Express server with basic endpoints
3. Configure Redis connection with proper isolation
4. Implement BullMQ worker framework

### Phase 2: Log Ingestion
1. Create log ingestion endpoint with batching
2. Implement RunId management
3. Add log storage with TTL in Redis
4. Create Winston transport for log shipping

### Phase 3: Analysis Pipeline
1. Implement regex pattern matching
2. Add OpenAI integration with circuit breaker
3. Create issue fingerprinting and storage
4. Set up notification system with debouncing

### Phase 4: Developer Tools
1. Create CLI scripts for log management
2. Implement query endpoint with filtering
3. Add Cursor tool integration
4. Create debug visualization tools

### Phase 5: Optimization
1. Add metrics collection
2. Implement token tracking for cost monitoring
3. Add graceful degradation when OpenAI is unavailable
4. Improve RunId handling with 'latest' feature

## Enhanced Features

### Pattern Recognition
- Common error patterns: ECONNREFUSED, TypeErrors, uncaught exceptions
- A2A-specific issues: agent creation failures, TaskProcessor shutdowns
- Database-related problems: connection timeouts, query failures
- Memory-related issues: high usage patterns, potential leaks

### OpenAI Analysis
- Custom system prompts for log analysis
- Context window optimization for token efficiency
- Fallback to regex-only when OpenAI is unavailable
- Cost tracking for budget management

### Notification Flow
- Issue fingerprinting to identify unique problems
- Count ≥ 3 before notifying to prevent noise
- Debounce window via issue.notifiedAt
- Webhook callback system for flexibility

### Developer Experience
- Hot reloading with ts-node-dev for rapid development
- Simple CLI interface for daily workflow
- Editor integration for seamless querying
- "Latest" RunId feature for convenience

## Technical Requirements

### Redis Schema
- `logs:{runId}:{source}` - Lists of log lines by source
- `issues:{runId}` - JSON array of detected issues
- `callback:{runId}` - Webhook URL for notifications
- `latest_run` - Most recent active runId

### Endpoints
- `POST /ingest` - Receive logs from Winston transport
- `POST /control/clear` - Clear logs and start new run
- `POST /qna` - Query logs with OpenAI analysis
- `GET /issues` - List detected issues for runId
- `GET /raw` - Raw log access with grep filtering

### CLI Commands
- `npm run log:agent` - Start the log agent service
- `npm run log:refresh` - Clear logs and start new run
- `npm run log:ask` - Query logs with natural language
- `npm run log:raw` - View raw logs with grep filtering
- `npm run log:issues` - List detected issues

### Editor Integration
- `log_query` - Ask questions about current logs
- `log_clear` - Start a fresh log session
- `log_issues` - View current issues in editor

## Implementation Notes

- No authentication for local development
- Reuse Redis connections to avoid connection limits
- Implement circuit breaker for OpenAI to handle outages
- Count tokens for cost tracking
- Use 'latest' as special RunId value for convenience
- 24-hour TTL on all Redis keys to prevent storage bloat

# Sprint 22 – Log Agent MVP

## Sprint Goal  
Ship a standalone **Log Agent** (port `3002`) that ingests Bazaar‑Vid logs, runs fast rule‑based checks plus on‑demand LLM analysis, and exposes simple tools the Cursor/Windsurf Dev‑Agent can call for real‑time debugging.

---

## Deliverables

1. **Micro‑service scaffold**  
   *Express server, Dockerfile, `docker‑compose.override.yml`.*

2. **`/ingest` endpoint**  
   *Accepts Fluent Bit JSON batches.*

3. **Redis buffering + BullMQ worker**  
   *200‑line batches, regex rules, push to queue.*

4. **`/control/clear` route**  
   *Flushes logs, returns fresh `runId`, stores callback URL.*

5. **`/qna` route** (optional deep analysis)  
   *OpenAI summary on last ≤ 7 k tokens.*

6. **`/issues` & `/raw` read‑only routes**  
   *Structured JSON list + plain‑text grep access.*

7. **Notification webhook** `/notify`  
   *SHA‑fingerprint dedup; 204 response.*

8. **Developer CLI scripts**  
   *`npm run log:refresh`, `npm run log:ask "<question>"`.*

9. **Cursor/Windsurf extension**  
   *Implements `log_query` & `log_clear` tools; manages `runId`.*

---

## Acceptance Criteria

| ID | Description | Target |
|----|-------------|--------|
| A1 | Ingest latency p95 | ≤ 1 s |
| A2 | Duplicate notifications per fingerprint/run | ≤ 1 |
| A3 | `log:ask` round‑trip | ≤ 5 s |
| A4 | LLM token budget per run | ≤ 10 k |

---

## Stretch Goals

- Live tail UI in the editor sidebar.  
- Auto‑retry loop: Dev‑Agent applies fix → `log_clear` → re‑run tests.  
- Heuristic weighting to prioritise "new" errors over known flaky ones.

---

*Prepared by: AI design assistant – 2025‑05‑18*