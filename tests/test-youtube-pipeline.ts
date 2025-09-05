#!/usr/bin/env tsx

/**
 * Test script for YouTube video recreation pipeline
 * Tests: First 5 seconds of https://www.youtube.com/watch?v=wPnohSQBNlk
 */

import { orchestrator } from './src/brain/orchestratorNEW';
import type { OrchestrationInput } from './src/lib/types/ai/brain.types';

async function testYouTubeRecreation() {
  console.log('\n🧪 === YOUTUBE RECREATION PIPELINE TEST ===\n');
  
  const testInput: OrchestrationInput = {
    prompt: 'recreate the first 5 seconds of https://www.youtube.com/watch?v=wPnohSQBNlk',
    projectId: 'test-project',
    userId: 'test-user',
    storyboardSoFar: [],
    userContext: {
      useGitHub: false, // GitHub mode disabled
    },
    onProgress: (message: string, type: string) => {
      console.log(`📊 Progress [${type}]: ${message}`);
    }
  };

  try {
    console.log('1️⃣ Testing orchestrator detection of YouTube URL + time spec...');
    const result = await orchestrator.processUserInput(testInput);
    
    console.log('\n2️⃣ Orchestration Result:');
    console.log('   Success:', result.success);
    console.log('   Tool Used:', result.toolUsed);
    console.log('   Reasoning:', result.reasoning?.substring(0, 200));
    
    if (result.result?.toolContext) {
      console.log('\n3️⃣ Tool Context:');
      console.log('   Is YouTube Analysis:', result.result.toolContext.isYouTubeAnalysis);
      console.log('   User Prompt Enhanced:', result.result.toolContext.userPrompt?.includes('RECREATE this video'));
      
      // Check if the enhanced prompt contains Gemini analysis
      const hasAnalysis = result.result.toolContext.userPrompt?.includes('sceneStartFrame');
      console.log('   Contains Frame Analysis:', hasAnalysis);
      
      if (hasAnalysis) {
        // Extract and display first part of analysis
        const analysisStart = result.result.toolContext.userPrompt?.indexOf('{');
        const analysisEnd = result.result.toolContext.userPrompt?.indexOf('}', analysisStart || 0);
        if (analysisStart && analysisEnd && analysisStart > -1) {
          const firstObject = result.result.toolContext.userPrompt?.substring(analysisStart, analysisEnd + 1);
          console.log('\n4️⃣ First Scene Object from Gemini:');
          try {
            const parsed = JSON.parse(firstObject);
            console.log(JSON.stringify(parsed, null, 2));
          } catch {
            console.log('   (Could not parse first object, showing raw):');
            console.log(firstObject?.substring(0, 500));
          }
        }
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    
    // Check for hallucination indicators
    console.log('\n5️⃣ Hallucination Check:');
    const prompt = result.result?.toolContext?.userPrompt || '';
    const suspiciousContent = [
      'sometimes i need',
      'days off',
      'lyrics',
      'song',
      'music'
    ];
    
    for (const term of suspiciousContent) {
      if (prompt.toLowerCase().includes(term)) {
        console.log(`   ⚠️ WARNING: Found suspicious content: "${term}"`);
      }
    }
    
    const cleanCheck = !suspiciousContent.some(term => prompt.toLowerCase().includes(term));
    console.log(`   ${cleanCheck ? '✅' : '❌'} Analysis appears ${cleanCheck ? 'clean' : 'contaminated with hallucinations'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testYouTubeRecreation().then(() => {
  console.log('\n🧪 === TEST COMPLETE ===\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});