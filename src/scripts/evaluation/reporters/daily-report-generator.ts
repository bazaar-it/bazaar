//src/scripts/evaluation/reporters/daily-report-generator.ts
import * as fs from "fs";
import * as path from "path";
import { TestResult } from "../runners/a2a-test-runner";

/**
 * Daily report data structure
 */
export interface DailyReport {
  /** Report date */
  date: string;
  /** Total number of tests run */
  totalTests: number;
  /** Number of successful tests */
  successfulTests: number;
  /** Success rate percentage */
  successRate: number;
  /** Average generation time in milliseconds */
  avgGenerationTime: number;
  /** Success rate improvement from previous day */
  successRateImprovement: number | null;
  /** Time improvement from previous day */
  timeImprovement: number | null;
  /** Distribution of error types */
  errorTypes: Array<{
    /** Error type */
    type: string;
    /** Error count */
    count: number;
    /** Percentage of errors */
    percentage: number;
  }>;
  /** Performance by category */
  categoryPerformance: Array<{
    /** Category name */
    category: string;
    /** Success rate percentage */
    successRate: number;
    /** Average generation time */
    avgTime: number;
    /** Number of tests */
    tests: number;
  }>;
  /** Top issues identified */
  topIssues: Array<{
    /** Issue name */
    name: string;
    /** Number of occurrences */
    occurrences: number;
    /** Example component ID */
    exampleComponentId?: string;
    /** Category pattern */
    categoryPattern?: string;
    /** Description */
    description?: string;
  }>;
}

/**
 * Previous daily report data (simplified for storage)
 */
interface PreviousDayData {
  /** Success rate percentage */
  successRate: number;
  /** Average generation time in milliseconds */
  avgGenerationTime: number;
}

/**
 * Generates a daily summary report after test execution
 */
export class DailyReportGenerator {
  private reportDir: string;
  private logger: Console;
  
  /**
   * Create a new daily report generator
   */
  constructor(options: { reportDir?: string; logger?: Console } = {}) {
    this.reportDir = options.reportDir || path.join(process.cwd(), "memory-bank", "evaluation", "reports");
    this.logger = options.logger || console;
    
    // Ensure report directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }
  
  /**
   * Generate daily report with basic statistics and highlights
   */
  async generateReport(
    results: TestResult[],
    date: Date = new Date()
  ): Promise<DailyReport> {
    this.logger.log(`Generating daily report for ${date.toISOString().split('T')[0]}...`);
    
    if (results.length === 0) {
      throw new Error("No test results to generate report from");
    }
    
    // Basic statistics
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.success).length;
    const successRate = (successfulTests / totalTests) * 100;
    
    const avgGenerationTime = results.reduce((sum, r) => sum + r.metrics.totalTime, 0) / totalTests;
    
    // Get previous day's data
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    const prevDayData = await this.getPreviousDayData(previousDay);
    
    // Calculate improvements
    const successRateImprovement = prevDayData ? successRate - prevDayData.successRate : null;
    const timeImprovement = prevDayData ? prevDayData.avgGenerationTime - avgGenerationTime : null;
    
    // Error analysis
    const errors = results.filter(r => !r.success);
    const errorTypes = this.categorizeErrors(errors);
    
    // Category performance
    const categoryPerformance = this.calculateCategoryPerformance(results);
    
    // Top issues
    const topIssues = this.identifyTopIssues(results);
    
    // Create the report
    const report: DailyReport = {
      date: date.toISOString().split('T')[0],
      totalTests,
      successfulTests,
      successRate,
      avgGenerationTime,
      successRateImprovement,
      timeImprovement,
      errorTypes,
      categoryPerformance,
      topIssues
    };
    
    this.logger.log(`Generated daily report with ${totalTests} tests (${successRate.toFixed(1)}% success rate)`);
    
    return report;
  }
  
  /**
   * Save report to the filesystem as Markdown
   */
  async saveReport(report: DailyReport): Promise<string> {
    // Format report as Markdown
    const markdown = this.formatReportAsMarkdown(report);
    
    // Save to file
    const filename = `daily-report-${report.date}.md`;
    const filePath = path.join(this.reportDir, filename);
    
    fs.writeFileSync(filePath, markdown);
    
    this.logger.log(`Saved daily report to ${filePath}`);
    
    // Store raw data for future trend analysis
    this.storeReportData(report);
    
    return filePath;
  }
  
  /**
   * Get data from a previous day's report
   */
  private async getPreviousDayData(date: Date): Promise<PreviousDayData | null> {
    const dateStr = date.toISOString().split('T')[0];
    const filename = `daily-report-data-${dateStr}.json`;
    const filePath = path.join(this.reportDir, filename);
    
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        this.logger.error(`Error reading previous day data: ${error.message}`);
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * Store raw report data for future trend analysis
   */
  private storeReportData(report: DailyReport): void {
    const data: PreviousDayData = {
      successRate: report.successRate,
      avgGenerationTime: report.avgGenerationTime
    };
    
    const filename = `daily-report-data-${report.date}.json`;
    const filePath = path.join(this.reportDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
  
  /**
   * Categorize errors from test results
   */
  private categorizeErrors(errors: TestResult[]): Array<{ type: string; count: number; percentage: number }> {
    // Count errors by stage
    const errorsByStage = errors.reduce((count, error) => {
      const stage = error.error?.stage || "unknown";
      count[stage] = (count[stage] || 0) + 1;
      return count;
    }, {} as Record<string, number>);
    
    // Convert to array and calculate percentages
    const totalErrors = errors.length;
    const errorTypes = Object.entries(errorsByStage).map(([type, count]) => ({
      type,
      count,
      percentage: (count / totalErrors) * 100
    }));
    
    // Sort by count, descending
    return errorTypes.sort((a, b) => b.count - a.count);
  }
  
  /**
   * Calculate performance metrics by category
   */
  private calculateCategoryPerformance(results: TestResult[]): Array<{
    category: string;
    successRate: number;
    avgTime: number;
    tests: number;
  }> {
    // Group results by category
    const categories = new Map<string, TestResult[]>();
    
    results.forEach(result => {
      // In real implementation, you'd access testCase.metadata.category
      // Here we'll simulate with a random category
      const category = this.getTestCategory(result.testCaseId);
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      
      categories.get(category)!.push(result);
    });
    
    // Calculate metrics for each category
    const categoryPerformance = Array.from(categories.entries()).map(([category, categoryResults]) => {
      const tests = categoryResults.length;
      const successfulTests = categoryResults.filter(r => r.success).length;
      const successRate = (successfulTests / tests) * 100;
      const avgTime = categoryResults.reduce((sum, r) => sum + r.metrics.totalTime, 0) / tests;
      
      return {
        category,
        successRate,
        avgTime,
        tests
      };
    });
    
    // Sort by test count, descending
    return categoryPerformance.sort((a, b) => b.tests - a.tests);
  }
  
  /**
   * Identify top issues from test results
   */
  private identifyTopIssues(results: TestResult[]): Array<{
    name: string;
    occurrences: number;
    exampleComponentId?: string;
    categoryPattern?: string;
    description?: string;
  }> {
    // In a real implementation, you would analyze the test results
    // to identify patterns in failures and generate insights
    
    // For this simulation, we'll create some example issues
    const issues = [];
    
    // Check for missing export issues
    const missingExportErrors = results.filter(r => 
      !r.success && 
      r.error?.message?.includes("export")
    );
    
    if (missingExportErrors.length > 0) {
      issues.push({
        name: "Missing Export Statement",
        occurrences: missingExportErrors.length,
        exampleComponentId: missingExportErrors[0].component?.id,
        categoryPattern: this.getTestCategory(missingExportErrors[0].testCaseId),
        description: "Components missing proper export declarations"
      });
    }
    
    // Check for symbol redeclaration issues
    const symbolRedeclarationErrors = results.filter(r => 
      !r.success && 
      r.error?.message?.includes("redeclaration")
    );
    
    if (symbolRedeclarationErrors.length > 0) {
      issues.push({
        name: "Window Symbol Redeclaration",
        occurrences: symbolRedeclarationErrors.length,
        exampleComponentId: symbolRedeclarationErrors[0].component?.id,
        categoryPattern: this.getTestCategory(symbolRedeclarationErrors[0].testCaseId),
        description: "Components redeclaring window.* variables"
      });
    }
    
    // Check for build timeout issues
    const buildTimeoutErrors = results.filter(r => 
      !r.success && 
      r.error?.stage === "build" &&
      r.error?.message?.includes("timeout")
    );
    
    if (buildTimeoutErrors.length > 0) {
      issues.push({
        name: "Build Timeout",
        occurrences: buildTimeoutErrors.length,
        exampleComponentId: buildTimeoutErrors[0].component?.id,
        categoryPattern: this.identifyComplexityPattern(buildTimeoutErrors),
        description: "Components timing out during build phase"
      });
    }
    
    // Sort by occurrences, descending
    return issues.sort((a, b) => b.occurrences - a.occurrences);
  }
  
  /**
   * Format report as Markdown
   */
  private formatReportAsMarkdown(report: DailyReport): string {
    const lines = [];
    
    // Title
    lines.push(`# Component Generation Daily Report: ${report.date}`);
    lines.push('');
    
    // Overview
    lines.push('## Overview');
    lines.push(`- **Tests Run:** ${report.totalTests}`);
    lines.push(`- **Success Rate:** ${report.successRate.toFixed(1)}% (${report.successfulTests}/${report.totalTests})`);
    lines.push(`- **Average Generation Time:** ${report.avgGenerationTime.toFixed(1)}ms`);
    
    const errorDistribution = report.errorTypes.map(e => `${e.type} (${e.count})`).join(', ');
    lines.push(`- **Error Distribution:** ${errorDistribution}`);
    lines.push('');
    
    // Highlights
    lines.push('## Highlights');
    
    if (report.successRateImprovement !== null) {
      const sign = report.successRateImprovement >= 0 ? '+' : '';
      lines.push(`- **Success Rate Change:** ${sign}${report.successRateImprovement.toFixed(1)}% from previous day`);
    }
    
    if (report.timeImprovement !== null) {
      const sign = report.timeImprovement >= 0 ? '-' : '+';
      const value = Math.abs(report.timeImprovement).toFixed(1);
      lines.push(`- **Performance Change:** ${sign}${value}ms average generation time`);
    }
    
    if (report.topIssues.length > 0) {
      lines.push(`- **Top Issue:** ${report.topIssues[0].occurrences} components failed with "${report.topIssues[0].name}"`);
    }
    lines.push('');
    
    // Category Performance
    lines.push('## Category Performance');
    lines.push('| Category | Success Rate | Avg Time | Tests |');
    lines.push('|----------|-------------|----------|-------|');
    
    report.categoryPerformance.forEach(cat => {
      lines.push(`| ${cat.category} | ${cat.successRate.toFixed(0)}% | ${cat.avgTime.toFixed(1)}ms | ${cat.tests} |`);
    });
    lines.push('');
    
    // Top Issues
    if (report.topIssues.length > 0) {
      lines.push('## Top Issues');
      
      report.topIssues.forEach((issue, index) => {
        lines.push(`${index + 1}. **${issue.name}** (${issue.occurrences} occurrences)`);
        
        if (issue.categoryPattern) {
          lines.push(`   - Common in ${issue.categoryPattern} components`);
        }
        
        if (issue.exampleComponentId) {
          lines.push(`   - Example: ${issue.exampleComponentId}`);
        }
        
        if (issue.description) {
          lines.push(`   - ${issue.description}`);
        }
        
        lines.push('');
      });
    }
    
    // Recommended Actions
    lines.push('## Recommended Actions');
    
    // Generate recommendations based on top issues
    if (report.topIssues.length > 0) {
      report.topIssues.slice(0, 3).forEach((issue, index) => {
        lines.push(`${index + 1}. ${this.generateRecommendation(issue)}`);
      });
    } else {
      lines.push('1. Continue monitoring component generation performance');
      lines.push('2. Consider increasing test coverage across more animation types');
    }
    lines.push('');
    
    // Metrics Trends
    lines.push('## Metrics Trends');
    lines.push('[Link to interactive dashboard](#)');
    
    return lines.join('\n');
  }
  
  /**
   * Generate a recommendation based on an issue
   */
  private generateRecommendation(issue: {
    name: string;
    categoryPattern?: string;
  }): string {
    switch (issue.name) {
      case "Missing Export Statement":
        return `Improve LLM prompt for ${issue.categoryPattern || 'all'} components to include proper export statements`;
      
      case "Window Symbol Redeclaration":
        return `Investigate ${issue.categoryPattern || ''} components for symbol redeclaration issues`;
      
      case "Build Timeout":
        return `Consider increasing build timeout for complexity level 4-5 components`;
      
      default:
        return `Investigate "${issue.name}" issue in ${issue.categoryPattern || 'affected'} components`;
    }
  }
  
  /**
   * Get test category from test case ID
   * This is a placeholder for the real implementation
   */
  private getTestCategory(testCaseId: string): string {
    // In a real implementation, you would look up the category from test case metadata
    // For this simulation, we'll derive a category from the test case ID
    
    const categories = [
      "Text Animations",
      "Shape Animations",
      "Transition Effects",
      "Data Visualization",
      "Particle Effects",
      "Character Animations"
    ];
    
    // Use the test case ID to deterministically select a category
    const hash = testCaseId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return categories[hash % categories.length];
  }
  
  /**
   * Identify patterns in complex errors
   */
  private identifyComplexityPattern(errors: TestResult[]): string {
    // In a real implementation, you would analyze the test cases to find patterns
    // For this simulation, we'll return a placeholder
    
    return "high complexity";
  }
}
