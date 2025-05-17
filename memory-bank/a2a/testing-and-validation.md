# A2A Testing and Validation

## Testing Strategy

This document outlines the approach for testing and validating the A2A (Agent-to-Agent) system in the Bazaar-Vid platform. The testing strategy focuses on ensuring reliable communication between agents, correct task processing, and proper integration with existing services.

## Test Environment

The A2A system can be tested in two environments:

1. **Integration Test Environment**
   - Uses the `/test/a2a-integration` route
   - Focuses on agent communication without full video generation
   - Useful for isolated testing of agent interactions

2. **Evaluation Dashboard Environment**
   - Uses the `/test/evaluation-dashboard` route
   - Provides visualization of the entire agent network
   - Includes metrics collection and performance monitoring

## Core Test Cases

### 1. Agent Registration and Discovery

**Test Case: Agent Discovery**
- **Objective**: Verify that agents properly register and can discover each other
- **Verification Steps**:
  1. Initialize the agent registry
  2. Register all specialized agents
  3. Request the list of available agents
  4. Verify each agent has a proper agent card
  5. Confirm coordinator agent can discover other agents

### 2. Basic Task Processing

**Test Case: Simple Prompt Processing**
- **Objective**: Verify end-to-end processing of a simple user prompt
- **Verification Steps**:
  1. Submit a prompt: "Create a simple animation of a bouncing ball"
  2. Verify task creation with unique ID
  3. Confirm UserInteractionAgent receives and processes the prompt
  4. Check CoordinatorAgent receives structured instructions
  5. Validate task status changes (submitted → working → completed)
  6. Verify SSE updates are sent to the client

### 3. Agent Communication

**Test Case: Inter-Agent Communication**
- **Objective**: Verify proper message passing between agents
- **Verification Steps**:
  1. Trigger communication from CoordinatorAgent to ScenePlannerAgent
  2. Validate message format follows A2A protocol
  3. Confirm message is delivered via message bus
  4. Verify ScenePlannerAgent processes the message
  5. Check for valid response back to CoordinatorAgent
  6. Validate the communication appears in the AgentNetworkGraph

### 4. Error Handling

**Test Case: Agent Error Recovery**
- **Objective**: Verify system handles agent errors gracefully
- **Verification Steps**:
  1. Force an error in ScenePlannerAgent (e.g., invalid input)
  2. Verify proper error response format
  3. Confirm task state transitions to appropriate error state
  4. Check that error is propagated to the client via SSE
  5. Validate error appears in the UI (TaskStatusBadge shows failure)
  6. Confirm system allows retry after error

### 5. Integration with Existing Services

**Test Case: ScenePlanner Integration**
- **Objective**: Verify ScenePlannerAgent properly integrates with scenePlanner.service.ts
- **Verification Steps**:
  1. Submit a prompt requiring scene planning
  2. Verify ScenePlannerAgent calls scenePlanner.service.ts
  3. Confirm scene plan is generated correctly
  4. Validate scene plan is passed to the next agent in the workflow
  5. Check scene plan appears in the UI

**Test Case: AnimationDesigner Integration**
- **Objective**: Verify ADBAgent properly integrates with animationDesigner.service.ts
- **Verification Steps**:
  1. Pass a scene plan to ADBAgent
  2. Verify ADBAgent calls animationDesigner.service.ts
  3. Confirm animation design brief is generated
  4. Validate the ADB has correct structure
  5. Check ADB appears in the AnimationDesignBriefViewer

## UI Component Testing

### 1. TaskInputForm Validation

**Test Case: Form Submission**
- **Objective**: Verify the task input form correctly submits prompts
- **Verification Steps**:
  1. Enter a prompt in TaskInputForm
  2. Submit the form
  3. Verify form data is correctly passed to backend
  4. Confirm task creation response
  5. Check UI updates to show pending task

### 2. AgentNetworkGraph Visualization

**Test Case: Network Visualization**
- **Objective**: Verify the agent network graph correctly displays interactions
- **Verification Steps**:
  1. Process a task involving multiple agents
  2. Verify nodes appear for each agent involved
  3. Confirm edges appear representing communications
  4. Validate edge direction reflects message flow
  5. Check UI updates in real-time as new messages occur

### 3. TaskTimeline Updates

**Test Case: Timeline Accuracy**
- **Objective**: Verify the task timeline displays correct sequence and timing
- **Verification Steps**:
  1. Process a multi-step task
  2. Verify timeline entries appear for each step
  3. Confirm timestamps are accurate
  4. Validate status changes are reflected
  5. Check UI allows drilling into specific timeline events

## Performance Testing

### 1. SSE Connection Reliability

**Test Case: Long-Running Connection**
- **Objective**: Verify SSE connection remains stable for long-running tasks
- **Verification Steps**:
  1. Start a complex task expected to run for several minutes
  2. Monitor SSE connection for disconnections
  3. Verify events continue to arrive throughout task duration
  4. Confirm UI updates throughout the process
  5. Validate all status changes are received

### 2. Multiple Concurrent Tasks

**Test Case: Concurrent Task Processing**
- **Objective**: Verify system can handle multiple concurrent tasks
- **Verification Steps**:
  1. Submit multiple tasks in quick succession
  2. Verify each receives a unique task ID
  3. Confirm all tasks progress through states
  4. Validate UI correctly distinguishes between tasks
  5. Check resources are properly allocated between tasks

## Test Automation

Automated tests should cover:

1. **Unit Tests**: Individual agent implementations
2. **Integration Tests**: Agent-to-agent communication
3. **End-to-End Tests**: Complete task processing flows

## Validation Checklist

Before considering the A2A system ready for production:

- [ ] All agents properly register with the system
- [ ] Agents can discover and communicate with each other
- [ ] Task lifecycle (creation → processing → completion) works correctly
- [ ] SSE updates are reliable and real-time
- [ ] UI components accurately reflect agent activities
- [ ] Error handling is robust across all components
- [ ] Integration with existing services is seamless
- [ ] Performance is acceptable under normal load
- [ ] All test cases pass consistently 