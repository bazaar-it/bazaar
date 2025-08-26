/**
 * Auto-Fix Test Harness
 * Controlled testing environment for validating auto-fix behavior
 */

export class AutoFixTestHarness {
  private testResults: Array<{
    test: string;
    passed: boolean;
    details: any;
    timestamp: number;
  }> = [];
  
  constructor() {
    // Expose to window for easy testing
    if (typeof window !== 'undefined') {
      (window as any).autofixTest = this;
    }
  }
  
  /**
   * Simulate different error scenarios to test auto-fix behavior
   */
  simulateSceneError(
    sceneId: string = 'test-scene-' + Date.now(),
    errorType: 'syntax' | 'duplicate' | 'undefined' | 'import' = 'syntax',
    sceneName: string = 'Test Scene'
  ) {
    const errorMessages = {
      syntax: "Unexpected token '}' at line 42",
      duplicate: "Identifier 'script_A7B9C2D4' has already been declared",
      undefined: "Cannot read property 'map' of undefined",
      import: "Module not found: 'nonexistent-module'",
    };
    
    const event = new CustomEvent('preview-scene-error', {
      detail: {
        sceneId,
        sceneName,
        error: new Error(errorMessages[errorType]),
      },
    });
    
    console.log(`[TEST] Simulating ${errorType} error for scene ${sceneId}`);
    window.dispatchEvent(event);
    
    return {
      sceneId,
      errorType,
      message: errorMessages[errorType],
    };
  }
  
  /**
   * Test: Verify duplicate error prevention
   */
  async testDuplicatePrevention() {
    console.log('=== TEST: Duplicate Error Prevention ===');
    
    const sceneId = 'duplicate-test-' + Date.now();
    
    // Get initial metrics
    const metricsBefore = (window as any).getAutofixReport?.();
    const duplicatesBefore = metricsBefore?.report?.summary?.duplicatesIgnored || 0;
    
    // Simulate the same error 5 times
    for (let i = 0; i < 5; i++) {
      this.simulateSceneError(sceneId, 'syntax', 'Duplicate Test Scene');
      await this.wait(500); // Small delay between events
    }
    
    // Wait for processing
    await this.wait(6000); // Wait longer than debounce
    
    // Check metrics
    const metricsAfter = (window as any).getAutofixReport?.();
    const duplicatesAfter = metricsAfter?.report?.summary?.duplicatesIgnored || 0;
    const fixAttempts = metricsAfter?.report?.summary?.apiCalls || 0;
    
    const passed = duplicatesAfter > duplicatesBefore && fixAttempts <= 2;
    
    this.testResults.push({
      test: 'Duplicate Prevention',
      passed,
      details: {
        duplicatesIgnored: duplicatesAfter - duplicatesBefore,
        fixAttempts,
        expected: 'Should ignore duplicates and attempt fix max 2 times',
      },
      timestamp: Date.now(),
    });
    
    console.log(`Test ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('Details:', this.testResults[this.testResults.length - 1].details);
    
    return passed;
  }
  
  /**
   * Test: Verify rate limiting
   */
  async testRateLimiting() {
    console.log('=== TEST: Rate Limiting ===');
    
    const metricsBefore = (window as any).getAutofixReport?.();
    const rateLimitedBefore = metricsBefore?.report?.summary?.rateLimited || 0;
    
    // Simulate rapid errors
    const scenes = [];
    for (let i = 0; i < 10; i++) {
      const sceneId = `rate-limit-test-${i}`;
      scenes.push(sceneId);
      this.simulateSceneError(sceneId, 'syntax', `Rate Test ${i}`);
      await this.wait(100); // Very rapid succession
    }
    
    // Wait for processing
    await this.wait(15000); // Wait for some processing
    
    const metricsAfter = (window as any).getAutofixReport?.();
    const rateLimitedAfter = metricsAfter?.report?.summary?.rateLimited || 0;
    const rateLimitedCount = rateLimitedAfter - rateLimitedBefore;
    
    const passed = rateLimitedCount > 0;
    
    this.testResults.push({
      test: 'Rate Limiting',
      passed,
      details: {
        scenesCreated: scenes.length,
        rateLimitedCount,
        expected: 'Should rate limit rapid requests',
      },
      timestamp: Date.now(),
    });
    
    console.log(`Test ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log('Details:', this.testResults[this.testResults.length - 1].details);
    
    return passed;
  }
  
  /**
   * Test: Verify project isolation
   */
  async testProjectIsolation() {
    console.log('=== TEST: Project Isolation ===');
    
    // Note: This test requires manually switching projects in the UI
    console.log('⚠️ Manual test: Switch between projects while errors are occurring');
    console.log('Expected: Errors from old project should not trigger fixes in new project');
    
    // Simulate error in "project 1"
    const project1Scene = 'project1-scene-' + Date.now();
    this.simulateSceneError(project1Scene, 'syntax', 'Project 1 Scene');
    
    console.log('Now switch to a different project within 5 seconds...');
    await this.wait(5000);
    
    // Check if cross-project errors were ignored
    const metrics = (window as any).getAutofixReport?.();
    const crossProjectIgnored = metrics?.report?.summary?.crossProjectIgnored || 0;
    
    this.testResults.push({
      test: 'Project Isolation',
      passed: null, // Manual verification needed
      details: {
        crossProjectIgnored,
        note: 'Manual verification required - check if errors stopped when switching projects',
      },
      timestamp: Date.now(),
    });
    
    console.log('Check metrics for cross-project errors ignored:', crossProjectIgnored);
    
    return null;
  }
  
  /**
   * Test: Verify circuit breaker
   */
  async testCircuitBreaker() {
    console.log('=== TEST: Circuit Breaker ===');
    
    const metricsBefore = (window as any).getAutofixReport?.();
    const circuitTripsBefore = metricsBefore?.report?.reliability?.circuitBreakerTrips || 0;
    
    // Note: This test would need to simulate API failures
    console.log('⚠️ This test requires simulating API failures (not implemented)');
    console.log('In production, circuit breaker trips after 5 consecutive failures');
    
    this.testResults.push({
      test: 'Circuit Breaker',
      passed: null,
      details: {
        note: 'Requires API failure simulation',
        expected: 'Should trip after 5 consecutive failures',
      },
      timestamp: Date.now(),
    });
    
    return null;
  }
  
  /**
   * Test: Verify cooldown period
   */
  async testCooldown() {
    console.log('=== TEST: Cooldown Period ===');
    
    // This test would need to trigger 5 fixes within 5 minutes
    console.log('⚠️ This test requires triggering 5 fixes (takes several minutes)');
    console.log('Expected: After 5 fixes in 5 minutes, system enters 2-minute cooldown');
    
    const metrics = (window as any).getAutofixReport?.();
    
    this.testResults.push({
      test: 'Cooldown Period',
      passed: null,
      details: {
        currentApiCalls: metrics?.report?.summary?.apiCalls || 0,
        cooldownsTriggered: metrics?.report?.reliability?.cooldownsTriggered || 0,
        note: 'Monitor cooldownsTriggered metric after multiple fixes',
      },
      timestamp: Date.now(),
    });
    
    return null;
  }
  
  /**
   * Run all automated tests
   */
  async runAllTests() {
    console.log('🧪 Starting Auto-Fix Test Suite...\n');
    
    // Reset metrics before testing
    console.log('Resetting metrics...');
    (window as any).resetAutofixMetrics?.();
    await this.wait(1000);
    
    // Run automated tests
    await this.testDuplicatePrevention();
    await this.wait(2000);
    
    await this.testRateLimiting();
    await this.wait(2000);
    
    // Manual tests
    await this.testProjectIsolation();
    await this.testCircuitBreaker();
    await this.testCooldown();
    
    // Generate report
    this.generateReport();
  }
  
  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n=== AUTO-FIX TEST REPORT ===\n');
    
    const passed = this.testResults.filter(r => r.passed === true).length;
    const failed = this.testResults.filter(r => r.passed === false).length;
    const manual = this.testResults.filter(r => r.passed === null).length;
    
    console.log(`Tests Passed: ${passed} ✅`);
    console.log(`Tests Failed: ${failed} ❌`);
    console.log(`Manual Verification: ${manual} ⚠️\n`);
    
    this.testResults.forEach((result, i) => {
      const icon = result.passed === true ? '✅' : result.passed === false ? '❌' : '⚠️';
      console.log(`${i + 1}. ${result.test} ${icon}`);
      console.log('   Details:', result.details);
      console.log('');
    });
    
    // Show final metrics
    console.log('\n=== FINAL METRICS ===');
    (window as any).getAutofixReport?.();
    
    return {
      passed,
      failed,
      manual,
      results: this.testResults,
    };
  }
  
  /**
   * Helper: Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Clear test results
   */
  clearResults() {
    this.testResults = [];
    console.log('Test results cleared');
  }
}

// Create singleton instance
export const autofixTestHarness = new AutoFixTestHarness();

// Instructions for manual testing
export const testingInstructions = `
=== AUTO-FIX TESTING INSTRUCTIONS ===

1. Open browser console
2. Run automated tests:
   > autofixTest.runAllTests()

3. For manual project isolation test:
   - Open a project with errors
   - Note the error messages
   - Switch to a different project
   - Verify old errors don't trigger in new project

4. Check metrics anytime:
   > getAutofixReport()

5. View recent events:
   > getAutofixLogs()

6. Reset metrics:
   > resetAutofixMetrics()

7. Simulate specific errors:
   > autofixTest.simulateSceneError('test-1', 'syntax')
   > autofixTest.simulateSceneError('test-2', 'duplicate')
   > autofixTest.simulateSceneError('test-3', 'undefined')

8. Monitor in real usage:
   - Open DevTools Network tab
   - Filter by 'generateScene' to see API calls
   - Should see MAX 2 attempts per unique error
   - Should see 10+ second gaps between attempts
   - Should see no attempts after project switch

EXPECTED IMPROVEMENTS:
- 95%+ reduction in API calls
- No infinite loops
- No cross-project contamination
- Max 2 fix attempts per error
- Proper cooldown after 5 fixes
`;

console.log('[Auto-Fix Test Harness] Loaded. Type "autofixTest.runAllTests()" to start testing.');