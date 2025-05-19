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
- [Mocking in Jest](https://jestjs.io/docs/mock-functions) 