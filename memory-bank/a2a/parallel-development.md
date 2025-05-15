# A2A Parallel Development Coordination

## Overview

This document serves as the central coordination point for parallel development of the Google A2A protocol implementation in Bazaar-Vid. It's designed to help maintain alignment and prevent integration issues when multiple developers work simultaneously on different aspects of the implementation.

## Work Division

| Component | Owner | Description |
|-----------|-------|-------------|
| Task Lifecycle & API Endpoints | Markus | JSON-RPC endpoints, task state management, database schema updates |
| Agent Discovery & SSE Streaming | Windsirf | AgentCard implementation, streaming infrastructure, real-time updates |

## Shared Interfaces

**Important**: Both developers should reference these shared interfaces to maintain compatibility. All changes to these interfaces must be coordinated between both developers.

The definitive shared interfaces are now in `src/types/a2a.ts` and should be used for all A2A-related development.

## Daily Check-in Process

1. Update your section of this document at the end of each development session
2. Review the other developer's updates to identify integration points/issues
3. Flag any questions or potential conflicts in the "Coordination Issues" section
4. Schedule a quick sync if blocking issues are identified

## Progress Tracking

### Task Lifecycle & API Endpoints (Markus)

| Date | Completed | In Progress | Blocked | Notes |
|------|-----------|-------------|---------|-------|
| 2025-05-15 | - Created shared type definitions<br>- Added database migration for A2A fields<br>- Implemented TaskManager service<br>- Created JSON-RPC endpoint<br>- Added SSE streaming endpoint<br>- Added agent_messages table<br>- Implemented BaseAgent class<br>- Created AgentRegistry service<br>- Added agent discovery endpoints<br>- Updated BaseAgent with TaskManager integration | - tRPC integration<br>- Updating existing agents | - None | Core A2A infrastructure is now in place. BaseAgent uses TaskManager. Next steps are to refactor existing agents and integrate with tRPC. |

### Agent Discovery & SSE Streaming (Windsirf)

| Date | Completed | In Progress | Blocked | Notes |
|------|-----------|-------------|---------|-------|
|      |           |             |         |       |

## Integration Points

These are the critical points where both developers' work must integrate:

1. **Shared Types** (`src/types/a2a.ts`) - Completed
2. **BaseAgent Class** (`src/server/agents/base-agent.ts`) - Completed
3. **SSE Event Format** - Integrated in shared types
4. **Agent Message Format** - Integrated in shared types and BaseAgent

## Development Guidelines

1. **Always check the other developer's progress** before making significant changes to shared interfaces.
2. **Update this document** when completing major components or encountering blockers.
3. **Coordinate directly** for any changes that affect the other developer's work.
4. **Run tests** after integrating your changes with the other developer's work.
5. **Document any changes** to the agreed interfaces or approaches.

## Testing Strategy

Both developers should focus on unit testing their specific components, with integration testing to be done jointly once the initial implementation is complete.

## Timeline

- **Week 1**: Core infrastructure, shared types, and base services
- **Week 2**: Agent implementation and SSE infrastructure
- **Week 3**: tRPC integration and frontend components
- **Week 4**: Testing, bug fixes, and documentation

## Questions and Blockers

_Document any questions or blockers here that require the other developer's input_

## Integration Checkpoints

Schedule regular integration points to ensure components work together:

1. **Checkpoint 1**: Shared interfaces finalized (Target: ___)
2. **Checkpoint 2**: Task lifecycle and Agent discovery basics implemented (Target: ___)
3. **Checkpoint 3**: JSON-RPC endpoints and SSE infrastructure connected (Target: ___)
4. **Checkpoint 4**: Full E2E testing with both components (Target: ___)

## Coordination Issues

Document any alignment issues here:

| Date | Issue | Resolution | Status |
|------|-------|------------|--------|
|      |       |            |        |

## Reference Implementations

For reference, we're closely following the Google A2A protocol specifications:

- Task creation/management: [Google A2A Task API](https://github.com/google/A2A/blob/main/docs/tasks.md)
- Agent discovery: [Google A2A Agent API](https://github.com/google/A2A/blob/main/docs/agent.md)
- Streaming: [Google A2A Streaming](https://github.com/google/A2A/blob/main/docs/tasks.md#streaming)

## Testing Strategy

Cross-component testing is essential:

1. **Unit Tests**: Each component should have its own isolated tests
2. **Integration Tests**: Create tests that specifically validate the integration points
3. **End-to-End Tests**: Full flow tests from task creation through streaming updates 