# Sprint 52: Quick Start Guide

## TL;DR - Get Running in 1 Hour

### Step 1: Install (5 minutes)
```bash
cd apps/main
npm install playwright
npx playwright install chromium
```

### Step 2: Test Basic Screenshot (10 minutes)
Create `/src/tools/webAnalysis/test-screenshot.js`:
```javascript
const { chromium } = require('playwright');

async function testScreenshot() {
  console.log('🚀 Testing Playwright screenshot...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://stripe.com', { waitUntil: 'networkidle' });
    
    const screenshot = await page.screenshot({ 
      type: 'png',
      fullPage: false 
    });
    
    console.log('✅ Screenshot captured!', screenshot.length, 'bytes');
    
    // Save to file for verification
    const fs = require('fs');
    fs.writeFileSync('./stripe-test.png', screenshot);
    console.log('📁 Saved to stripe-test.png');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testScreenshot();
```

Run test:
```bash
cd apps/main
node src/tools/webAnalysis/test-screenshot.js
```

### Step 3: Create WebAnalysisAgent (20 minutes)
Create `/src/tools/webAnalysis/WebAnalysisAgent.ts`:
```typescript
import { chromium } from 'playwright';

export interface WebAnalysisResult {
  success: boolean;
  url?: string;
  screenshots?: {
    desktop: Buffer;
    mobile: Buffer;
  };
  pageData?: {
    title: string;
    description?: string;
    headings: string[];
  };
  error?: string;
}

export class WebAnalysisAgent {
  async analyzeWebsite(url: string): Promise<WebAnalysisResult> {
    console.log(`🌐 Analyzing: ${url}`);
    
    const browser = await chromium.launch({ headless: true });
    
    try {
      const page = await browser.newPage();
      
      // Navigate with timeout
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      // Desktop screenshot
      await page.setViewportSize({ width: 1280, height: 800 });
      const desktopScreenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      });
      
      // Mobile screenshot  
      await page.setViewportSize({ width: 390, height: 844 });
      const mobileScreenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      });
      
      // Extract page data
      const pageData = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
        headings: Array.from(document.querySelectorAll('h1, h2, h3'))
          .map(h => h.textContent?.trim())
          .filter(Boolean)
          .slice(0, 10) // Limit to first 10 headings
      }));
      
      return {
        success: true,
        url,
        screenshots: {
          desktop: desktopScreenshot,
          mobile: mobileScreenshot
        },
        pageData
      };
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      return {
        success: false,
        error: error.message,
        url
      };
    } finally {
      await browser.close();
    }
  }
}
```

### Step 4: Test WebAnalysisAgent (10 minutes)
Create `/src/tools/webAnalysis/test-agent.ts`:
```typescript
import { WebAnalysisAgent } from './WebAnalysisAgent';
import fs from 'fs';

async function testAgent() {
  const agent = new WebAnalysisAgent();
  
  console.log('🧪 Testing WebAnalysisAgent...');
  
  const result = await agent.analyzeWebsite('https://figma.com');
  
  if (result.success) {
    console.log('✅ Analysis successful!');
    console.log('📄 Title:', result.pageData?.title);
    console.log('📝 Description:', result.pageData?.description);
    console.log('📋 Headings:', result.pageData?.headings);
    console.log('🖥️ Desktop screenshot:', result.screenshots?.desktop.length, 'bytes');
    console.log('📱 Mobile screenshot:', result.screenshots?.mobile.length, 'bytes');
    
    // Save screenshots for verification
    if (result.screenshots) {
      fs.writeFileSync('./figma-desktop.png', result.screenshots.desktop);
      fs.writeFileSync('./figma-mobile.png', result.screenshots.mobile);
      console.log('💾 Screenshots saved');
    }
  } else {
    console.error('❌ Analysis failed:', result.error);
  }
}

testAgent();
```

Run test:
```bash
cd apps/main
npx tsx src/tools/webAnalysis/test-agent.ts
```

### Step 5: Add URL Detection (10 minutes)
Create `/src/lib/utils/url-detection.ts`:
```typescript
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  
  // Clean up URLs (remove trailing punctuation)
  return matches.map(url => {
    return url.replace(/[.,;!?]+$/, '');
  });
}

export function isValidWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Test function
export function testUrlDetection() {
  const testCases = [
    "Check out https://stripe.com for payments",
    "Our site is https://figma.com.",
    "Visit http://example.com and https://google.com",
    "No URLs here!",
    "Multiple: https://a.com, https://b.com, and https://c.com"
  ];
  
  testCases.forEach(text => {
    const urls = extractUrls(text);
    console.log(`"${text}" → ${JSON.stringify(urls)}`);
  });
}
```

Test URL detection:
```bash
cd apps/main
node -e "
const { testUrlDetection } = require('./src/lib/utils/url-detection.ts');
testUrlDetection();
"
```

### Step 6: Quick Integration Test (5 minutes)
Create `/src/tools/webAnalysis/integration-test.ts`:
```typescript
import { WebAnalysisAgent } from './WebAnalysisAgent';
import { extractUrls, isValidWebUrl } from '~/lib/utils/url-detection';

async function testIntegration() {
  console.log('🔗 Testing full integration...');
  
  // Simulate user message
  const userMessage = "Create a video for our company website: https://notion.so";
  
  // Extract URLs
  const urls = extractUrls(userMessage);
  console.log('📋 Found URLs:', urls);
  
  const validUrls = urls.filter(isValidWebUrl);
  console.log('✅ Valid URLs:', validUrls);
  
  if (validUrls.length > 0) {
    // Analyze first URL
    const agent = new WebAnalysisAgent();
    const result = await agent.analyzeWebsite(validUrls[0]);
    
    if (result.success) {
      console.log('🎉 Integration successful!');
      console.log('🏷️ Site title:', result.pageData?.title);
      console.log('📊 Screenshot sizes:', {
        desktop: result.screenshots?.desktop.length,
        mobile: result.screenshots?.mobile.length
      });
    } else {
      console.error('❌ Analysis failed:', result.error);
    }
  }
}

testIntegration();
```

## Expected Output

After running all tests, you should see:
```
🚀 Testing Playwright screenshot...
✅ Screenshot captured! 89234 bytes
📁 Saved to stripe-test.png

🧪 Testing WebAnalysisAgent...
✅ Analysis successful!
📄 Title: Figma: The Collaborative Interface Design Tool
📝 Description: Figma is the leading collaborative design tool...
📋 Headings: ['Products', 'Solutions', 'Resources', 'Pricing']
🖥️ Desktop screenshot: 156789 bytes
📱 Mobile screenshot: 98456 bytes
💾 Screenshots saved

🔗 Testing full integration...
📋 Found URLs: ['https://notion.so']
✅ Valid URLs: ['https://notion.so']
🎉 Integration successful!
🏷️ Site title: Notion – The all-in-one workspace
📊 Screenshot sizes: { desktop: 145632, mobile: 87234 }
```

## Next Steps

Once these tests pass:

1. **Integrate with R2 storage** - Upload screenshots instead of saving locally
2. **Add to context builder** - Include web analysis in generation context  
3. **Update brain orchestrator** - Pass web context to tools
4. **Test with real generation** - See if videos match brand
5. **Add UI feedback** - Show progress in chat

## Troubleshooting

### Common Issues

**Playwright Installation**
```bash
# If installation fails
npx playwright install --force
```

**Browser Not Found**
```bash
# Reinstall browser
npx playwright install chromium
```

**Permission Errors**
```bash
# On some systems
sudo npx playwright install-deps
```

**Timeout Errors**
- Some sites are slow - increase timeout to 15-20 seconds
- Add `waitUntil: 'domcontentloaded'` for faster loading

**Memory Issues**
- Always close browser in finally block
- Consider using browserless.io for production

### Production Checklist

Before deploying:
- [ ] Test with 10+ different websites
- [ ] Add proper error handling
- [ ] Set up R2 storage integration
- [ ] Add rate limiting
- [ ] Configure proper timeouts
- [ ] Test memory usage over time
- [ ] Add monitoring/logging

## File Structure After Quick Start

```
src/
├── tools/
│   └── webAnalysis/
│       ├── WebAnalysisAgent.ts     ✅
│       ├── test-screenshot.js      ✅
│       ├── test-agent.ts          ✅
│       └── integration-test.ts    ✅
└── lib/
    └── utils/
        └── url-detection.ts       ✅
```

You now have a working web analysis foundation! 🎉