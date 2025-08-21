import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin to bypass Cloudflare
puppeteer.use(StealthPlugin());

async function testPuppeteerStealth() {
  const url = 'https://www.revolut.com';
  
  console.log('🚀 Launching Puppeteer with Stealth...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    console.log('✅ Browser launched!');
    
    const page = await browser.newPage();
    console.log('📄 Created new page');
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { 
      waitUntil: 'networkidle0',
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
        
        // Get all unique colors
        const colorSet = new Set();
        const elements = document.querySelectorAll('*');
        for (let i = 0; i < Math.min(elements.length, 100); i++) {
          const el = elements[i];
          const style = window.getComputedStyle(el);
          if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            colorSet.add(style.backgroundColor);
          }
          if (style.color && style.color !== 'rgba(0, 0, 0, 0)') {
            colorSet.add(style.color);
          }
        }
        
        return {
          title: document.title,
          headline: headline?.textContent?.trim(),
          buttonColor: buttonStyle?.backgroundColor,
          bodyFont: window.getComputedStyle(document.body).fontFamily,
          colors: Array.from(colorSet).slice(0, 10)
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

testPuppeteerStealth();