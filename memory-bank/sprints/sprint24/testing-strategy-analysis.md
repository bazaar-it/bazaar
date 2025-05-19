# BAZAAR-260: Testing Strategy Analysis

## Current Testing Status Documentation

This document contains an analysis of the current testing setup, problems, and potential solutions for the Bazaar-Vid project, covering both Project 1 (Standard Functionality) and Project 2 (A2A System).

### Table of Contents
1. [Current Testing Configuration](#current-testing-configuration)
2. [Test File Organization](#test-file-organization)
3. [Testing Challenges](#testing-challenges)
4. [Test Run Results](#test-run-results)
5. [Recommendations](#recommendations)

## Current Testing Configuration

The project has multiple Jest configuration files, indicating potential configuration conflicts or specialized setups for different parts of the codebase:

- `jest.config.cjs` - Main Jest configuration
- `jest.config.ts.bak` - Backup TypeScript configuration (likely deprecated)
- `babel.jest.config.cjs` - Babel configuration for Jest
- `jest-special-paths.config.cjs` - Configuration for special path mappings
- `jest-special-paths.config.ts` - TypeScript version of special paths config
- `jest.env.setup.js` - Environment setup for Jest
- `jest.setup.js` - General Jest setup file
- `jest.setup.ts` - TypeScript version of setup file

The presence of both `.js`/`.cjs` and `.ts` versions of configuration files suggests a migration between configurations or an attempt to support both CommonJS and ESM modules. This mix of configuration approaches is likely contributing to testing issues.

## Test File Organization

Test files are scattered throughout the codebase, generally following a co-location pattern where tests are placed near the code they're testing:

- `src/app/__tests__/` - Tests for app-level components
- `src/app/projects/[id]/edit/panels/__tests__/` - Tests for editor panels
- `src/client/components/test-harness/__tests__/` - Tests for test harness components
- `src/client/hooks/sse/__tests__/` - Tests for SSE (Server-Sent Events) hooks
- `src/hooks/__tests__/` - Tests for general hooks
- `src/scripts/log-agent/__tests__/` - Tests for logging agent
- `src/server/a2a/__tests__/` - Tests for A2A system
- `src/server/agents/__tests__/` - Tests for agent implementations
- `src/server/services/__tests__/` - Tests for server services
- `src/server/utils/__tests__/` - Tests for server utilities
- `src/server/workers/__tests__/` - Tests for worker processes
- `src/stores/__tests__/` - Tests for state stores

Additional test directories for specialized testing:
- `src/tests/e2e/` - End-to-end tests
- `src/tests/integration/` - Integration tests
- `src/tests/llm/` - Tests for LLM functionality
- `src/tests/performance/` - Performance tests
- `src/tests/remotion/` - Tests for Remotion components

This structure suggests an intention to have comprehensive test coverage, but the distributed nature and inconsistent organization may contribute to maintenance challenges.

## Testing Challenges

Based on the test runs and codebase exploration, several key challenges exist in the current testing infrastructure:

1. **Module Resolution Conflicts**: Many tests fail with errors related to path mappings and module resolution, particularly with imports using the `~/` alias.

2. **ESM vs CommonJS Conflicts**: Errors like "Must use import to load ES Module" indicate conflicts between ESM and CommonJS module systems.

3. **Missing Dependencies**: Several tests rely on modules that don't exist or aren't properly installed, such as:
   - `vitest` (referenced in tests but using Jest)
   - Missing `./types.js` from logger implementations
   - Missing services like `redis.service.js`

4. **Jest Configuration Issues**: Inconsistent Jest configurations lead to problems with module mocking, timeouts, and environment setup.

5. **Mocking Inconsistencies**: Tests use different mock approaches (`jest.mock`, manual mock functions, `mockImplementation`, etc.) with inconsistent patterns.

6. **Environment Variables**: Some tests fail due to missing or invalid environment variables, despite the `.env.local` file being loaded.

7. **Database Connectivity**: Tests that need database access fail because they attempt to connect to a real database without proper mocking.

8. **Test Environment Isolation**: Poor isolation between tests, as evidenced by errors like "Jest environment has been torn down" appearing frequently.

9. **Testing Framework Confusion**: Some tests use Vitest syntax/patterns within Jest tests, suggesting a potential migration or confusion between testing frameworks.

10. **Test Timeouts**: Several tests exceed the default timeout of 5000ms, indicating either performance issues or improper async handling.

## Test Run Results

### Overall Test Statistics
After running the complete test suite with `npm test`, the results show significant challenges:
- **Total test suites**: 43
- **Passed test suites**: 12 (27.9%)
- **Failed test suites**: 31 (72.1%)
- **Total tests**: 98
- **Passed tests**: 76 (77.6%)
- **Failed tests**: 22 (22.4%)

### Specific Test Runs

1. **Simple App Tests**: `src/app/__tests__/simple.test.ts` passes successfully, indicating basic Jest setup works for simple tests.

2. **Worker Utility Tests**: `src/server/workers/__tests__/imports.test.ts` passes, showing functionality for sanitizing imports works correctly.

3. **Service Tests**: Tests for server services like `agentRegistry.service.test.ts` fail with module resolution errors, particularly missing `./types.js` from the logging system.

4. **A2A Integration Tests**: These fail with multiple reference errors and module resolution issues.

5. **A2A Routing Verification**: Running `src/scripts/verify-a2a-routing.js` manually shows communication failures with the A2A system, with errors like "Control plane request failed" and "Agent not found", indicating issues with the underlying A2A implementation that tests are trying to verify.

6. **LLM Tests**: Many LLM tests fail with timeouts or mocking issues, particularly in the dual LLM architecture tests.

### Common Error Patterns

1. **Module Resolution Errors**:
   ```
   Could not locate module ~/trpc/trpc mapped as:
   /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/$1.
   ```

2. **Missing Modules**:
   ```
   Cannot find module './types.js' from 'src/scripts/log-agent/logger-transport.ts'
   ```

3. **ESM vs CommonJS Conflicts**:
   ```
   Must use import to load ES Module: /Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/types/json-patch.ts
   ```

4. **Torn Down Environment**:
   ```
   ReferenceError: You are trying to `import` a file after the Jest environment has been torn down.
   ```

5. **Mock Function Errors**:
   ```
   TypeError: mockOpenAI.chat.completions.create.mockResolvedValueOnce is not a function
   ```

## Recommendations

Based on this analysis, the following recommendations would form a comprehensive strategy for resolving the testing issues:

1. **Standardize on a Single Testing Configuration**:
   - Choose between ESM and CommonJS and standardize the codebase
   - Consolidate the multiple Jest configuration files
   - Consider migrating fully to Vitest if that's the intended direction

2. **Fix Module Resolution**:
   - Ensure path aliases (`~/`) are consistently configured in both TypeScript and Jest
   - Use a single approach for import/require statements throughout tests

3. **Improve Test Isolation**:
   - Implement proper cleanup in test files to prevent "torn down environment" errors
   - Use Jest's `--detectOpenHandles` flag to identify resource leaks

4. **Standardize Mocking Approaches**:
   - Create consistent patterns for mocking external dependencies
   - Develop shared mock factories for common services like OpenAI

5. **Environment Management**:
   - Create a dedicated test environment file (e.g., `.env.test`)
   - Implement proper environment variable mocking in tests

6. **Test Organization**:
   - Consider reorganizing tests into a more consistent structure
   - Separate unit, integration, and e2e tests more clearly

7. **Database Testing Strategy**:
   - Implement a proper database mocking strategy or use test databases
   - Consider using in-memory SQLite for tests that require database operations

8. **Improved Error Handling in Tests**:
   - Add more robust error handling in test files
   - Increase timeout for long-running tests or optimize them

9. **Documentation and Examples**:
   - Create documentation on the correct testing approach
   - Provide example test files that follow the standardized pattern

10. **Gradual Migration**:
    - Fix the simplest tests first to establish patterns
    - Gradually migrate more complex tests to the standardized approach
    - Consider adding a CI pipeline that runs tests to prevent regressions

This analysis confirms the "messy" state of testing described in the BAZAAR-260 ticket and validates the need for a unified testing strategy. The next steps would be to implement these recommendations systematically to improve the testability and reliability of the codebase.

# Testing Strategy Analysis

## Summary of Current Testing Infrastructure

Based on detailed analysis of the Bazaar-Vid testing system, we have identified significant issues that need to be addressed. Our analysis confirms and expands on the concerns mentioned in the BAZAAR-260 ticket.

## Testing Configuration Files

Multiple Jest configuration files exist in the project:
- `jest.config.cjs` - Main configuration file using CommonJS format
- `jest.setup.ts` - Setup file for global mocks using ESM imports
- `jest.env.setup.js` - Environment variables setup using CommonJS
- `babel.jest.config.cjs` - Babel configuration for Jest
- `jest-special-paths.config.cjs` - Special configuration for certain paths

These configuration files have mixed module systems and potential conflicts between them, leading to unreliable test execution.

## Test File Locations

Tests are scattered throughout the codebase:
- Co-located tests: `src/**/components/**/__tests__/*.test.ts`
- Service tests: `src/server/services/__tests__/*.service.test.ts`
- Agent tests: `src/server/agents/__tests__/*.test.ts`
- Worker tests: `src/server/workers/__tests__/*.test.ts`
- Integration tests: `src/tests/integration/**/*.test.ts`
- LLM tests: `src/tests/llm/__tests__/*.test.ts`
- Simple app tests: `src/app/__tests__/*.test.ts`

## Testing Run Analysis (Updated)

We've performed multiple test runs to understand what's working and what's failing:

### Working Tests
- Simple tests pass successfully: `src/app/__tests__/simple.test.ts`, `src/server/workers/__tests__/simple.test.ts`
- Utility tests work correctly: `src/server/workers/__tests__/imports.test.ts`

### Failing Tests
1. Service Tests:
   - All service tests fail with module resolution errors: "Cannot find module './types.js' from 'src/scripts/log-agent/logger-transport.ts'"
   - After the test failures, we see "ReferenceError: You are trying to `import` a file after the Jest environment has been torn down."
   
2. A2A Integration Tests:
   - Same module resolution error as service tests
   - Multiple torn down environment errors

3. Agent Tests:
   - All agent tests fail with the same module resolution error

## Key Error Patterns (Updated)

1. **Module Resolution Issues**:
   - The most common error is missing `types.js` - this is due to ESM/CommonJS incompatibility. The system is trying to import from a `.js` file (ESM convention) when it should be importing from `.ts` directly
   - The `logger-transport.ts` file is importing from `'./types.js'` but the file exists as `types.ts`

2. **Environment Teardown Issues**:
   - Many failing tests show "ReferenceError: You are trying to import a file after the Jest environment has been torn down"
   - This suggests improper cleanup or potentially async operations continuing after tests complete

3. **ESM/CommonJS Conflicts**:
   - Jest configuration is using mixed module systems (both ESM and CommonJS)
   - Import statements use both formats (.js extensions in imports indicate ESM conventions)

## Root Causes

1. The most immediate issue appears to be the incorrect import in `logger-transport.ts` which is importing from `'./types.js'` when it should be importing from `'./types'` in a TypeScript project.

2. The Jest configuration is trying to use ESM modules (`extensionsToTreatAsEsm: ['.ts', '.tsx']`) but many parts of the setup are still using CommonJS.

3. There's no consistent pattern for tests - each test follows its own pattern and approach, making maintenance difficult.

## Recommended Solutions

### Short-term Fixes

1. **Fix the Module Resolution Issue**:
   - Update the import in `logger-transport.ts` to use `'./types'` instead of `'./types.js'`
   - Fix any other similar imports throughout the codebase

2. **Standardize Jest Configuration**:
   - Choose one module system (ESM is recommended for TypeScript projects) and stick with it
   - Consolidate configuration files into a single source of truth

### Longer-term Strategy

1. **Standardize Test Structure**:
   - Reorganize tests into a consistent pattern
   - Create clear separation between unit, integration, and e2e tests

2. **Improve Test Isolation**:
   - Ensure tests properly clean up after themselves
   - Avoid sharing state between tests

3. **Implement Proper Mocking**:
   - Standardize how external dependencies are mocked
   - Use clear patterns for mocking (e.g., jest.mock or manual mocks)

4. **Testing the A2A System**:
   - Create specialized test harnesses for agent-to-agent communication
   - Implement proper mocking of OpenAI responses

5. **Evaluation Framework Development**:
   - Develop specific tests for evaluating LLM outputs
   - Create comparison frameworks for expected vs. actual outputs

## Sprint 24 Implementation Plan

For Sprint 24, we propose the following approach:

1. Fix the immediate module resolution issues to get existing tests working
2. Create a standardized testing approach document
3. Implement proper test isolation to prevent environment teardown issues
4. Create examples of proper tests for each type (unit, integration, LLM evaluation)
5. Begin migrating existing tests to the new pattern

## Next Steps

1. Fix the immediate `types.js` import issue
2. Create a `tests.md` file in the root directory as the single source of truth for testing
3. Implement test patterns for evaluating LLM outputs and agent communication
4. Begin refactoring existing tests to follow the new pattern 