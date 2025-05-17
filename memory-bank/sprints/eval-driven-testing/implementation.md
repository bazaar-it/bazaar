# Eval-Driven Testing Framework Implementation

## Overview

The eval-driven testing framework provides an empirical approach to evaluating component generation within the Bazaar-Vid platform. Instead of relying on feature checklists, the framework focuses on measurable metrics like success rates, generation times, and code quality indicators.

## Architecture

The framework consists of several modular components:

1. **Test Case Generation** - Creates diverse animation test cases based on categories and complexity levels
2. **A2A Test Runner** - Submits component generation tasks using the A2A protocol and monitors progress
3. **Metrics Collection** - Tracks performance and code quality metrics
4. **Database Integration** - Stores test results and metrics for analysis
5. **Reporting** - Generates daily reports summarizing test results

## Database Schema

The database schema includes two main tables:

1. **Component Test Cases** - Stores test case definitions
2. **Component Evaluation Metrics** - Records detailed metrics for each test run

The schema is designed to track multiple aspects of component generation:
- Timing metrics for each pipeline stage
- Success/failure information
- Code quality indicators
- A2A-specific metrics like state transitions

## Key Components

### Test Case Generator (`prompt-generator.ts`)
- Generates diverse animation test cases based on category and complexity
- Supports edge cases for testing challenging scenarios

### A2A Test Runner (`a2a-test-runner.ts`)
- Submits component generation tasks using the A2A protocol
- Monitors task progress via SSE (Server-Sent Events)
- Records state transitions and artifacts

### Metrics Collectors
- **Performance Collector** - Tracks timing for each stage of the pipeline
- **Code Quality Collector** - Analyzes generated code for syntax errors and ESLint issues

### Database Integration
- Stores test cases and evaluation metrics in PostgreSQL via Drizzle ORM
- Provides methods for aggregating and analyzing test results

### Daily Report Generator
- Summarizes test results, success rates, and average times
- Identifies common error patterns

## Usage

The framework can be run via the `run-tests.ts` script, which:
1. Generates test cases based on configured categories and complexity levels
2. Runs tests with specified concurrency
3. Collects and stores metrics
4. Generates a comprehensive report

## Configuration

The framework is configurable through environment variables:
- `TEST_PROJECT_ID` - Project ID to use for testing
- `TEST_COUNT_PER_CATEGORY` - Number of test cases per category
- `TEST_CONCURRENCY` - Maximum concurrent tests
- `TEST_TIMEOUT` - Timeout for each test in milliseconds
- `REPORT_DIR` - Directory to store reports
- `SAVE_TO_DATABASE` - Whether to save results to database
- `TEST_CATEGORIES` - Categories to test (comma-separated)
- `COMPLEXITY_LEVELS` - Complexity levels to include (comma-separated)

## Benefits

1. **Empirical Testing** - Provides data-driven insights into component generation performance
2. **Regression Detection** - Identifies performance degradation over time
3. **Targeted Improvements** - Helps focus development efforts on problematic areas
4. **Quality Assurance** - Ensures consistent component generation quality

## Next Steps

1. **Dashboard Development** - Create an interactive dashboard to visualize metrics
2. **Advanced Analytics** - Implement trend analysis and anomaly detection
3. **CI/CD Integration** - Run automated tests as part of the CI/CD pipeline
4. **A/B Testing** - Compare different component generation approaches
