# Testing A2A Agents Without Database Access

When the Neon database is down, we still need to validate that our A2A system is working correctly. This document outlines the approaches implemented to test the A2A system without relying on database connectivity.

## Test Scripts Overview

We've implemented standalone test scripts that mock the database layer and other dependencies to allow testing individual agents and their interactions. These scripts are located in:

```
src/scripts/a2a-test/
```

### Available Test Scripts

1. **test-adb-agent.js** - Tests the Animation Design Brief Agent in isolation
2. **test-coordinator.js** - Tests the Coordinator Agent with a mock Scene Planner Agent 
3. **test-builder-agent.js** - Tests the Builder Agent's component generation capabilities
4. **test-error-fixer-agent.js** - Tests the Error Fixer Agent's code repair functionality
5. **test-end-to-end-flow.js** - Tests the complete flow between all agents in the system
6. **test-integrated-adb-agent.js** - Tests a more realistic ADB Agent implementation

### Mock Implementation Approach

The test scripts use several key mocking patterns:

1. **MockMessageBus** - For routing messages between agents
2. **MockTaskManager** - For tracking task state without database access
3. **Simulated Agent Responses** - Predefined responses for each agent type
4. **Test Data Generation** - Methods to create sample animation design briefs, scene plans, etc.

### Benefits of Standalone Scripts

1. **Independence** - Tests can run without any external services
2. **Simplicity** - Pure JavaScript allows easy debugging
3. **Focus** - Tests focus on agent communication rather than database integration
4. **Speed** - No network or database calls makes tests run quickly

### Usage

Run any test script directly with Node.js:

```bash
node src/scripts/a2a-test/test-end-to-end-flow.js
```

## Jest Testing with Mocks

The A2A system also has Jest-based unit tests that use mocks to test each agent in isolation. These tests focus on the individual agent implementations rather than their interactions.

Key tests:

- `src/server/agents/__tests__/coordinator-agent.test.ts`
- `src/server/agents/__tests__/builder-agent.test.ts`
- `src/server/agents/__tests__/adb-agent.test.ts`
- `src/server/agents/__tests__/error-fixer-agent.test.ts`

## Testing with Real LLM Integration

In addition to mocked tests, we've implemented tests that use real LLM calls via the actual OpenAI API. This approach allows us to:

1. Validate that our prompt engineering is effective
2. Test actual LLM responses in our real A2A workflow
3. Ensure our agents can handle the real variety of LLM outputs

### Real LLM Test Implementation

The real LLM tests are implemented in `src/server/agents/__tests__/coordinator-agent.test.ts` in a separate describe block. These tests:

1. Connect to the real OpenAI API using environment credentials
2. Make actual API calls to generate responses
3. Test the CoordinatorAgent's LLM routing capabilities with real intelligence
4. Use the real TaskManager service (but with an isolated test database)

### Running Real LLM Tests

To run the real LLM tests:

```bash
# Set required environment variables
export OPENAI_API_KEY="your-api-key-here"
export RUN_REAL_LLM_TESTS=true

# Run the specific test file
npm test -- src/server/agents/__tests__/coordinator-agent.test.ts
```

> **Important**: These tests make real API calls that will incur costs. They should not be run in CI environments unless proper controls and budget limits are in place.

### Real LLM Test Cases

The test suite includes these real-LLM test cases:

1. Video creation request routing - Tests that the CoordinatorAgent correctly analyses a user prompt and routes it to the appropriate next agent (ScenePlannerAgent)
2. Error analysis - Tests that the CoordinatorAgent can generate user-friendly explanations for technical errors
3. Failed component handling - Tests determining whether errors are fixable and routing to ErrorFixerAgent appropriately

These tests validate the LLM integration's effectiveness in making intelligent decisions within our agent system.

## Future Testing Improvements

- Add more detailed tracing/logging for agent interactions
- Create a visual representation of the A2A message flows
- Add performance benchmarks for different agent implementations
- Create more targeted test cases for edge conditions

## Core Components of the Test Framework

### MockTaskManager

The MockTaskManager provides an in-memory implementation of the TaskManager service:

```javascript
class MockTaskManager {
  constructor() {
    this.tasks = new Map();
    this.artifacts = new Map();
    this.messages = [];
  }

  async createTask(taskData) { /* ... */ }
  async updateTaskStatus(taskId, state, message, artifacts, componentStatus) { /* ... */ }
  async addTaskArtifact(taskId, artifact) { /* ... */ }
  async logTaskMessage(taskId, message) { /* ... */ }
  async getTask(taskId) { /* ... */ }
  async getTaskArtifacts(taskId) { /* ... */ }
}
```

This in-memory implementation allows agent code to interact with "tasks" just as it would with the real database-backed TaskManager.

### MockMessageBus

For the end-to-end test, we've added a MessageBus implementation that handles message routing:

```javascript
class MockMessageBus {
  constructor() {
    this.agents = new Map();
    this.messages = [];
  }

  registerAgent(name, agent) { /* ... */ }
  async sendMessage(message) { /* ... */ }
  getMessageHistory() { /* ... */ }
}
```

This allows us to simulate the complete flow of messages between different agents without requiring the real message routing infrastructure.

### Test Agent Implementations

Each test script includes simplified agent implementations that:
1. Follow the same interface as production agents
2. Implement the core logic without database or LLM dependencies
3. Generate deterministic outputs for testing purposes

For example, in the ADBAgent test:

```javascript
async processMessage(message) {
  // Extract message details
  const { type, payload, id: correlationId } = message;
  
  // Handle GENERATE_DESIGN_BRIEF_REQUEST message type
  if (type === "GENERATE_DESIGN_BRIEF_REQUEST") {
    // Generate a mock ADB based on the description
    const adb = {
      id: crypto.randomUUID(),
      name: `Animation: ${payload.description.substring(0, 30)}...`,
      // ... more ADB properties
    };
    
    // Create and send response message
    return this.createA2AMessage(
      "CREATE_COMPONENT_REQUEST",
      payload.taskId,
      "CoordinatorAgent",
      this.createSimpleTextMessage("ADB generated successfully"),
      [adbArtifact],
      correlationId
    );
  }
}
```

## Enhanced Test Scripts

We've created additional more sophisticated test scripts that provide more realistic functionality while still avoiding database dependencies:

### test-builder-agent.js

This enhanced script provides a more sophisticated BuilderAgent implementation that:
- Actually parses the Animation Design Brief to extract elements and animations
- Generates real component code based on the ADB content
- Handles different element types (shapes, text) and animation types (bounce, fadeIn, spin)
- Implements realistic code error checking
- Simulates build process with proper error handling

### test-error-fixer-agent.js

The enhanced ErrorFixerAgent test script:
- Implements more realistic code analysis based on error messages
- Applies specific fixes based on error patterns (syntax errors, missing return statements, etc.)
- Creates detailed fix reports showing applied changes
- Handles unfixable errors with appropriate responses
- Demonstrates enhancement of code based on ADB specifications

### test-end-to-end-flow.js

Our most comprehensive test script demonstrates the complete A2A system:
- Implements all five agent types (Coordinator, ScenePlanner, ADB, Builder, ErrorFixer)
- Creates a complete message chain from initial request to final component
- Shows message flow, task state updates, and artifact creation at each step
- Follows realistic agent decision-making patterns

The typical message flow demonstrated in this script:

1. **UserInterface → CoordinatorAgent**: `CREATE_VIDEO_REQUEST`
2. **CoordinatorAgent → ScenePlannerAgent**: `PLAN_SCENE_REQUEST`
3. **ScenePlannerAgent → CoordinatorAgent**: `SCENE_PLAN_CREATED`
4. **CoordinatorAgent → ADBAgent**: `GENERATE_DESIGN_BRIEF_REQUEST`
5. **ADBAgent → CoordinatorAgent**: `CREATE_COMPONENT_REQUEST`
6. **CoordinatorAgent → BuilderAgent**: `BUILD_COMPONENT_REQUEST`
7. **BuilderAgent → CoordinatorAgent**: `COMPONENT_BUILD_SUCCESS`

The script can optionally demonstrate error handling paths:
8. **BuilderAgent → CoordinatorAgent**: `COMPONENT_SYNTAX_ERROR`
9. **CoordinatorAgent → ErrorFixerAgent**: `COMPONENT_SYNTAX_ERROR`
10. **ErrorFixerAgent → BuilderAgent**: `REBUILD_COMPONENT_REQUEST`
11. **BuilderAgent → CoordinatorAgent**: `COMPONENT_BUILD_SUCCESS`

### test-integrated-adb-agent.js

This script shows a more realistic ADBAgent implementation:
- Uses a controlled LLM-like generation process for Animation Design Briefs
- Parses the scene description to extract potential elements and animations
- Makes intelligent decisions about element properties based on the description
- Creates more realistic ADB structure with proper elements and animations
- Demonstrates a better simulation of the actual service behavior

## Running the Tests

To run a test script, simply use Node.js:

```bash
# Test the ADB agent
node src/scripts/a2a-test/test-adb-agent.js

# Test the Coordinator agent with ScenePlanner
node src/scripts/a2a-test/test-coordinator.js

# Test the Builder agent (enhanced implementation)
node src/scripts/a2a-test/test-builder-agent.js

# Test the Error Fixer agent (enhanced implementation)
node src/scripts/a2a-test/test-error-fixer-agent.js

# Test the complete end-to-end flow
node src/scripts/a2a-test/test-end-to-end-flow.js

# Test integrated ADB agent with LLM-like generation
node src/scripts/a2a-test/test-integrated-adb-agent.js
```

The output will show detailed logs of:
- Message routing between agents
- Task state transitions
- Artifact creation
- Decision-making logic
- Intelligent processing of inputs (where applicable)

## Key Validations

The tests verify:

1. **Model Initialization** - The agents properly initialize and respond to messages
2. **Coordinator Decision-Making** - The Coordinator correctly analyzes requests and routes to appropriate agents
3. **Scene Planning** - The ScenePlanner generates valid scene plans
4. **ADB Generation** - The ADBAgent produces valid Animation Design Briefs
5. **Component Building** - The BuilderAgent correctly generates and builds components
6. **Error Fixing** - The ErrorFixerAgent identifies and repairs code issues
7. **Message Protocol** - All messages follow the A2A protocol format
8. **End-to-End Workflow** - The complete chain of messages flows correctly between all agents

## Example: End-to-End A2A Flow Test

When running `test-end-to-end-flow.js`, you'll see the complete agent interaction sequence:

```
=== Testing End-to-End A2A Flow ===

[MessageBus] Registered agent: CoordinatorAgent
[MessageBus] Registered agent: ScenePlannerAgent
[MessageBus] Registered agent: ADBAgent
[MessageBus] Registered agent: BuilderAgent
[MessageBus] Registered agent: ErrorFixerAgent

=== Starting A2A Flow ===
Initial request: Create a short video with a red ball bouncing on a blue background with text

--- Step 1: CREATE_VIDEO_REQUEST ---
[MessageBus] Routing message: CREATE_VIDEO_REQUEST from UserInterface to CoordinatorAgent
[TaskManager] Task fc4b2288-83ba-4890-ab3c-19b7aa703ce1 updated to state: working

--- Step 2: PLAN_SCENE_REQUEST ---
[MessageBus] Routing message: PLAN_SCENE_REQUEST from CoordinatorAgent to ScenePlannerAgent
[TaskManager] Task fc4b2288-83ba-4890-ab3c-19b7aa703ce1 updated to state: working
[ScenePlannerAgent] Planning scene for: "Create a short video with a red ball bouncing on a blue background with text"
[TaskManager] Added artifact to task fc4b2288-83ba-4890-ab3c-19b7aa703ce1: scene-plan-fc4b2288-83ba-4890-ab3c-19b7aa703ce1.json
[TaskManager] Task fc4b2288-83ba-4890-ab3c-19b7aa703ce1 updated to state: completed

--- Step 3: SCENE_PLAN_CREATED ---
[MessageBus] Routing message: SCENE_PLAN_CREATED from ScenePlannerAgent to CoordinatorAgent
[TaskManager] Task fc4b2288-83ba-4890-ab3c-19b7aa703ce1 updated to state: working

--- Step 4: GENERATE_DESIGN_BRIEF_REQUEST ---
[MessageBus] Routing message: GENERATE_DESIGN_BRIEF_REQUEST from CoordinatorAgent to ADBAgent
...
```

This demonstrates the flow of messages through the A2A system, task state updates, and artifact creation - without any actual database operations or LLM API calls.

## Limitations

These test scripts have the following limitations:
- No actual database operations (uses in-memory state)
- No actual LLM API calls (uses predetermined or simulated outputs)
- No actual component bundling/building (simulates build process)
- JavaScript-only implementation (TypeScript would require compilation)

## Troubleshooting

If you encounter issues with ESM/CommonJS imports:
- Make sure your scripts use `import` statements instead of `require()`
- The extension should be `.js` as configured in your package.json
- Node.js 18+ should be used for running the scripts

## Next Steps

1. Add similar test scripts for R2StorageAgent and UIAgent
2. Expand tests to cover edge cases such as timeout handling and retries
3. Add validation for more complex error handling scenarios
4. Create a test dashboard to visualize the agent communication flow 
5. Integrate these tests into a CI/CD pipeline for automated verification 