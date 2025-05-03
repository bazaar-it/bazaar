# Testing the Build Worker

This directory contains tests for the custom component build worker system. 

## Testing Approach

We use Jest as the test runner and testing framework. Due to the project using ES modules and having complex dependencies, we take the following approaches:

1. **Function Isolation**: We test specific functions in isolation by reimplementing their logic in the test files rather than trying to mock all dependencies.

2. **Focused Unit Tests**: We write small, focused tests that verify specific behaviors rather than trying to test the entire system at once.

3. **Pure Function Testing**: We prioritize testing pure functions that don't have side effects or complex dependencies.

## Test Files

- `imports.test.ts`: Tests for the TSX code processing functions (`sanitizeTsx` and `wrapTsxWithGlobals`).
- `simple.test.ts`: A minimal test to verify Jest configuration.

## Best Practices

1. Avoid importing project modules directly in tests when possible to prevent dependency issues
2. Reimplement simple functions in test files when testing isolated behaviors
3. Use descriptive test names that explain what's being tested
4. Group related tests with describe blocks
5. Focus on testing one thing at a time

## Running Tests

To run all tests:

```
npm test
```

To run a specific test file:

```
npx jest src/server/workers/__tests__/imports.test.ts
``` 