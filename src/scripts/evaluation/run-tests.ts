//src/scripts/evaluation/run-tests.ts
import { config } from "dotenv";
config(); // Load environment variables

import { PromptGenerator } from "./generators/prompt-generator";
import { A2ATestRunner } from "./runners/a2a-test-runner";
import { PerformanceMetricsCollector } from "./collectors/performance-collector";
import { CodeQualityMetricsCollector } from "./collectors/code-quality-collector";
import { DailyReportGenerator } from "./reporters/daily-report-generator";
import { DatabaseIntegration } from "./integration/db-integration";
import { findProject } from "./utils/find-project";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

/**
 * Configuration for the test harness
 */
interface TestHarnessConfig {
  /** Project ID to use for testing */
  projectId: string;
  /** Number of test cases to generate for each category */
  testCountPerCategory: number;
  /** Maximum number of concurrent tests to run */
  concurrency: number;
  /** Timeout for each test in milliseconds */
  testTimeout: number;
  /** Directory to store reports */
  reportDir: string;
  /** Whether to save test case metadata to database */
  saveToDatabase: boolean;
  /** Categories of tests to run */
  categories: string[];
  /** Complexity levels to include */
  complexityLevels: number[];
}

/**
 * Load configuration from environment or use defaults
 */
function loadConfig(): TestHarnessConfig {
  return {
    projectId: process.env.TEST_PROJECT_ID || "",
    testCountPerCategory: parseInt(process.env.TEST_COUNT_PER_CATEGORY || "2", 10),
    concurrency: parseInt(process.env.TEST_CONCURRENCY || "2", 10),
    testTimeout: parseInt(process.env.TEST_TIMEOUT || "600000", 10), // 10 minutes default
    reportDir: process.env.REPORT_DIR || path.join(process.cwd(), "reports"),
    saveToDatabase: process.env.SAVE_TO_DATABASE !== "false",
    categories: (process.env.TEST_CATEGORIES || "basic,interactive,dataVisualization").split(","),
    complexityLevels: (process.env.COMPLEXITY_LEVELS || "1,2,3").split(",").map(Number),
  };
}

/**
 * Main test harness for running component generation tests
 */
class TestHarness {
  private config: TestHarnessConfig;
  private generator: PromptGenerator;
  private runner: A2ATestRunner;
  private dbIntegration: DatabaseIntegration;
  private reportGenerator: DailyReportGenerator;

  constructor(config: TestHarnessConfig) {
    this.config = config;
    this.generator = new PromptGenerator();
    this.runner = new A2ATestRunner(config.projectId);
    this.dbIntegration = new DatabaseIntegration();
    this.reportGenerator = new DailyReportGenerator(config.reportDir);
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log("Starting component generation tests...");
    console.log(`Project ID: ${this.config.projectId}`);
    console.log(`Test count per category: ${this.config.testCountPerCategory}`);
    console.log(`Concurrency: ${this.config.concurrency}`);
    console.log(`Categories: ${this.config.categories.join(", ")}`);
    console.log(`Complexity levels: ${this.config.complexityLevels.join(", ")}`);
    
    const testResults = [];
    const startTime = Date.now();
    
    // Create test cases for each category and complexity
    const testCases = [];
    
    for (const category of this.config.categories) {
      for (const complexity of this.config.complexityLevels) {
        const categoryTestCases = this.generator.generateTestCases(
          category, 
          complexity, 
          this.config.testCountPerCategory
        );
        
        testCases.push(...categoryTestCases);
      }
    }
    
    console.log(`Generated ${testCases.length} test cases.`);
    
    // Run tests with concurrency
    const concurrentTests = [];
    const totalTests = testCases.length;
    let completedTests = 0;
    
    for (const testCase of testCases) {
      if (concurrentTests.length >= this.config.concurrency) {
        // Wait for one test to complete before starting another
        await Promise.race(concurrentTests);
        concurrentTests.splice(0, concurrentTests.length, ...concurrentTests.filter(p => !p.isResolved));
      }
      
      const testPromise = this.runSingleTest(testCase)
        .then(result => {
          completedTests++;
          console.log(`Completed test ${completedTests}/${totalTests}: ${result.success ? "SUCCESS" : "FAILURE"}`);
          testResults.push(result);
          return result;
        })
        .catch(error => {
          completedTests++;
          console.error(`Error running test ${completedTests}/${totalTests}:`, error);
          return {
            testCaseId: testCase.id,
            success: false,
            error: {
              stage: "test",
              type: "error",
              message: error.message || String(error)
            }
          };
        });
      
      // Add a property to track when the promise is resolved
      (testPromise as any).isResolved = false;
      testPromise.finally(() => {
        (testPromise as any).isResolved = true;
      });
      
      concurrentTests.push(testPromise);
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Wait for all remaining tests to complete
    await Promise.all(concurrentTests);
    
    const endTime = Date.now();
    console.log(`All tests completed in ${(endTime - startTime) / 1000} seconds.`);
    
    // Generate report
    const reportPath = await this.reportGenerator.generateReport(testResults);
    console.log(`Report saved to: ${reportPath}`);
    
    return {
      testResults,
      reportPath,
      totalTime: endTime - startTime
    };
  }
  
  /**
   * Run a single test case
   */
  private async runSingleTest(testCase: any) {
    console.log(`Running test: ${testCase.category} (complexity: ${testCase.complexity})`);
    
    // Store test case in database
    let testCaseId = testCase.id;
    if (this.config.saveToDatabase) {
      try {
        testCaseId = await this.dbIntegration.storeTestCase(testCase);
        console.log(`Stored test case in database with ID: ${testCaseId}`);
      } catch (error) {
        console.error("Failed to store test case in database:", error);
      }
    }
    
    // Create collectors
    const performanceCollector = new PerformanceMetricsCollector();
    const codeQualityCollector = new CodeQualityMetricsCollector();
    
    // Record start time
    performanceCollector.recordEvent('promptSubmission');
    
    // Run test
    const testResult = await this.runner.runTest(testCase, {
      timeout: this.config.testTimeout,
      performanceCollector,
      codeQualityCollector
    });
    
    // Store results in database
    if (this.config.saveToDatabase) {
      try {
        const metricId = await this.dbIntegration.storeTestResults(
          testCaseId,
          testResult,
          performanceCollector.getMetrics(),
          codeQualityCollector.getMetrics(),
          {
            category: testCase.category,
            complexity: testCase.complexity,
            edgeCases: testCase.edgeCases || []
          }
        );
        console.log(`Stored test results in database with ID: ${metricId}`);
      } catch (error) {
        console.error("Failed to store test results in database:", error);
      }
    }
    
    return {
      testCaseId,
      ...testResult
    };
  }
}

/**
 * Run the test harness
 */
async function main() {
  try {
    // Load configuration
    const config = loadConfig();
    
    // Find project ID if not provided
    if (!config.projectId) {
      const projectId = await findProject();
      if (!projectId) {
        throw new Error("No project ID provided and could not find a valid project in the database.");
      }
      config.projectId = projectId;
    }
    
    // Ensure report directory exists
    await fs.mkdir(config.reportDir, { recursive: true });
    
    // Initialize test harness
    const harness = new TestHarness(config);
    
    // Run tests
    await harness.runTests();
    
    process.exit(0);
  } catch (error) {
    console.error("Error running tests:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { TestHarness, loadConfig };
