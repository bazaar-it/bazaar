# Feature Analysis: Web Agent Production Fix

**Feature ID**: 009  
**Priority**: HIGH  
**Complexity**: HIGH (3-4 days)  
**Created**: January 2, 2025

## Problem Statement

The web agent feature (pasting URLs to generate content) works perfectly in development but completely fails in production. This is a critical issue because:
- Feature is advertised to users but doesn't work
- Users report it as "broken" damaging trust
- We're missing a key differentiator vs competitors

## Root Cause Analysis

**The core issue**: Playwright cannot run on Vercel serverless functions.

### Why Playwright Fails on Vercel:
1. **Size Constraints**
   - Vercel serverless limit: 50MB compressed, 250MB uncompressed
   - Playwright + Chromium: ~400MB
   - Cannot fit browser binaries in function

2. **System Dependencies**
   - Playwright needs system libraries (libX11, libXcomposite, etc.)
   - Vercel's AWS Lambda runtime lacks these dependencies
   - Cannot install system packages in serverless

3. **Process Restrictions**
   - Serverless functions can't spawn child processes effectively
   - Browser automation requires process management
   - Lambda environment is too restrictive

4. **Timeout Limits**
   - Vercel functions timeout at 10s (free) or 60s (pro)
   - Playwright startup + navigation often exceeds this
   - No way to maintain browser sessions

## Current Implementation Analysis

```typescript
// Current code (works in dev only)
import { chromium } from 'playwright';

export async function scrapeWebsite(url: string) {
  const browser = await chromium.launch(); // FAILS IN PRODUCTION
  const page = await browser.newPage();
  await page.goto(url);
  const content = await page.content();
  await browser.close();
  return content;
}
```

## Solution Options

### Option A: External Scraping API (Recommended)
**Services**: Browserless.io, ScrapingBee, Apify
- **Pros**: Works immediately, handles JS sites, maintained by experts
- **Cons**: Monthly cost ($50-200), API limits, latency
- **Implementation**: 1 day

### Option B: Hybrid Approach (Best Overall)
**Combine simple fetch with API fallback**
- **Pros**: Fast for most sites, reliable fallback, cost-effective
- **Cons**: More complex implementation
- **Implementation**: 2-3 days

### Option C: Separate Scraping Service
**Deploy on Railway/Render with Playwright**
- **Pros**: Full control, no API limits
- **Cons**: Another service to maintain, costs, complexity
- **Implementation**: 3-4 days

### Option D: Edge Functions
**Use Cloudflare Workers or Vercel Edge**
- **Pros**: Better limits, global distribution
- **Cons**: Still can't run full browsers
- **Implementation**: 2 days

## Recommended Implementation: Hybrid Approach

### Phase 1: Simple Fetch Handler (Day 1)
```typescript
// lib/webScraper/simpleFetch.ts
import * as cheerio from 'cheerio';

export async function fetchSimpleContent(url: string) {
  try {
    // Add timeout and headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BazaarBot/1.0)',
      },
      signal: AbortSignal.timeout(5000),
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract meaningful content
    const content = {
      title: $('title').text() || $('h1').first().text(),
      description: $('meta[name="description"]').attr('content'),
      mainContent: $('main, article, [role="main"]').text().trim(),
      headers: $('h1, h2, h3').map((_, el) => $(el).text()).get(),
      images: $('img').map((_, el) => $(el).attr('src')).get(),
    };
    
    return content;
  } catch (error) {
    return null; // Will trigger fallback
  }
}
```

### Phase 2: External API Integration (Day 2)
```typescript
// lib/webScraper/browserlessApi.ts
export async function fetchDynamicContent(url: string) {
  const response = await fetch('https://api.browserless.io/content', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BROWSERLESS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      waitFor: 2000, // Wait for JS to load
      elements: [
        { selector: 'main' },
        { selector: 'article' },
        { selector: '[role="main"]' },
      ],
    }),
  });
  
  return await response.json();
}
```

### Phase 3: Intelligent Router (Day 3)
```typescript
// lib/webScraper/index.ts
export async function scrapeWebsite(url: string) {
  // Check cache first
  const cached = await getCachedContent(url);
  if (cached && !isExpired(cached)) {
    return cached;
  }
  
  // Try simple fetch for most sites
  const simpleContent = await fetchSimpleContent(url);
  
  // Check if we got meaningful content
  if (simpleContent && simpleContent.mainContent.length > 100) {
    await cacheContent(url, simpleContent);
    return simpleContent;
  }
  
  // Fallback to API for JS-heavy sites
  const dynamicContent = await fetchDynamicContent(url);
  await cacheContent(url, dynamicContent);
  return dynamicContent;
}
```

### Phase 4: User Experience (Day 3)
```typescript
// Enhanced UI feedback
const WebFetchUI = () => {
  const [status, setStatus] = useState<'idle' | 'fetching' | 'processing' | 'done'>();
  
  return (
    <div>
      {status === 'fetching' && (
        <div className="animate-pulse">
          🌐 Fetching website content...
        </div>
      )}
      {status === 'processing' && (
        <div className="animate-pulse">
          🤖 Analyzing content for video generation...
        </div>
      )}
    </div>
  );
};
```

## Cost Analysis

### External API Pricing:
- **Browserless.io**: $50/mo for 2,000 requests
- **ScrapingBee**: $49/mo for 1,000 requests  
- **Apify**: $49/mo for 2,000 requests

### Expected Usage:
- 80% simple fetch (free)
- 20% API calls (paid)
- Estimated: 500 API calls/month = $25/month

## Implementation Checklist

- [ ] Remove Playwright dependencies from production
- [ ] Implement simple fetch with Cheerio
- [ ] Set up Browserless.io account and API
- [ ] Create intelligent routing logic
- [ ] Add R2 caching layer
- [ ] Implement retry logic
- [ ] Add comprehensive error handling
- [ ] Create user feedback UI
- [ ] Add usage analytics
- [ ] Document API limits for users

## Success Metrics

1. **Functionality**: 100% of URL pastes work in production
2. **Performance**: 80% complete in <2 seconds (simple fetch)
3. **Reliability**: <1% failure rate
4. **Cost**: <$50/month for API usage
5. **User Satisfaction**: Support tickets drop to zero

## Future Enhancements

1. **Smart Detection**: ML model to predict if site needs full browser
2. **Selective Scraping**: Let users specify what content to extract
3. **Batch Processing**: Handle multiple URLs efficiently
4. **Preview Mode**: Show extracted content before generation
5. **Custom Scrapers**: Per-domain optimized extractors

## Migration Path

1. **Week 1**: Deploy hybrid solution alongside Playwright
2. **Week 2**: A/B test and monitor performance
3. **Week 3**: Remove Playwright, go 100% hybrid
4. **Week 4**: Optimize based on usage patterns

## Risk Mitigation

- **API Downtime**: Implement multiple provider fallbacks
- **Cost Overrun**: Set hard limits and user quotas
- **Content Quality**: Validate extraction quality metrics
- **Legal Issues**: Respect robots.txt and rate limits