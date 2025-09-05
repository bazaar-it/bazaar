#!/usr/bin/env tsx
/**
 * Test Runner for Intelligent Template Selection
 * 
 * Usage:
 *   npm run test:template-selection
 *   npm run test:e2e
 *   npm run test:all
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const testSuites = {
  unit: [
    'src/tests/integration/template-selection-intelligent.test.ts'
  ],
  e2e: [
    'src/tests/e2e/url-to-video-pipeline.test.ts'
  ],
  fixtures: [
    'src/tests/fixtures/test-database-setup.ts'
  ]
};

function runTests(suite: keyof typeof testSuites | 'all') {
  console.log(`🧪 Running ${suite} tests...\n`);

  const testsToRun = suite === 'all' 
    ? [...testSuites.unit, ...testSuites.e2e]
    : testSuites[suite];

  if (!testsToRun) {
    console.error(`Unknown test suite: ${suite}`);
    process.exit(1);
  }

  try {
    // Run tests with proper configuration
    const testCommand = `npx jest ${testsToRun.join(' ')} --config jest.config.mjs --verbose`;
    
    console.log(`Executing: ${testCommand}\n`);
    
    execSync(testCommand, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        // Set to 'true' to run against real database
        RUN_E2E_TESTS: process.env.RUN_E2E_TESTS || 'false'
      }
    });

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Tests failed');
    process.exit(1);
  }
}

// Parse command line arguments
const suite = process.argv[2] || 'unit';

if (!['unit', 'e2e', 'all', 'fixtures'].includes(suite)) {
  console.log(`
Usage: tsx run-intelligent-tests.ts [suite]

Suites:
  unit     - Run unit tests for template selection
  e2e      - Run end-to-end pipeline tests
  all      - Run all tests
  fixtures - Test database fixtures

Examples:
  npm run test:template-selection  # Run unit tests
  npm run test:e2e                 # Run E2E tests
  RUN_E2E_TESTS=true npm run test:e2e  # Run E2E with real database
  `);
  process.exit(1);
}

runTests(suite as any);