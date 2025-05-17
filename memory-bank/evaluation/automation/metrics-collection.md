//memory-bank/evaluation/automation/metrics-collection.md

# Metrics Collection for Component Evaluation

## Overview

This document describes the metrics collection system for evaluating the component generation pipeline. The system captures both quantitative and qualitative metrics to provide a comprehensive view of component generation performance and reliability.

## Metrics Database Schema

Metrics are stored in a dedicated table in the database:

```typescript
// Define in src/server/db/schema.ts
export const componentEvaluationMetrics = pgTable(
  "bazaar-vid_component_evaluation_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testCaseId: uuid("test_case_id").notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    
    // Test case metadata
    category: varchar("category", { length: 50 }).notNull(),
    complexity: integer("complexity").notNull(),
    edgeCases: jsonb("edge_cases").default([]),
    
    // Pipeline success metrics
    success: boolean("success").notNull(),
    errorStage: varchar("error_stage", { length: 50 }),
    errorType: varchar("error_type", { length: 100 }),
    errorMessage: text("error_message"),
    
    // Timing metrics (in milliseconds)
    promptSubmissionTime: timestamp("prompt_submission_time").notNull(),
    codeGenerationStartTime: timestamp("code_generation_start_time"),
    codeGenerationEndTime: timestamp("code_generation_end_time"),
    validationStartTime: timestamp("validation_start_time"),
    validationEndTime: timestamp("validation_end_time"),
    buildStartTime: timestamp("build_start_time"),
    buildEndTime: timestamp("build_end_time"),
    uploadStartTime: timestamp("upload_start_time"),
    uploadEndTime: timestamp("upload_end_time"),
    componentCompletionTime: timestamp("component_completion_time"),
    
    // Derived timing metrics (calculated on insertion)
    timeToFirstToken: integer("time_to_first_token"),
    codeGenerationTime: integer("code_generation_time"),
    validationTime: integer("validation_time"),
    buildTime: integer("build_time"),
    uploadTime: integer("upload_time"),
    totalTime: integer("total_time"),
    
    // Code quality metrics
    syntaxErrorCount: integer("syntax_error_count"),
    eslintErrorCount: integer("eslint_error_count"),
    eslintWarningCount: integer("eslint_warning_count"),
    codeLength: integer("code_length"),
    
    // Rendering metrics
    renderSuccess: boolean("render_success"),
    renderErrorMessage: text("render_error_message"),
    
    // References
    componentId: varchar("component_id", { length: 100 }),
    outputUrl: text("output_url"),
    taskId: uuid("task_id"),
    
    // A2A specific metrics
    stateTransitions: jsonb("state_transitions").default([]),
    artifacts: jsonb("artifacts").default([]),
    
    // Analysis fields
    analysisNotes: text("analysis_notes"),
    tags: jsonb("tags").default([]),
  }
);
```

## Metrics Collectors

### 1. Performance Metrics Collector

Collects timing data for each stage of the component generation pipeline:

```typescript
/**
 * Collects performance metrics during component generation
 */
export class PerformanceMetricsCollector {
  /**
   * Initialize a new metrics collection session
   */
  constructor(testCaseId: string, options?: MetricsCollectionOptions) {
    // Initialize metrics collection
  }

  /**
   * Record a timing event in the component generation pipeline
   */
  recordEvent(
    event: 'prompt_submitted' | 'code_generation_start' | 'code_generation_end' | 
           'validation_start' | 'validation_end' | 'build_start' | 'build_end' | 
           'upload_start' | 'upload_end' | 'component_complete',
    metadata?: Record<string, any>
  ): void {
    // Record timestamp for the event
  }

  /**
   * Record a state transition for A2A tasks
   */
  recordStateTransition(state: string, timestamp: number, metadata?: Record<string, any>): void {
    // Record state transition
  }

  /**
   * Calculate derived metrics from recorded events
   */
  calculateDerivedMetrics(): Record<string, number> {
    // Calculate time differences between events
  }

  /**
   * Save metrics to database
   */
  async saveMetrics(success: boolean, errorInfo?: ErrorInfo): Promise<string> {
    // Save metrics to database and return metrics ID
  }
}
```

### 2. Code Quality Metrics Collector

Analyzes the quality of generated code:

```typescript
/**
 * Collects code quality metrics for generated components
 */
export class CodeQualityMetricsCollector {
  /**
   * Analyze code and collect quality metrics
   */
  async analyzeCode(code: string): Promise<CodeQualityMetrics> {
    // Run static analysis tools on the code
    // Return metrics about code quality
  }

  /**
   * Run ESLint on the generated code
   */
  async runEslint(code: string): Promise<ESLintResults> {
    // Run ESLint and return results
  }

  /**
   * Check for common issues in component code
   */
  checkComponentIssues(code: string): ComponentIssues {
    // Check for missing exports, direct imports, etc.
  }
}
```

### 3. Storage Consistency Collector

Verifies database and R2 storage consistency:

```typescript
/**
 * Checks consistency between database records and R2 storage
 */
export class StorageConsistencyCollector {
  /**
   * Check if component exists in both database and R2
   */
  async checkConsistency(componentId: string): Promise<ConsistencyResult> {
    // Check database record
    // Check R2 object
    // Compare and return consistency status
  }
}
```

## Integration with A2A

The metrics collection system integrates with the A2A protocol by:

1. **SSE Event Monitoring**: Records all SSE events during component generation
2. **Task State Tracking**: Logs all task state transitions with timestamps
3. **Artifact Collection**: Records metadata about all artifacts produced
4. **Real-Time Updates**: Provides real-time metrics updates during test execution

Example A2A integration:

```typescript
/**
 * A2A-aware metrics collector that monitors SSE events
 */
export class A2AMetricsCollector extends PerformanceMetricsCollector {
  /**
   * Initialize collector with SSE monitoring
   */
  constructor(testCaseId: string, options?: MetricsCollectionOptions) {
    super(testCaseId, options);
    this.initializeSseMonitoring();
  }

  /**
   * Setup SSE monitoring for the task
   */
  private initializeSseMonitoring(): void {
    // Connect to SSE endpoint
    // Register event handlers
  }

  /**
   * Handle SSE events and record metrics
   */
  private handleSseEvent(event: SseEvent): void {
    // Process event based on type
    // Record relevant metrics
  }
}
```

## Metrics Dashboard

The metrics collection system feeds into a dashboard that shows:

1. **Real-time Metrics**: Current test execution status and metrics
2. **Historical Trends**: Metrics over time, showing improvements or regressions
3. **Category Breakdown**: Performance by animation type, complexity level, etc.
4. **Error Analysis**: Common error types and frequencies
5. **Success Rate**: Overall and per-category success rates

## Automated Alerts

The system can generate alerts when:

1. **Success Rate Drops**: Overall success rate falls below threshold
2. **Performance Degrades**: Average generation time increases significantly
3. **Error Rate Spikes**: Sudden increase in errors of a specific type
4. **Storage Inconsistency**: Discrepancies between database and R2 storage

## Using the Metrics System

```typescript
// Example usage in test harness
async function runTestWithMetrics(testCase: TestCase) {
  // Initialize metrics collection
  const metricsCollector = new A2AMetricsCollector(testCase.id);
  
  try {
    // Record start time
    metricsCollector.recordEvent('prompt_submitted');
    
    // Submit component generation task
    const task = await submitTask(testCase.prompt);
    
    // Wait for completion
    const result = await waitForTaskCompletion(task.id);
    
    // Analyze code quality
    const codeQualityCollector = new CodeQualityMetricsCollector();
    const codeQuality = await codeQualityCollector.analyzeCode(result.code);
    
    // Check storage consistency
    const consistencyCollector = new StorageConsistencyCollector();
    const consistency = await consistencyCollector.checkConsistency(result.componentId);
    
    // Save all metrics
    await metricsCollector.saveMetrics(true, undefined);
    
    return {
      success: true,
      componentId: result.componentId,
      metrics: metricsCollector.calculateDerivedMetrics(),
      codeQuality,
      consistency
    };
  } catch (error) {
    // Record error metrics
    await metricsCollector.saveMetrics(false, {
      stage: determineErrorStage(error),
      type: categorizeError(error),
      message: error.message
    });
    
    return {
      success: false,
      error,
      metrics: metricsCollector.calculateDerivedMetrics()
    };
  }
}
```

## Integration with Sprint 20 Fixes

The metrics system incorporates lessons from Sprint 20:

1. **Correct Table References**: Uses consistent database table names
2. **Error Classification**: Categorizes errors based on the patterns identified in Sprint 20
3. **Component Verification**: Integrates with improved component verification methods
4. **Fix Tracking**: Records instances where syntax fixes were applied

## Implementation Plan

1. **Phase 1**: Implement basic metrics collection and database schema
2. **Phase 2**: Add code quality analysis and storage consistency checks
3. **Phase 3**: Integrate with A2A protocol for real-time monitoring
4. **Phase 4**: Develop dashboard and alerting system
