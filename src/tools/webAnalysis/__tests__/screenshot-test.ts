/**
 * Manual test script for screenshot functionality
 * Run with: npm run test:screenshots
 */

import { WebAnalysisAgentV4 } from '../WebAnalysisAgentV4';

async function testScreenshots() {
  console.log('🧪 Testing WebAnalysisAgentV4 screenshot functionality...\n');
  
  const testUrls = [
    'https://ramp.com',
    'https://stripe.com',
    'https://vercel.com'
  ];
  
  // Use a test project ID
  const testProjectId = 'test-screenshot-' + Date.now();
  
  for (const url of testUrls) {
    console.log(`\n📸 Testing screenshots for: ${url}`);
    console.log('=' .repeat(50));
    
    try {
      const agent = new WebAnalysisAgentV4(testProjectId);
      const result = await agent.analyze(url);
      
      console.log(`✅ Analysis completed for ${url}`);
      console.log(`   - Brand name: ${result.brand?.identity?.name}`);
      console.log(`   - Screenshots captured: ${result.screenshots?.length || 0}`);
      
      if (result.screenshots && result.screenshots.length > 0) {
        result.screenshots.forEach((screenshot, index) => {
          console.log(`   - Screenshot ${index + 1}: ${screenshot.type} (${screenshot.url})`);
        });
      } else {
        console.log('   ⚠️ No screenshots captured');
      }
      
    } catch (error: any) {
      console.error(`❌ Error analyzing ${url}:`, error.message);
      console.error('   Stack:', error.stack);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n✅ Screenshot test completed');
}

// Run the test if this file is executed directly
testScreenshots().catch(console.error);

export { testScreenshots };