import { WebAnalysisAgent } from './WebAnalysisAgent';
import { extractUrls, isValidWebUrl, extractFirstValidUrl } from '~/lib/utils/url-detection';

/**
 * Simulate the full integration flow:
 * User message → URL detection → Web analysis → Brand context
 */
async function testIntegration() {
  console.log('🔗 Testing Full Integration Flow\n');
  
  // Simulate different user messages
  const userMessages = [
    "Create a video for our company website: https://notion.so",
    "I want to make a video that matches our brand at https://stripe.com/pricing",
    "Generate a video for https://figma.com with our brand colors",
    "Make a promotional video (no URL provided)",
    "Check out multiple sites: https://vercel.com and https://github.com"
  ];
  
  const agent = new WebAnalysisAgent();
  
  for (let i = 0; i < userMessages.length; i++) {
    const message = userMessages[i];
    console.log(`\n--- Test Case ${i + 1} ---`);
    console.log(`💬 User Message: "${message}"`);
    
    // Step 1: Extract URLs
    const urls = extractUrls(message);
    console.log(`📋 Found URLs: ${JSON.stringify(urls)}`);
    
    const validUrls = urls.filter(isValidWebUrl);
    console.log(`✅ Valid URLs: ${JSON.stringify(validUrls)}`);
    
    if (validUrls.length === 0) {
      console.log('❌ No valid URLs found - skipping web analysis');
      continue;
    }
    
    // Step 2: Get first valid URL
    const targetUrl = extractFirstValidUrl(message);
    console.log(`🎯 Target URL: ${targetUrl}`);
    
    if (!targetUrl) {
      console.log('❌ No target URL - skipping analysis');
      continue;
    }
    
    // Step 3: Validate URL before analysis
    const validation = await agent.validateUrl(targetUrl);
    if (!validation.valid) {
      console.log(`❌ URL validation failed: ${validation.error}`);
      continue;
    }
    
    // Step 4: Test connection
    console.log('🔍 Testing connection...');
    const connectionTest = await agent.testConnection(targetUrl);
    if (!connectionTest.reachable) {
      console.log(`❌ Connection failed: ${connectionTest.error}`);
      continue;
    }
    console.log('✅ Connection successful');
    
    // Step 5: Perform full analysis
    console.log('🎨 Performing brand analysis...');
    const startTime = Date.now();
    const analysis = await agent.analyzeWebsite(targetUrl);
    const duration = Date.now() - startTime;
    
    if (analysis.success) {
      console.log(`✅ Analysis completed in ${duration}ms`);
      console.log(`📄 Site: ${analysis.pageData?.title}`);
      console.log(`📝 Description: ${analysis.pageData?.description?.substring(0, 80)}...`);
      console.log(`📋 Key Headings: ${analysis.pageData?.headings?.slice(0, 3).join(', ')}`);
      console.log(`📊 Screenshots: Desktop (${analysis.screenshots?.desktop.length} bytes), Mobile (${analysis.screenshots?.mobile.length} bytes)`);
      
      // Step 6: Simulate brand context creation
      const brandContext = createBrandContext(analysis, message);
      console.log('🎭 Brand Context Created:');
      console.log(`   - Original URL: ${brandContext.originalUrl}`);
      console.log(`   - Has Screenshots: ${brandContext.hasScreenshots}`);
      console.log(`   - Page Title: ${brandContext.pageTitle}`);
      console.log(`   - User Intent: ${brandContext.userIntent}`);
      
    } else {
      console.log(`❌ Analysis failed: ${analysis.error}`);
    }
  }
  
  // Performance summary
  console.log('\n🚀 Performance Test');
  const perfTest = await performanceTest();
  console.log(`   Average analysis time: ${perfTest.averageTime}ms`);
  console.log(`   Success rate: ${perfTest.successRate}%`);
}

/**
 * Simulate brand context creation (what would be passed to Brain/Tools)
 */
function createBrandContext(analysis: any, userMessage: string) {
  return {
    originalUrl: analysis.url,
    hasScreenshots: !!(analysis.screenshots?.desktop && analysis.screenshots?.mobile),
    pageTitle: analysis.pageData?.title,
    pageDescription: analysis.pageData?.description,
    keyHeadings: analysis.pageData?.headings?.slice(0, 5),
    screenshotSizes: {
      desktop: analysis.screenshots?.desktop.length || 0,
      mobile: analysis.screenshots?.mobile.length || 0
    },
    analyzedAt: analysis.analyzedAt,
    userIntent: extractIntent(userMessage),
    // In real implementation, screenshots would be uploaded to R2 here
    mockScreenshotUrls: {
      desktop: `https://r2.example.com/screenshots/${Date.now()}-desktop.png`,
      mobile: `https://r2.example.com/screenshots/${Date.now()}-mobile.png`
    }
  };
}

/**
 * Extract user intent from message
 */
function extractIntent(message: string): string {
  if (message.includes('brand colors') || message.includes('brand')) {
    return 'brand_matching';
  }
  if (message.includes('promotional') || message.includes('marketing')) {
    return 'promotional';
  }
  if (message.includes('matches')) {
    return 'style_matching';
  }
  return 'general_video_creation';
}

/**
 * Quick performance test
 */
async function performanceTest() {
  const agent = new WebAnalysisAgent();
  const testUrls = [
    'https://example.com',
    'https://google.com',
    'https://github.com'
  ];
  
  const results = [];
  
  for (const url of testUrls) {
    try {
      const startTime = Date.now();
      const result = await agent.analyzeWebsite(url);
      const duration = Date.now() - startTime;
      
      results.push({
        url,
        success: result.success,
        duration,
        error: result.error
      });
    } catch (error) {
      results.push({
        url,
        success: false,
        duration: 0,
        error: error.message
      });
    }
  }
  
  const successfulResults = results.filter(r => r.success);
  const averageTime = successfulResults.length > 0 
    ? Math.round(successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length)
    : 0;
  const successRate = Math.round((successfulResults.length / results.length) * 100);
  
  return { averageTime, successRate, results };
}

// Run the test
testIntegration().catch(console.error);