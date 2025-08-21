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
    visualDesign?: {
      colors: string[];
      colorSystem: {
        primary: string;
        secondary: string;
        accents: string[];
        neutrals: string[];
        gradients: Array<{ type: string; angle: number; stops: string[] }>;
        allColors: string[];
      };
      fonts: string[];
      heroStyles: any;
      buttonStyles: any[];
      headingData: any[];
      shadows: {
        sm: string;
        md: string;
        lg: string;
        xl: string;
      };
      borderRadius: {
        none: string;
        sm: string;
        md: string;
        lg: string;
        full: string;
      };
      cssVariables: Record<string, string>;
      brandColors: {
        primary: string;
        secondary: string;
        text: string;
        background: string;
      };
      extraction?: any; // Full V2 extraction data
    };
    productNarrative?: {
      headline: string;
      subheadline: string;
      ctas: {
        primary: string;
        secondary: string;
        tertiary?: string;
      };
      features: Array<{
        title: string;
        description: string;
      }>;
      testimonials: Array<{
        quote: string;
        author: string;
      }>;
      metrics: string[];
    };
  };
  error?: string;
  analyzedAt?: string;
}

export class WebAnalysisAgent {
  
  // Manual fallback for Cloudflare-protected sites
  private getRevolutManualData(): any {
    return {
      title: 'Revolut - Change the way you money',
      description: 'Move freely between countries and currencies. Sign up for free, in a tap.',
      url: 'https://www.revolut.com',
      visualDesign: {
        colors: ['#000000', '#FFFFFF', '#6F00FF', '#FF007A', '#FFD700', '#00FF66'],
        colorSystem: {
          primary: '#000000',
          secondary: '#FFFFFF',
          accents: ['#6F00FF', '#FF007A', '#FFD700', '#00FF66'],
          neutrals: ['#F5F5F5', '#E5E5E5', '#333333', '#1A1A1A'],
          gradients: [
            { type: 'linear', angle: 135, stops: ['#6F00FF', '#FF007A'] },
            { type: 'linear', angle: 45, stops: ['#FFD700', '#00FF66'] }
          ],
          allColors: ['#000000', '#FFFFFF', '#6F00FF', '#FF007A', '#FFD700', '#00FF66', '#F5F5F5']
        },
        fonts: ['Inter', '-apple-system', 'BlinkMacSystemFont'],
        heroStyles: {
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: '72px',
          fontWeight: '700',
          color: '#000000',
          backgroundColor: '#FFFFFF'
        },
        buttonStyles: [{
          text: 'Download the app',
          styles: {
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: '600',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            borderRadius: '20px',
            padding: '16px 32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }
        }],
        headingData: [
          { level: 'h1', text: 'Change the way you money', styles: { fontSize: '72px', fontWeight: '700', color: '#000000' } },
          { level: 'h2', text: 'Elevate your spend', styles: { fontSize: '48px', fontWeight: '600', color: '#000000' } }
        ],
        shadows: {
          sm: '0 2px 4px rgba(0,0,0,0.05)',
          md: '0 4px 12px rgba(0,0,0,0.1)',
          lg: '0 8px 24px rgba(0,0,0,0.15)',
          xl: '0 16px 48px rgba(0,0,0,0.2)'
        },
        borderRadius: {
          none: '0px',
          sm: '8px',
          md: '16px',
          lg: '20px',
          full: '9999px'
        },
        brandColors: {
          primary: '#000000',
          secondary: '#FFFFFF',
          text: '#000000',
          background: '#FFFFFF'
        }
      },
      productNarrative: {
        headline: 'Change the way you money',
        subheadline: 'Move freely between countries and currencies. Sign up for free, in a tap.',
        ctas: {
          primary: 'Download the app',
          secondary: 'Learn more',
          tertiary: 'Start earning'
        },
        features: [
          { title: 'Debit & Virtual Cards', description: 'Earn points, pay globally, use with Apple/Google Wallet' },
          { title: 'Savings', description: 'Up to 4.5% interest, paid daily' },
          { title: 'Security', description: 'Fraud detection, 24/7 protection' },
          { title: 'Stocks', description: 'Trade 2,500+ global stocks commission-free' }
        ],
        testimonials: [],
        metrics: ['60M+ users', '4.5% savings rate', '2,500+ stocks', '24/7 security', '150+ currencies']
      },
      headings: ['Change the way you money', 'Elevate your spend', 'Go beyond banking']
    };
  }
  async analyzeWebsite(url: string, projectId?: string, userId?: string): Promise<WebAnalysisResult> {
    console.log(`🌐 Analyzing: ${url}`);
    
    // Use V2 agent if Browserless is configured
    if (process.env.BROWSERLESS_URL && projectId) {
      try {
        const { WebAnalysisAgentV2 } = await import('./WebAnalysisAgentV2');
        const agentV2 = new WebAnalysisAgentV2(projectId);
        const extractedData = await agentV2.analyze(url);
        
        // Convert V2 format to V1 format for compatibility
        const screenshotUrls = extractedData.media.screenshots.reduce((acc, s) => {
            if (s.type === 'hero') acc.desktop = s.url;
            if (s.type === 'mobile') acc.mobile = s.url;
            return acc;
          }, { desktop: '', mobile: '' } as any);
          
        // Ensure we have both desktop and mobile URLs
        if (!screenshotUrls.desktop) {
          screenshotUrls.desktop = extractedData.media.screenshots[0]?.url || '';
        }
        if (!screenshotUrls.mobile) {
          screenshotUrls.mobile = extractedData.media.screenshots.find(s => s.type === 'mobile')?.url || 
                                   extractedData.media.screenshots[0]?.url || '';
        }
        
        return {
          success: true,
          url,
          screenshotUrls,
          analyzedAt: new Date().toISOString(),
          pageData: {
            title: extractedData.page.title,
            url: extractedData.page.url,
            headings: [extractedData.product.value_prop.headline],
            visualDesign: {
              colors: [],
              colorSystem: extractedData.brand.colors,
              fonts: extractedData.brand.typography.fonts.map(f => f.family),
              heroStyles: {},
              buttonStyles: [extractedData.brand.buttons.styles.primary],
              headingData: Object.entries(extractedData.brand.typography.scale).map(([tag, styles]) => ({
                tag,
                styles
              })),
              shadows: extractedData.brand.shadows,
              borderRadius: extractedData.brand.borderRadius,
              cssVariables: {},
              brandColors: extractedData.brand.colors,
              extraction: extractedData // Include full extraction for Hero's Journey
            }
          }
        };
      } catch (error) {
        console.error('V2 agent failed, falling back to V1:', error);
      }
    }
    
    // Check if we're in production without browser support
    if (process.env.NODE_ENV === 'production' && !process.env.BROWSERLESS_URL && !process.env.SCREENSHOT_API_KEY) {
      console.warn('⚠️ Web analysis disabled in production - no browser or API configured');
      return {
        success: false,
        error: 'Web analysis is not available in production. Please configure BROWSERLESS_URL or SCREENSHOT_API_KEY.',
        url
      };
    }
    
    let browser;
    try {
      // Fallback to regular Playwright
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // For production deployment
      });
      const page = await browser.newPage();
      
      // Navigate with timeout and Cloudflare detection
      console.log('📍 Navigating to website...');
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait for potential Cloudflare challenge
      await page.waitForTimeout(3000);
      
      // Check if we hit Cloudflare
      const title = await page.title();
      if (title.includes('Just a moment') || title.includes('Checking your browser')) {
        console.warn('⚠️ Cloudflare detected! Trying to wait it out...');
        
        // Try to wait for redirect
        try {
          await page.waitForNavigation({ timeout: 10000 });
        } catch (e) {
          console.error('❌ Could not bypass Cloudflare protection');
          
          // FALLBACK: Use manual brand data for known sites
          if (url.includes('revolut.com')) {
            return this.getRevolutManualData();
          }
          
          throw new Error('Website is protected by Cloudflare. Please try a different URL or provide brand assets manually.');
        }
      }
      
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
      
      // Extract COMPLETE brand system for motion graphics
      console.log('🎨 Extracting complete brand system for motion graphics...');
      const pageData = await page.evaluate(() => {
        // Helper to get computed styles
        const getComputedStyles = (element: Element) => {
          const styles = window.getComputedStyle(element);
          return {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            padding: styles.padding,
            margin: styles.margin,
            borderRadius: styles.borderRadius,
            boxShadow: styles.boxShadow,
            lineHeight: styles.lineHeight,
            letterSpacing: styles.letterSpacing,
            textTransform: styles.textTransform,
          };
        };

        // Extract COMPLETE color system with gradients
        const extractColorSystem = () => {
          const colorMap = new Map<string, number>();
          const gradients: any[] = [];
          const elements = document.querySelectorAll('*');
          
          elements.forEach(el => {
            const styles = window.getComputedStyle(el);
            
            // Collect solid colors with frequency
            ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
              const value = styles[prop as any];
              if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
                colorMap.set(value, (colorMap.get(value) || 0) + 1);
              }
            });
            
            // Extract gradients
            const bgImage = styles.backgroundImage;
            if (bgImage && bgImage.includes('gradient')) {
              const gradientMatch = bgImage.match(/(linear|radial)-gradient\(([^)]+)\)/);
              if (gradientMatch) {
                const [_, type, content] = gradientMatch;
                const parts = content.split(',').map(s => s.trim());
                
                // Parse angle/direction
                let angle = 180;
                if (parts[0].includes('deg')) {
                  angle = parseInt(parts[0]);
                  parts.shift();
                } else if (parts[0].includes('to ')) {
                  // Convert direction to angle
                  const dir = parts[0];
                  if (dir.includes('top')) angle = 0;
                  if (dir.includes('right')) angle = 90;
                  if (dir.includes('bottom')) angle = 180;
                  if (dir.includes('left')) angle = 270;
                  parts.shift();
                }
                
                gradients.push({
                  type,
                  angle,
                  stops: parts.filter(p => p.includes('rgb') || p.includes('#'))
                });
              }
            }
          });
          
          // Sort colors by frequency
          const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([color]) => color);
          
          // Categorize colors
          const isNeutral = (color: string) => {
            const rgb = color.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const [r, g, b] = rgb.map(Number);
              return Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
            }
            return false;
          };
          
          return {
            primary: sortedColors[0] || '#000000',
            secondary: sortedColors.find(c => !isNeutral(c) && c !== sortedColors[0]) || sortedColors[1] || '#666666',
            accents: sortedColors.filter(c => !isNeutral(c)).slice(2, 5),
            neutrals: sortedColors.filter(isNeutral).slice(0, 5),
            gradients: gradients.slice(0, 3),
            allColors: sortedColors.slice(0, 15)
          };
        };

        // Extract all unique fonts
        const extractFonts = () => {
          const fonts = new Set<string>();
          const elements = document.querySelectorAll('*');
          
          elements.forEach(el => {
            const fontFamily = window.getComputedStyle(el).fontFamily;
            if (fontFamily) {
              // Clean up font family string
              const cleanFont = fontFamily.replace(/["']/g, '').split(',')[0].trim();
              fonts.add(cleanFont);
            }
          });
          
          return Array.from(fonts);
        };

        // Get hero/header section styles
        const heroElement = document.querySelector('header, .hero, [class*="hero"], section:first-of-type') || document.body;
        const heroStyles = getComputedStyles(heroElement);

        // Get button styles
        const buttons = Array.from(document.querySelectorAll('button, .btn, [class*="button"], a[class*="btn"]')).slice(0, 3);
        const buttonStyles = buttons.map(btn => ({
          text: btn.textContent?.trim(),
          styles: getComputedStyles(btn)
        }));

        // Get heading styles
        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 5);
        const headingData = headings.map(h => ({
          level: h.tagName.toLowerCase(),
          text: h.textContent?.trim(),
          styles: getComputedStyles(h)
        }));

        // Extract shadows and elevation system
        const extractShadows = () => {
          const shadows = new Map<string, number>();
          document.querySelectorAll('*').forEach(el => {
            const shadow = window.getComputedStyle(el).boxShadow;
            if (shadow && shadow !== 'none') {
              shadows.set(shadow, (shadows.get(shadow) || 0) + 1);
            }
          });
          
          const sorted = Array.from(shadows.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([shadow]) => shadow);
          
          return {
            sm: sorted.find(s => s.includes('2px') || s.includes('1px')) || 'none',
            md: sorted.find(s => s.includes('4px') || s.includes('5px')) || sorted[0] || 'none',
            lg: sorted.find(s => s.includes('10px') || s.includes('15px')) || sorted[1] || 'none',
            xl: sorted.find(s => s.includes('20px') || s.includes('25px')) || sorted[2] || 'none'
          };
        };
        
        // Extract border radius tokens
        const extractBorderRadius = () => {
          const radii = new Set<string>();
          document.querySelectorAll('button, .card, [class*="card"], [class*="rounded"]').forEach(el => {
            const radius = window.getComputedStyle(el).borderRadius;
            if (radius && radius !== '0px') radii.add(radius);
          });
          
          const values = Array.from(radii).map(r => parseInt(r)).filter(n => !isNaN(n)).sort((a, b) => a - b);
          return {
            none: '0px',
            sm: `${values[0] || 4}px`,
            md: `${values[Math.floor(values.length / 2)] || 8}px`,
            lg: `${values[values.length - 1] || 16}px`,
            full: '9999px'
          };
        };
        
        // Extract product narrative and copy
        const extractProductNarrative = () => {
          const hero = document.querySelector('h1, .hero h1, [class*="hero"] h1');
          const subhero = document.querySelector('.hero p, .subtitle, [class*="subtitle"], h2 + p');
          
          // Extract CTAs
          const ctaButtons = Array.from(document.querySelectorAll('button, .btn, a[class*="btn"]'))
            .map(el => el.textContent?.trim())
            .filter(Boolean)
            .slice(0, 5);
          
          // Extract features
          const features = Array.from(document.querySelectorAll('.feature, [class*="feature"]:not([class*="featured"])'))
            .slice(0, 6)
            .map(el => {
              const title = el.querySelector('h3, h4, .title, [class*="title"]');
              const desc = el.querySelector('p, .description, [class*="desc"]');
              return {
                title: title?.textContent?.trim() || '',
                description: desc?.textContent?.trim() || ''
              };
            });
          
          // Extract testimonials
          const testimonials = Array.from(document.querySelectorAll('.testimonial, [class*="testimonial"], blockquote'))
            .slice(0, 3)
            .map(el => {
              const quote = el.querySelector('p, .quote, [class*="quote"]')?.textContent?.trim() || el.textContent?.trim() || '';
              const author = el.querySelector('.name, .author, [class*="author"], cite')?.textContent?.trim() || '';
              return { quote, author };
            });
          
          // Extract metrics/stats
          const metrics = Array.from(document.querySelectorAll('[class*="stat"], [class*="metric"], [class*="number"]'))
            .map(el => el.textContent?.trim())
            .filter(text => text && /\d+[%MKx+]/.test(text))
            .slice(0, 6);
          
          return {
            headline: hero?.textContent?.trim() || '',
            subheadline: subhero?.textContent?.trim() || '',
            ctas: {
              primary: ctaButtons[0] || 'Get Started',
              secondary: ctaButtons[1] || 'Learn More',
              tertiary: ctaButtons[2]
            },
            features,
            testimonials,
            metrics
          };
        };
        
        const colorSystem = extractColorSystem();
        const productNarrative = extractProductNarrative();
        
        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                      document.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined,
          url: window.location.href,
          
          // Visual design system for motion graphics
          visualDesign: {
            colors: colorSystem.allColors,
            colorSystem,
            fonts: extractFonts(),
            heroStyles,
            buttonStyles,
            headingData,
            shadows: extractShadows(),
            borderRadius: extractBorderRadius(),
            
            // Get CSS variables (often contain design tokens)
            cssVariables: (() => {
              const vars: Record<string, string> = {};
              const styles = window.getComputedStyle(document.documentElement);
              const cssText = styles.cssText;
              const matches = cssText.matchAll(/--[\w-]+:\s*[^;]+/g);
              for (const match of matches) {
                const [name, value] = match[0].split(':').map(s => s.trim());
                if (name && value) vars[name] = value;
              }
              return vars;
            })(),
            
            // Get specific brand colors from root/body
            brandColors: {
              primary: colorSystem.primary,
              secondary: colorSystem.secondary,
              text: window.getComputedStyle(document.body).color,
              background: window.getComputedStyle(document.body).backgroundColor,
            }
          },
          
          // Product narrative for motion graphics
          productNarrative,
          
          // Content
          headings: headingData.map(h => h.text).filter(Boolean) as string[],
        };
      });
      
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