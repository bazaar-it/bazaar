# Testing Recommendations for Sprint 24

Based on our analysis of the existing testing infrastructure and the needs of the Bazaar-Vid project, this document provides concrete recommendations for improving the testing system during Sprint 24.

## Executive Summary

The current testing infrastructure suffers from several key issues:

1. Module resolution errors due to ESM/CommonJS conflicts
2. Inconsistent test organization and patterns
3. Improper cleanup causing "torn down environment" errors
4. Lack of specialized testing for LLM outputs and A2A interactions

Our analysis shows that 72.1% of test suites are failing, with the main issues being module resolution errors and environment teardown problems. We recommend a focused approach to address these issues in Sprint 24.

## Immediate Actions

### 1. Fix Module Resolution Issues

- Change import statements using `.js` extensions to use bare specifiers instead
  ```typescript
  // Before
  import { LogEntry } from './types.js';
  
  // After
  import { LogEntry } from './types';
  ```
- Update jest.config.cjs to ensure TypeScript paths are properly resolved:
  ```js
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  ```

### 2. Standardize Test Configuration

- Consolidate Jest configuration files into a single source of truth
- Choose either ESM or CommonJS for the entire project (preferably ESM)
- Update the npm test script to ensure environment variables are properly loaded

### 3. Implement Proper Test Cleanup

- Ensure all tests properly clean up resources in afterEach/afterAll hooks
- Wrap database operations in transactions that can be rolled back
- Fix "torn down environment" errors by ensuring all async operations complete before tests end

### 4. Implement Robust Test Isolation

- Prevent tests from affecting each other
- Mock third-party services consistently
- Use separate test databases or in-memory options

### 5. Standardize Mocking Approaches

- Create shared mocks for common dependencies
- Document proper mocking patterns for OpenAI, database, etc.
- Ensure consistent usage across the codebase

### 6. Develop Specialized Test Harnesses

- Create an A2A test harness for agent interaction testing
- Build LLM evaluation framework for testing output quality
- Implement tools for testing SSE and real-time updates

### 7. Implement Dual LLM Testing Strategy

- Use mocked LLM responses for basic unit/integration tests
- Create a separate test suite for real LLM evaluation tests
- Set up a controlled environment for model comparison testing
- Implement metrics collection for response quality, speed, and costs
- Add environment flags to control when real LLM tests run

## Testing Strategy for Sprint 24

### 1. Test Organization

We recommend organizing tests in the following structure:

```
src/
├── component/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   └── component.test.ts
│   │   └── integration/
│   │       └── component-integration.test.ts
├── server/
│   ├── services/
│   │   ├── __tests__/
│   │   │   └── service.test.ts
└── tests/
    ├── a2a/
    │   └── a2a-integration.test.ts
    ├── llm/
    │   └── llm-evaluation.test.ts
    └── e2e/
        └── full-workflow.test.ts
```

### 2. A2A Testing Approach

For testing the Agent-to-Agent system:

1. **Mock OpenAI Responses**: Create realistic but deterministic responses for tests
   ```typescript
   jest.mock('~/server/lib/openai', () => ({
     createChatCompletion: jest.fn().mockImplementation((messages) => {
       // Return different responses based on prompt content
       const lastMessage = messages[messages.length - 1]?.content || '';
       if (lastMessage.includes('create scene')) {
         return Promise.resolve({
           choices: [{ message: { content: 'Mocked scene creation response' } }]
         });
       }
       // Default response
       return Promise.resolve({
         choices: [{ message: { content: 'Default response' } }]
       });
     })
   }));
   ```

2. **Test Message Flow**: Verify that agents receive and process messages correctly
3. **Test Task Lifecycle**: Ensure tasks progress through expected states
4. **Test Error Cases**: Verify proper handling of errors in the A2A system

### 3. LLM Output Evaluation

Implement and use the evaluation framework for LLM outputs:

1. **Content Evaluation**: Check that outputs contain required elements
2. **Code Quality**: Verify generated code meets quality standards
3. **Functional Requirements**: Test that generated components fulfill requirements

Example:
```typescript
import { evaluateRemotionComponent } from '~/server/services/evaluation/metrics.service';

it('should generate a valid Remotion component', async () => {
  const prompt = 'Create a spinning logo component';
  const generatedCode = await componentGenerator.generateComponent(prompt);
  
  const evaluation = evaluateRemotionComponent(generatedCode);
  
  expect(evaluation.score).toBeGreaterThan(0.8);
  expect(evaluation.missingElements).toHaveLength(0);
});
```

### 4. Database Testing Strategy

1. **Use Isolated Test Database**: Configure a separate test database or schema
2. **Transaction Wrapping**: Wrap tests in transactions that are rolled back
3. **Mock Where Appropriate**: For unit tests, mock database operations
4. **Clean Up After Integration Tests**: Ensure database is cleaned after each test

## Implementation Plan for Sprint 24

### Week 1: Fix Core Issues

1. Fix module resolution issues
2. Standardize test configuration
3. Update basic tests to ensure they pass
4. Create a 'tests.md' guide for the team

### Week 2: Implement Testing Infrastructure

1. Create LLM evaluation framework
2. Implement A2A test harness
3. Add specialized mocks for OpenAI responses
4. Set up database testing patterns

### Week 3: Migrate Existing Tests

1. Update existing tests to follow new patterns
2. Fix environment teardown issues
3. Add proper mocking for external services
4. Ensure all tests clean up resources

### Week 4: Add New Tests

1. Create example tests for each type
2. Add comprehensive tests for A2A interactions
3. Implement LLM output evaluation tests
4. Document testing best practices

## Success Metrics

By the end of Sprint 24, we should achieve:

1. >90% of existing tests passing
2. Clear documentation of testing patterns
3. Specialized infrastructure for testing A2A and LLM outputs
4. Improved test isolation and resource cleanup

## Long-term Goals

Beyond Sprint 24, we should aim for:

1. **Continuous Integration**: Add tests to CI/CD pipeline
2. **Test Coverage**: Improve overall test coverage
3. **Performance Testing**: Add performance benchmarks
4. **Regression Testing**: Implement automated regression tests
5. **User Acceptance Testing**: Add tools for UAT

## Long-Term Testing Roadmap

### Evaluation Framework Enhancement

1. **Robust LLM Evaluation Framework**
   - Build a comprehensive framework for evaluating LLM outputs
   - Include metrics for content quality, code correctness, etc.
   - Add capability to compare different models and providers
   - Implement cost tracking and performance metrics
   - Set up automated reports for prompt quality and model performance

2. **Model Comparison Dashboard**
   - Create a dedicated dashboard for comparing different LLM models
   - Track metrics like response quality, speed, token usage, and cost
   - Provide insights for model selection based on specific agent needs
   - Visualize performance trends over time as models are updated

3. **Evaluation-Driven Development**
   - Implement a workflow where prompt changes are validated through real LLM testing
   - Create regression tests to ensure prompt modifications don't degrade output quality
   - Build a library of golden test cases for evaluating model outputs
   - Set quality thresholds that must be maintained for key agent capabilities 