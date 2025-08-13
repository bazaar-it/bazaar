#!/usr/bin/env npx tsx

/**
 * Test script for YouTube analysis flow
 * Tests the following scenarios:
 * 1. YouTube URL without time specification - should ask for clarification
 * 2. YouTube URL with time specification - should analyze and proceed
 * 3. Context builder not crawling random websites
 * 4. Duration parser not confusing t=51s
 */

import { orchestrator } from './src/brain/orchestratorNEW';
import { ContextBuilder } from './src/brain/orchestrator_functions/contextBuilder';
import { parseDurationFromPrompt } from './src/brain/utils/durationParser';

async function testYouTubeFlow() {
  console.log('\n=== TESTING YOUTUBE ANALYSIS FLOW ===\n');
  
  // Test 1: YouTube URL without time specification - should ask for clarification
  console.log('TEST 1: YouTube URL without time specification');
  console.log('Input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
  
  try {
    const result1 = await orchestrator.processUserInput({
      prompt: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      projectId: 'test-project',
      userId: 'test-user',
      storyboardSoFar: [],
      chatHistory: [],
    });
    
    console.log('Result:', {
      success: result1.success,
      needsClarification: result1.needsClarification,
      chatResponse: result1.chatResponse,
    });
    
    if (result1.needsClarification) {
      console.log('✅ TEST 1 PASSED: Brain correctly asked for time specification');
    } else {
      console.log('❌ TEST 1 FAILED: Brain should ask for clarification');
    }
  } catch (error) {
    console.log('❌ TEST 1 ERROR:', error);
  }
  
  console.log('\n---\n');
  
  // Test 2: YouTube URL with time specification - should proceed
  console.log('TEST 2: YouTube URL with time specification');
  console.log('Input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ first 5 seconds"');
  
  try {
    const result2 = await orchestrator.processUserInput({
      prompt: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ first 5 seconds',
      projectId: 'test-project',
      userId: 'test-user',
      storyboardSoFar: [],
      chatHistory: [],
    });
    
    console.log('Result:', {
      success: result2.success,
      needsClarification: result2.needsClarification,
      toolUsed: result2.toolUsed,
    });
    
    if (!result2.needsClarification && result2.toolUsed) {
      console.log('✅ TEST 2 PASSED: Brain proceeded with tool selection');
    } else {
      console.log('❌ TEST 2 FAILED: Brain should proceed with analysis');
    }
  } catch (error) {
    console.log('⚠️ TEST 2 ERROR (expected if YouTube API not configured):', error);
  }
  
  console.log('\n---\n');
  
  // Test 3: Context builder should not crawl random websites
  console.log('TEST 3: Context builder with random domain mention');
  console.log('Input: "Create a video like the one on Motionvid.ai"');
  
  try {
    const contextBuilder = new ContextBuilder();
    const context = await contextBuilder.buildContext({
      prompt: 'Create a video like the one on Motionvid.ai',
      projectId: 'test-project',
      userId: 'test-user',
      storyboardSoFar: [],
      chatHistory: [],
    });
    
    console.log('Web context result:', context.webContext ? 'CRAWLED' : 'NOT CRAWLED');
    
    if (!context.webContext) {
      console.log('✅ TEST 3 PASSED: Context builder did not crawl random website');
    } else {
      console.log('❌ TEST 3 FAILED: Context builder should not crawl without explicit URL');
    }
  } catch (error) {
    console.log('❌ TEST 3 ERROR:', error);
  }
  
  console.log('\n---\n');
  
  // Test 4: Duration parser should ignore YouTube t= parameter
  console.log('TEST 4: Duration parser with YouTube URL');
  console.log('Input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=51s"');
  
  const duration = parseDurationFromPrompt('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=51s');
  console.log('Parsed duration:', duration);
  
  if (duration === undefined) {
    console.log('✅ TEST 4 PASSED: Duration parser ignored t=51s parameter');
  } else {
    console.log('❌ TEST 4 FAILED: Duration parser should ignore YouTube timestamps');
  }
  
  console.log('\n---\n');
  
  // Test 5: Duration parser should still work for explicit durations
  console.log('TEST 5: Duration parser with explicit duration');
  console.log('Input: "make it 5 seconds"');
  
  const duration2 = parseDurationFromPrompt('make it 5 seconds');
  console.log('Parsed duration:', duration2, 'frames');
  
  if (duration2 === 150) { // 5 seconds * 30fps
    console.log('✅ TEST 5 PASSED: Duration parser correctly parsed 5 seconds');
  } else {
    console.log('❌ TEST 5 FAILED: Duration parser should return 150 frames for 5 seconds');
  }
  
  console.log('\n=== ALL TESTS COMPLETE ===\n');
}

// Run tests
testYouTubeFlow().catch(console.error);