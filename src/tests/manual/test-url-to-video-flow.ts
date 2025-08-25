/**
 * End-to-end test for URL-to-video flow with dynamic features
 */

import { WebsiteToVideoHandler } from '~/tools/website/websiteToVideoHandler';
import { IntentAnalyzer } from '~/brain/orchestrator_functions/intentAnalyzer';

// Mock extraction data (simulating WebAnalysisAgentV4 output)
const mockExtraction = {
  brand: {
    identity: {
      name: "Elhub",
      tagline: "Norwegian Energy Data Hub",
      mission: "Streamline energy data exchange"
    },
    personality: ["professional", "innovative", "reliable"],
    colors: {
      primary: "#0056b3",
      secondary: "#28a745",
      neutrals: ["#f8f9fa", "#212529"]
    }
  },
  product: {
    problem: "Complex energy market data management",
    value_prop: {
      headline: "Unified Energy Data Platform",
      subhead: "Connect, manage, and optimize"
    },
    features: [
      { title: "Real-time Data", desc: "Live energy market updates" },
      { title: "Smart Analytics", desc: "AI-powered insights" },
      { title: "Secure Exchange", desc: "Enterprise-grade security" }
    ]
  },
  ctas: [{ label: "Start Now" }]
};

async function testFlow() {
  console.log('🚀 Testing Complete URL-to-Video Flow\n');
  console.log('=' .repeat(60));
  
  const handler = new WebsiteToVideoHandler();
  const analyzer = new IntentAnalyzer();
  
  // Test cases with different user inputs
  const testCases = [
    { 
      prompt: "https://elhub.no",
      expected: "Default: 5 scenes, 15 seconds"
    },
    { 
      prompt: "https://elhub.no make a 10 second video",
      expected: "Dynamic: 3 scenes, 10 seconds"
    },
    { 
      prompt: "https://elhub.no with 6 quick scenes",
      expected: "Dynamic: 6 scenes, 18 seconds"
    },
    { 
      prompt: "create a 20 second commercial for https://elhub.no",
      expected: "Dynamic: 5 scenes, 20 seconds"
    }
  ];
  
  for (const test of testCases) {
    console.log(`\n📝 User Input: "${test.prompt}"`);
    console.log(`   Expected: ${test.expected}`);
    
    // @ts-ignore - accessing private method for testing
    const durationInfo = analyzer['detectDurationIntent'](test.prompt);
    
    // Create input with duration info
    const input = {
      userPrompt: test.prompt,
      extraction: mockExtraction,
      projectId: 'test-project',
      ...durationInfo
    };
    
    // @ts-ignore - accessing private method
    const arcConfig = handler['determineArcConfig'](input);
    console.log(`   ✅ Result: ${arcConfig.sceneCount} scenes, ${arcConfig.totalDuration/30}s`);
    
    // Test narrative generation
    console.log(`   🎭 Generating narrative...`);
    // @ts-ignore - accessing private method
    const narrative = await handler['generateNarrative'](mockExtraction, arcConfig);
    
    if (narrative && narrative.length > 0) {
      console.log(`   ✅ Generated ${narrative.length} scenes:`);
      narrative.forEach((scene, i) => {
        console.log(`      ${i+1}. ${scene.title} (${scene.emotionalBeat})`);
      });
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Flow Test Complete!\n');
}

// Run the test
testFlow().catch(console.error);
