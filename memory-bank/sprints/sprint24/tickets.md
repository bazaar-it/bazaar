# Sprint 24 - Development Tickets

Based on detailed analysis of both the Standard Functionality (Project 1) and Agent-to-Agent System (Project 2), and recent feedback on testing and observability challenges, the following tickets are proposed for Sprint 24 and upcoming work.

## I. Core Testing & Logging Infrastructure

### BAZAAR-260: Define and Implement Unified Testing Strategy & Framework
**Description**: Establish a comprehensive, unified testing strategy for both Project 1 and Project 2. This includes stabilizing the current Jest setup (or selecting an alternative), defining testing levels (unit, integration, E2E), CI/CD integration considerations, and clear quality gates. This ticket aims to resolve pervasive issues with test reliability and execution (e.g., Jest/ESM/CJS/module conflicts).
**Acceptance Criteria**:
- Documented overall testing strategy covering unit, integration, and E2E tests for P1 and P2.
- A stable, documented, and working Jest configuration (or chosen alternative framework) across the project.
- Clear guidelines and examples for writing unit tests (mocking strategies, scope).
- Clear guidelines and examples for writing integration tests (e.g., message bus, service-to-service, agent-to-agent comms).
- Defined strategy and examples for End-to-End (E2E) tests, including:
    - E2E tests with mocked LLM/external service responses for rapid pipeline integrity checks.
    - E2E tests that interact with *real* LLM services to validate output quality (e.g., generated Remotion code, agent responses based on prompts).
- Plan for managing test data, test environments, and associated configurations.
- Guidelines for test accessibility, including strategies for testing authenticated routes in an automated fashion (e.g., bypassing auth for specific test users/environments).
- At least one core E2E test for Project 1 (e.g., `chatOrchestration.service.ts` flow) and one for Project 2 (basic A2A task flow from input to agent processing) demonstrating the new framework and reliability.
- Review and incorporate relevant learnings/code from previous testing attempts (`@evaluation.ts`, `@eval-framework-progress.md`, `@run-tests.ts`, `@verify-a2a-routing.js`).

### BAZAAR-261: Resolve Critical Logging Issues and Implement Sustainable Strategy
**Description**: Address critical issues with current logging practices: the HMR problem potentially caused by writing to the local `/logs` folder, the excessive log spam from the A2A system, and the need for a clear, usable logging approach for developers.
**Acceptance Criteria**:
- Root cause of HMR issues related to file-based logging identified and resolved (e.g., ensure Next.js HMR ignores specific log directories, or shift development logs away from HMR-triggering file writes to robust console/external solutions).
- A2A system log verbosity dramatically reduced by default. Implement fine-grained log level controls (e.g., ERROR, WARN, INFO, DEBUG, TRACE) for A2A services and individual agents, with INFO or WARN as default.
- Clear documentation on how to enable verbose/debug logging for specific A2A components when needed.
- Building on `BAZAAR-242` (Standardized Logging), ensure all logs (P1 & P2) are consistently structured (e.g., JSON), include timestamps, severity, correlation IDs (for tracing requests), and relevant context (e.g., agent name, service name, task ID).
- Strategy for easily distinguishing or filtering logs from Project 1 vs. Project 2 during development.
- Development team is aligned on the new logging strategy and how to effectively use logs for debugging without causing system instability.

### BAZAAR-242: Implement standardized logging framework
**Description**: Create a structured logging system with consistent format, severity levels, and context-aware tagging. (Note: This ticket's scope is now heavily influenced and partially superseded by BAZAAR-261, focusing here on the structural aspects of the logger itself rather than output strategy and HMR issues).
**Acceptance Criteria**:
- Configuration for different log levels (as defined in BAZAAR-261).
- Context/correlation ID support across process boundaries integrated into log messages.
- Base logger utility provides easy-to-use methods for emitting structured logs.
- Developer documentation on using the standardized logger utilities.

## Project 1 (Standard Functionality) Tickets

### BAZAAR-243: Refactor chatOrchestration.service.ts
**Description**: Break down the monolithic chat orchestration service into smaller, focused services.
**Acceptance Criteria**:
- Separate LLM communication from tool execution
- Split scene planning and component generation flows
- Maintain backward compatibility
- Improve error handling
- Add comprehensive tests

### BAZAAR-244: Implement error recovery for component generation pipeline
**Description**: Add checkpointing and resumability to the component generation process.
**Acceptance Criteria**:
- Store intermediate states during processing
- Add retry capability with backoff
- Allow manual resumption of failed generations
- Provide detailed error context
- Create test cases for error conditions

### BAZAAR-245: Enhance real-time feedback during processing
**Description**: Improve the granularity and reliability of SSE updates during component generation.
**Acceptance Criteria**:
- More frequent progress updates
- Detailed stage information
- Reconnection support
- UI elements that reflect current process state
- Integration tests for connection interruptions

## Project 2 (A2A System) Tickets

### BAZAAR-246: Fix agent lifecycle management
**Description**: Solve the agent initialization, restart issues ("churn"), and ensure stable agent operation, particularly during development with HMR. (Related to Memory: `d54e0a9d-afb5-41fc-8014-2a0c4c4c8958`, `b8b18ccd-556e-4e2c-9691-f39f529fdc5b`)
**Acceptance Criteria**:
- Agent instances are stable across HMR cycles in Next.js development mode.
- Proper cleanup and shutdown of agents and the `TaskProcessor` on process termination (SIGINT, SIGTERM).
- Clear agent lifecycle states (e.g., `initializing`, `ready`, `processing`, `idle`, `stopping`, `error`) reflected in logs and potentially the A2A dashboard.
- Mechanisms to detect and report unhealthy or unresponsive agents.
- Documentation of agent lifecycle hooks and management.
- Verification of `TaskProcessor` singleton stability and its role in agent lifecycle (as per Memory `b8b18ccd-556e-4e2c-9691-f39f529fdc5b`).

### BAZAAR-247: Improve message bus reliability
**Description**: Enhance the message bus (`src/server/agents/message-bus.ts`) to ensure reliable message delivery and handle edge cases effectively.
**Acceptance Criteria**:
- Options for persistent message storage (if critical for certain message types) or clear documentation on its current in-memory nature and limitations.
- Message acknowledgments (if deemed necessary for specific critical communications) or a robust error handling strategy for send failures.
- Dead letter queue/handling strategy for messages that cannot be delivered or processed after retries.
- Monitoring interface or logging hooks to observe message flow and diagnose issues.
- Performance testing under simulated load to identify bottlenecks.

### BAZAAR-248: Implement A2A System Test Harness & Agent Testing (Was: Create agent testing framework)
**Description**: Build a dedicated test harness for the A2A system, leveraging the unified framework from `BAZAAR-260`. This harness will facilitate isolated testing of individual agents, their interactions via the message bus, and the validation of their outputs or state changes.
**Acceptance Criteria**:
- Framework for instantiating individual agents in a controlled test environment with mocked dependencies (other agents, external services, LLMs).
- Utilities to easily send messages/tasks to specific agents and assert their responses, errors, or state changes.
- Test utilities for verifying message bus interactions: publishing events, correct subscription handling, message content validation.
- Ability to inspect an agent's internal state/context during a test run (e.g., via specific test-only methods or by analyzing emitted state events).
- Example tests for key agents: `CoordinatorAgent`, `BuilderAgent`, `ScenePlannerAgent`, `ErrorFixerAgent`, demonstrating various scenarios (success, failure, specific inputs).
- Integration with the main testing framework (`BAZAAR-260`).

### BAZAAR-249: Enhance A2A Evaluation Dashboard & Observability Tools
**Description**: Significantly improve the A2A evaluation dashboard (`src/app/test/evaluation-dashboard/page.tsx`) and related tooling to provide clear, real-time insights into agent activity, state, communication, and context. This is crucial for debugging, understanding the A2A system's behavior, and building confidence.
**Acceptance Criteria**:
- Real-time visualization of agent initialization status and lifecycle events (see `BAZAAR-246`).
- Enhanced `AgentNetworkGraph.tsx` (or similar component) to display:
    - Actively running / registered agents.
    - Visual representation of message flows between agents (e.g., animated edges when messages are sent).
    - On-hover or on-click display of key message content snippets or metadata.
    - Indication of message acknowledgment (if implemented) or processing errors related to a message.
- UI components to allow developers to select an agent and view its current essential context, memory, or critical state variables.
- A timeline view that reconstructs agent activities and task state transitions for a given high-level operation or task ID.
- Mechanisms to filter/search agent activity and logs directly within the dashboard interface for a specific task or time window.
- Clear error reporting and visualization within the dashboard when agents encounter issues or tasks fail.

## Integration Tickets

### BAZAAR-250: Create unified component generation API
**Description**: Develop a common API that can route component generation requests to either Project 1 or Project 2.
**Acceptance Criteria**:
- Feature flag for routing selection
- Compatible input/output format
- Performance metrics collection
- Error handling compatibility
- Documentation for consumers

### BAZAAR-251: Design migration path from Project 1 to Project 2
**Description**: Create a detailed plan for gradually transitioning from direct service calls to the A2A system.
**Acceptance Criteria**:
- Phase-by-phase migration document
- Risk assessment
- Rollback procedures
- Testing strategy for each phase
- Success metrics

## Documentation Tickets

### BAZAAR-252: Create architecture documentation
**Description**: Document both current architectures (Project 1 and Project 2) and the ideal target architecture, incorporating all verified details.
**Acceptance Criteria**:
- Current state diagrams reflecting verified component names, paths, and workflows (as per updated `overview.md`)
- Future state diagrams
- Component interaction documentation (using precise, verified names)
- Data flow documentation (using precise, verified names)
- Trade-off analysis

### BAZAAR-253: Update developer onboarding guides
**Description**: Update documentation to help new developers understand both systems, reflecting the latest verified understanding.
**Acceptance Criteria**:
- Setup instructions
- Local development workflow
- Debugging tips
- Common issues and solutions
- Architecture overview for newcomers (aligned with verified details in `overview.md`)

### BAZAAR-254: Align Existing Project Documentation with Verified Findings
**Description**: Review and update all existing analytical and project-specific markdown documents within the `/memory-bank/` (especially under `/sprints/sprint24/`) and any other relevant documentation locations. Ensure consistency with the verified information now present in `memory-bank/sprints/sprint24/overview.md`.
**Acceptance Criteria**:
- All references to file paths (e.g., `message-bus.ts`), service names (e.g., `componentGenerator.service.ts`), agent names (e.g., `ErrorFixerAgent`), and workflow descriptions (e.g., `TaskProcessor` polling) in documents like `project1-standard-workflow.md`, `project2-a2a-workflow.md`, `project1_current_vs_ideal.md`, `project2_current_vs_ideal.md`, etc., are corrected to match verified facts.
- Remove or archive outdated/misleading statements regarding system architecture or component behavior.
- Ensure a single source of truth for architectural details is primarily `overview.md` for this sprint's context, with other documents being supplementary or historical if not fully updated.
