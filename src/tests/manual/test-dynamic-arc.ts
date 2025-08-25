/**
 * Manual test for dynamic arc length feature
 * Run with: tsx src/tests/manual/test-dynamic-arc.ts
 */

import { IntentAnalyzer } from '~/brain/orchestrator_functions/intentAnalyzer';

// Test cases for duration and scene detection
const testCases = [
  // Duration-based
  "https://elhub.no make a 10 second video",
  "create a 5 sec video about https://stripe.com",
  "https://example.com 30 second commercial",
  "quick 6s teaser for https://revolut.com",
  
  // Scene-based
  "https://elhub.no with 6 scenes",
  "make 3 acts for https://stripe.com",
  "https://example.com create 8 scene video",
  "generate 4 parts about https://revolut.com",
  
  // Mixed
  "10 second video with 4 scenes about https://elhub.no",
  "https://stripe.com 6 quick scenes, about 15 seconds",
  
  // No specification (should use defaults)
  "https://elhub.no",
  "create video from https://example.com"
];

// Mock the private method for testing
class TestableIntentAnalyzer extends IntentAnalyzer {
  public testDetectDuration(prompt: string) {
    // @ts-ignore - accessing private method for testing
    return this.detectDurationIntent(prompt);
  }
}

async function runTests() {
  console.log('🧪 Testing Dynamic Arc Length Detection\n');
  console.log('=' .repeat(60));
  
  const analyzer = new TestableIntentAnalyzer();
  
  for (const testCase of testCases) {
    console.log(`\n📝 Input: "${testCase}"`);
    
    const result = analyzer.testDetectDuration(testCase);
    
    if (result.requestedDurationSeconds) {
      console.log(`   ⏱️  Duration: ${result.requestedDurationSeconds} seconds`);
      console.log(`   🎬 Frames: ${result.requestedDurationSeconds * 30} frames`);
    }
    
    if (result.requestedScenes) {
      console.log(`   🎭 Scenes: ${result.requestedScenes} scenes`);
    }
    
    if (!result.requestedDurationSeconds && !result.requestedScenes) {
      console.log(`   ⚡ Default: Will use 5 scenes, 15 seconds`);
    }
    
    // Simulate arc config determination
    const arcConfig = determineArcConfig(result);
    console.log(`   📊 Arc Config: ${arcConfig.sceneCount} scenes, ${arcConfig.totalDuration/30}s`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test Complete!\n');
}

// Simulate the determineArcConfig logic
function determineArcConfig(detection: { 
  requestedDurationSeconds?: number; 
  requestedScenes?: number; 
}): { sceneCount: number; totalDuration: number } {
  let sceneCount = 5;
  let totalDuration = 450;
  
  if (detection.requestedScenes) {
    sceneCount = Math.min(Math.max(detection.requestedScenes, 2), 10);
    totalDuration = sceneCount * 90;
  } else if (detection.requestedDurationSeconds) {
    totalDuration = detection.requestedDurationSeconds * 30;
    
    if (detection.requestedDurationSeconds <= 6) {
      sceneCount = 2;
    } else if (detection.requestedDurationSeconds <= 10) {
      sceneCount = 3;
    } else if (detection.requestedDurationSeconds <= 15) {
      sceneCount = 4;
    } else if (detection.requestedDurationSeconds <= 20) {
      sceneCount = 5;
    } else if (detection.requestedDurationSeconds <= 25) {
      sceneCount = 6;
    } else if (detection.requestedDurationSeconds <= 30) {
      sceneCount = 7;
    } else {
      sceneCount = Math.min(Math.ceil(detection.requestedDurationSeconds / 5), 10);
    }
  }
  
  return { sceneCount, totalDuration };
}

// Run the tests
runTests().catch(console.error);