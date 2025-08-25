/**
 * Jest configuration for Sprint 99.5 tests
 * Optimized for Sprint 99.5 URL to Video V2 testing
 */

module.exports = {
  displayName: 'Sprint 99.5 - URL to Video V2',
  testMatch: [
    '<rootDir>/src/__tests__/sprint99.5/**/*.test.ts'
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/sprint99.5/utils/test-helpers.ts'
  ],
  collectCoverageFrom: [
    'src/tools/webAnalysis/**/*.ts',
    'src/tools/edit/**/*.ts', 
    'src/server/services/website/**/*.ts',
    '!**/*.test.ts',
    '!**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testTimeout: 30000, // 30s timeout for integration tests
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputName: 'sprint99.5-test-results.xml',
      classNameTemplate: 'Sprint99.5.{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};