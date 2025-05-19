# Bazaar-Vid Testing Best Practices

This document outlines the best practices for testing in the Bazaar-Vid project. It serves as a guide for all future test development and for refactoring existing tests.

## Table of Contents

1. [Test Types](#test-types)
2. [Directory Structure](#directory-structure)
3. [Naming Conventions](#naming-conventions)
4. [Test Setup and Teardown](#test-setup-and-teardown)
5. [Mocking Strategy](#mocking-strategy)
6. [A2A Testing](#a2a-testing)
7. [LLM Output Evaluation](#llm-output-evaluation)
8. [Testing Commands](#testing-commands)

## Test Types

Bazaar-Vid uses several types of tests:

### Unit Tests

- Test individual functions/components in isolation
- Should be fast and reliable
- Don't hit external services or databases
- Use mocks for dependencies

```typescript
// Example unit test for a utility function
import { formatTimestamp } from '../timeUtils';

describe('formatTimestamp', () => {
  it('formats timestamp correctly', () => {
    const timestamp = new Date('2023-01-01T12:00:00Z');
    expect(formatTimestamp(timestamp)).toBe('Jan 1, 2023 12:00 PM');
  });
});
```

### Integration Tests

- Test how components work together
- May involve multiple services
- Use test databases or mock external APIs
- Focus on boundaries between components

```typescript
// Example integration test for database interactions
import { db } from '~/server/db';
import { createUser, getUserById } from '~/server/services/userService';

describe('User Service Integration', () => {
  beforeAll(async () => {
    // Setup test database
    await db.table('users').delete();
  });

  afterAll(async () => {
    // Cleanup
    await db.table('users').delete();
  });

  it('creates and retrieves a user', async () => {
    const userId = await createUser({ name: 'Test User', email: 'test@example.com' });
    const user = await getUserById(userId);
    expect(user).toMatchObject({ name: 'Test User', email: 'test@example.com' });
  });
});
```

### A2A Tests

- Test agent-to-agent communication
- Mock the OpenAI responses
- Verify message passing between agents
- Check state transitions in the system

### LLM Evaluation Tests

- Evaluate the quality and correctness of LLM outputs
- Compare expected vs. actual outputs
- Measure metrics like coherence, relevance, etc.

## Directory Structure

Tests should be organized according to the following structure:

```
src/
├── component/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   └── component.test.ts
│   │   └── integration/
│   │       └── component-integration.test.ts
│   └── component.ts
├── server/
│   ├── services/
│   │   ├── __tests__/
│   │   │   └── service.test.ts
│   │   └── service.ts
│   └── agents/
│       ├── __tests__/
│       │   └── agent.test.ts
│       └── agent.ts
└── tests/
    ├── a2a/
    │   └── a2a-integration.test.ts
    ├── llm/
    │   └── llm-evaluation.test.ts
    └── e2e/
        └── full-workflow.test.ts
```

## Naming Conventions

- Test files should have the `.test.ts` extension
- Test files should be named after the module they're testing
- Test descriptions should be clear about what's being tested

```typescript
// Good naming
describe('UserService', () => {
  describe('createUser', () => {
    it('creates a user with valid data', () => {
      // Test implementation
    });
    
    it('throws an error with invalid email', () => {
      // Test implementation
    });
  });
});
```

## Test Setup and Teardown

- Use `beforeAll` and `afterAll` for test suite setup/teardown
- Use `beforeEach` and `afterEach` for per-test setup/teardown
- Clean up all resources after tests complete
- Don't leave dangling promises or async operations

```typescript
describe('Database Operations', () => {
  beforeAll(async () => {
    // Connect to test database
    await db.connect();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await db.table('test_data').delete();
  });

  afterAll(async () => {
    // Disconnect and clean up
    await db.disconnect();
  });

  it('performs database operations', async () => {
    // Test implementation
  });
});
```

## Mocking Strategy

### External Dependencies

- Use Jest's mocking capabilities for external dependencies
- Create mock implementations that match the API contract
- Mock at the service boundary, not internal implementation

```typescript
// Mocking an API client
jest.mock('~/server/lib/openai', () => ({
  createChatCompletion: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Mocked response' } }]
  }),
}));
```

### Database

- Use an in-memory test database for unit tests
- Use transactions for integration tests to roll back changes
- Don't rely on database state between tests

### Time-based Tests

- Mock timers for time-dependent tests
- Don't rely on actual timing for assertions

```typescript
// Testing a timeout function
jest.useFakeTimers();

it('calls function after timeout', () => {
  const callback = jest.fn();
  
  setTimeout(callback, 1000);
  
  expect(callback).not.toBeCalled();
  
  jest.advanceTimersByTime(1000);
  
  expect(callback).toBeCalled();
});
```

## A2A Testing

### Mocking Agent Responses

- Create mock definitions for each agent type
- Define expected responses for various prompts
- Test the orchestration logic, not the LLM responses

```typescript
// Example A2A test with mocked responses
jest.mock('~/server/services/a2a/openaiService', () => ({
  generateAgentResponse: jest.fn().mockImplementation((agent, prompt) => {
    if (agent === 'ScenePlannerAgent' && prompt.includes('create scene')) {
      return Promise.resolve({ 
        text: 'I will create a scene with the following elements...',
        actions: [
          { type: 'CREATE_SCENE', payload: { id: 'test-scene-1' } }
        ]
      });
    }
    return Promise.resolve({ text: 'Generic response' });
  }),
}));
```

### Testing Message Flow

- Verify that agents receive the correct messages
- Check that responses are processed correctly
- Test error handling and recovery

## LLM Output Evaluation

### Evaluation Metrics

For evaluating LLM outputs, use the following metrics:

1. **Correctness**: Does the output match expected behavior?
2. **Completeness**: Does it address all requirements?
3. **Code Quality**: Is generated code syntactically valid?
4. **Coherence**: Is the output logically structured?

### Implementing Evaluation Tests

- Create test cases with expected outputs
- Compare actual outputs to expected values
- Use scoring functions for fuzzy matching

```typescript
// Example LLM evaluation test
import { evaluateResponse } from '~/server/services/evaluation/evaluator';

describe('Scene Planner Agent', () => {
  it('generates a valid scene plan', async () => {
    const prompt = 'Create a scene with a blue background and a spinning logo';
    const response = await agent.generateResponse(prompt);
    
    const evaluation = evaluateResponse(response, {
      requiredElements: ['background', 'logo'],
      requiredProperties: ['color', 'animation'],
      expectedValues: {
        backgroundColor: 'blue',
        animation: ['spin', 'rotate'],
      }
    });
    
    expect(evaluation.score).toBeGreaterThan(0.8);
    expect(evaluation.missingElements).toEqual([]);
  });
});
```

## Testing Commands

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests with a specific pattern
npm test -- -t "pattern"

# Run tests in watch mode
npm test -- --watch
```

### Debugging Tests

```bash
# Run with node debugger
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.test.ts
```

### Test Coverage

```bash
# Generate coverage report
npm test -- --coverage
```

## Best Practices for Sprint 24

For Sprint 24 development, follow these guidelines:

1. Write tests before or alongside feature development
2. Ensure all tests clean up after themselves
3. Don't skip tests without documenting why
4. Keep unit tests fast and focused
5. Use proper mocking for external dependencies
6. Prioritize test stability over coverage 