# A2A Test Scripts

This directory contains test scripts for validating the A2A (Agent-to-Agent) system functionality without relying on database connectivity.

## Available Test Scripts

1. **test-adb-agent.js** - Tests the Animation Design Brief (ADB) Agent in isolation
2. **test-coordinator.js** - Tests the Coordinator Agent with a mock Scene Planner Agent
3. **test-builder-agent.js** - Tests the Builder Agent's component generation capabilities
4. **test-error-fixer-agent.js** - Tests the Error Fixer Agent's code repair functionality
5. **test-end-to-end-flow.js** - Tests the complete flow between all agents in the system
6. **test-integrated-adb-agent.js** - Tests a more realistic implementation of the ADB Agent that uses LLM-like generation

## Running the Tests

To run a test script, simply use Node.js:

```bash
# Test the ADB agent
node src/scripts/a2a-test/test-adb-agent.js

# Test the Coordinator agent with ScenePlanner
node src/scripts/a2a-test/test-coordinator.js

# Test the Builder agent
node src/scripts/a2a-test/test-builder-agent.js

# Test the Error Fixer agent
node src/scripts/a2a-test/test-error-fixer-agent.js

# Test the complete end-to-end flow
node src/scripts/a2a-test/test-end-to-end-flow.js

# Test integrated ADB agent with LLM-like generation
node src/scripts/a2a-test/test-integrated-adb-agent.js
```

## Key Features of the Tests

### Common Elements

All test scripts demonstrate:
- Message routing and agent communication
- Task state management (without database dependency)
- Error handling
- Artifacts creation and tracking

### Enhanced Test Scripts

The enhanced test scripts (`test-builder-agent.js`, `test-error-fixer-agent.js`, `test-integrated-adb-agent.js`) offer:

1. **More realistic data generation**:
   - ADB generation based on scene description content analysis
   - Code generation that actually parses the ADB and generates matching component code
   - Error fixing that applies specific fixes based on error patterns

2. **Advanced Testing Scenarios**:
   - Multiple test cases with different inputs
   - Testing success and failure paths
   - Generating detailed reports of operations

### End-to-End Flow Testing

The `test-end-to-end-flow.js` script demonstrates:
- Registration of all five agent types (Coordinator, ScenePlanner, ADB, Builder, ErrorFixer)
- Complete message flow through the agent pipeline
- State transitions and artifact creation at each step
- Sequential processing of messages between agents

The typical flow demonstrated is:
1. User request → Coordinator
2. Coordinator → ScenePlanner (plan the scene)
3. ScenePlanner → Coordinator (with scene plan)
4. Coordinator → ADBAgent (generate Animation Design Brief)
5. ADBAgent → Coordinator (with ADB)
6. Coordinator → BuilderAgent (generate and build component)
7. BuilderAgent → Coordinator (with built component or errors)
8. (Optional) Coordinator → ErrorFixerAgent (if errors need fixing)
9. (Optional) ErrorFixerAgent → BuilderAgent (with fixed code)
10. BuilderAgent → Coordinator (with final built component)

## Limitations

These tests have the following limitations:
- No actual database operations (uses in-memory state)
- No actual LLM API calls (uses predetermined or generated outputs)
- No actual component bundling/building (simulates build process)
- JavaScript-only implementation (TypeScript would require compilation)

## Use Cases

1. **Development Testing**: Quickly validate agent behavior without waiting for LLM responses
2. **Logic Verification**: Ensure message routing and state transitions work correctly
3. **Neon DB Outage**: Provide fallback testing capability when database is unavailable
4. **CI/CD Integration**: Lightweight tests that can run in CI environments without external dependencies 
5. **Regression Testing**: Ensure changes to one agent don't break the end-to-end flow 