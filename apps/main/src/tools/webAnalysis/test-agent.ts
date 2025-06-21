import { WebAnalysisAgent } from './WebAnalysisAgent';
import fs from 'fs';

async function testAgent() {
  const agent = new WebAnalysisAgent();
  
  console.log('🧪 Testing WebAnalysisAgent...');
  
  // Test with Figma
  console.log('\n--- Testing with Figma ---');
  const result = await agent.analyzeWebsite('https://figma.com');
  
  if (result.success) {
    console.log('✅ Analysis successful!');
    console.log('📄 Title:', result.pageData?.title);
    console.log('📝 Description:', result.pageData?.description?.substring(0, 100) + '...');
    console.log('📋 Headings:', result.pageData?.headings?.slice(0, 5));
    console.log('🖥️ Desktop screenshot:', result.screenshots?.desktop.length, 'bytes');
    console.log('📱 Mobile screenshot:', result.screenshots?.mobile.length, 'bytes');
    console.log('⏰ Analyzed at:', result.analyzedAt);
    
    // Save screenshots for verification
    if (result.screenshots) {
      fs.writeFileSync('./figma-desktop.png', result.screenshots.desktop);
      fs.writeFileSync('./figma-mobile.png', result.screenshots.mobile);
      console.log('💾 Screenshots saved');
    }
  } else {
    console.error('❌ Analysis failed:', result.error);
  }
  
  // Test URL validation
  console.log('\n--- Testing URL Validation ---');
  const validTests = [
    'https://stripe.com',
    'http://example.com',
    'https://localhost:3000',
    'ftp://example.com',
    'invalid-url'
  ];
  
  for (const testUrl of validTests) {
    const validation = await agent.validateUrl(testUrl);
    console.log(`${validation.valid ? '✅' : '❌'} ${testUrl}: ${validation.error || 'Valid'}`);
  }
  
  // Test connection
  console.log('\n--- Testing Connection ---');
  const connectionTest = await agent.testConnection('https://notion.so');
  console.log(`${connectionTest.reachable ? '✅' : '❌'} Notion.so: ${connectionTest.error || 'Reachable'}`);
}

testAgent().catch(console.error);