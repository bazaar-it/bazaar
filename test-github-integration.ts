#!/usr/bin/env tsx
/**
 * GitHub Integration Test Suite
 * Tests the robustness of our component fetching improvements
 * 
 * Run with: npx tsx test-github-integration.ts
 */

import { config } from 'dotenv';
import { GitHubComponentSearchService } from './src/server/services/github/component-search.service';
import { GitHubComponentAnalyzerTool } from './src/brain/tools/github-component-analyzer';
import { db } from './src/server/db';
import { githubConnections } from './src/server/db/schema/github-connections';
import { eq } from 'drizzle-orm';
import chalk from 'chalk';

// Load environment variables
config();

// Test configuration
const TEST_USER_ID = 'clzmt5jzi0000i5pqo5f5h1p3'; // Your user ID from logs
const TEST_REPO = 'Lysaker1/bazaar-vid';

// Test components with different scenarios
const TEST_COMPONENTS = [
  {
    name: 'Footer',
    path: 'src/components/ui/Footer.tsx',
    scenario: 'Standard component path'
  },
  {
    name: 'GenerateSidebar',
    path: 'src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx',
    scenario: 'Path with brackets'
  },
  {
    name: 'ChatPanelG',
    path: 'src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx',
    scenario: 'Deep nested path'
  },
  {
    name: 'AppHeader',
    path: 'src/components/AppHeader.tsx',
    scenario: 'Root components folder'
  },
  {
    name: 'button',
    path: 'src/components/ui/button.tsx',
    scenario: 'Lowercase component'
  },
  {
    name: 'NonExistent',
    path: 'src/components/DoesNotExist.tsx',
    scenario: 'Non-existent file (should fail gracefully)'
  }
];

// Test results tracking
interface TestResult {
  component: string;
  scenario: string;
  success: boolean;
  method?: string;
  error?: string;
  contentLength?: number;
  timeMs?: number;
}

const results: TestResult[] = [];

// Helper functions
function logTest(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    error: chalk.red('✗'),
    warning: chalk.yellow('⚠')
  };
  console.log(`${prefix[type]} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + chalk.bold.underline(title));
}

async function getGitHubConnection() {
  const connection = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.userId, TEST_USER_ID))
    .limit(1);
  
  if (!connection[0]) {
    throw new Error('No GitHub connection found. Please connect GitHub first.');
  }
  
  return connection[0];
}

// Test 1: Direct File Fetching
async function testDirectFetching() {
  logSection('Test 1: Direct File Fetching');
  
  const connection = await getGitHubConnection();
  const searchService = new GitHubComponentSearchService(
    connection.accessToken,
    TEST_USER_ID
  );
  
  for (const testCase of TEST_COMPONENTS) {
    const startTime = Date.now();
    
    try {
      logTest(`Testing ${testCase.name}: ${testCase.scenario}`, 'info');
      
      const result = await searchService.fetchFileDirectly(
        TEST_REPO,
        testCase.path
      );
      
      const timeMs = Date.now() - startTime;
      
      if (result && result.content) {
        logTest(`  Found ${testCase.name} (${result.content.length} bytes) in ${timeMs}ms`, 'success');
        
        results.push({
          component: testCase.name,
          scenario: testCase.scenario,
          success: true,
          method: 'direct',
          contentLength: result.content.length,
          timeMs
        });
        
        // Verify it's actual component code
        if (result.content.includes('export') || result.content.includes('function')) {
          logTest(`  ✓ Contains valid component code`, 'success');
        } else {
          logTest(`  ⚠ May not be valid component code`, 'warning');
        }
      }
    } catch (error: any) {
      const timeMs = Date.now() - startTime;
      
      if (testCase.name === 'NonExistent') {
        logTest(`  Expected failure for non-existent file (${timeMs}ms)`, 'success');
        results.push({
          component: testCase.name,
          scenario: testCase.scenario,
          success: true, // Expected failure
          method: 'direct',
          error: 'File not found (expected)',
          timeMs
        });
      } else {
        logTest(`  Failed: ${error.message} (${timeMs}ms)`, 'error');
        results.push({
          component: testCase.name,
          scenario: testCase.scenario,
          success: false,
          method: 'direct',
          error: error.message,
          timeMs
        });
      }
    }
  }
}

// Test 2: Fallback Strategies
async function testFallbackStrategies() {
  logSection('Test 2: Fallback Strategies (Component Analyzer)');
  
  const connection = await getGitHubConnection();
  const analyzer = new GitHubComponentAnalyzerTool();
  
  for (const testCase of TEST_COMPONENTS.slice(0, 3)) { // Test first 3 to save API calls
    const startTime = Date.now();
    
    try {
      logTest(`Testing analyzer for ${testCase.name}`, 'info');
      
      // Test the full analyzer flow
      const componentRef = {
        name: testCase.name.toLowerCase(),
        path: testCase.path
      };
      
      const context = await analyzer.analyze(
        TEST_USER_ID,
        componentRef,
        connection.accessToken
      );
      
      const timeMs = Date.now() - startTime;
      
      if (context && context.rawCode) {
        logTest(`  Analyzer found ${testCase.name} (${context.rawCode.length} bytes) in ${timeMs}ms`, 'success');
        logTest(`  Repository: ${context.repository}`, 'info');
        logTest(`  Framework: ${context.framework}`, 'info');
        
        // Check if enhanced prompt would be created
        const enhancedPrompt = analyzer.createEnhancedPrompt(
          `Animate my ${testCase.name} component`,
          context
        );
        
        if (enhancedPrompt.includes('HERE IS THE ACTUAL COMPONENT CODE')) {
          logTest(`  ✓ Enhanced prompt includes real code`, 'success');
        }
      }
    } catch (error: any) {
      const timeMs = Date.now() - startTime;
      logTest(`  Analyzer failed: ${error.message} (${timeMs}ms)`, 'error');
    }
  }
}

// Test 3: Error Recovery
async function testErrorRecovery() {
  logSection('Test 3: Error Recovery & Retry Logic');
  
  const connection = await getGitHubConnection();
  const searchService = new GitHubComponentSearchService(
    connection.accessToken,
    TEST_USER_ID
  );
  
  // Test with wrong extension
  logTest('Testing path variation fallback (wrong extension)', 'info');
  try {
    const result = await searchService.fetchFileDirectly(
      TEST_REPO,
      'src/components/ui/Footer.js' // Wrong extension, should try .tsx
    );
    
    if (result) {
      logTest('  ✓ Successfully found with .tsx fallback', 'success');
    }
  } catch (error: any) {
    logTest(`  Failed to find with fallback: ${error.message}`, 'error');
  }
  
  // Test with leading slash
  logTest('Testing path normalization (leading slash)', 'info');
  try {
    const result = await searchService.fetchFileDirectly(
      TEST_REPO,
      '/src/components/ui/Footer.tsx' // Leading slash
    );
    
    if (result) {
      logTest('  ✓ Successfully normalized path', 'success');
    }
  } catch (error: any) {
    logTest(`  Failed to normalize: ${error.message}`, 'error');
  }
}

// Test 4: Performance Test
async function testPerformance() {
  logSection('Test 4: Performance Metrics');
  
  const connection = await getGitHubConnection();
  const searchService = new GitHubComponentSearchService(
    connection.accessToken,
    TEST_USER_ID
  );
  
  const times: number[] = [];
  
  logTest('Running 5 sequential fetches...', 'info');
  
  for (let i = 0; i < 5; i++) {
    const startTime = Date.now();
    
    try {
      await searchService.fetchFileDirectly(
        TEST_REPO,
        'src/components/ui/Footer.tsx'
      );
      
      const timeMs = Date.now() - startTime;
      times.push(timeMs);
      logTest(`  Fetch ${i + 1}: ${timeMs}ms`, 'info');
    } catch (error) {
      logTest(`  Fetch ${i + 1} failed`, 'error');
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    logTest(`Average: ${avgTime.toFixed(0)}ms`, 'info');
    logTest(`Min: ${minTime}ms, Max: ${maxTime}ms`, 'info');
    
    if (avgTime < 1000) {
      logTest('✓ Performance is excellent (<1s average)', 'success');
    } else if (avgTime < 2000) {
      logTest('✓ Performance is good (<2s average)', 'success');
    } else {
      logTest('⚠ Performance needs improvement (>2s average)', 'warning');
    }
  }
}

// Test 5: Real-world Scenario
async function testRealWorldScenario() {
  logSection('Test 5: Real-world Chat Scenario');
  
  const connection = await getGitHubConnection();
  const analyzer = new GitHubComponentAnalyzerTool();
  
  // Simulate what happens when user drags components
  const userMessage = `Animate my Footer component from src/components/ui/Footer.tsx
Animate my GenerateSidebar component from src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx
Animate my AppHeader component from src/components/AppHeader.tsx`;
  
  logTest('Simulating multi-component drag & drop...', 'info');
  
  const lines = userMessage.split('\n');
  let successCount = 0;
  
  for (const line of lines) {
    const componentRef = analyzer.extractComponentReference(line);
    
    if (componentRef) {
      logTest(`  Extracted: ${componentRef.name} from ${componentRef.path}`, 'info');
      
      try {
        const context = await analyzer.analyze(
          TEST_USER_ID,
          componentRef,
          connection.accessToken
        );
        
        if (context && context.rawCode) {
          logTest(`    ✓ Fetched ${context.rawCode.length} bytes of code`, 'success');
          successCount++;
        }
      } catch (error: any) {
        logTest(`    ✗ Failed to fetch: ${error.message}`, 'error');
      }
    }
  }
  
  logTest(`Successfully fetched ${successCount}/${lines.length} components`, 
    successCount === lines.length ? 'success' : 'warning');
}

// Generate summary report
function generateReport() {
  logSection('Test Summary Report');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgTime = results
    .filter(r => r.timeMs)
    .reduce((sum, r) => sum + (r.timeMs || 0), 0) / results.length;
  
  console.log('\n' + chalk.bold('Results:'));
  console.log(chalk.green(`  ✓ Successful: ${successful}`));
  console.log(chalk.red(`  ✗ Failed: ${failed}`));
  console.log(chalk.blue(`  ⏱ Average time: ${avgTime.toFixed(0)}ms`));
  
  const successRate = (successful / results.length) * 100;
  console.log('\n' + chalk.bold(`Success Rate: ${successRate.toFixed(1)}%`));
  
  if (successRate >= 95) {
    console.log(chalk.green.bold('🎉 GOAL ACHIEVED: 95%+ reliability!'));
  } else if (successRate >= 80) {
    console.log(chalk.yellow.bold('⚠️  Good progress, but not at 95% target yet'));
  } else {
    console.log(chalk.red.bold('❌ Needs improvement to reach 95% target'));
  }
  
  // Show failed tests
  const failures = results.filter(r => !r.success && r.component !== 'NonExistent');
  if (failures.length > 0) {
    console.log('\n' + chalk.red.bold('Failed Tests:'));
    failures.forEach(f => {
      console.log(`  - ${f.component}: ${f.error}`);
    });
  }
}

// Main test runner
async function runTests() {
  console.log(chalk.bold.blue('\n🧪 GitHub Integration Test Suite\n'));
  console.log('Testing improvements to component fetching...\n');
  
  try {
    await testDirectFetching();
    await testFallbackStrategies();
    await testErrorRecovery();
    await testPerformance();
    await testRealWorldScenario();
    
    generateReport();
    
    console.log('\n' + chalk.green('✅ All tests completed!'));
    process.exit(0);
  } catch (error: any) {
    console.error('\n' + chalk.red('Fatal error:'), error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();