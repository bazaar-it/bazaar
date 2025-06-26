import { chromium } from 'playwright';
import fs from 'fs';

async function testScreenshot() {
  console.log('🚀 Testing Playwright screenshot...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('📍 Navigating to Stripe...');
    await page.goto('https://stripe.com', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    console.log('📸 Taking screenshot...');
    const screenshot = await page.screenshot({ 
      type: 'png',
      fullPage: false 
    });
    
    console.log('✅ Screenshot captured!', screenshot.length, 'bytes');
    
    // Save to file for verification
    fs.writeFileSync('./stripe-test.png', screenshot);
    console.log('📁 Saved to stripe-test.png');
    
    // Test mobile viewport
    console.log('📱 Testing mobile viewport...');
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileScreenshot = await page.screenshot({ 
      type: 'png',
      fullPage: false 
    });
    
    fs.writeFileSync('./stripe-mobile-test.png', mobileScreenshot);
    console.log('📁 Mobile screenshot saved to stripe-mobile-test.png');
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

testScreenshot();