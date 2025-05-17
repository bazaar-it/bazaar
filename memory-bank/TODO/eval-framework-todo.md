//memory-bank/TODO/eval-framework-todo.md
# Eval-Driven Testing Framework TODOs

## High Priority

- [ ] **Apply Migration to Production Database**
  - Run the Drizzle migration (0007) to add evaluation tables to the Neon database
  - Verify schema creation with simple database queries

- [ ] **Set Up Test Environment**
  - Configure environment variables for test harness
  - Find appropriate test projects to use as targets
  - Create a dedicated `.env.test` file for testing configuration

- [ ] **Run Initial Test Batches**
  - Execute test harness with a small batch of test cases
  - Validate metrics collection and storage
  - Analyze initial results for baseline metrics

## Medium Priority

- [ ] **Develop Metrics Dashboard**
  - Create a simple web UI for viewing test results
  - Implement charts for success rates and timing metrics
  - Add filtering by category, complexity, and date ranges

- [ ] **Integrate with CI/CD Pipeline**
  - Add GitHub Action to run tests on a schedule
  - Automatically generate daily reports
  - Alert on significant metric changes (e.g., success rate drops)

- [ ] **Expand Test Coverage**
  - Add more test case categories
  - Create more edge cases for complex animations
  - Test different component sizes and complexities

## Low Priority

- [ ] **Advanced Analytics**
  - Implement trend analysis to track performance over time
  - Add anomaly detection for unexpected metric changes
  - Create visualization of state transition patterns

- [ ] **A/B Testing Support**
  - Allow testing different component generation approaches
  - Compare metrics between approaches
  - Generate comparative reports

- [ ] **Integration with Slack/Discord**
  - Send daily report summaries to team channels
  - Alert on test failures or performance regressions
  - Share success stories and improvements

## Documentation

- [ ] **User Guide**
  - Document how to run tests manually
  - Explain configuration options
  - Provide examples of test case creation

- [ ] **Architecture Documentation**
  - Create detailed architecture diagrams
  - Document database schema and relationships
  - Explain metrics collection methodology

## Completed Items

- [x] Design test case generator for diverse animation test cases
- [x] Create A2A test runner with SSE for real-time monitoring
- [x] Implement performance metrics collector for timing measurements
- [x] Build code quality metrics collector for analyzing generated components
- [x] Design database schema for storing test cases and metrics
- [x] Generate Drizzle migration for evaluation tables
- [x] Create metrics service for database operations
- [x] Implement database integration layer for test runners
- [x] Build comprehensive test harness that ties all components together
