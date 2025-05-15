# A2A Implementation Checklist

This checklist tracks the critical components that need to be implemented for full A2A protocol compliance. Each developer should update their sections as progress is made.

## Shared Interface Implementation (Markus & Windsirf)

- [x] Create shared types file in codebase (`src/types/a2a.ts`)
- [x] Add A2A task state types
- [x] Add message part interfaces
- [x] Add artifact interfaces
- [x] Add JSON-RPC request/response types
- [x] Add agent card interfaces
- [x] Add SSE event types
- [x] Create state mapping utilities

## Task Lifecycle & API Endpoints (Markus - Completed)

### Database Updates

- [x] Add `task_id` field to component jobs table
- [x] Add `internalStatus` field to track detailed states
- [x] Add `requires_input` boolean field
- [x] Add migration script for schema changes
- [x] Add `agent_messages` table for inter-agent communication
- [x] Add `history` field to track task state changes

### Task Management

- [x] Create TaskManager class
- [x] Implement task creation method
- [x] Implement task status retrieval
- [x] Implement state transition methods
- [x] Add artifact management methods
- [x] Create BaseAgent class for all agents to inherit from

### JSON-RPC API

- [x] Create route handler for JSON-RPC requests
- [x] Implement parsing and validation logic
- [x] Add task creation endpoints
- [x] Add task status checking endpoints
- [x] Add task cancellation endpoints

### SSE Implementation (Backend by Markus - Completed)

- [x] Create SSE infrastructure (TaskManager integration for event emission)
- [x] Implement task status stream endpoint (`/api/a2a/tasks/[taskId]/stream/route.ts`)
- [x] Add subscription management (in TaskManager)
- [x] Add event publishing mechanism (in TaskManager)
- [x] Implement clean disconnect handling (basic in SSE route)
- [ ] Add reconnection support (backend part in TaskManager mostly done, client-side by Windsirf)

### tRPC Integration (Markus - Completed)

- [x] Create A2A tRPC router (`src/server/api/routers/a2a.ts`)
- [x] Add task creation procedure
- [x] Add task status retrieval procedure
- [x] Add task cancellation procedure
- [x] Add task input submission procedure
- [x] Add SSE subscription procedure (`subscribeToTaskStatus`)
- [x] Update tRPC router to use TaskManager and AgentRegistry

## Agent Discovery & Card APIs (Markus - Completed)

### Agent Registry

- [x] Create AgentRegistry service (`src/server/services/a2a/agentRegistry.service.ts`)
- [x] Add agent discovery endpoint (`/api/a2a/agents/route.ts`)
- [x] Add agent card endpoint (`/api/a2a/agents/[name]/route.ts`)
- [x] Implement agent capability detection (basic via `BaseAgent.getAgentCard()`)
- [x] Add agent registration methods (in `MessageBus` and `AgentRegistry` setup)

## Agent Implementation (Markus - Completed)

### Coordinator Agent

- [x] Update to inherit from BaseAgent
- [x] Implement A2A message processing
- [x] Add task state management
- [x] Handle task cancellation

### Builder Agent

- [x] Update to inherit from BaseAgent
- [x] Implement A2A artifact creation
- [x] Add proper task state transitions
- [x] Implement message part processing

### Error Fixer Agent

- [x] Update to inherit from BaseAgent
- [x] Implement A2A message processing
- [x] Modify to handle structured messages
- [x] Update error handling

### R2 Storage Agent

- [x] Update to inherit from BaseAgent
- [x] Implement A2A message processing
- [x] Modify to handle structured messages (artifacts)
- [x] Add artifact URL handling and verification

### UI Agent

- [x] Update to inherit from BaseAgent
- [x] Implement A2A message processing for notifications
- [x] Add streaming support (interaction with TaskManager for SSE)

### ADB Agent

- [x] Create ADBAgent inheriting from BaseAgent
- [x] Implement A2A message processing for GENERATE_DESIGN_BRIEF_REQUEST
- [x] Integrate with generateAnimationDesignBrief service
- [x] Create ADB artifact and update task state
- [x] Forward CREATE_COMPONENT_REQUEST to CoordinatorAgent
- [x] Define AgentCard skills for ADB generation

## MessageBus Integration (Markus - Completed)

- [x] Create MessageBus class (`src/server/agents/message-bus.ts`)
- [x] Implement agent registration
- [x] Implement message publishing and routing
- [x] Integrate with TaskManager for SSE streams
- [x] Update agent setup to use MessageBus (`src/server/agents/setup.ts`)

## Frontend Integration (Windsirf - In Progress)

- [ ] Create React hooks for A2A tasks (useSSE, useTaskStatus - In Progress by Windsirf)
- [ ] Add task status tracking UI components (TaskStatusBadge, TaskStatus - In Progress by Windsirf)
- [ ] Create SSE connection manager for frontend (Part of useSSE - In Progress by Windsirf)
- [ ] Add reconnection logic (Part of useSSE - In Progress by Windsirf)
- [ ] Implement UI for `input-required` state
- [ ] Develop Artifact viewers/display components
- [ ] Migrate existing UI from Pusher to new SSE system

## Testing (Markus - Actively Working)

- [x] Add initial unit tests for TaskManager
- [x] Add unit tests for AgentRegistry
- [x] Add unit tests for MessageBus
- [x] Add unit tests for `CoordinatorAgent` (initial pass complete)
- [x] Add unit tests for `BuilderAgent` (initial pass complete)
- [x] Add unit tests for `ErrorFixerAgent` (initial pass complete)
- [x] Add unit tests for `R2StorageAgent` (initial pass complete)
- [x] Add unit tests for `UIAgent` (initial pass complete)
- [x] Add unit tests for `ADBAgent` (initial pass complete)
- [x] Create initial integration tests for JSON-RPC API
- [x] Create initial integration tests for SSE streaming
- [x] Create initial integration tests for inter-agent communication flows (basic & key paths)
- [ ] Expand unit tests for all agents (cover more scenarios, edge cases) (Low priority, focus on integration)
- [ ] Expand integration tests for inter-agent flows (all key success/error paths, including ErrorFixer->Builder, R2Storage, full E2E success) (Actively Working)
- [ ] Develop end-to-end test for full component generation flow (simulated from backend, covering `input-required`) (Actively Working)
- [ ] Test A2A task lifecycle state transitions rigorously in all integration tests (Actively Working)
- [ ] Test artifact creation and reporting in all integration tests (Actively Working)
- [ ] Test `input-required` state flow in integration tests (backend perspective) (Actively Working)

## Documentation (Ongoing)

- [x] Update API documentation (in-code comments, A2A docs folder)
- [x] Create A2A protocol compliance documentation (A2A docs folder)
- [ ] Document frontend integration (Windsirf)
- [ ] Add examples of agent card usage
- [ ] Document SSE streaming API (usage for frontend)

## Deployment (Future Phase)

- [ ] Create migration plan
- [ ] Plan feature flag strategy
- [ ] Develop rollback procedures
- [ ] Create monitoring strategy
- [ ] Plan gradual rollout

## Integration Checkpoints

### Checkpoint 1: Shared Interfaces & Core DB (Target: May 15, 2025) - Completed

- [x] Review and finalize shared type definitions
- [x] Create initial database schema changes
- [x] Agree on state transition approach
- [x] Define JSON-RPC endpoint structure

### Checkpoint 2: Core Backend Services & API Endpoints (Target: May 22, 2025) - Completed by Markus

- [x] Review TaskManager implementation
- [x] Review AgentCard implementations
- [x] Test JSON-RPC endpoints (basic manual tests done, automated tests pending)
- [x] Verify SSE infrastructure (backend part done, frontend by Windsirf)

### Checkpoint 3: Agent Refactoring & MessageBus Integration (Target: May 29, 2025) - Completed by Markus

- [x] Test agent message exchange (basic tests, more needed)
- [x] Verify state transitions (basic tests, more needed)
- [ ] Test SSE with frontend components (pending Windsirf's frontend work)
- [x] Validate artifact handling (basic tests, more needed)

### Checkpoint 4: Frontend SSE Integration (Target: June 5, 2025) - Windsirf

- [ ] Complete frontend hooks and UI components for SSE
- [ ] Test UI updates for all A2A task states and artifact changes
- [ ] Ensure robust reconnection handling on the client-side

### Checkpoint 5: Full E2E Testing & Refinement (Target: June 12, 2025) - Both

- [ ] Complete end-to-end test of component generation using A2A protocol
- [ ] Test error handling scenarios across frontend and backend
- [ ] Verify SSE reconnection under various conditions
- [ ] Validate A2A protocol compliance with external tools/checks if possible
- [ ] Performance testing and optimization

## Agent Message Structure

- [x] Update base agent class
- [x] Add structured message support
- [x] Implement message part creation utilities
- [x] Add artifact creation utilities 