# Fixing Playwright/Puppeteer in Production

## The Problem
Playwright (and Puppeteer) require browser binaries that aren't available in most production environments like Vercel, AWS Lambda, or containerized deployments.

## Solutions

### Option 1: Use a Screenshot API Service (Recommended for Vercel)
The easiest solution is to use a third-party screenshot service in production:

1. **Choose a service:**
   - [Screenly](https://screenly.com) - Simple, affordable
   - [ScreenshotAPI](https://screenshotapi.net) - Good free tier
   - [Urlbox](https://urlbox.io) - More features
   - [Browserless](https://browserless.io) - Full browser automation

2. **Add environment variables:**
```env
# Production
SCREENSHOT_API_KEY=your_api_key_here
SCREENSHOT_API_URL=https://shot.screenshotapi.net/screenshot
```

3. **Update your code to use the API in production:**
```typescript
if (process.env.NODE_ENV === 'production') {
  // Use screenshot API
} else {
  // Use local Playwright
}
```

### Option 2: Use Browserless (Remote Browser)
Browserless provides Chrome as a service:

1. **Sign up at [browserless.io](https://browserless.io)**

2. **Add environment variable:**
```env
BROWSERLESS_URL=wss://chrome.browserless.io?token=YOUR_API_TOKEN
```

3. **Update WebAnalysisAgent to connect to remote browser:**
```typescript
import { chromium } from 'playwright-core';

const browser = await chromium.connect(process.env.BROWSERLESS_URL);
```

### Option 3: Deploy with Docker (Self-hosted)
If you're self-hosting, use a Docker image with Chrome pre-installed:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.53.1-focal

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

CMD ["npm", "start"]
```

### Option 4: Use Vercel Functions with Layers (Advanced)
For Vercel, you can use a custom runtime with Chrome:

1. **Install @sparticuz/chromium:**
```bash
npm install @sparticuz/chromium playwright-core
```

2. **Update your API route:**
```typescript
import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';

export async function POST(req: Request) {
  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  // ... rest of your code
}
```

3. **Add to vercel.json:**
```json
{
  "functions": {
    "app/api/web-analysis/route.ts": {
      "maxDuration": 30
    }
  }
}
```

## Quick Fix for Your Current Setup

Since you're already using Playwright, the quickest fix is:

1. **For Vercel deployment:**
   - Remove playwright from dependencies
   - Use a screenshot API service instead
   - Or use the Browserless service

2. **Update package.json:**
```json
{
  "scripts": {
    "postinstall": "npm rebuild lightningcss @tailwindcss/oxide || true"
  }
}
```

3. **Add conditional logic in WebAnalysisAgent:**
```typescript
const isProduction = process.env.NODE_ENV === 'production';
const hasScreenshotAPI = !!process.env.SCREENSHOT_API_KEY;

if (isProduction && !hasScreenshotAPI) {
  throw new Error('Screenshot service not configured for production');
}
```

## Environment Variables to Add

Add these to your Vercel/production environment:

```env
# Option 1: Screenshot API
SCREENSHOT_API_KEY=your_key_here
SCREENSHOT_API_URL=https://shot.screenshotapi.net/screenshot

# Option 2: Browserless
BROWSERLESS_URL=wss://chrome.browserless.io?token=YOUR_TOKEN

# Option 3: Self-hosted Chrome
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium
```

## Testing Locally

To test the production setup locally:

```bash
# Simulate production environment
NODE_ENV=production npm run dev

# Or with API keys
SCREENSHOT_API_KEY=test_key NODE_ENV=production npm run dev
```

## Recommended Approach

For your use case (web analysis with screenshots), I recommend:

1. **Use ScreenshotAPI.net** for production (free tier available)
2. **Keep Playwright** for local development
3. **Add environment detection** to switch between them

This avoids the complexity of managing browser binaries in production while maintaining a good developer experience locally.