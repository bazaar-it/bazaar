// /memory-bank/sprints/sprint24/project2-ticket-breakdown.md
# Project 2 Ticket Breakdown for Sprint 24

This document divides the large "Project 2 (A2A System) Detailed Ticket Breakdown" into smaller tasks. Each task can be assigned to a dedicated agent to streamline implementation.

## BAZAAR-246: Fix agent lifecycle management

### Tasks for Agents
1. **Singleton TaskProcessor**
   - Verify singleton instantiation logic.
   - Add `getTaskProcessor()` helper service.
   - Guard against re-creation during HMR.
2. **Lifecycle Hooks**
   - Extend `BaseAgent` with `init()`, `start()`, `stop()`, `destroy()`.
   - Implement state tracking and expose `getStatus()`.
3. **Shutdown Handling**
   - Create handlers for `SIGINT`/`SIGTERM` to gracefully stop agents.
   - Update `scripts/startup-with-a2a.sh` to register hooks.
4. **Health Monitoring**
   - Implement heartbeat messages and unresponsive agent detection.
   - Surface status in the evaluation dashboard.
5. **Documentation & Tests**
   - Document lifecycle rules in `/memory-bank/agent.md`.
   - Write unit and integration tests simulating HMR and shutdown scenarios.

## BAZAAR-247: Improve message bus reliability

### Tasks for Agents
1. **Persistent Storage (Optional)**
   - Evaluate a lightweight store (e.g., Redis) and create abstraction layer.
2. **Acknowledgment & Retry**
   - Implement optional ACK mechanism with configurable retries.
   - Add DLQ support for repeatedly failing messages.
3. **Monitoring Hooks**
   - Add logging for publish, delivery, retry, and DLQ events.
   - Expose metrics counters for future dashboards.
4. **Stress Tests**
   - Build tests generating high message volume to benchmark throughput.

## BAZAAR-248: Implement A2A System Test Harness & Agent Testing

### Tasks for Agents
1. **Test Harness Utilities**
   - Spin up a mock A2A environment with dependency injection.
   - Provide helpers for publishing messages and waiting for responses.
2. **Agent State Inspection**
   - Add test-only methods or events to inspect agent context.
3. **Example Tests**
   - Create sample tests for `CoordinatorAgent`, `BuilderAgent`, `ScenePlannerAgent`, and `ErrorFixerAgent`.
4. **Integration with Unified Testing Framework**
   - Ensure harness runs via `npm test` and works with the setup from BAZAAR-260.

## BAZAAR-249: Enhance A2A Evaluation Dashboard & Observability Tools

### Tasks for Agents
1. **Lifecycle Visualization**
   - Display agent states using color-coded indicators.
   - Animate message edges in `AgentNetworkGraph.tsx`.
2. **Message Flow Inspection**
   - Show tooltips with metadata and acknowledgment status.
3. **Agent Context Viewer**
   - Implement panel to display selected agent context snapshots.
4. **Timeline View**
   - Reconstruct agent activities for a task ID with scrubbable timeline.
5. **Error Reporting**
   - Surface errors and stack traces in a dedicated dashboard section.
6. **Dashboard Tests**
   - Write component and integration tests using the new harness.

---

By delegating each task to specialized agents, the team can tackle Project 2 systematically and achieve full coverage of the detailed ticket requirements.
