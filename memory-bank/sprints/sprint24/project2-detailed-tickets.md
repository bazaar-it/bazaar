// /memory-bank/sprints/sprint24/project2-detailed-tickets.md
# Project 2 (A2A System) Detailed Ticket Breakdown

This document provides an in-depth plan for implementing the outstanding tickets for Project 2, the Agent-to-Agent (A2A) system. Each section expands upon the acceptance criteria with implementation guidelines, trade‑offs to consider, and testing strategies.

## BAZAAR-246: Fix agent lifecycle management

### Goals
- Stabilize agent instances across Hot Module Replacement (HMR) cycles in Next.js development mode.
- Ensure graceful shutdown of agents and the `TaskProcessor` singleton on process termination (`SIGINT`, `SIGTERM`).
- Establish explicit agent lifecycle states (e.g., `initializing`, `ready`, `processing`, `idle`, `stopping`, `error`).
- Detect unhealthy or unresponsive agents and surface errors in logs and the A2A dashboard.
- Document lifecycle hooks and management rules.

### Implementation Notes
1. **Singleton `TaskProcessor`**
   - Verify `TaskProcessor` is instantiated exactly once and reused by all agents.
   - Consider a module-level variable or a service pattern (`getTaskProcessor()`) that creates the instance lazily.
   - Guard against accidental re-creation during HMR by checking if the instance already exists.

2. **Agent Lifecycle API**
   - Extend `BaseAgent` with explicit lifecycle hooks: `init()`, `start()`, `stop()`, and `destroy()`.
   - Track agent state transitions and emit lifecycle events via the message bus or a dedicated `LifecycleManager`.
   - Provide a method like `getStatus()` returning the current state for dashboards and debugging.

3. **Process Shutdown Handling**
   - Register listeners for `process.on('SIGINT')` and `process.on('SIGTERM')` to call `stop()` on all agents and flush pending tasks before exit.
   - In development, handle `next dev` HMR by cleaning up old agent instances before modules reload.
   - Optionally expose a CLI command or script (`scripts/startup-with-a2a.sh`) to ensure shutdown hooks run correctly when using `npm run dev:a2a`.

4. **Health Monitoring**
   - Implement periodic heartbeat messages from each agent to the `AgentRegistryService`.
   - If a heartbeat is missed for a configurable interval, mark the agent as `unresponsive` and emit an alert.
   - Provide health check utilities for the evaluation dashboard to query agent status.

### Trade-offs & Considerations
- Keeping agents in memory during development allows faster iteration but consumes resources. Consider an environment flag to disable persistent agents when not needed.
- Long-lived agents may hold state that becomes outdated after code changes. Document when a full restart is required.
- Implementing heartbeat monitoring adds overhead but greatly improves observability and reliability.

### Testing Strategy
- Unit test lifecycle methods to ensure state transitions occur as expected.
- Simulate HMR by re-importing agent modules in tests and verify that duplicate instances are not created.
- Integration test shutdown hooks by spawning a child process that runs the agent system, then sending `SIGINT` and asserting clean shutdown.
- Add dashboard tests (with mocked agents) verifying that lifecycle states render correctly.

## BAZAAR-247: Improve message bus reliability

### Goals
- Ensure reliable message delivery between agents.
- Handle send failures and retries gracefully.
- Provide visibility into message flow for debugging.

### Implementation Notes
1. **Persistent Storage (Optional)**
   - Evaluate lightweight persistence options (e.g., Redis, SQLite, or a file-based queue) for critical messages.
   - If persistence is out of scope for now, clearly document that the current bus is in-memory and subject to message loss on crash.

2. **Acknowledgment and Retry Logic**
   - For critical messages, implement an acknowledgment mechanism: the sender marks a message as delivered only after the receiver confirms.
   - If no acknowledgment arrives within a timeout, retry a configurable number of times before moving the message to a Dead Letter Queue (DLQ).
   - Keep the API flexible so agents can opt in to this behavior only when necessary.

3. **Dead Letter Handling**
   - Maintain a DLQ data structure (in-memory or persistent) to store messages that repeatedly fail to deliver or process.
   - Provide admin utilities or dashboard views to inspect and manually reprocess DLQ items.

4. **Monitoring Hooks**
   - Add logging hooks to record when messages are published, delivered, acknowledged, retried, or moved to the DLQ.
   - Expose metrics counters (e.g., total messages, failed deliveries) for future integration with a monitoring stack.

5. **Performance Testing**
   - Create stress tests that publish large volumes of messages and measure delivery latency and throughput.
   - Identify bottlenecks (e.g., slow subscribers, blocking operations) and optimize the message bus implementation accordingly.

### Trade-offs & Considerations
- Persistent queues add operational complexity. In-memory queues are simpler but risk losing messages on crashes.
- Acknowledgment logic increases reliability but may introduce latency. Make it configurable per message type.
- DLQ management requires manual oversight; weigh the maintenance cost against the benefit of never losing critical messages.

### Testing Strategy
- Unit tests for the message bus covering publish/subscribe behavior, acknowledgment flows, and DLQ handling.
- Integration tests with multiple agents to verify messages are routed correctly under load.
- Stress tests to benchmark throughput and identify performance issues.

## BAZAAR-248: Implement A2A System Test Harness & Agent Testing

### Goals
- Provide a dedicated environment for testing individual agents and their interactions.
- Integrate with the unified testing framework from BAZAAR-260.

### Implementation Notes
1. **Test Harness Setup**
   - Create utilities to spin up a minimal A2A environment with a mock message bus, mocked external services (LLMs, database), and a temporary task store.
   - Allow tests to instantiate specific agents with dependency injection to replace real services with mocks.

2. **Message Bus Testing Utilities**
   - Implement helper functions to publish messages, wait for responses, and assert the content of messages exchanged between agents.
   - Provide spies or event listeners to verify that expected topics are subscribed to and that messages include required metadata (task ID, sender, timestamp).

3. **Agent State Inspection**
   - Expose test-only methods or use dependency injection to inspect an agent's internal context or memory during tests.
   - Consider emitting state snapshots over the message bus when running in a test environment.

4. **Example Tests**
   - Write sample tests for `CoordinatorAgent`, `BuilderAgent`, `ScenePlannerAgent`, and `ErrorFixerAgent` demonstrating:
     - Successful task execution flow.
     - Failure scenarios and error propagation.
     - Specific input/output validations.

### Trade-offs & Considerations
- Building a comprehensive harness requires initial effort but pays off with faster iteration and fewer regressions.
- Excessive mocking may hide integration issues; balance isolation with realistic scenarios.

### Testing Strategy
- Integrate harness tests into `npm test` so they run automatically in CI.
- Ensure tests are deterministic by seeding random inputs and mocking network calls.
- Provide scripts to run a subset of agent tests during development for quick feedback.

## BAZAAR-249: Enhance A2A Evaluation Dashboard & Observability Tools

### Goals
- Improve real-time visibility into agent activity and message flow.
- Aid debugging by exposing agent states, context, and errors.

### Implementation Notes
1. **Agent Initialization & Lifecycle Visualization**
   - Display each agent's current state (from BAZAAR-246) in the dashboard.
   - Use color-coded indicators (e.g., green for `ready`, yellow for `processing`, red for `error`).
   - Update the existing `AgentNetworkGraph.tsx` to animate edges when messages are sent between agents.

2. **Message Flow Inspection**
   - On hover or click, show a tooltip with key message metadata (topic, sender, snippet of content).
   - If acknowledgments are implemented, visualize the acknowledgment status or highlight messages that failed delivery.

3. **Agent Context Viewer**
   - Provide a panel that displays selected agents' internal context or memory snapshots.
   - Include filters to search logs or messages by task ID or time range.

4. **Timeline View**
   - Implement a timeline that reconstructs agent activities and task state transitions for a given task ID.
   - Allow developers to scrub through events and inspect details at each step.

5. **Error Reporting**
   - Surface errors encountered by agents in a dedicated dashboard section with stack traces or relevant logs.

### Trade-offs & Considerations
- Real-time visualization can become resource-intensive with many agents; provide controls to limit update frequency or number of displayed events.
- Exposing internal agent state could reveal sensitive data; restrict access to authorized developers in non-production environments.

### Testing Strategy
- Write component tests for dashboard UI elements to ensure they render agent states and message flows correctly.
- Use the test harness from BAZAAR-248 to generate mock data and validate dashboard updates in integration tests.
- Run manual smoke tests during development to confirm real-time updates behave as expected under different load conditions.

---

These detailed notes should guide the implementation of Project 2 tickets, clarifying expected behavior, potential pitfalls, and concrete testing approaches.
