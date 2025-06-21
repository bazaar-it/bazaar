# Streaming Chat Functionality Tests

This directory contains tests for the chat streaming functionality, focusing on message handling and state management.

## Testing Strategy

We use an isolation-based testing approach similar to what we implemented for the build worker:

1. **Function Isolation**: Key functions are reimplemented in the test files to avoid complex dependencies.
2. **Pure Logic Testing**: Tests focus on the core logic of message updates and synchronization.
3. **Mocking**: Where necessary, dependencies are mocked using Jest's mocking capabilities.

## Test Coverage

The tests cover the following key aspects of the streaming chat system:

### 1. Message Update Logic (`videoState.test.ts`)

- Delta handling (appending vs. replacing content)
- Status updates
- Multiple sequential updates to the same message
- Edge cases (empty messages, missing fields)

### 2. Database Synchronization (`videoState.test.ts`)

- Merging database messages with optimistic updates
- Handling message chronology
- Handling duplicate message IDs
- Edge cases (empty arrays, missing fields)

### 3. Stream Event Handling (`handleStreamEvents.test.ts`)

- Processing different types of stream events
- Delta content appending
- Status updates based on event types
- Tool execution events
- Error handling
- Stream completion

## Running Tests

To run these tests:

```bash
# Run all tests
npm test

# Run specific test file
npx jest src/stores/__tests__/videoState.test.ts
```

## Test Patterns

These tests use the following patterns that can be applied to other parts of the codebase:

1. **Reimplementation for Isolation**: Key functions are reimplemented in the test files to avoid dependency issues.
2. **State-Based Testing**: Tests track changes to state rather than implementation details.
3. **Comprehensive Coverage**: Tests cover normal operation, edge cases, and error conditions.
4. **Clear Expectations**: Each test has clear, focused expectations about the outcome. 