/**
 * Jest configuration for REAL Sprint 99.5 integration tests
 * These tests use actual websites and real components
 */

module.exports = {
  displayName: 'Sprint 99.5 - REAL Integration Tests',
  testMatch: [
    '<rootDir>/src/__tests__/sprint99.5/real/**/*.test.ts'
  ],
  testEnvironment: 'node',
  
  // Extended timeouts for real web requests
  testTimeout: 120000, // 2 minutes per test
  
  // Setup for real testing environment
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/real-test-environment.ts'
  ],
  
  // Transform and ignore node_modules except specific ones
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Only test real integration files
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/sprint99.5/unit/',
    '<rootDir>/src/__tests__/sprint99.5/integration/',
    '<rootDir>/src/__tests__/sprint99.5/fixtures/',
    '<rootDir>/src/__tests__/sprint99.5/utils/',
    '.*_MOCK\\.test\\.ts$'
  ],
  
  // Coverage only for components being tested
  collectCoverageFrom: [
    'src/tools/webAnalysis/WebAnalysisAgentV4.ts',
    'src/tools/website/websiteToVideoHandler.ts',
    'src/server/services/website/template-selector.ts',
    'src/tools/narrative/herosJourneyLLM.ts',
    '!**/*.test.ts',
    '!**/*.d.ts'
  ],
  
  // Coverage thresholds for real functionality
  coverageThreshold: {
    global: {
      branches: 60, // Lower threshold for integration tests
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Better reporting for real tests
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputName: 'real-integration-test-results.xml',
      classNameTemplate: 'Sprint99.5.Real.{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  
  // Retry failed tests (network can be flaky)
  retry: 1,
  
  // Slower tests, run in sequence to avoid rate limiting
  maxConcurrency: 1,
  maxWorkers: 1
};