// @ts-nocheck
// src/server/services/evaluation/metrics.service.ts
import { db } from "../../../server/db";
import { componentTestCases, componentEvaluationMetrics } from "../../../server/db/schema";
import { eq, desc, and, gte, lt } from "drizzle-orm";
import type { TestCaseMetadata } from "../../../../scripts/evaluation/generators/prompt-generator"; 
import { v4 as uuidv4 } from "uuid";

// --- Input Interfaces for new methods ---
interface RecordTestCaseParams {
  id: string;
  prompt: string;
  category: string;
  complexity: number;
  edgeCases?: any[]; // Corresponds to JSONB in schema, typically string[] or object[]
  createdAt?: Date;
}

interface TestResultError { // Based on TestResult.error structure from a2a-test-runner.ts
  message: string;
  stage: 'codeGeneration' | 'validation' | 'build' | 'upload' | 'rendering';
  stack?: string;
  code?: string;
}

interface TestResultMetrics { // Based on TestResult.metrics structure from a2a-test-runner.ts
  timeToFirstToken: number;
  codeGenerationTime: number;
  validationTime: number;
  buildTime: number;
  uploadTime: number;
  totalTime: number;
}

interface RecordTestResultParams {
  testCaseId: string;
  taskId?: string;
  componentDbId?: string;      // from TestResult.component.dbId
  generatedComponentId?: string; // from TestResult.component.id, could be used in notes or if componentId is free
  success: boolean;
  error?: TestResultError;
  metrics: TestResultMetrics;
  codeOutputId?: string; // If there's a specific code artifact ID
}

interface AdbGenerationMetricsParams {
  adbId: string; // Maps to componentEvaluationMetrics.componentId
  taskId?: string;
  testCaseId?: string; // Optional: to fetch category/complexity if not directly provided
  timeToFirstToken: number;
  generationTime: number; // maps to codeGenerationTime in storeMetrics
}

interface CodeGenerationMetricsParams {
  codeOutputId: string; // Maps to componentEvaluationMetrics.componentId
  taskId?: string;
  testCaseId: string; // To fetch category/complexity
  timeToFirstToken: number;
  generationTime: number; // maps to codeGenerationTime in storeMetrics
}

interface PerformanceMetricsParams {
  taskId?: string;
  testCaseId: string; // To fetch category/complexity
  timeToFirstToken: number;
  codeGenerationTime: number;
  validationTime: number;
  buildTime: number;
  uploadTime: number;
  totalTime: number;
}

interface CodeQualityMetricsParams {
  codeOutputId: string; // Maps to componentId in storeMetrics
  taskId?: string;
  testCaseId: string; // To fetch category/complexity
  eslintErrorCount?: number;
  eslintWarningCount?: number;
  // boolean fields from CodeQualityMetrics interface might be summarized or stored in tags/notes
  // missingExport?: boolean; 
  // directImports?: boolean;
  // symbolRedeclaration?: boolean;
  // deprecatedApiUsage?: boolean;
  codeLength?: number;
  complexity?: number; // This is cyclomatic complexity, distinct from test case complexity
  importCount?: number;
}
// --- End Input Interfaces ---

/**
 * Error information for failed component generation
 */
export interface ErrorInfo {
  /** Stage where the error occurred */
  stage: 'codeGeneration' | 'validation' | 'build' | 'upload' | 'rendering';
  /** Type of error */
  type: string; // Note: TestResult.error doesn't have 'type', this might need to be derived or omitted
  /** Error message */
  message: string;
}

/**
 * Service for storing and retrieving component evaluation metrics
 */
export class MetricsService {
  /**
   * Create a new test case for component generation evaluation (Original method)
   */
  async createTestCase(
    prompt: string,
    metadata: TestCaseMetadata,
  ): Promise<string> {
    try {
      const [result] = await db.insert(componentTestCases).values({
        id: metadata.id || uuidv4(),
        prompt,
        category: metadata.category,
        complexity: metadata.complexity,
        edgeCases: metadata.edgeCases,
        createdAt: new Date()
      }).returning({ id: componentTestCases.id });
      
      return result.id;
    } catch (error) {
      console.error("Error creating test case:", error);
      throw error;
    }
  }

  /**
   * Records a test case. (New method as expected by db-integration.ts)
   */
  async recordTestCase(params: RecordTestCaseParams): Promise<void> {
    try {
      await db.insert(componentTestCases).values({
        id: params.id,
        prompt: params.prompt,
        category: params.category,
        complexity: params.complexity,
        edgeCases: params.edgeCases || [], // Ensure default for JSONB
        createdAt: params.createdAt || new Date(),
      });
    } catch (error) {
      console.error("Error recording test case:", error);
      throw error; 
    }
  }

  /**
   * Store metrics from a component generation test (Core private/internal method if used by others)
   * Made public for now, but could be refactored to be private if all calls go through specific recorders.
   */
  async storeMetrics(
    testCaseId: string,
    metrics: {
      category: string;
      complexity: number; // Test Case Complexity
      edgeCases: any[]; // string[] or object[] depending on actual usage
      success: boolean;
      errorStage?: string;
      errorType?: string;
      errorMessage?: string;
      promptSubmissionTime: Date;
      codeGenerationStartTime?: Date;
      codeGenerationEndTime?: Date;
      validationStartTime?: Date;
      validationEndTime?: Date;
      buildStartTime?: Date;
      buildEndTime?: Date;
      uploadStartTime?: Date;
      uploadEndTime?: Date;
      componentCompletionTime?: Date;
      timeToFirstToken?: number;
      codeGenerationTime?: number;
      validationTime?: number;
      buildTime?: number;
      uploadTime?: number;
      totalTime?: number;
      syntaxErrorCount?: number;
      eslintErrorCount?: number;
      eslintWarningCount?: number;
      codeLength?: number;
      renderSuccess?: boolean;
      renderErrorMessage?: string;
      componentId?: string; // Generic ID, could be component DB ID, artifact ID etc.
      outputUrl?: string;
      taskId?: string;
      stateTransitions?: Array<{ state: string; timestamp: number }>;
      artifacts?: Array<{ id: string; type: string; url?: string }>;
      analysisNotes?: string;
      tags?: string[];
    }
  ): Promise<string> {
    try {
      const [result] = await db.insert(componentEvaluationMetrics).values({
        testCaseId,
        timestamp: new Date(), // Timestamp of this metric record
        ...metrics
      }).returning({ id: componentEvaluationMetrics.id });
      
      return result.id;
    } catch (error) {
      console.error("Error storing metrics:", error);
      throw error;
    }
  }

  async recordTestResult(params: RecordTestResultParams): Promise<void> {
    const testCaseDetailsArray = await this.getTestCase(params.testCaseId);
    if (!testCaseDetailsArray || testCaseDetailsArray.length === 0) {
      console.error(`recordTestResult: Test case not found for ID: ${params.testCaseId}`);
      // Depending on strictness, could throw error or create a metric record with missing TC data
      return; 
    }
    const tc = testCaseDetailsArray[0];

    await this.storeMetrics(params.testCaseId, {
      category: tc.category,
      complexity: tc.complexity,
      edgeCases: (tc.edgeCases as any[]) || [],
      success: params.success,
      errorStage: params.error?.stage,
      errorMessage: params.error?.message,
      promptSubmissionTime: tc.createdAt || new Date(), 
      timeToFirstToken: params.metrics.timeToFirstToken,
      codeGenerationTime: params.metrics.codeGenerationTime,
      validationTime: params.metrics.validationTime,
      buildTime: params.metrics.buildTime,
      uploadTime: params.metrics.uploadTime,
      totalTime: params.metrics.totalTime,
      componentId: params.componentDbId || params.codeOutputId || params.generatedComponentId, 
      taskId: params.taskId,
      // Note: Specific start/end timestamps for pipeline stages are not in TestResult.metrics.
      // If needed, PerformanceCollector and TestResult would need to provide these.
    });
  }

  async recordAdbGenerationMetrics(params: AdbGenerationMetricsParams): Promise<void> {
    let tcCategory = "N/A";
    let tcComplexity = 0;
    let tcEdgeCases: any[] = [];
    let tcCreatedAt = new Date();
    let resolvedTestCaseId = params.testCaseId || uuidv4(); // Use provided or generate if specific TC context is missing

    if (params.testCaseId) {
      const testCaseDetailsArray = await this.getTestCase(params.testCaseId);
      if (testCaseDetailsArray && testCaseDetailsArray.length > 0) {
        const tc = testCaseDetailsArray[0];
        tcCategory = tc.category;
        tcComplexity = tc.complexity;
        tcEdgeCases = (tc.edgeCases as any[]) || [];
        tcCreatedAt = tc.createdAt || new Date();
      } else {
        console.warn(`recordAdbGenerationMetrics: Test case ID ${params.testCaseId} not found. Using defaults/fallback ID.`);
        resolvedTestCaseId = uuidv4(); // Ensure a unique ID if original testCaseId was not found
      }
    }
    
    await this.storeMetrics(resolvedTestCaseId, {
      category: tcCategory,
      complexity: tcComplexity,
      edgeCases: tcEdgeCases,
      success: true, // Assuming these metrics imply a successful part of the process
      promptSubmissionTime: tcCreatedAt,
      timeToFirstToken: params.timeToFirstToken,
      codeGenerationTime: params.generationTime,
      componentId: params.adbId, 
      taskId: params.taskId,
      analysisNotes: "ADB Generation Specific Metrics",
      tags: ["ADBGeneration"],
    });
  }
  
  async recordCodeGenerationMetrics(params: CodeGenerationMetricsParams): Promise<void> {
    const testCaseDetailsArray = await this.getTestCase(params.testCaseId);
    if (!testCaseDetailsArray || testCaseDetailsArray.length === 0) {
      console.error(`recordCodeGenerationMetrics: Test case not found for ID: ${params.testCaseId}`);
      return;
    }
    const tc = testCaseDetailsArray[0];
    
    await this.storeMetrics(params.testCaseId, {
      category: tc.category,
      complexity: tc.complexity,
      edgeCases: (tc.edgeCases as any[]) || [],
      success: true, // Assuming metrics for a successful code generation
      promptSubmissionTime: tc.createdAt || new Date(),
      timeToFirstToken: params.timeToFirstToken,
      codeGenerationTime: params.generationTime,
      componentId: params.codeOutputId, 
      taskId: params.taskId,
      analysisNotes: "Code Generation Specific Metrics",
      tags: ["CodeGeneration"],
    });
  }

  async recordPerformanceMetrics(params: PerformanceMetricsParams): Promise<void> {
    const testCaseDetailsArray = await this.getTestCase(params.testCaseId);
    if (!testCaseDetailsArray || testCaseDetailsArray.length === 0) {
      console.error(`recordPerformanceMetrics: Test case not found for ID: ${params.testCaseId}`);
      return;
    }
    const tc = testCaseDetailsArray[0];

    await this.storeMetrics(params.testCaseId, {
      category: tc.category,
      complexity: tc.complexity,
      edgeCases: (tc.edgeCases as any[]) || [],
      success: true, // Assuming these are overall performance for a successful/measurable operation
      promptSubmissionTime: tc.createdAt || new Date(),
      timeToFirstToken: params.timeToFirstToken,
      codeGenerationTime: params.codeGenerationTime,
      validationTime: params.validationTime,
      buildTime: params.buildTime,
      uploadTime: params.uploadTime,
      totalTime: params.totalTime,
      taskId: params.taskId,
      analysisNotes: "Overall Performance Metrics",
      tags: ["Performance"],
    });
  }
  
  async recordCodeQualityMetrics(params: CodeQualityMetricsParams): Promise<void> {
    const testCaseDetailsArray = await this.getTestCase(params.testCaseId);
    if (!testCaseDetailsArray || testCaseDetailsArray.length === 0) {
      console.error(`recordCodeQualityMetrics: Test case not found for ID: ${params.testCaseId}`);
      return;
    }
    const tc = testCaseDetailsArray[0];

    let analysisNotes = "Code Quality Metrics.";
    if (params.complexity !== undefined) {
      analysisNotes += ` Cyclomatic Complexity: ${params.complexity}.`;
    }
    // Add other boolean CQM flags to notes if needed

    await this.storeMetrics(params.testCaseId, {
      category: tc.category,
      complexity: tc.complexity, // Test case complexity
      edgeCases: (tc.edgeCases as any[]) || [],
      success: true, // Assuming CQM is for successfully generated/analyzed code
      promptSubmissionTime: tc.createdAt || new Date(),
      eslintErrorCount: params.eslintErrorCount,
      eslintWarningCount: params.eslintWarningCount,
      codeLength: params.codeLength,
      // 'complexity' from params is cyclomatic, store in notes or specific field if added
      componentId: params.codeOutputId,
      taskId: params.taskId,
      analysisNotes,
      tags: ["CodeQuality"],
    });
  }

  /**
   * Get all test cases
   */
  async getAllTestCases() {
    return db.select().from(componentTestCases).orderBy(desc(componentTestCases.createdAt));
  }

  /**
   * Get a specific test case by ID
   */
  async getTestCase(id: string) {
    return db.select().from(componentTestCases).where(eq(componentTestCases.id, id)).limit(1);
  }

  /**
   * Get all metrics for a specific test case
   */
  async getMetricsForTestCase(testCaseId: string) {
    return db.select().from(componentEvaluationMetrics)
      .where(eq(componentEvaluationMetrics.testCaseId, testCaseId))
      .orderBy(desc(componentEvaluationMetrics.timestamp));
  }

  /**
   * Get metrics from a specific date range
   */
  async getMetricsInDateRange(startDate: Date, endDate: Date) {
    return db.select().from(componentEvaluationMetrics)
      .where(
        and(
          gte(componentEvaluationMetrics.timestamp, startDate),
          lt(componentEvaluationMetrics.timestamp, endDate)
        )
      )
      .orderBy(desc(componentEvaluationMetrics.timestamp));
  }

  /**
   * Get success rate for all test cases
   */
  async getSuccessRate(): Promise<number> {
    const metrics = await db.select().from(componentEvaluationMetrics);
    
    if (metrics.length === 0) {
      return 0;
    }
    
    const successfulTests = metrics.filter((m: typeof componentEvaluationMetrics.$inferSelect) => m.success).length;
    return successfulTests / metrics.length;
  }

  /**
   * Get success rate by category
   */
  async getSuccessRateByCategory(): Promise<Record<string, number>> {
    const metricsData = await db.select({
      category: componentEvaluationMetrics.category,
      success: componentEvaluationMetrics.success
    }).from(componentEvaluationMetrics);
    
    // Group by category
    const categoryCounts: Record<string, { total: number; successful: number }> = {};
    
    for (const metric of metricsData) {
      // Schema defines category and success as notNull, so direct access is safe.
      const categoryKey = metric.category; // Explicitly string
      if (!categoryCounts[categoryKey]) {
        categoryCounts[categoryKey] = { total: 0, successful: 0 };
      }
      
      categoryCounts[categoryKey].total++;
      if (metric.success) { // Explicitly boolean
        categoryCounts[categoryKey].successful++;
      }
    }
    
    // Calculate success rates
    const successRates: Record<string, number> = {};
    
    for (const [category, counts] of Object.entries(categoryCounts)) {
      successRates[category] = counts.total > 0 ? counts.successful / counts.total : 0;
    }
    
    return successRates;
  }

  /**
   * Get average generation time
   */
  async getAverageGenerationTime(): Promise<number> {
    const metrics = await db.select({
      totalTime: componentEvaluationMetrics.totalTime
    }).from(componentEvaluationMetrics)
      .where(
        and(
          eq(componentEvaluationMetrics.success, true),
          componentEvaluationMetrics.totalTime.isNotNull()
        )
      );
    
    if (metrics.length === 0) {
      return 0;
    }
    
    const totalTimeSum = metrics.reduce((sum: number, m: { totalTime: number | null }) => sum + (m.totalTime || 0), 0);
    return totalTimeSum / metrics.length;
  }

  /**
   * Get common error types
   */
  async getCommonErrorTypes(): Promise<Array<{ type: string; count: number }>> {
    const metrics = await db.select({
      errorType: componentEvaluationMetrics.errorType
    }).from(componentEvaluationMetrics)
      .where(
        and(
          eq(componentEvaluationMetrics.success, false),
          componentEvaluationMetrics.errorType.isNotNull()
        )
      );
    
    // Count error types
    const errorCounts: Record<string, number> = {};
    
    for (const metric of metrics) {
      // errorType is nullable in schema, but isNotNull() in where clause + select specific field should ensure it's string here.
      // However, explicit check is safer due to how SQL nulls propagate.
      if (metric.errorType) { 
        errorCounts[metric.errorType] = (errorCounts[metric.errorType] || 0) + 1;
      }
    }
    
    // Convert to array and sort by count
    return Object.entries(errorCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
}

/**
 * Evaluation metrics service for LLM outputs
 * Used to evaluate the quality and correctness of LLM-generated content
 */

// Types for evaluation criteria
export interface EvaluationCriteria {
  requiredElements?: string[];
  requiredProperties?: string[];
  requiredFeatures?: string[];
  expectedValues?: Record<string, string | string[]>;
  codeQuality?: boolean;
}

// Types for evaluation results
export interface EvaluationResult {
  score: number;
  missingElements: string[];
  missingProperties: string[];
  missingFeatures: string[];
  incorrectValues: Array<{key: string, expected: string | string[], actual: string}>;
  codeQualityIssues?: string[];
  details: string;
}

/**
 * Evaluates an LLM response against provided criteria
 * @param response The text response from the LLM
 * @param criteria Evaluation criteria to check against
 * @returns Evaluation results with score and details
 */
export function evaluateResponse(response: string, criteria: EvaluationCriteria): EvaluationResult {
  const result: EvaluationResult = {
    score: 0,
    missingElements: [],
    missingProperties: [],
    missingFeatures: [],
    incorrectValues: [],
    codeQualityIssues: [],
    details: '',
  };
  
  let totalPoints = 0;
  let earnedPoints = 0;
  
  // Check for required elements
  if (criteria.requiredElements && criteria.requiredElements.length > 0) {
    totalPoints += criteria.requiredElements.length;
    
    for (const element of criteria.requiredElements) {
      if (response.includes(element)) {
        earnedPoints++;
      } else {
        result.missingElements.push(element);
      }
    }
  }
  
  // Check for required properties
  if (criteria.requiredProperties && criteria.requiredProperties.length > 0) {
    totalPoints += criteria.requiredProperties.length;
    
    for (const prop of criteria.requiredProperties) {
      if (response.includes(prop)) {
        earnedPoints++;
      } else {
        result.missingProperties.push(prop);
      }
    }
  }
  
  // Check for required features
  if (criteria.requiredFeatures && criteria.requiredFeatures.length > 0) {
    totalPoints += criteria.requiredFeatures.length;
    
    for (const feature of criteria.requiredFeatures) {
      // Features may be described in various ways, so we do a fuzzy check
      const featureWords = feature.toLowerCase().split(/\s+/);
      const featurePresent = featureWords.every(word => 
        response.toLowerCase().includes(word)
      );
      
      if (featurePresent) {
        earnedPoints++;
      } else {
        result.missingFeatures.push(feature);
      }
    }
  }
  
  // Check for expected values
  if (criteria.expectedValues) {
    const expectedKeys = Object.keys(criteria.expectedValues);
    totalPoints += expectedKeys.length;
    
    for (const key of expectedKeys) {
      const expectedValue = criteria.expectedValues[key];
      
      if (Array.isArray(expectedValue)) {
        // If we expect any of several values
        const anyValuePresent = expectedValue.some(val => 
          response.toLowerCase().includes(val.toLowerCase())
        );
        
        if (anyValuePresent) {
          earnedPoints++;
        } else {
          result.incorrectValues.push({
            key,
            expected: expectedValue,
            actual: 'Not found'
          });
        }
      } else {
        // Single expected value
        if (response.toLowerCase().includes(expectedValue.toLowerCase())) {
          earnedPoints++;
        } else {
          result.incorrectValues.push({
            key,
            expected: expectedValue,
            actual: 'Not found'
          });
        }
      }
    }
  }
  
  // Code quality check (basic)
  if (criteria.codeQuality) {
    totalPoints += 5; // 5 possible points for code quality
    
    // Check for syntax errors (very basic check)
    if (!response.includes('undefined') && !response.includes('NaN')) {
      earnedPoints++;
    } else {
      result.codeQualityIssues?.push('Contains undefined or NaN');
    }
    
    // Check for comments
    if (response.includes('//') || response.includes('/*')) {
      earnedPoints++;
    } else {
      result.codeQualityIssues?.push('Missing comments');
    }
    
    // Check for proper indentation (basic heuristic)
    if (response.includes('\n  ') || response.includes('\n    ')) {
      earnedPoints++;
    } else {
      result.codeQualityIssues?.push('Improper indentation');
    }
    
    // Check for error handling
    if (response.includes('try') && response.includes('catch')) {
      earnedPoints++;
    } else {
      result.codeQualityIssues?.push('Missing error handling');
    }
    
    // Check for TypeScript types
    if (response.includes(': ') && (response.includes('interface') || response.includes('type '))) {
      earnedPoints++;
    } else {
      result.codeQualityIssues?.push('Missing TypeScript types');
    }
  }
  
  // Calculate final score (normalized to 0-1)
  result.score = totalPoints > 0 ? earnedPoints / totalPoints : 0;
  
  // Generate details
  result.details = `Evaluation Score: ${result.score.toFixed(2)} (${earnedPoints}/${totalPoints} points)
Missing Elements: ${result.missingElements.length ? result.missingElements.join(', ') : 'None'}
Missing Properties: ${result.missingProperties.length ? result.missingProperties.join(', ') : 'None'}
Missing Features: ${result.missingFeatures.length ? result.missingFeatures.join(', ') : 'None'}
Incorrect Values: ${result.incorrectValues.length ? result.incorrectValues.map(v => `${v.key}: expected ${v.expected}, not found`).join(', ') : 'None'}
${criteria.codeQuality ? `Code Quality Issues: ${result.codeQualityIssues?.length ? result.codeQualityIssues.join(', ') : 'None'}` : ''}`;
  
  return result;
}

/**
 * Evaluates a generated component against specific Remotion requirements
 * @param componentCode The generated component code
 * @returns Evaluation results specific to Remotion components
 */
export function evaluateRemotionComponent(componentCode: string): EvaluationResult {
  return evaluateResponse(componentCode, {
    requiredElements: [
      'export', 
      'React', 
      'Composition', 
      'useCurrentFrame', 
      'return'
    ],
    requiredProperties: [
      'width', 
      'height', 
      'fps', 
      'durationInFrames'
    ],
    codeQuality: true
  });
}

/**
 * Evaluates an A2A agent response against expected patterns
 * @param agentResponse The response from the agent
 * @param expectedActions Expected actions the agent should take
 * @returns Evaluation results specific to agent responses
 */
export function evaluateAgentResponse(agentResponse: string, expectedActions: string[]): EvaluationResult {
  return evaluateResponse(agentResponse, {
    requiredElements: expectedActions,
    requiredFeatures: ['reasoning', 'plan'],
    codeQuality: false
  });
}

/**
 * Evaluates scene planner output against scene requirements
 * @param scenePlan The generated scene plan
 * @param requiredSceneElements Elements that should be present in the scene
 * @returns Evaluation results for the scene plan
 */
export function evaluateScenePlan(scenePlan: string, requiredSceneElements: string[]): EvaluationResult {
  return evaluateResponse(scenePlan, {
    requiredElements: requiredSceneElements,
    requiredFeatures: ['composition', 'animation', 'timing'],
    codeQuality: false
  });
}
