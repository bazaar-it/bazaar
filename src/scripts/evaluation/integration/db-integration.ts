//src/scripts/evaluation/integration/db-integration.ts
import { MetricsService } from "../../../server/services/evaluation/metrics.service";
import type { TestCaseMetadata } from "../generators/prompt-generator";
import type { TestResult } from "../runners/a2a-test-runner";
import type { CodeQualityMetrics } from "../collectors/code-quality-collector";
import { v4 as uuidv4 } from 'uuid';

// Define interface for performance metrics to ensure type safety
interface PerformanceMetrics {
  timeToFirstToken?: number;
  codeGenerationTime?: number;
  validationTime?: number;
  buildTime?: number;
  uploadTime?: number;
  totalTime?: number;
  [key: string]: any; // Allow for additional metrics that might be added later
}

/**
 * Integration between the evaluation framework and the database
 * Responsible for storing test cases and metrics
 */
export class DatabaseIntegration {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = new MetricsService();
  }

  /**
   * Store a test case prompt and its metadata
   */
  async storeTestCase(prompt: string, metadata: TestCaseMetadata): Promise<void> {
    const testCaseId = metadata.id || uuidv4(); 
    // TODO: Replace with actual MetricsService call once its methods are defined
    console.log("Attempting to recordTestCase with MetricsService", {
      id: testCaseId,
      prompt,
      category: metadata.category,
      complexity: metadata.complexity,
      edgeCases: metadata.edgeCases,
      createdAt: metadata.createdAt || new Date(),
    });
    // await this.metricsService.recordTestCase({
    //   id: testCaseId,
    //   prompt,
    //   category: metadata.category,
    //   complexity: metadata.complexity,
    //   edgeCases: metadata.edgeCases,
    //   createdAt: metadata.createdAt || new Date(),
    // });
  }

  /**
   * Store metrics for a test run
   */
  async storeTestResult(testResult: TestResult): Promise<void> {
    const { testCaseId, success, error, metrics, task, component } = testResult;
    
    // Ensure metrics is typed correctly
    const performanceMetrics = metrics as PerformanceMetrics;

    const taskId = task?.id; // from A2AExecution, with optional chaining
    // The 'component' field in TestResult seems to hold component-specific DB IDs
    const componentDbId = component?.dbId; 
    const generatedComponentId = component?.id; // This is likely the Remotion component ID/name

    // Find specific artifact IDs if needed, e.g., for code output
    const codeArtifact = task?.artifacts?.find(a => a.type === 'generated-code' || a.type === 'final-code'); // with optional chaining
    const codeOutputId = codeArtifact?.id;

    // TODO: Replace with actual MetricsService calls once its methods are defined
    // For now, logging what would be sent
    console.log("Attempting to recordTestResult with MetricsService", {
      testCaseId,
      taskId,
      componentId: componentDbId, // Assuming this is the relevant DB ID for the component
      success,
      error: error ? JSON.stringify(error) : undefined,
      metrics: JSON.stringify(metrics), // All performance metrics are in testResult.metrics
    });

    // Store ADB Generation Metrics (if applicable - this part seems specific)
    // 'adbId' was used before, componentDbId seems to be the equivalent now if this refers to the component's DB record
    // 'adbGeneration' metrics are not directly on testResult.metrics; needs clarification if this is a sub-object or specific timings.
    // For now, let's assume adbGeneration related timings are part of the overall 'metrics' object if they exist.
    if (componentDbId) { // Only if we have a component DB ID
      console.log("Attempting to recordAdbGenerationMetrics with MetricsService", {
        adbId: componentDbId,
        taskId,
        timeToFirstToken: performanceMetrics.timeToFirstToken, // Assuming these are general metrics
        generationTime: performanceMetrics.codeGenerationTime, // Assuming adbGeneration means code generation
        // ... other relevant adb-specific metrics from testResult.metrics if they exist
      });
    }

    // Store Code Generation Metrics
    if (codeOutputId) { // If a code artifact was produced
      console.log("Attempting to recordCodeGenerationMetrics with MetricsService", {
        codeOutputId,
        taskId,
        testCaseId,
        timeToFirstToken: performanceMetrics.timeToFirstToken,
        generationTime: performanceMetrics.codeGenerationTime,
        // ... other relevant code-gen specific metrics
      });
    }

    // Store overall Performance Metrics
    // Store overall Performance Metrics
    console.log("Attempting to recordPerformanceMetrics with MetricsService", {
      taskId,
      testCaseId,
      timeToFirstToken: performanceMetrics.timeToFirstToken,
      codeGenerationTime: performanceMetrics.codeGenerationTime,
      validationTime: performanceMetrics.validationTime,
      buildTime: performanceMetrics.buildTime,
      uploadTime: performanceMetrics.uploadTime,
      totalTime: performanceMetrics.totalTime,
      // other performance metrics from testResult.metrics
    });

    // Store Code Quality Metrics (if available)
    // The `codeQuality` sub-object error was because it's not on testResult.metrics.
    // CodeQualityMetrics would typically be a separate object, possibly passed in or retrieved elsewhere.
    // For now, let's assume `testResult` might be extended to include it or it's fetched separately.
    // This part needs clarification on how CodeQualityMetrics are obtained for a TestResult.
    // If `testResult` had a `codeQualityMetrics?: CodeQualityMetrics` field:
    /* 
    if (testResult.codeQualityMetrics && codeOutputId) {
      const cqMetrics: CodeQualityMetrics = testResult.codeQualityMetrics;
      await this.metricsService.recordCodeQualityMetrics({
        codeOutputId: codeOutputId, // Link to the specific code output
        taskId: taskId,
        testCaseId: testCaseId,
        cyclomaticComplexity: cqMetrics.complexity, // Corrected field name
        maintainabilityIndex: undefined, // Does not exist on CodeQualityMetrics
        halsteadVolume: undefined, // Does not exist on CodeQualityMetrics
        linesOfCode: cqMetrics.codeLength, // codeLength is available
        commentDensity: undefined, // Does not exist on CodeQualityMetrics
        eslintErrorCount: cqMetrics.eslintErrorCount, // Corrected field name
        eslintWarningCount: cqMetrics.eslintWarningCount,
        missingExport: cqMetrics.missingExport,
        directImports: cqMetrics.directImports,
        symbolRedeclaration: cqMetrics.symbolRedeclaration,
        deprecatedApiUsage: cqMetrics.deprecatedApiUsage,
        importCount: cqMetrics.importCount,
      });
    }
    */
    // Since CodeQualityMetrics is not part of TestResult currently, this block is commented out.
    // It needs to be sourced from somewhere, e.g. a CodeQualityCollector.collect(testResult.code) call.
  }

  // Placeholder for actual CodeQualityMetrics retrieval if needed
  // async getCodeQualityMetrics(code: string): Promise<CodeQualityMetrics | null> {
  //   // const collector = new CodeQualityMetricsCollector();
  //   // return collector.analyzeCode(code);
  //   return null; 
  // }
}
