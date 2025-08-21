// Production-ready version using Playwright with Vercel
import { chromium } from 'playwright-core';
import { uploadWebAnalysisScreenshots } from '~/lib/utils/r2-upload';

export interface WebAnalysisResult {
  success: boolean;
  url?: string;
  screenshots?: {
    desktop: Buffer;
    mobile: Buffer;
  };
  screenshotUrls?: {
    desktop: string;
    mobile: string;
  };
  pageData?: {
    title: string;
    description?: string;
    headings: string[];
    url: string;
  };
  error?: string;
  analyzedAt?: string;
}

export class WebAnalysisAgent {
  async analyzeWebsite(url: string, projectId?: string, userId?: string): Promise<WebAnalysisResult> {
    console.log(`🌐 Analyzing: ${url}`);
    
    // For production, we have several options:
    
    // Option 1: Use a screenshot API service (recommended)
    if (process.env.NODE_ENV === 'production') {
      return this.analyzeWithScreenshotAPI(url, projectId, userId);
    }
    
    // Option 2: Use playwright-core with remote browser
    let browser;
    try {
      // For Vercel, you need to use a remote browser service like Browserless
      const browserWSEndpoint = process.env.BROWSERLESS_URL || process.env.BROWSER_WS_ENDPOINT;
      
      if (browserWSEndpoint) {
        // Connect to remote browser
        browser = await chromium.connect(browserWSEndpoint);
      } else {
        // Fallback to local browser (development only)
        browser = await chromium.launch({ 
          headless: true,
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, // Must be set in production
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
          ]
        });
      }
      
      const page = await browser.newPage();
      
      // Navigate with timeout
      console.log('📍 Navigating to website...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Desktop screenshot
      console.log('🖥️ Taking desktop screenshot...');
      await page.setViewportSize({ width: 1920, height: 1080 });
      const desktopScreenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      });
      
      // Mobile screenshot  
      console.log('📱 Taking mobile screenshot...');
      await page.setViewportSize({ width: 390, height: 844 });
      const mobileScreenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false 
      });
      
      // Extract page data
      console.log('📄 Extracting page data...');
      const pageData = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                    document.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined,
        headings: Array.from(document.querySelectorAll('h1, h2, h3'))
          .map(h => h.textContent?.trim())
          .filter((text): text is string => Boolean(text))
          .slice(0, 10),
        url: window.location.href
      }));
      
      console.log(`✅ Analysis complete for ${pageData.title}`);
      
      // Upload screenshots to R2 if projectId provided
      let screenshotUrls: { desktop: string; mobile: string } | undefined;
      if (projectId) {
        try {
          console.log('📤 Uploading screenshots to R2...');
          screenshotUrls = await uploadWebAnalysisScreenshots(
            { desktop: desktopScreenshot, mobile: mobileScreenshot },
            projectId,
            userId
          );
          console.log('✅ Screenshots uploaded to R2');
        } catch (uploadError) {
          console.error('❌ Failed to upload screenshots:', uploadError);
        }
      }
      
      return {
        success: true,
        url,
        screenshots: {
          desktop: desktopScreenshot,
          mobile: mobileScreenshot
        },
        screenshotUrls,
        pageData,
        analyzedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Web analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  // Alternative: Use a screenshot API service
  private async analyzeWithScreenshotAPI(url: string, projectId?: string, userId?: string): Promise<WebAnalysisResult> {
    try {
      // Option 1: Use a service like Screenly, ScreenshotAPI, or Urlbox
      const SCREENSHOT_API_KEY = process.env.SCREENSHOT_API_KEY;
      const SCREENSHOT_API_URL = process.env.SCREENSHOT_API_URL || 'https://shot.screenshotapi.net/screenshot';
      
      if (!SCREENSHOT_API_KEY) {
        throw new Error('Screenshot API not configured for production');
      }
      
      // Take desktop screenshot
      const desktopResponse = await fetch(`${SCREENSHOT_API_URL}?token=${SCREENSHOT_API_KEY}&url=${encodeURIComponent(url)}&width=1920&height=1080&output=image&file_type=png&wait_for_event=load`);
      const desktopScreenshot = Buffer.from(await desktopResponse.arrayBuffer());
      
      // Take mobile screenshot
      const mobileResponse = await fetch(`${SCREENSHOT_API_URL}?token=${SCREENSHOT_API_KEY}&url=${encodeURIComponent(url)}&width=390&height=844&output=image&file_type=png&wait_for_event=load`);
      const mobileScreenshot = Buffer.from(await mobileResponse.arrayBuffer());
      
      // Fetch page metadata using a simple fetch
      const pageResponse = await fetch(url);
      const html = await pageResponse.text();
      
      // Simple regex extraction (not as reliable as browser evaluation)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      
      const pageData = {
        title: titleMatch ? titleMatch[1] : 'Untitled',
        description: descMatch ? descMatch[1] : undefined,
        headings: [], // Would need HTML parser for this
        url
      };
      
      // Upload screenshots to R2
      let screenshotUrls: { desktop: string; mobile: string } | undefined;
      if (projectId) {
        try {
          screenshotUrls = await uploadWebAnalysisScreenshots(
            { desktop: desktopScreenshot, mobile: mobileScreenshot },
            projectId,
            userId
          );
        } catch (uploadError) {
          console.error('Failed to upload screenshots:', uploadError);
        }
      }
      
      return {
        success: true,
        url,
        screenshots: {
          desktop: desktopScreenshot,
          mobile: mobileScreenshot
        },
        screenshotUrls,
        pageData,
        analyzedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Screenshot API failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot API error'
      };
    }
  }
}