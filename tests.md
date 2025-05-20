# Bazaar-Vid Testing Guide

This document serves as the definitive guide for testing in the Bazaar-Vid project. It provides clear instructions on how to run tests, write new tests, and fix existing issues.

## Quick Start

```bash
# Run all tests
npm test

# Run a specific test file
npm test -- path/to/test.test.ts

# Run tests with a specific pattern
npm test -- -t "pattern name"

# Run tests in watch mode
npm test -- --watch
```

## Core Testing Concepts

Understanding the basics of our testing setup is crucial for writing and debugging tests effectively.

### What is Jest?

Jest is a popular JavaScript testing framework. It's responsible for finding and running our tests, and reporting the results. It provides built-in features for assertions (checking expected values) and mocking (creating fake versions of code dependencies).

### What is a Test Suite?

A test suite is a collection of related tests, typically grouped together to test a specific feature or component. In Jest, test suites are defined using the `describe()` function.

### What happens when we run `npm test`?

The `npm test` command executes the `test` script defined in our `package.json` file. In this project, this script runs the Jest executable. The command includes configurations to set the Node environment, load environment variables, and handle ESM modules using the `--experimental-vm-modules` flag.

### What is Babel?

Babel is a JavaScript compiler used to transform modern JavaScript, TypeScript, and JSX syntax into a format compatible with the environment where the tests are run (Node.js via Jest). Our `jest.config.cjs` is configured to use `babel-jest` for this transformation.

### What is ESM?

ESM stands for ECMAScript Modules, the standard system for `import` and `export` statements in JavaScript. Node.js historically used CommonJS (`require`/`module.exports`). Our project uses ESM, and the test setup (`npm test` script, `jest.config.cjs`) includes specific configurations to ensure Jest can correctly process ESM files.

### What do we need for a Test Environment?

A functional test environment requires several components working together:

*   **Test Runner (Jest):** To execute tests.
*   **Assertion Library (`expect`):** To make checks within tests.
*   **Test Environment (`jest-environment-jsdom`):** To simulate a browser-like environment (providing `window`, `document`, etc.) for testing frontend or isomorphic code.
*   **Code Transformer (Babel/SWC):** To compile code into a runnable format.
*   **Mocking:** To isolate units of code by replacing dependencies with controlled test doubles.
*   **Configuration:** To orchestrate all these tools and define test behavior.

This explains why we sometimes need to adjust configuration files when encountering test issues; these files define how all these components interact.

## Common Test Failures and Troubleshooting

During test execution, you may encounter various types of errors. Understanding these can help diagnose and fix issues more effectively.

### ES Module Import Errors (`Must use import to load ES Module`)

**Cause:** Jest or the configured transformer (Babel/SWC) is failing to correctly process `import` and `export` statements in certain files, often due to mismatched module systems (ESM vs CommonJS) or incorrect configuration.
**Troubleshooting:**
*   Verify `jest.config.cjs` and Babel/SWC configurations for correct handling of `.js`, `.ts`, `.jsx`, and `.tsx` files, especially in `node_modules` or specific source directories.
*   Ensure mock files (`__mocks__`) are compatible with the module system required by the tests or correctly transformed.
*   Check if the `npm test` script includes necessary flags like `--experimental-vm-modules` for Node.js ESM support.

### Jest Mock Reference Errors (`ReferenceError: ... The module factory of jest.mock() is not allowed to reference any out-of-scope variables`)

**Cause:** Code within the factory function provided to `jest.mock()` is attempting to access variables (like `jest`, `crypto`, `uuidv4`, helper functions, etc.) defined outside that factory's scope. Jest's mock factories are run in a sandboxed environment.
**Troubleshooting:**
*   Refactor mock factories to be self-contained. Move any necessary helper functions or variable definitions *inside* the `jest.mock()` factory function.
*   If accessing `jest` functions like `jest.fn()`, ensure `jest` is accessible within the mock factory's closure, potentially by defining the mocks using a factory pattern that receives `jest` as an argument if necessary, or ensuring they are defined in files where `jest` is implicitly available (like test files themselves, though mocking external modules in the test file scope is preferred). A common pattern is to define mocks in the `__mocks__` directory and ensure they only export the mocked values.

### Drizzle ORM Type Errors (`TypeError: d.uuid is not a function`)

**Cause:** This typically indicates an issue with how Drizzle ORM schema building functions (like `uuid()`) are being used or mocked in a test context. It could be a problem with the mock of the Drizzle schema or the database connection.
**Troubleshooting:**
*   Review the test file and any related mock files (`~/server/db/index.ts`, `~/server/db/schema.ts`) to ensure Drizzle is being mocked correctly, providing necessary helper functions like `uuid()` if the schema is being rebuilt in the test.
*   Ensure the test environment correctly sets up the database or database mock.

### Timeout Errors (`Exceeded timeout of 30000 ms for a test.`)

**Cause:** A test is taking longer than the configured timeout (currently 30 seconds) to complete. This can be due to infinite loops, complex asynchronous operations, slow dependencies, or issues with fake timers not advancing as expected.
**Troubleshooting:**
*   Increase the individual test timeout using `it('...', async () => { ... }, 60000);` if the test is legitimately long-running.
*   Examine the code being tested for performance bottlenecks or blocking operations.
*   If using `jest.useFakeTimers()`, ensure timers are being advanced correctly (`jest.advanceTimersByTime()`) to avoid timeouts.
*   Check for unhandled promises or asynchronous operations that are preventing the test from finishing.

## Testing Architecture

The Bazaar-Vid project uses Jest as its primary testing framework. Tests are organized as follows:

1. **Unit Tests** - Test individual functions/components in isolation
2. **Integration Tests** - Test how components work together
3. **A2A Tests** - Test agent-to-agent communication
4. **LLM Evaluation Tests** - Evaluate the quality and correctness of LLM outputs

### Important Files

- `jest.config.cjs` - Main Jest configuration
- `jest.setup.ts` - Test setup file
- `jest.env.setup.js` - Environment variable setup

## Common Issues and Fixes

### Module Resolution Issues

If you encounter module resolution errors like:

```
Cannot find module './types.js' from 'src/scripts/log-agent/logger-transport.ts'
```

This is due to ESM/CommonJS module system conflicts. The fix is to update imports:

1. Change `import { X } from './module.js'` to `import { X } from './module'`
2. Avoid mixing module systems in a single file

### Environment Teardown Issues

If you see errors like:

```
ReferenceError: You are trying to `import` a file after the Jest environment has been torn down
```

This is typically caused by:

1. Unclosed database connections
2. Dangling promises or async operations
3. Improper cleanup in `afterEach` or `afterAll` hooks

Make sure all async operations are properly awaited and all resources are cleaned up.

## Writing New Tests

### Test File Location

- Place tests close to the code they're testing
- Use `__tests__` directories for test files
- Name test files with the `.test.ts` extension

Example directory structure:

```
src/
└── server/
    └── services/
        ├── userService.ts
        └── __tests__/
            └── userService.test.ts
```

### Test Structure

```typescript
import { feature } from '../featureModule';

describe('Feature Module', () => {
  // Setup code if needed
  beforeEach(() => {
    // Setup for each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something specific', () => {
    // Arrange - set up test data
    const input = 'test';
    
    // Act - call the function/component being tested
    const result = feature(input);
    
    // Assert - check the result
    expect(result).toBe('expected output');
  });
});
```

## Mocking

### Mocking Dependencies

```typescript
// Manual mock
jest.mock('~/server/lib/openai', () => ({
  createChatCompletion: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Mocked response' } }]
  }),
}));

// Using spyOn
jest.spyOn(openai, 'createChatCompletion').mockResolvedValue({
  choices: [{ message: { content: 'Mocked response' } }]
});
```

### Mocking Database

For Drizzle ORM:

```typescript
import { db } from '~/server/db';

// Mock the entire db object
jest.mock('~/server/db', () => ({
  db: {
    table: jest.fn().mockReturnValue({
      findFirst: jest.fn().mockResolvedValue({ id: 1, name: 'Test' }),
      findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
      // ... other methods
    }),
  },
}));
```

## Testing A2A System

The Agent-to-Agent (A2A) system requires special testing approaches:

1. **Mock LLM Outputs for Unit/Integration Tests** - For most tests that verify system logic, API handling, error paths, and component interactions, use mocked LLM responses:
   - Faster test execution
   - Deterministic behavior 
   - No API costs
   - Consistent CI/CD pipeline

2. **Real LLM Calls for Model Evaluation Tests** - Create a separate suite of evaluation tests that make actual LLM calls to:
   - Compare performance between models (OpenAI vs Claude)
   - Test different model tiers (o4-mini vs turbo, etc.)
   - Evaluate prompt quality and effectiveness
   - Measure real-world response quality for ADBs and code generation
   - Benchmark response times and costs

3. **Test Message Flow** - Ensure agents communicate correctly
4. **Verify State Transitions** - Check that tasks progress through expected states

### Mock Example

```typescript
import { initializeAgents } from '~/server/services/a2a/initializeAgents';
import { taskManager } from '~/server/services/a2a/taskManager.service';

// Mock OpenAI responses
jest.mock('~/server/lib/openai', () => ({
  createChatCompletion: jest.fn().mockImplementation((messages) => {
    // Return different responses based on the prompt
    if (messages.some(m => m.content.includes('plan a scene'))) {
      return Promise.resolve({
        choices: [{ message: { content: 'I will create a scene with...' } }]
      });
    }
    // Default response
    return Promise.resolve({
      choices: [{ message: { content: 'Generic response' } }]
    });
  }),
}));

describe('A2A Integration', () => {
  beforeAll(async () => {
    await initializeAgents();
  });

  afterAll(async () => {
    // Clean up agents
    await taskManager.shutdown();
  });

  it('completes a full task flow', async () => {
    // Start a task
    const taskId = await taskManager.createTask({
      type: 'CREATE_SCENE',
      input: { prompt: 'Make a scene with a blue background' }
    });

    // Wait for task completion
    const result = await taskManager.waitForTaskCompletion(taskId, 5000);

    // Verify results
    expect(result.status).toBe('COMPLETED');
    expect(result.output).toHaveProperty('scene');
  });
});
```

### Real LLM Evaluation Example

```typescript
import { taskManager } from '~/server/services/a2a/taskManager.service';
import { CONFIG } from '~/server/constants/config';

// USE REAL LLM CALLS - Don't mock OpenAI in this test suite
describe('Model Comparison Tests', () => {
  // Flag to only run these tests manually or in specific environments
  const RUN_LLM_TESTS = process.env.RUN_LLM_TESTS === 'true';
  
  // Skip these tests in CI or when running the full test suite
  (RUN_LLM_TESTS ? describe : describe.skip)('O4-mini vs GPT-4 Turbo Comparison', () => {
    // Test timing/performance metrics
    it('measures response time differences', async () => {
      // First with o4-mini
      CONFIG.LLM_MODEL = 'o4-mini';
      const startO4 = Date.now();
      const o4Task = await taskManager.createTask({
        type: 'CREATE_SCENE',
        input: { prompt: 'Make a complex animation with parallax effects' }
      });
      const o4Result = await taskManager.waitForTaskCompletion(o4Task, 30000);
      const o4Time = Date.now() - startO4;
      
      // Then with turbo
      CONFIG.LLM_MODEL = 'gpt-4-turbo';
      const startTurbo = Date.now();
      const turboTask = await taskManager.createTask({
        type: 'CREATE_SCENE',
        input: { prompt: 'Make a complex animation with parallax effects' }
      });
      const turboResult = await taskManager.waitForTaskCompletion(turboTask, 30000);
      const turboTime = Date.now() - startTurbo;
      
      // Log results for analysis
      console.log(`o4-mini time: ${o4Time}ms, gpt-4-turbo time: ${turboTime}ms`);
      
      // Evaluate output quality (using the metrics service)
      const o4Quality = await evaluateResponse(o4Result.output.scene);
      const turboQuality = await evaluateResponse(turboResult.output.scene);
      
      console.log('Quality comparison:', { o4Quality, turboQuality });
    });
  });
});
```

## LLM Output Evaluation

For evaluating LLM outputs, use the evaluation framework in `src/server/services/evaluation/`:

```typescript
import { evaluateResponse } from '~/server/services/evaluation/metrics.service';

describe('LLM Output Evaluation', () => {
  it('generates code that meets requirements', async () => {
    // Get actual LLM output (or use a mock)
    const output = await getLLMResponse('Create a component that displays a timer');
    
    // Evaluate against criteria
    const evaluation = evaluateResponse(output, {
      requiredElements: ['useState', 'useEffect', 'return'],
      requiredFeatures: ['timer display', 'start/stop functionality'],
      codeQuality: true,
    });
    
    // Check evaluation results
    expect(evaluation.score).toBeGreaterThan(0.7);
    expect(evaluation.missingElements).toEqual([]);
  });
});
```

## Troubleshooting

### Tests Running Slowly

1. Ensure proper isolation - don't share database connections between tests
2. Use `--runInBand` for tests with shared resources
3. Mock heavy operations like database or API calls

### Tests Failing Intermittently

1. Check for race conditions or timing issues
2. Use proper cleanup in `afterEach` and `afterAll`
3. Don't rely on execution order between tests

## Contributing to Testing

When adding new features, please:

1. Write tests before or alongside your code
2. Follow the patterns in this guide
3. Update the relevant documentation if you change testing patterns

For more detailed guidance, see the [Testing Best Practices](memory-bank/sprints/sprint24/testing-best-practices.md) document.

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Mocking in Jest](https://jestjs.io/docs/mock-functions) - Added unit tests for retryWithBackoff utility and A2A helper functions



# Testing Guide: Bazaar-Vid Project

After analyzing the current testing setup, I've identified the working patterns and common issues. Here's a comprehensive guide for creating effective tests for our service-based architecture.

## 1. Basic Setup - Working Tests

Create test files in the `__tests__` directory adjacent to the service:

```
src/server/services/
├── llm/
│   ├── LLMService.ts
│   └── __tests__/
│       └── LLMService.test.ts
```

## 2. Test File Structure

Here's a template for a typical service test:

```typescript
// src/server/services/llm/__tests__/LLMService.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LLMService } from '../LLMService';

// Mock dependencies
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

describe('LLMService', () => {
  let service: LLMService;
  let mockOpenAI: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock client
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    
    // Initialize service with mock
    service = new LLMService(mockOpenAI);
  });
  
  describe('streamChat', () => {
    it('should call the OpenAI API with correct parameters', async () => {
      // Arrange
      const messages = [{ role: 'user', content: 'Test message' }];
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({ id: 'test-id' });
      
      // Act
      await service.streamChat(messages);
      
      // Assert
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'o4-mini',
          messages,
          stream: true
        })
      );
    });
    
    it('should use custom options when provided', async () => {
      // Arrange
      const messages = [{ role: 'user', content: 'Test message' }];
      const options = { model: 'gpt-4', tools: false, temperature: 0.5 };
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({ id: 'test-id' });
      
      // Act
      await service.streamChat(messages, options);
      
      // Assert
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.5,
          stream: true
        })
      );
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          tools: expect.anything()
        })
      );
    });
  });
  
  describe('parseToolCallArguments', () => {
    it('should parse valid JSON arguments', () => {
      // Arrange
      const toolCall = {
        function: {
          arguments: '{"key": "value"}'
        }
      };
      
      // Act
      const result = service.parseToolCallArguments(toolCall, 'test-message-id');
      
      // Assert
      expect(result).toEqual({ key: 'value' });
    });
    
    it('should throw an error for invalid JSON', () => {
      // Arrange
      const toolCall = {
        function: {
          arguments: '{invalid json}'
        }
      };
      
      // Act & Assert
      expect(() => 
        service.parseToolCallArguments(toolCall, 'test-message-id')
      ).toThrow('Invalid JSON');
    });
  });
});
```

## 3. Running Tests

Run tests with:

```bash
npm test -- src/server/services/llm/__tests__/LLMService.test.ts
```

For tests with ESM/module issues, use:

```bash
NODE_OPTIONS=--experimental-vm-modules npm test -- src/server/services/llm/__tests__/LLMService.test.ts
```

## 4. Common Testing Patterns

### Mocking Dependencies

```typescript
// Direct dependency injection (preferred)
const mockDependency = { method: jest.fn() };
const service = new Service(mockDependency);

// Module mocking (when needed)
jest.mock('~/path/to/module', () => ({
  default: jest.fn().mockImplementation(() => ({
    method: jest.fn().mockResolvedValue('result')
  }))
}));
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  // Arrange
  mockDependency.method.mockResolvedValueOnce('result');
  
  // Act
  const result = await service.asyncMethod();
  
  // Assert
  expect(result).toBe('result');
  expect(mockDependency.method).toHaveBeenCalled();
});
```

### Testing Error Handling

```typescript
it('should handle errors', async () => {
  // Arrange
  const error = new Error('Test error');
  mockDependency.method.mockRejectedValueOnce(error);
  
  // Act & Assert
  await expect(service.asyncMethod()).rejects.toThrow('Test error');
});
```

## 5. Solutions to Common Issues

### Type Issues

For TypeScript type errors with mocks:

```typescript
// Use type assertion
const mockDb = db as unknown as jest.Mocked<typeof db>;

// For complex objects with nested mocks
const mockResponse = {
  choices: [{
    message: { content: 'test' }
  }]
} as any; // Use 'as any' for complex nested structures
```

### Module Resolution Issues

If you encounter module resolution errors:

```typescript
// Import directly from the file instead of using path aliases
import { SomeService } from '../../../some-service';

// Or mock the entire module
jest.mock('../../../some-service', () => ({
  SomeService: jest.fn().mockImplementation(() => ({
    method: jest.fn()
  }))
}));
```

### Environment Teardown Problems

To fix "torn down environment" errors:

```typescript
// In beforeAll/afterAll hooks
beforeAll(() => {
  // Setup
});

afterAll(async () => {
  // Important: Wait for all pending promises
  await new Promise(resolve => setTimeout(resolve, 100));
});
```

## 6. Testing Different Service Types

### Testing LLM Service

```typescript
// Mock the entire OpenAI client
const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'test response' } }]
      })
    }
  }
};

// Pass the mock to the service constructor
const llmService = new LLMService(mockOpenAIClient);
```

### Testing Database Services

```typescript
// Mock the database client
const mockDb = {
  insert: jest.fn().mockReturnValue({
    returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
  }),
  query: {
    tableName: {
      findMany: jest.fn().mockResolvedValue([])
    }
  }
};

// Pass the mock to the service
const dbService = new DatabaseService(mockDb);
```

### Testing Event-Based Services

```typescript
// Create a mock subject
const mockSubject = {
  next: jest.fn(),
  error: jest.fn(),
  complete: jest.fn()
};

// Pass to the service
const service = new StreamingService(mockDependencies);
await service.processWithEvents(data, mockSubject);

// Verify events were emitted correctly
expect(mockSubject.next).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'progress' })
);
```

## Conclusion

For the refactored LLMService specifically, create tests that validate:
1. Stream creation with different options
2. Tool call argument parsing
3. Error handling
4. Integration with the chat orchestration service
