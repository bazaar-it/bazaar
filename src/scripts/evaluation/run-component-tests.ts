// @ts-nocheck
// src/scripts/evaluation/run-component-tests.ts
import { generateTestPrompts } from "./generators/prompt-generator";
import { A2AComponentTestRunner } from "./runners/a2a-test-runner";
import { PerformanceMetricsCollector } from "./collectors/performance-collector";
import { CodeQualityMetricsCollector } from "./collectors/code-quality-collector";
import { DailyReportGenerator } from "./reporters/daily-report-generator";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

/**
 * Options for the test harness
 */
interface TestHarnessOptions {
  /** Number of test cases to generate */
  testCount?: number;
  /** Whether to include edge cases */
  includeEdgeCases?: boolean;
  /** Maximum concurrent tests */
  concurrency?: number;
  /** Project ID to use for component generation */
  projectId?: string;
  /** Timeout for each test in ms */
  timeout?: number;
  /** Whether to generate a report */
  generateReport?: boolean;
  /** Whether to use verbose logging */
  verbose?: boolean;
}

/**
 * Main test harness for component generation evaluation
 */
async function runComponentTestHarness(options: TestHarnessOptions = {}): Promise<void> {
  const logger = console;
  
  // Default options
  const testCount = options.testCount || 10;
  const includeEdgeCases = options.includeEdgeCases ?? true;
  const concurrency = options.concurrency || 2;
  const timeout = options.timeout || 60000;
  const generateReport = options.generateReport ?? true;
  const verbose = options.verbose ?? false;
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), "memory-bank", "evaluation", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  logger.log("=".repeat(80));
  logger.log(`COMPONENT GENERATION TEST HARNESS - ${new Date().toISOString()}`);
  logger.log("=".repeat(80));
  logger.log(`Test count: ${testCount}`);
  logger.log(`Include edge cases: ${includeEdgeCases}`);
  logger.log(`Concurrency: ${concurrency}`);
  logger.log(`Timeout: ${timeout}ms`);
  logger.log(`Generate report: ${generateReport}`);
  logger.log(`Verbose: ${verbose}`);
  logger.log("-".repeat(80));
  
  try {
    // Check for project ID
    const projectId = options.projectId || await getValidProjectId();
    if (!projectId) {
      throw new Error("No valid project ID found or provided. Please provide a project ID.");
    }
    
    logger.log(`Using project ID: ${projectId}`);
    
    // Generate test cases
    logger.log(`Generating ${testCount} test cases...`);
    const testCases = await generateTestPrompts(testCount, {
      includeEdgeCases
    });
    
    logger.log(`Generated ${testCases.length} test cases.`);
    
    // Save test cases for reference
    const testCasesFile = path.join(dataDir, `test-cases-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(testCasesFile, JSON.stringify(testCases, null, 2));
    logger.log(`Saved test cases to ${testCasesFile}`);
    
    // Run tests
    logger.log(`Running tests with concurrency ${concurrency}...`);
    const testRunner = new A2AComponentTestRunner(logger);
    const results = await testRunner.runTests(testCases, {
      concurrency,
      timeout,
      projectId,
      verbose
    });
    
    // Save test results
    const resultsFile = path.join(dataDir, `test-results-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    logger.log(`Saved test results to ${resultsFile}`);
    
    // Log summary
    const successCount = results.filter(r => r.success).length;
    logger.log(`Test run completed. ${successCount}/${results.length} tests successful (${(successCount / results.length * 100).toFixed(1)}%).`);
    
    // Average timing metrics
    const avgTotal = results.reduce((sum, r) => sum + r.metrics.totalTime, 0) / results.length;
    const avgCodeGen = results.reduce((sum, r) => sum + r.metrics.codeGenerationTime, 0) / results.length;
    const avgBuild = results.reduce((sum, r) => sum + r.metrics.buildTime, 0) / results.length;
    
    logger.log(`Average total time: ${avgTotal.toFixed(1)}ms`);
    logger.log(`Average code generation time: ${avgCodeGen.toFixed(1)}ms`);
    logger.log(`Average build time: ${avgBuild.toFixed(1)}ms`);
    
    // Generate report
    if (generateReport) {
      logger.log(`Generating daily report...`);
      const reportGenerator = new DailyReportGenerator({ logger });
      const report = await reportGenerator.generateReport(results);
      const reportPath = await reportGenerator.saveReport(report);
      
      logger.log(`Generated daily report: ${reportPath}`);
      logger.log(`Success rate: ${report.successRate.toFixed(1)}%`);
      
      if (report.successRateImprovement !== null) {
        const sign = report.successRateImprovement >= 0 ? '+' : '';
        logger.log(`Success rate change: ${sign}${report.successRateImprovement.toFixed(1)}% from previous day`);
      }
      
      if (report.topIssues.length > 0) {
        logger.log(`Top issue: ${report.topIssues[0].name} (${report.topIssues[0].occurrences} occurrences)`);
      }
    }
    
    logger.log("=".repeat(80));
    logger.log("TEST HARNESS COMPLETED SUCCESSFULLY");
    logger.log("=".repeat(80));
    
  } catch (error) {
    logger.error("ERROR IN TEST HARNESS:", error);
    throw error;
  }
}

/**
 * Get a valid project ID for testing
 */
async function getValidProjectId(): Promise<string | null> {
  // In a real implementation, you would query the database for a valid project
  // You could use your find-project.js script from your A2A testing
  
  // For now, we'll return a placeholder
  return null;
}

// If this file is run directly (not imported)
if (require.main === module) {
  runComponentTestHarness({
    testCount: parseInt(process.env.TEST_COUNT || '10'),
    concurrency: parseInt(process.env.CONCURRENCY || '2'),
    timeout: parseInt(process.env.TIMEOUT || '60000'),
    projectId: process.env.PROJECT_ID,
    verbose: process.env.VERBOSE === 'true'
  }).catch(error => {
    console.error("Test harness failed:", error);
    process.exit(1);
  });
}

export { runComponentTestHarness };
