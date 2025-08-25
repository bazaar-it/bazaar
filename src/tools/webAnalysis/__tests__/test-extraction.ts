/**
 * Direct test of WebAnalysisAgentV4 extraction
 */

import playwrightCore from 'playwright-core';

async function testExtraction() {
  console.log('Testing page.evaluate extraction...\n');
  
  let browser: any = null;
  let context: any = null;
  let page: any = null;
  
  try {
    // Connect to browser
    browser = await playwrightCore.chromium.connect(process.env.BROWSERLESS_URL!);
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();
    
    // Navigate to a test page
    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    
    // Test simple extraction
    const result = await page.evaluate(() => {
      // Simple test
      const title = document.title;
      const h1 = document.querySelector('h1')?.textContent || '';
      
      return {
        title,
        h1,
        test: 'extraction works'
      };
    });
    
    console.log('✅ Basic extraction works:', result);
    
    // Test with our actual extraction logic (simplified)
    const advancedResult = await page.evaluate(() => {
      const cleanText = (text: string | null | undefined): string => {
        return text?.trim().replace(/\s+/g, ' ') || '';
      };
      
      const extractFeatures = () => {
        const features: any[] = [];
        const containers = document.querySelectorAll('[class*="feature"], p');
        
        containers.forEach((container) => {
          const text = cleanText(container.textContent);
          if (text && text.length > 10 && text.length < 200) {
            features.push({
              title: text.substring(0, 50),
              description: text
            });
          }
        });
        
        return features.slice(0, 5);
      };
      
      return {
        title: document.title,
        features: extractFeatures()
      };
    });
    
    console.log('✅ Advanced extraction works:', JSON.stringify(advancedResult, null, 2));
    
  } catch (error: any) {
    console.error('❌ Extraction error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Run test
testExtraction().catch(console.error);