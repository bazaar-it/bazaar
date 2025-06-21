/**
 * Data Lifecycle Management Test Script
 * Tests the automated cleanup and retention functionality
 */

const { dataLifecycleService } = require('../src/lib/services/dataLifecycle.service.ts');

async function testDataLifecycle() {
  console.log('\n🗂️ Testing Data Lifecycle Management - Phase 4.1\n');

  try {
    // Test 1: Get current lifecycle statistics
    console.log('📊 Step 1: Getting current lifecycle statistics...');
    const stats = await dataLifecycleService.getLifecycleStats();
    console.log('Statistics:', JSON.stringify(stats, null, 2));

    // Test 2: Perform a dry-run cleanup (with very short retention for testing)
    console.log('\n🧹 Step 2: Performing test cleanup (short retention periods)...');
    const testResult = await dataLifecycleService.performCleanup({
      imageAnalysisRetentionDays: 1,     // Very short for testing
      conversationContextRetentionDays: 7,
      sceneIterationsRetentionDays: 3,
      projectMemoryRetentionDays: 14,
      enableAutoCleanup: false,          // Don't start automated service during test
      cleanupIntervalHours: 24
    });

    console.log('\nCleanup Results:');
    console.log(`  🖼️  Image analysis records deleted: ${testResult.imageAnalysisRecordsDeleted}`);
    console.log(`  💬 Conversation records deleted: ${testResult.conversationRecordsDeleted}`);
    console.log(`  🎬 Scene iterations deleted: ${testResult.sceneIterationsDeleted}`);
    console.log(`  🧠 Project memory records deleted: ${testResult.projectMemoryRecordsDeleted}`);
    console.log(`  💾 Space reclaimed: ${testResult.totalSpaceReclaimed}`);
    console.log(`  ⏱️  Duration: ${testResult.cleanupDurationMs.toFixed(2)}ms`);

    // Test 3: Test automated cleanup service (start and stop quickly)
    console.log('\n🤖 Step 3: Testing automated cleanup service...');
    
    dataLifecycleService.startAutomatedCleanup({
      enableAutoCleanup: true,
      cleanupIntervalHours: 0.001, // 3.6 seconds for testing
      imageAnalysisRetentionDays: 30,
      conversationContextRetentionDays: 90,
      sceneIterationsRetentionDays: 60,
      projectMemoryRetentionDays: 180
    });

    // Wait a moment to see if it starts properly
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    dataLifecycleService.stopAutomatedCleanup();
    console.log('✅ Automated cleanup service test completed');

    console.log('\n🎉 All data lifecycle tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Data lifecycle test failed:', error);
    process.exit(1);
  }
}

// Help function
function showHelp() {
  console.log(`
Data Lifecycle Management Test Tool

Usage:
  node scripts/test-data-lifecycle.js [command]

Commands:
  test      Run full data lifecycle test suite (default)
  stats     Show current lifecycle statistics only
  cleanup   Force immediate cleanup with default settings
  help      Show this help message

Examples:
  node scripts/test-data-lifecycle.js test
  node scripts/test-data-lifecycle.js stats
  node scripts/test-data-lifecycle.js cleanup
`);
}

// Parse command line arguments
const command = process.argv[2] || 'test';

async function main() {
  switch (command) {
    case 'test':
      await testDataLifecycle();
      break;
    
    case 'stats':
      try {
        console.log('📊 Getting lifecycle statistics...');
        const stats = await dataLifecycleService.getLifecycleStats();
        console.log(JSON.stringify(stats, null, 2));
      } catch (error) {
        console.error('❌ Failed to get stats:', error);
        process.exit(1);
      }
      break;
    
    case 'cleanup':
      try {
        console.log('🧹 Performing immediate cleanup...');
        const result = await dataLifecycleService.forceCleanup();
        console.log('Cleanup completed:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
      }
      break;
    
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 