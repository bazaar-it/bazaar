/**
 * Test LLM narrative generation
 */

import { HeroJourneyLLM } from '~/tools/narrative/herosJourneyLLM';

// Mock extraction data
const mockExtraction = {
  brand: {
    identity: {
      name: "TechCorp",
      tagline: "Innovation at Speed",
      mission: "Accelerate digital transformation"
    },
    visual: {
      colors: {
        primary: "#0066ff",
        secondary: "#ffffff",
        accent: "#00ff66"
      },
      typography: {
        stack: {
          primary: ["Inter", "sans-serif"]
        }
      }
    }
  },
  product: {
    problem: "Manual processes waste time and money",
    value_prop: {
      headline: "Automate Everything",
      subhead: "Save 10 hours per week"
    },
    features: [
      { title: "AI-Powered", description: "Smart automation" },
      { title: "Real-time", description: "Instant updates" },
      { title: "Secure", description: "Bank-level security" }
    ]
  }
};

async function testLLMNarrative() {
  console.log('🧪 Testing LLM Narrative Generation\n');
  console.log('=' .repeat(60));
  
  const llm = new HeroJourneyLLM();
  
  // Test different scene counts
  const tests = [
    { scenes: 3, duration: 270 },  // 9 seconds
    { scenes: 5, duration: 450 },  // 15 seconds
    { scenes: 7, duration: 630 }   // 21 seconds
  ];
  
  for (const test of tests) {
    console.log(`\n📝 Generating ${test.scenes}-scene narrative (${test.duration/30}s)...`);
    
    try {
      const scenes = await llm.generateNarrativeScenes(
        mockExtraction,
        test.scenes,
        test.duration
      );
      
      console.log(`✅ Generated ${scenes.length} unique scenes:`);
      scenes.forEach((scene, i) => {
        console.log(`   ${i+1}. ${scene.title}`);
        console.log(`      Duration: ${scene.duration}f (${(scene.duration/30).toFixed(1)}s)`);
        console.log(`      Beat: ${scene.emotionalBeat}`);
        console.log(`      Narrative: ${scene.narrative}`);
      });
      
      const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
      console.log(`   📊 Total: ${totalDuration}f (${(totalDuration/30).toFixed(1)}s)`);
      
    } catch (error) {
      console.error(`   ❌ Failed:`, error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ LLM Test Complete!\n');
}

// Run test
testLLMNarrative().catch(console.error);
