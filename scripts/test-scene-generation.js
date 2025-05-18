#!/usr/bin/env node
// scripts/test-scene-generation.js
// A simplified script to trigger scene generation through the API

import fetch from 'node-fetch';

// Configuration
const API_ENDPOINT = 'http://localhost:3000/api/debug/test-scene-planner';
const PROMPT = 'Create a short intro video for a tech company named Bazaar that specializes in video generation'; 

// Main function to execute the test
async function testSceneGeneration() {
  console.log('🚀 Testing scene generation through the API');
  console.log(`📝 Using prompt: "${PROMPT}"`);

  // Prepare the request body
  const data = {
    prompt: PROMPT,
    testMode: true
  };

  console.log('📤 Sending request to trigger scene generation...');
  
  try {
    // Send the request using fetch
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    console.log(`🔄 Status Code: ${response.status}`);
    
    const responseData = await response.json();
    console.log('✅ Response received:');
    console.log(JSON.stringify(responseData, null, 2));
    
    if (responseData.success) {
      console.log('🎬 Scene generation has been triggered successfully!');
      console.log('⏳ The ScenePlannerAgent should now be processing the request.');
      console.log('📋 Check the logs to see the complete scene generation process.');
    } else {
      console.error('❌ Scene generation failed to trigger.');
      console.error('Error:', responseData.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.log('Make sure the Next.js server is running on port 3000');
  }
}

// Run the test
console.log('⏳ Starting test...');
testSceneGeneration().catch(error => {
  console.error('❌ Unhandled error:', error);
});
