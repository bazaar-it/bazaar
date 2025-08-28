import { chromium } from 'playwright-core';

async function testBrowserlessV2() {
  // Your API key from the Browserless dashboard
  const apiKey = '2SuTiuykODr5DXy3b11c16bc36c977d23cef9052f5b8be8cc';
  const url = 'https://www.revolut.com';
  
  // Browserless V2 endpoint for Playwright
  const browserlessUrl = `wss://production-sfo.browserless.io/playwright/chromium?token=${apiKey}`;
  
  console.log('🚀 Connecting to Browserless V2...');
  
  let browser;
  try {
    // Connect to Browserless cloud browser
    browser = await chromium.connect(browserlessUrl);
    console.log('✅ Connected to Browserless!');
    
    // Create a new page with stealth settings
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    
    const page = await context.newPage();
    console.log('📄 Created new page with stealth context');
    
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    const title = await page.title();
    console.log(`📍 Page title: ${title}`);
    
    // Check if we bypassed Cloudflare
    if (title.includes('Just a moment') || title.includes('Checking')) {
      console.log('⚠️ Detected Cloudflare protection');
      
      // Wait for Cloudflare to pass
      console.log('⏳ Waiting for Cloudflare challenge...');
      await page.waitForTimeout(5000);
      
      // Check title again
      const newTitle = await page.title();
      console.log(`📍 New page title: ${newTitle}`);
      
      if (!newTitle.includes('Just a moment')) {
        console.log('✅ Cloudflare challenge passed!');
      }
    } else {
      console.log('✅ Successfully loaded page!');
    }
    
    // Extract brand data
    const brandData = await page.evaluate(() => {
      // Helper to get RGB values
      const getRGB = (color) => {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
        }
        return null;
      };
      
      // Get primary colors from buttons
      const buttons = Array.from(document.querySelectorAll('button, .btn, [role="button"], a[class*="button"]'));
      const buttonColors = buttons.map(btn => {
        const style = window.getComputedStyle(btn);
        return {
          background: style.backgroundColor,
          color: style.color,
          borderRadius: style.borderRadius
        };
      }).filter(c => c.background && c.background !== 'rgba(0, 0, 0, 0)');
      
      // Get headline and hero content
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      
      // Get font families
      const fonts = new Set();
      ['h1', 'h2', 'h3', 'p', 'button'].forEach(tag => {
        const el = document.querySelector(tag);
        if (el) {
          const font = window.getComputedStyle(el).fontFamily;
          fonts.add(font);
        }
      });
      
      // Get all unique colors from the page
      const colorMap = new Map();
      const elements = document.querySelectorAll('*');
      for (let i = 0; i < Math.min(elements.length, 200); i++) {
        const el = elements[i];
        const style = window.getComputedStyle(el);
        
        ['backgroundColor', 'color', 'borderColor'].forEach(prop => {
          const value = style[prop];
          if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
            colorMap.set(value, (colorMap.get(value) || 0) + 1);
          }
        });
      }
      
      // Sort colors by frequency
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color)
        .slice(0, 15);
      
      // Extract features/benefits
      const features = [];
      document.querySelectorAll('[class*="feature"], [class*="benefit"], [class*="card"]').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 10 && text.length < 200) {
          features.push(text);
        }
      });
      
      return {
        title: document.title,
        url: window.location.href,
        headline: h1?.textContent?.trim(),
        subheadline: h2?.textContent?.trim(),
        buttons: buttonColors.slice(0, 3),
        fonts: Array.from(fonts),
        topColors: sortedColors,
        features: features.slice(0, 5),
        hasVideo: !!document.querySelector('video'),
        hasAnimation: !!document.querySelector('[class*="animate"], [class*="motion"]')
      };
    });
    
    console.log('\\n🎨 Extracted Brand Data:');
    console.log('================================');
    console.log(JSON.stringify(brandData, null, 2));
    
    // Take a screenshot for verification
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
    console.log(`\\n📸 Screenshot captured (${(screenshot.length / 1024).toFixed(2)} KB)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    if (browser) {
      await browser.close();
      console.log('\\n👋 Browser closed');
    }
  }
}

testBrowserlessV2();