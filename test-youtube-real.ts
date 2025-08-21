#!/usr/bin/env tsx

/**
 * Real-world test for YouTube video recreation pipeline
 * Tests: First 5 seconds of https://www.youtube.com/watch?v=wPnohSQBNlk
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Now import after env is loaded
import { orchestrator } from './src/brain/orchestratorNEW';
import type { OrchestrationInput } from './src/lib/types/ai/brain.types';

async function testYouTubeRecreation() {
  console.log('\n🧪 === REAL YOUTUBE RECREATION PIPELINE TEST ===\n');
  console.log('Testing: First 5 seconds of https://www.youtube.com/watch?v=wPnohSQBNlk\n');
  
  const testInput: OrchestrationInput = {
    prompt: 'recreate the first 5 seconds of https://www.youtube.com/watch?v=wPnohSQBNlk',
    projectId: 'test-project',
    userId: 'test-user',
    storyboardSoFar: [],
    userContext: {
      useGitHub: false, // GitHub mode explicitly disabled
    },
    onProgress: (message: string, type: string) => {
      console.log(`📊 [${new Date().toISOString().split('T')[1].split('.')[0]}] ${type}: ${message}`);
    }
  };

  try {
    console.log('1️⃣ Calling orchestrator.processUserInput()...\n');
    const result = await orchestrator.processUserInput(testInput);
    
    console.log('\n2️⃣ === ORCHESTRATION RESULT ===');
    console.log('   Success:', result.success);
    console.log('   Tool Selected:', result.toolUsed || 'NONE');
    console.log('   Reasoning:', result.reasoning?.substring(0, 200) + '...\n');
    
    if (!result.success) {
      console.error('❌ Orchestration failed:', result.error);
      return;
    }
    
    if (result.result?.toolContext) {
      console.log('3️⃣ === TOOL CONTEXT ===');
      console.log('   Is YouTube Analysis:', result.result.toolContext.isYouTubeAnalysis);
      console.log('   Tool Name:', result.result.toolName);
      
      const prompt = result.result.toolContext.userPrompt || '';
      console.log('   Enhanced Prompt Starts With:', prompt.substring(0, 100) + '...\n');
      
      // Check if YouTube analysis was included
      if (prompt.includes('RECREATE this video exactly')) {
        console.log('4️⃣ === YOUTUBE ANALYSIS DETECTED ===');
        
        // Try to extract the JSON analysis
        const jsonStart = prompt.indexOf('[') !== -1 ? prompt.indexOf('[') : prompt.indexOf('{');
        const jsonEnd = prompt.lastIndexOf(']') !== -1 ? prompt.lastIndexOf(']') : prompt.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const analysisJson = prompt.substring(jsonStart, jsonEnd + 1);
          
          try {
            const analysis = JSON.parse(analysisJson);
            console.log('   ✅ Valid JSON analysis received from Gemini');
            console.log('   Number of scenes:', Array.isArray(analysis) ? analysis.length : 1);
            
            // Show first scene details
            const firstScene = Array.isArray(analysis) ? analysis[0] : analysis;
            console.log('\n   === FIRST SCENE DETAILS ===');
            console.log('   Start Frame:', firstScene.sceneStartFrame);
            console.log('   End Frame:', firstScene.sceneEndFrame);
            console.log('   Duration:', (firstScene.sceneEndFrame - firstScene.sceneStartFrame) / 30, 'seconds');
            console.log('   Background:', JSON.stringify(firstScene.background));
            console.log('   Number of elements:', firstScene.elements?.length || 0);
            
            if (firstScene.elements?.length > 0) {
              console.log('\n   === FIRST ELEMENT ===');
              const elem = firstScene.elements[0];
              console.log('   Type:', elem.type);
              console.log('   Content:', elem.content || '(no text content)');
              console.log('   Position:', JSON.stringify(elem.position));
              console.log('   Frame Range:', `${elem.startFrame}-${elem.endFrame}`);
            }
            
          } catch (e) {
            console.log('   ⚠️ Could not parse JSON analysis');
            console.log('   First 500 chars of analysis:', analysisJson.substring(0, 500));
          }
        }
      } else {
        console.log('4️⃣ ❌ YouTube analysis NOT included in prompt!');
      }
      
      // Check for hallucinations
      console.log('\n5️⃣ === HALLUCINATION CHECK ===');
      const suspiciousTerms = [
        'sometimes i need',
        'days off',
        'day off',
        'lyrics',
        'song',
        'music',
        'audio',
        'speech',
        'talking',
        'saying'
      ];
      
      let foundHallucinations = [];
      for (const term of suspiciousTerms) {
        if (prompt.toLowerCase().includes(term)) {
          foundHallucinations.push(term);
        }
      }
      
      if (foundHallucinations.length > 0) {
        console.log('   ❌ HALLUCINATION DETECTED! Found terms:', foundHallucinations.join(', '));
        
        // Try to find where it appears
        for (const term of foundHallucinations) {
          const index = prompt.toLowerCase().indexOf(term);
          if (index !== -1) {
            const context = prompt.substring(Math.max(0, index - 50), Math.min(prompt.length, index + 50));
            console.log(`   Context for "${term}": ...${context}...`);
          }
        }
      } else {
        console.log('   ✅ No hallucination patterns detected!');
      }
      
      // Check frame timing
      console.log('\n6️⃣ === FRAME TIMING CHECK ===');
      const frameMatches = prompt.match(/(\d+)\s*frames?/gi);
      if (frameMatches) {
        console.log('   Frame references found:', frameMatches.slice(0, 5).join(', '));
        
        // Check if 5 seconds = 150 frames
        if (prompt.includes('150') || prompt.includes('sceneEndFrame": 150')) {
          console.log('   ✅ Correct frame calculation for 5 seconds (150 frames)');
        } else {
          console.log('   ⚠️ May have incorrect frame timing');
        }
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
console.log('Starting test...');
testYouTubeRecreation().then(() => {
  console.log('\n🧪 === TEST COMPLETE ===\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});