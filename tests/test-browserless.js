import { chromium } from 'playwright-core';

async function testBrowserless() {
  const url = 'https://www.revolut.com';
  const browserlessUrl = 'wss://production-sfo.browserless.io?token=2SuTiuykODr5DXy3b11c16bc36c977d23cef9052f5b8be8cc';
  
  console.log('🚀 Connecting to Browserless...');
  console.log('URL:', browserlessUrl);
  
  let browser;
  try {
    browser = await chromium.connect(browserlessUrl, {
      timeout: 10000
    });
    console.log('✅ Connected to Browserless!');
    
    const page = await browser.newPage();
    console.log('📄 Created new page');
    
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const title = await page.title();
    console.log(`📍 Page title: ${title}`);
    
    // Check if we bypassed Cloudflare
    if (title.includes('Just a moment') || title.includes('Checking')) {
      console.log('❌ Still hit Cloudflare protection');
    } else {
      console.log('✅ Successfully bypassed Cloudflare!');
      
      // Try to extract some brand data
      const brandData = await page.evaluate(() => {
        // Get primary button color
        const button = document.querySelector('button, .btn, [class*="button"]');
        const buttonStyle = button ? window.getComputedStyle(button) : null;
        
        // Get headline
        const headline = document.querySelector('h1');
        
        return {
          title: document.title,
          headline: headline?.textContent?.trim(),
          buttonColor: buttonStyle?.backgroundColor,
          bodyFont: window.getComputedStyle(document.body).fontFamily
        };
      });
      
      console.log('\n🎨 Extracted brand data:');
      console.log(JSON.stringify(brandData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('👋 Browser closed');
    }
  }
}

testBrowserless();