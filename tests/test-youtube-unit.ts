#!/usr/bin/env npx tsx

/**
 * Unit tests for YouTube flow fixes
 * Tests without requiring full environment setup
 */

// Test duration parser
import { parseDurationFromPrompt } from './src/brain/utils/durationParser';

console.log('\n=== TESTING YOUTUBE FLOW FIXES ===\n');

// Test 1: Duration parser should ignore YouTube t= parameter
console.log('TEST 1: Duration parser with YouTube URL containing t=51s');
const input1 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=51s';
const duration1 = parseDurationFromPrompt(input1);
console.log(`Input: "${input1}"`);
console.log(`Parsed duration: ${duration1}`);
if (duration1 === undefined) {
  console.log('✅ TEST 1 PASSED: Duration parser correctly ignored t=51s\n');
} else {
  console.log('❌ TEST 1 FAILED: Should not parse t=51s as duration\n');
}

// Test 2: Duration parser should still work for explicit durations
console.log('TEST 2: Duration parser with explicit "5 seconds"');
const input2 = 'make it 5 seconds';
const duration2 = parseDurationFromPrompt(input2);
console.log(`Input: "${input2}"`);
console.log(`Parsed duration: ${duration2} frames`);
if (duration2 === 150) { // 5 seconds * 30fps
  console.log('✅ TEST 2 PASSED: Correctly parsed as 150 frames\n');
} else {
  console.log('❌ TEST 2 FAILED: Should parse as 150 frames\n');
}

// Test 3: URL extraction helper
import { extractFirstValidUrl } from './src/lib/utils/url-detection';

console.log('TEST 3: URL extraction should only match explicit URLs');
const input3a = 'Create a video like the one on Motionvid.ai';
const url3a = extractFirstValidUrl(input3a);
console.log(`Input: "${input3a}"`);
console.log(`Extracted URL: ${url3a || 'none'}`);
if (!url3a) {
  console.log('✅ TEST 3a PASSED: Did not extract domain without protocol\n');
} else {
  console.log('❌ TEST 3a FAILED: Should not extract without http/https\n');
}

const input3b = 'Check out https://motionvid.ai for examples';
const url3b = extractFirstValidUrl(input3b);
console.log(`Input: "${input3b}"`);
console.log(`Extracted URL: ${url3b}`);
if (url3b === 'https://motionvid.ai') {
  console.log('✅ TEST 3b PASSED: Correctly extracted explicit URL\n');
} else {
  console.log('❌ TEST 3b FAILED: Should extract explicit URL\n');
}

// Test 4: YouTube URL extraction
console.log('TEST 4: YouTube URL extraction');
const input4 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ first 5 seconds';
const url4 = extractFirstValidUrl(input4);
console.log(`Input: "${input4}"`);
console.log(`Extracted URL: ${url4}`);
if (url4 === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') {
  console.log('✅ TEST 4 PASSED: Correctly extracted YouTube URL\n');
} else {
  console.log('❌ TEST 4 FAILED: Should extract YouTube URL\n');
}

console.log('=== ALL UNIT TESTS COMPLETE ===\n');