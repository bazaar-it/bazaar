/**
 * Test full generation with dynamic features
 */

import { WebsiteToVideoHandler } from '~/tools/website/websiteToVideoHandler';
import { HeroJourneyLLM } from '~/tools/narrative/herosJourneyLLM';

// Mock extraction
const mockExtraction = {
  brand: {
    identity: {
      name: "TestBrand",
      tagline: "Innovation Today",
      mission: "Transform the future"
    },
    personality: ["innovative", "bold", "creative"],
    colors: {
      primary: "#ff6b6b",
      secondary: "#4ecdc4",
      neutrals: ["#f8f9fa", "#212529"]
    }
  },
  product: {
    problem: "Outdated workflows",
    value_prop: {
      headline: "Work Smarter",
      subhead: "Not harder"
    },
    features: [
      { title: "AI-Powered", desc: "Smart automation" },
      { title: "Real-time", desc: "Instant updates" }
    ]
  },
  ctas: [{ label: "Start Free" }]
};

async function testGeneration() {
  console.log('🎬 Testing Full Generation with Dynamic Features\n');
  console.log('=' .repeat(60));
  
  const llmGenerator = new HeroJourneyLLM();
  
  console.log('\n1️⃣ Testing LLM Narrative Generation:');
  console.log('   Using brand personality:', mockExtraction.brand.personality);
  
  try {
    const narrative = await llmGenerator.generateNarrative(mockExtraction);
    console.log('   ✅ Generated narrative with', narrative.length, 'scenes:');
    narrative.forEach((scene, i) => {
      console.log(`      ${i+1}. ${scene.title} (${scene.emotionalBeat}, ${scene.duration}f)`);
    });
    
    // Test different narrative structures
    console.log('\n2️⃣ Testing Narrative Structure Selection:');
    const brands = [
      { personality: ["playful", "fun"], expected: "Emotional Rollercoaster" },
      { personality: ["professional", "corporate"], expected: "Problem-Agitate-Solve" },
      { personality: ["innovative", "tech"], expected: "Product Demo Flow" },
      { personality: ["inspiring", "bold"], expected: "Classic Hero's Journey" }
    ];
    
    for (const brand of brands) {
      const testExtraction = { ...mockExtraction, brand: { ...mockExtraction.brand, personality: brand.personality }};
      // @ts-ignore
      const structure = llmGenerator['selectNarrativeStructureForBrand'](testExtraction);
      console.log(`   ${brand.personality.join(', ')} → ${structure}`);
    }
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Generation Test Complete!\n');
}

// Run test
testGeneration().catch(console.error);
