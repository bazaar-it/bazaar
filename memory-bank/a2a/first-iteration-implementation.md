# A2A Implementation: First Iteration

## Overview

The first iteration of our Agent-to-Agent (A2A) system focuses on establishing a basic communication flow between two key agents - the User Interaction Agent and the Coordinator Agent. This forms the foundation for our video generation pipeline that will eventually incorporate scene planning, animation design, component generation, and error fixing.

## Existing Components Overview

Our codebase already contains significant infrastructure for A2A integration:

### Frontend Components
- `A2AIntegrationTest.tsx` and `SimpleA2ATest.tsx` - Test interfaces for agent interactions
- `TaskInputForm.tsx` - Form for submitting prompts to agents
- `AgentNetworkGraph.tsx` - Visualization of agent communication
- `TaskTimeline.tsx` - Timeline view of agent activities
- `AgentCard.tsx` - Display of individual agent status and capabilities

### Backend Services
- `src/server/agents/` - Contains implementations for various specialized agents
- `src/server/services/a2a/` - Core services for agent communication and task management
- Message bus system for inter-agent communication

## First Iteration Implementation Plan

### Step 1: Verify Agent Registration

1. Ensure the agent registry service is correctly initializing all agents:
   ```typescript
   // src/server/services/a2a/initializeAgents.ts
   // Verify these functions are correctly configured
   ```

2. Confirm each agent has a proper agent card defining its capabilities:
   ```typescript
   // Each agent should define its capabilities and endpoints
   // following the Google A2A specification
   ```

### Step 2: Establish Basic Communication Flow

1. User submits prompt via `TaskInputForm.tsx`
2. System creates a new task with `taskManager.service.ts`
3. UserInteractionAgent processes the initial prompt
4. CoordinatorAgent receives the task and begins orchestration
5. SSE updates are sent to the client to reflect status changes

### Step 3: Visualization and Monitoring

1. Connect `EvaluationDashboard.tsx` to receive SSE events
2. Update `AgentNetworkGraph.tsx` to show real-time communication
3. Ensure `TaskStatusBadge.tsx` reflects current task state
4. Populate `TaskDetailsPanel.tsx` with agent messages

### Step 4: Testing Protocol

For testing the first iteration:

1. Submit a simple prompt: "Create a video about space exploration"
2. Verify the task is created with a unique ID
3. Confirm UserInteractionAgent processes the prompt
4. Check that CoordinatorAgent receives a structured request
5. Validate that UI components update to reflect status changes

## Key Connections to Verify

1. **Frontend to Backend**:
   - Task submission → taskManager.service.ts
   - SSE subscription → sseManager.service.ts

2. **Agent-to-Agent**:
   - UserInteractionAgent → CoordinatorAgent
   - Message format follows A2A protocol

3. **Backend to Frontend**:
   - SSE events → AgentCard status updates
   - Task state changes → TaskTimeline updates

## Next Steps After First Iteration

Once the basic communication flow is established:

1. Add ScenePlannerAgent to the flow
2. Integrate with existing scenePlanner.service.ts
3. Connect AnimationDesignAgent with animationDesigner.service.ts
4. Expand visualization to show more complex agent interactions

## Implementation Notes

- Focus on establishing correct message format and communication patterns first
- Ensure SSE transport is reliable for real-time updates
- Start with minimal agent functionality, then expand capabilities
- Validate each step with proper UI feedback 