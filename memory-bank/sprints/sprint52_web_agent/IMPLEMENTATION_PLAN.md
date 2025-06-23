# Sprint 52: Web Agent Implementation Plan

## Playwright Licensing ✅
**Playwright is 100% FREE and open source** (Apache 2.0 license)
- No usage limits or fees
- Can be used commercially
- Maintained by Microsoft
- Same license as VS Code, TypeScript

## Simple Implementation Strategy

### Core Principle: "Screenshot → R2 → Context → Generate"
```
User: "Make a video for https://stripe.com"
  ↓
1. Playwright captures screenshots
2. Upload to R2 storage  
3. Add to context with URL
4. Brain uses screenshots in generation
5. Video matches brand perfectly
```

## Phase 1: Core Implementation (Day 1 - 4-6 hours)

### Step 1: Install Dependencies (15 mins)
```bash
cd apps/main
npm install playwright
npx playwright install chromium
```

### Step 2: Create WebAnalysisAgent (1 hour)
```typescript
// /src/tools/webAnalysis/WebAnalysisAgent.ts
import { chromium } from 'playwright';
import { uploadToR2 } from '~/lib/utils/r2-upload';

export class WebAnalysisAgent {
  async analyzeWebsite(url: string, projectId: string) {
    console.log(`🌐 Analyzing website: ${url}`);
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // Navigate to site
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      // Take screenshots
      const desktopScreenshot = await page.screenshot({ 
        fullPage: false,
        type: 'png'
      });
      
      // Mobile view
      await page.setViewportSize({ width: 390, height: 844 });
      const mobileScreenshot = await page.screenshot({ 
        fullPage: false,
        type: 'png'
      });
      
      // Extract basic page data
      const pageData = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).filter(Boolean),
        url: window.location.href
      }));
      
      // Upload to R2
      const timestamp = Date.now();
      const desktopUrl = await uploadToR2(
        desktopScreenshot, 
        `web-analysis/${projectId}/desktop-${timestamp}.png`
      );
      const mobileUrl = await uploadToR2(
        mobileScreenshot, 
        `web-analysis/${projectId}/mobile-${timestamp}.png`
      );
      
      await browser.close();
      
      return {
        success: true,
        url,
        screenshots: {
          desktop: desktopUrl,
          mobile: mobileUrl
        },
        pageData,
        analyzedAt: new Date().toISOString()
      };
      
    } catch (error) {
      await browser.close();
      console.error('Web analysis failed:', error);
      return {
        success: false,
        error: error.message,
        url
      };
    }
  }
}
```

### Step 3: Add URL Detection (30 mins)
```typescript
// /src/lib/utils/url-detection.ts
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return text.match(urlRegex) || [];
}

export function isValidWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### Step 4: Integrate with Context Builder (1 hour)
```typescript
// /src/brain/orchestrator_functions/contextBuilder.ts

import { WebAnalysisAgent } from '~/tools/webAnalysis/WebAnalysisAgent';
import { extractUrls, isValidWebUrl } from '~/lib/utils/url-detection';

export async function buildWebContext(
  chatHistory: ChatMessage[],
  projectId: string
): Promise<WebContext | null> {
  // Get latest user message
  const latestMessage = chatHistory[chatHistory.length - 1];
  if (!latestMessage || latestMessage.role !== 'user') return null;
  
  // Extract URLs from message
  const urls = extractUrls(latestMessage.content);
  const validUrls = urls.filter(isValidWebUrl);
  
  if (validUrls.length === 0) return null;
  
  // Analyze the first URL found
  const webAgent = new WebAnalysisAgent();
  const analysis = await webAgent.analyzeWebsite(validUrls[0], projectId);
  
  if (!analysis.success) {
    console.warn('Web analysis failed:', analysis.error);
    return null;
  }
  
  return {
    originalUrl: analysis.url,
    screenshots: analysis.screenshots,
    pageData: analysis.pageData,
    analyzedAt: analysis.analyzedAt
  };
}

// Update main buildContext function
export async function buildContext(
  chatHistory: ChatMessage[],
  projectId: string,
  currentState: any
): Promise<EnhancedContext> {
  
  const baseContext = await buildBaseContext(chatHistory, projectId, currentState);
  
  // Add web context
  const webContext = await buildWebContext(chatHistory, projectId);
  
  return {
    ...baseContext,
    web: webContext
  };
}
```

### Step 5: Update Brain Orchestrator (30 mins)
```typescript
// /src/brain/orchestratorNEW.ts

async process(input: GenerateSceneInput): Promise<GenerationResult> {
  // Build context including web analysis
  const context = await this.contextBuilder.buildContext(
    input.chatHistory,
    input.projectId,
    input.currentState
  );
  
  // Show web analysis progress if found
  if (context.web) {
    console.log(`🎨 Using brand context from: ${context.web.originalUrl}`);
  }
  
  // Rest unchanged - tools will automatically get web context
  const intent = await this.analyzeIntent(input.prompt, context);
  const tools = this.selectTools(intent);
  
  return await this.executeTools(tools, context);
}
```

### Step 6: Update Tools to Use Screenshots (30 mins)
```typescript
// /src/tools/add/add.ts

export async function addScene(input: AddSceneInput, context: EnhancedContext) {
  // Build image URLs for AI generation
  const imageUrls: string[] = [];
  
  // Add web screenshots if available
  if (context.web?.screenshots) {
    imageUrls.push(context.web.screenshots.desktop);
    console.log(`🖼️ Including website screenshot in generation`);
  }
  
  // Add user-uploaded images
  if (input.imageUrls?.length) {
    imageUrls.push(...input.imageUrls);
  }
  
  // Enhanced prompt with web context
  let enhancedPrompt = input.userPrompt;
  if (context.web) {
    enhancedPrompt = `
Create a video scene that matches the brand style from this website: ${context.web.originalUrl}

User request: ${input.userPrompt}

Website context:
- Title: ${context.web.pageData.title}
- Key headings: ${context.web.pageData.headings?.join(', ')}

Use the website screenshot to understand the brand colors, typography, and visual style. 
Match the aesthetic while creating the requested content.
`;
  }
  
  // Rest of add scene logic unchanged
  const result = await this.codeGenerator.generateScene({
    prompt: enhancedPrompt,
    imageUrls,
    // ... other params
  });
  
  return result;
}
```

## Phase 2: User Experience (Day 2 - 2-3 hours)

### Step 7: Add Chat UI Feedback (1 hour)
```typescript
// /src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx

// Add state for web analysis
const [webAnalysisStatus, setWebAnalysisStatus] = useState<'idle' | 'analyzing' | 'complete' | 'error'>('idle');

// In handleSendMessage function
const handleSendMessage = async (content: string, imageFiles?: File[]) => {
  // Check for URLs
  const urls = extractUrls(content);
  if (urls.length > 0) {
    setWebAnalysisStatus('analyzing');
    // Show progress message
    addAssistantMessage(`🌐 Analyzing website: ${urls[0]} for brand context...`);
  }
  
  // Rest of send logic...
};

// Show analysis status in UI
{webAnalysisStatus === 'analyzing' && (
  <div className="flex items-center gap-2 text-blue-600 text-sm">
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
    Analyzing website for brand context...
  </div>
)}
```

### Step 8: Add Error Handling (30 mins)
```typescript
// In WebAnalysisAgent.ts - add comprehensive error handling

async analyzeWebsite(url: string, projectId: string) {
  // Validate URL first
  if (!isValidWebUrl(url)) {
    return { success: false, error: 'Invalid URL format' };
  }
  
  // Add timeout and retry logic
  let retries = 2;
  while (retries > 0) {
    try {
      // Existing analysis logic
      
    } catch (error) {
      retries--;
      if (retries === 0) {
        return { 
          success: false, 
          error: `Failed to analyze website: ${error.message}` 
        };
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

## Phase 3: Storage & Caching (Day 3 - Optional)

### Step 9: Add Database Cache (1 hour)
```sql
-- Add to existing schema
ALTER TABLE projects ADD COLUMN web_analysis_data JSONB;

-- Or create separate table
CREATE TABLE web_analysis_cache (
  id SERIAL PRIMARY KEY,
  url_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 of URL
  original_url TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  screenshot_urls JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  
  INDEX(url_hash),
  INDEX(expires_at)
);
```

```typescript
// Add caching to WebAnalysisAgent
import crypto from 'crypto';

async analyzeWebsite(url: string, projectId: string) {
  const urlHash = crypto.createHash('sha256').update(url).digest('hex');
  
  // Check cache first
  const cached = await db.query.webAnalysisCache.findFirst({
    where: eq(webAnalysisCache.urlHash, urlHash)
  });
  
  if (cached && new Date(cached.expiresAt) > new Date()) {
    console.log('🚀 Using cached analysis');
    return cached.analysisData;
  }
  
  // Perform analysis
  const result = await this.performAnalysis(url, projectId);
  
  // Cache result
  if (result.success) {
    await db.insert(webAnalysisCache).values({
      urlHash,
      originalUrl: url,
      analysisData: result,
      screenshotUrls: result.screenshots,
    });
  }
  
  return result;
}
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Test with popular sites: stripe.com, figma.com, notion.so
- [ ] Test with broken/slow sites
- [ ] Test mobile vs desktop screenshots
- [ ] Verify R2 uploads work
- [ ] Check generated videos use brand colors
- [ ] Test error handling (invalid URLs, timeouts)

### Integration Points to Verify
- [ ] Screenshots appear in add scene generation
- [ ] Context passes through brain orchestrator
- [ ] Cache prevents duplicate analysis
- [ ] Error states show in chat UI
- [ ] R2 cleanup works (set expiry rules)

## Environment Setup

### Required Environment Variables
```env
# Existing R2 variables (already configured)
CLOUDFLARE_R2_BUCKET_NAME=...
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...

# Optional: Playwright config
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false
```

### Dependencies to Add
```json
{
  "playwright": "^1.45.0"
}
```

## Deployment Considerations

### Vercel/Production
- Playwright works on Vercel with some setup
- Consider timeout limits (10s max on Vercel)
- May need to increase memory allocation

### Alternative: Screenshot Service
If Playwright is problematic in production, quick fallback:
```typescript
// Use screenshot service as backup
const screenshotUrl = `https://api.screenshotone.com/take?url=${encodeURIComponent(url)}&format=png&viewport_width=1280&viewport_height=800&access_key=${process.env.SCREENSHOT_API_KEY}`;
```

## Success Metrics

### Technical
- [ ] Analysis completes in < 10 seconds
- [ ] 95% success rate on common websites
- [ ] Screenshots quality good enough for Vision API
- [ ] No memory leaks or browser crashes

### User Experience  
- [ ] Clear progress indicators
- [ ] Graceful error handling
- [ ] Brand-aligned video output
- [ ] Fast cache hits (< 1 second)

## Quick Start Commands

```bash
# Install and test
cd apps/main
npm install playwright
npx playwright install chromium

# Test basic screenshot
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://stripe.com');
  await page.screenshot({ path: 'test.png' });
  await browser.close();
  console.log('✅ Screenshot saved to test.png');
})();
"
```

## Next Steps

1. **Start with Step 1-3** (Core functionality)
2. **Test with 5 different websites** 
3. **Integrate into one generation flow**
4. **Add UI feedback and error handling**
5. **Polish and optimize based on usage**

The beauty of this approach: each step is independently valuable and can be deployed incrementally!