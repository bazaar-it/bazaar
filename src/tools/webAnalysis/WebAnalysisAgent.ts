import { chromium } from 'playwright';
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
    
    let browser;
    try {
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // For production deployment
      });
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
          .slice(0, 10), // Limit to first 10 headings
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
          // Continue without R2 URLs - screenshots still available as buffers
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
      console.error('❌ Analysis failed:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        url
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  /**
   * Validate if a URL is accessible and safe to analyze
   */
  async validateUrl(url: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const parsed = new URL(url);
      
      // Only allow http/https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
      }
      
      // Block localhost and private IPs for security
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === 'localhost' || 
          hostname.startsWith('127.') || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.includes('internal')) {
        return { valid: false, error: 'Local and private URLs are not allowed' };
      }
      
      return { valid: true };
      
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
  
  /**
   * Test if the agent can analyze a given URL without actually doing the analysis
   */
  async testConnection(url: string): Promise<{ reachable: boolean; error?: string }> {
    const validation = await this.validateUrl(url);
    if (!validation.valid) {
      return { reachable: false, error: validation.error };
    }
    
    const browser = await chromium.launch({ headless: true });
    
    try {
      const page = await browser.newPage();
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 5000 
      });
      
      const title = await page.title();
      return { 
        reachable: true, 
        error: title ? undefined : 'Page loaded but no title found' 
      };
      
    } catch (error) {
      return { 
        reachable: false, 
        error: `Cannot reach website: ${error instanceof Error ? error.message : String(error)}` 
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}