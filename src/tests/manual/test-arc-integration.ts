/**
 * Integration test for dynamic arc length with narrative generation
 * Tests the full flow from detection to scene adaptation
 */

import { HeroJourneyGenerator } from '~/tools/narrative/herosJourney';
import { WebsiteToVideoHandler } from '~/tools/website/websiteToVideoHandler';

// Create mock extraction data
const mockExtraction = {
  brand: {
    identity: {
      name: "TestBrand",
      tagline: "Innovation for tomorrow",
      mission: "Transform the digital landscape"
    },
    colors: {
      primary: "#0066CC",
      secondary: "#00A859",
      neutrals: ["#1a1a1a", "#666666"]
    }
  },
  product: {
    problem: "Complex workflows slow teams down",
    value_prop: {
      headline: "Streamline Your Process",
      subhead: "Work smarter, not harder"
    },
    features: [
      { title: "Automation", desc: "Automate repetitive tasks" },
      { title: "Analytics", desc: "Real-time insights" }
    ]
  },
  ctas: [
    { label: "Get Started Now" }
  ]
};

async function testNarrativeAdaptation() {
  console.log('🧪 Testing Narrative Adaptation\n');
  console.log('=' .repeat(60));
  
  const handler = new WebsiteToVideoHandler();
  const generator = new HeroJourneyGenerator();
  
  // Generate base 5-scene narrative
  const baseScenes = generator.generateNarrative(mockExtraction);
  console.log('\n📚 Base Narrative (5 scenes):');
  baseScenes.forEach((scene, i) => {
    console.log(`  ${i + 1}. ${scene.title} (${scene.duration} frames, ${scene.emotionalBeat})`);
  });
  
  // Test different arc configurations
  const testConfigs = [
    { sceneCount: 2, totalDuration: 150 },  // 5 seconds
    { sceneCount: 3, totalDuration: 300 },  // 10 seconds
    { sceneCount: 4, totalDuration: 360 },  // 12 seconds
    { sceneCount: 6, totalDuration: 540 },  // 18 seconds
    { sceneCount: 7, totalDuration: 630 },  // 21 seconds
  ];
  
  for (const config of testConfigs) {
    console.log(`\n🎬 Adapting to ${config.sceneCount} scenes (${config.totalDuration/30}s):`);
    
    // @ts-ignore - accessing private method for testing
    const adaptedScenes = handler.adaptNarrativeToSceneCount(baseScenes, config);
    
    adaptedScenes.forEach((scene, i) => {
      console.log(`  ${i + 1}. ${scene.title} (${scene.duration}f/${(scene.duration/30).toFixed(1)}s, ${scene.emotionalBeat})`);
    });
    
    const totalFrames = adaptedScenes.reduce((sum, s) => sum + s.duration, 0);
    console.log(`  📊 Total: ${totalFrames} frames (${(totalFrames/30).toFixed(1)}s)`);
  }
  
  // Test duration distribution
  console.log('\n📐 Duration Distribution Tests:');
  const distributions = [2, 3, 4, 5, 6, 7, 8];
  
  for (const count of distributions) {
    // @ts-ignore - accessing private method
    const durations = handler.distributeDuration(300, count); // 10 seconds
    console.log(`  ${count} scenes: [${durations.map(d => `${(d/30).toFixed(1)}s`).join(', ')}]`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Integration Test Complete!\n');
}

// Run the test
testNarrativeAdaptation().catch(console.error);