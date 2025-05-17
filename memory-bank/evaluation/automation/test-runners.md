//memory-bank/evaluation/automation/test-runners.md

# Test Runners for Component Evaluation

## Overview

This document describes the test runner modules that execute component generation test cases and collect performance metrics. These runners leverage the A2A protocol implementation to provide comprehensive monitoring of the component generation process.

## Test Runner Types

### 1. A2A Test Runner

The primary test runner uses the A2A protocol and SSE (Server-Sent Events) infrastructure to monitor component generation in real-time:

```typescript
/**
 * Test runner that uses the A2A protocol to submit component generation tasks
 * and monitor their progress through the pipeline using SSE.
 */
export class A2AComponentTestRunner {
  /**
   * Runs a set of test cases using the A2A protocol
   * @param testCases Array of test cases to run
   * @param options Test execution options
   * @returns Test results with performance metrics
   */
  async runTests(
    testCases: TestCase[],
    options: TestRunnerOptions = {}
  ): Promise<TestResult[]> {
    // Implementation details
  }
}
```

#### Key Features

- **Task Lifecycle Monitoring**: Uses SSE to track task state transitions
- **Real-time Metrics**: Captures timing data for each stage in real-time
- **Artifact Collection**: Records and validates artifacts produced during generation
- **Error Classification**: Categorizes errors by type and pipeline stage
- **Comprehensive Logs**: Maintains detailed execution logs for debugging

#### Integration with A2A

This runner integrates with the A2A implementation from `/memory-bank/a2a/progress.md`:

1. Creates tasks using the TaskManager service
2. Monitors status updates via SSE
3. Records all state transitions
4. Collects artifacts for validation
5. Captures error information when tasks fail

### 2. Legacy Test Runner

A simpler runner that uses direct API calls without the A2A protocol:

```typescript
/**
 * Legacy test runner that uses direct API calls to generate components
 * and poll for status updates.
 */
export class LegacyComponentTestRunner {
  /**
   * Runs a set of test cases using direct API calls
   * @param testCases Array of test cases to run
   * @param options Test execution options
   * @returns Test results with performance metrics
   */
  async runTests(
    testCases: TestCase[],
    options: TestRunnerOptions = {}
  ): Promise<TestResult[]> {
    // Implementation details
  }
}
```

#### Key Features

- **Polling Based**: Uses polling to check component status
- **Direct API Calls**: Bypasses the A2A protocol for simpler testing
- **Backward Compatibility**: Works with older components of the system
- **Simplified Execution**: Less detailed but faster for basic testing

## Test Execution Process

### 1. Test Case Preparation

- Load or generate test cases
- Initialize metrics collection
- Prepare database logging

### 2. Test Execution

A2A Execution Flow:
1. Submit task to A2A system with test prompt
2. Connect to SSE stream for real-time updates
3. Monitor all task state transitions
4. Collect timing data for each state change
5. Capture any errors or artifacts
6. Validate resulting component

Legacy Execution Flow:
1. Submit component generation request
2. Poll for status updates
3. Record timing between status changes
4. Check final component for errors
5. Validate component output

### 3. Results Collection

- Store timing metrics for each stage
- Record success/failure status
- Save log of all state transitions
- Store links to artifacts
- Calculate aggregate metrics

## Integration with Sprint 20 Fixes

The test runners incorporate fixes from Sprint 20:

- Uses correct database table names (`bazaar-vid_custom_component_job`)
- Incorporates updated tRPC procedure naming (`applySyntaxFix`, etc.)
- Handles error scenarios documented during Sprint 20
- Validates components using the improved verification methods

## Test Runner Configuration

```typescript
interface TestRunnerOptions {
  /** Maximum concurrent tests to run */
  concurrency?: number;
  /** Timeout in ms for each test case */
  timeout?: number;
  /** Whether to continue on test failure */
  continueOnFailure?: boolean;
  /** Directory to save artifacts */
  artifactsDir?: string;
  /** Whether to validate components after generation */
  validateComponents?: boolean;
  /** Project ID to use for component generation */
  projectId?: string;
  /** User ID to use for component generation */
  userId?: string;
  /** Whether to use verbose logging */
  verbose?: boolean;
}
```

## Example Usage

```typescript
// Example of using the A2A test runner
const testRunner = new A2AComponentTestRunner();
const testCases = await generateTestCases(10);
const results = await testRunner.runTests(testCases, {
  concurrency: 3,
  timeout: 60000,
  validateComponents: true,
  projectId: "valid-project-id",
  verbose: true
});

// Analyze results
const successRate = results.filter(r => r.success).length / results.length;
const avgGenerationTime = results.reduce((sum, r) => sum + r.metrics.totalTime, 0) / results.length;
```

## Metrics Collection

The test runners collect the following metrics:

- **Time to First Token**: Time from prompt submission to first response token
- **Code Generation Time**: Time to generate complete component code
- **Validation Time**: Time spent validating generated code
- **Build Time**: Time spent in esbuild compilation
- **Upload Time**: Time to upload to R2 storage
- **Total Pipeline Time**: End-to-end time from prompt to usable component
- **Success Rate**: Percentage of successfully generated components
- **Error Rate by Stage**: Percentage of errors at each pipeline stage

## Test Result Schema

```typescript
interface TestResult {
  /** Test case ID */
  testCaseId: string;
  /** Whether the test was successful */
  success: boolean;
  /** Error information if the test failed */
  error?: {
    /** Error message */
    message: string;
    /** Stage where the error occurred */
    stage: 'codeGeneration' | 'validation' | 'build' | 'upload' | 'rendering';
    /** Error stack trace */
    stack?: string;
    /** Error code */
    code?: string;
  };
  /** Performance metrics for the test */
  metrics: {
    /** Time to first token in ms */
    timeToFirstToken: number;
    /** Code generation time in ms */
    codeGenerationTime: number;
    /** Validation time in ms */
    validationTime: number;
    /** Build time in ms */
    buildTime: number;
    /** Upload time in ms */
    uploadTime: number;
    /** Total time in ms */
    totalTime: number;
  };
  /** Component metadata */
  component?: {
    /** Component ID */
    id: string;
    /** R2 URL */
    outputUrl?: string;
    /** Database ID */
    dbId: string;
    /** Component status */
    status: string;
  };
  /** A2A task information */
  task?: {
    /** Task ID */
    id: string;
    /** Final task state */
    finalState: string;
    /** State transitions with timestamps */
    stateTransitions: Array<{
      /** State name */
      state: string;
      /** Timestamp in ms */
      timestamp: number;
    }>;
    /** Artifacts produced */
    artifacts: Array<{
      /** Artifact ID */
      id: string;
      /** Artifact type */
      type: string;
      /** Artifact URL */
      url?: string;
    }>;
  };
}
```
