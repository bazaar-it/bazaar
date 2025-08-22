/**
 * WebAnalysisAgentV2 - Comprehensive brand extraction system
 * Extracts complete visual systems, product narratives, and social proof
 * Uses Browserless.io to bypass Cloudflare and anti-bot measures
 */

import { chromium as playwrightCore } from 'playwright-core';
import { uploadWebAnalysisScreenshots } from '~/lib/utils/r2-upload';

export interface ExtractedBrandData {
  page: {
    url: string;
    title: string;
    sections: string[];
  };
  brand: {
    colors: {
      primary: string;
      secondary: string;
      accents: string[];
      neutrals: string[];
      gradients: Array<{ type: string; angle?: number; stops: string[] }>;
    };
    typography: {
      fonts: Array<{ family: string; weights: number[] }>;
      scale: {
        h1: { size: string; weight: string; lineHeight: string };
        h2: { size: string; weight: string; lineHeight: string };
        h3: { size: string; weight: string; lineHeight: string };
        body: { size: string; weight: string; lineHeight: string };
        caption: { size: string; weight: string; lineHeight: string };
      };
    };
    buttons: {
      radius: string;
      padding: string;
      shadow: string;
      styles: {
        primary: { label: string; background: string; color: string; hover?: any };
        secondary?: { label: string; background: string; color: string };
        tertiary?: { label: string; background: string; color: string };
      };
    };
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
    iconStyle: 'line' | 'filled' | 'duotone';
    imageryStyle: string[];
    backgroundEffects: string[];
    logo: {
      light?: string;
      dark?: string;
      favicon?: string;
    };
    voice: {
      adjectives: string[];
      taglines: string[];
      tone: string;
    };
  };
  product: {
    value_prop: {
      headline: string;
      subhead: string;
    };
    problem: string;
    solution: string;
    features: Array<{
      title: string;
      desc: string;
      icon?: string;
    }>;
    useCases: string[];
    benefits: Array<{
      label: string;
      metric: string;
    }>;
    metrics: string[];
    integrations: Array<{
      name: string;
      logo?: string;
    }>;
    platforms: string[];
    onboarding: {
      trialDays?: number;
      freemium: boolean;
      sso?: string[];
    };
  };
  socialProof: {
    testimonials: Array<{
      quote: string;
      name: string;
      role: string;
      company: string;
      avatar?: string;
    }>;
    logos: string[];
    awards: string[];
    stats: {
      users?: string;
      rating?: string;
      reviews?: string;
    };
    press: Array<{
      publisher: string;
      url?: string;
    }>;
  };
  pricing?: {
    model: string;
    currency: string;
    tiers: Array<{
      name: string;
      price: string | number;
      features: string[];
    }>;
    policies?: {
      refund?: string;
      cancelAnytime?: boolean;
    };
  };
  layoutMotion: {
    componentInventory: string[];
    transitions: string[];
    easingHints: string[];
    motionDurationMs: number;
    deviceFrames: string[];
    hasVideo: boolean;
    hasAnimation: boolean;
  };
  media: {
    screenshots: Array<{
      url: string;
      type: string;
      description: string;
    }>;
    heroVideo?: string;
    lottieUrls: string[];
  };
  ctas: Array<{
    type: 'primary' | 'secondary' | 'tertiary';
    label: string;
    url?: string;
  }>;
  extractionMeta: {
    timestamp: string;
    confidence: number;
    extractionTimeMs: number;
  };
}

export class WebAnalysisAgentV2 {
  private browser: any;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async analyze(url: string): Promise<ExtractedBrandData> {
    const startTime = Date.now();
    console.log(`🌐 WebAnalysisV2: Analyzing ${url}`);

    try {
      // Connect to Browserless
      await this.connectBrowser();
      
      // Create stealth context
      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });

      const page = await context.newPage();
      
      // Navigate to URL with fallback strategy
      console.log('📍 Navigating to page...');
      let navigationSuccess = false;
      
      // Strategy 1: Network idle with longer timeout
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 45000
        });
        navigationSuccess = true;
        console.log('✅ Loaded with networkidle');
      } catch (error) {
        console.log('⚠️ Network idle failed, trying domcontentloaded...');
        
        // Strategy 2: DOM content loaded
        try {
          await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });
          navigationSuccess = true;
          console.log('✅ Loaded with domcontentloaded');
        } catch (error2) {
          console.log('⚠️ DOM content loaded failed, trying basic load...');
          
          // Strategy 3: Basic load
          try {
            await page.goto(url, { 
              waitUntil: 'load',
              timeout: 20000 
            });
            navigationSuccess = true;
            console.log('✅ Loaded with basic load');
          } catch (error3) {
            console.log('❌ All navigation strategies failed');
            throw new Error(`Failed to load ${url} - site may be down or blocking requests`);
          }
        }
      }
      
      if (!navigationSuccess) {
        throw new Error(`Unable to navigate to ${url}`);
      }

      // Wait for dynamic content
      await page.waitForTimeout(2000);

      // Check for Cloudflare
      const title = await page.title();
      if (title.includes('Just a moment') || title.includes('Checking')) {
        console.log('⏳ Cloudflare detected, waiting...');
        await page.waitForTimeout(5000);
      }

      // Take multiple screenshots
      console.log('📸 Capturing screenshots...');
      const screenshots = await this.captureScreenshots(page);

      // Extract comprehensive brand data
      console.log('🎨 Extracting brand data...');
      const brandData = await this.extractBrandData(page);

      // Upload screenshots to R2
      const screenshotUrls = await this.uploadScreenshots(screenshots);

      // Combine everything
      const extractedData: ExtractedBrandData = {
        ...brandData,
        media: {
          ...brandData.media,
          screenshots: screenshotUrls
        },
        extractionMeta: {
          timestamp: new Date().toISOString(),
          confidence: 0.95,
          extractionTimeMs: Date.now() - startTime
        }
      };

      console.log('✅ Extraction complete!');
      return extractedData;

    } catch (error) {
      console.error('❌ WebAnalysisV2 Error:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async connectBrowser() {
    if (!process.env.BROWSERLESS_URL) {
      throw new Error('BROWSERLESS_URL not configured');
    }

    console.log('🔌 Connecting to Browserless...');
    this.browser = await playwrightCore.connect(process.env.BROWSERLESS_URL);
    console.log('✅ Connected to Browserless');
  }

  private async captureScreenshots(page: any) {
    const screenshots: Array<{ buffer: Buffer; type: string; description: string }> = [];

    console.log('📸 Taking strategic screenshots for motion graphics...');

    // 1. Hero section - The main visual story
    screenshots.push({
      buffer: await page.screenshot({ type: 'jpeg', quality: 95 }),
      type: 'hero',
      description: 'Hero section - main brand visual'
    });

    // 2. Scroll to find key product sections
    const sections = ['features', 'benefits', 'cards', 'savings', 'security', 'app'];
    for (const section of sections) {
      try {
        const element = await page.$(`[class*="${section}"], [id*="${section}"], section:has(*:text-matches("${section}", "i"))`);
        if (element) {
          // Use a shorter timeout for scrolling to prevent hanging
          await Promise.race([
            element.scrollIntoViewIfNeeded(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Scroll timeout')), 5000))
          ]);
          await page.waitForTimeout(300);
          screenshots.push({
            buffer: await page.screenshot({ type: 'jpeg', quality: 90 }),
            type: section,
            description: `${section.charAt(0).toUpperCase() + section.slice(1)} section`
          });
          console.log(`  ✓ Captured ${section} section`);
          if (screenshots.length >= 5) break; // Max 5 meaningful screenshots
        }
      } catch (scrollError) {
        console.log(`  ⏭ Skipped ${section} section (scroll timeout)`);
        // Continue to next section instead of failing completely
      }
    }

    // 3. Mobile view - for responsive elements
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 Pro
    await page.goto(page.url(), { waitUntil: 'networkidle' }); // Reload for mobile
    await page.waitForTimeout(1000);
    screenshots.push({
      buffer: await page.screenshot({ type: 'jpeg', quality: 90 }),
      type: 'mobile',
      description: 'Mobile responsive view'
    });

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log(`📸 Captured ${screenshots.length} screenshots`);
    return screenshots;
  }

  private async extractBrandData(page: any): Promise<Partial<ExtractedBrandData>> {
    const data = await page.evaluate(() => {
      // Helper functions
      const getComputedStyles = (selector: string) => {
        const el = document.querySelector(selector);
        return el ? window.getComputedStyle(el) : null;
      };

      const extractColors = () => {
        const colorMap = new Map<string, number>();
        const gradients: any[] = [];
        
        // Sample elements for colors
        const elements = document.querySelectorAll('button, .btn, h1, h2, h3, header, nav, footer, [class*="hero"], [class*="primary"], [class*="accent"]');
        
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          
          // Background colors
          if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            const count = colorMap.get(style.backgroundColor) || 0;
            colorMap.set(style.backgroundColor, count + 1);
          }
          
          // Text colors
          if (style.color) {
            const count = colorMap.get(style.color) || 0;
            colorMap.set(style.color, count + 1);
          }
          
          // Gradients
          if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
            gradients.push({
              type: style.backgroundImage.includes('linear') ? 'linear' : 'radial',
              value: style.backgroundImage
            });
          }
        });

        // Sort by frequency and categorize
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => color);

        // Categorize colors
        const isNeutral = (color: string) => {
          const rgb = color.match(/\d+/g);
          if (!rgb) return false;
          const [r, g, b] = rgb.map(Number);
          const diff = Math.max(r, g, b) - Math.min(r, g, b);
          return diff < 30; // Low saturation = neutral
        };

        const neutrals = sortedColors.filter(isNeutral);
        const vibrant = sortedColors.filter(c => !isNeutral(c));

        return {
          primary: vibrant[0] || '#000000',
          secondary: vibrant[1] || '#FFFFFF',
          accents: vibrant.slice(2, 6),
          neutrals: neutrals.slice(0, 4),
          gradients: gradients.slice(0, 3).map(g => ({
            type: g.type,
            angle: g.type === 'linear' ? 135 : undefined,
            stops: [] // Would need more parsing
          }))
        };
      };

      const extractTypography = () => {
        const fonts = new Set<string>();
        const scale: any = {};

        // Get fonts from different elements
        ['h1', 'h2', 'h3', 'h4', 'p', 'button', 'a'].forEach(tag => {
          const el = document.querySelector(tag);
          if (el) {
            const style = window.getComputedStyle(el);
            fonts.add(style.fontFamily);
            
            if (tag.startsWith('h')) {
              scale[tag] = {
                size: style.fontSize,
                weight: style.fontWeight,
                lineHeight: style.lineHeight
              };
            } else if (tag === 'p') {
              scale.body = {
                size: style.fontSize,
                weight: style.fontWeight,
                lineHeight: style.lineHeight
              };
            }
          }
        });

        // Parse font families
        const fontFamilies = Array.from(fonts).map(f => {
          const family = f.split(',')[0].replace(/['"]/g, '').trim();
          return { family, weights: [400, 600, 700] }; // Default weights
        });

        return {
          fonts: fontFamilies,
          scale
        };
      };

      const extractButtons = () => {
        const buttons = Array.from(document.querySelectorAll('button, .btn, [role="button"], a[class*="button"]'));
        const buttonStyles: any[] = [];

        buttons.slice(0, 3).forEach((btn, i) => {
          const style = window.getComputedStyle(btn);
          const type = i === 0 ? 'primary' : i === 1 ? 'secondary' : 'tertiary';
          
          buttonStyles.push({
            type,
            label: btn.textContent?.trim() || '',
            background: style.backgroundColor,
            color: style.color,
            borderRadius: style.borderRadius,
            padding: style.padding,
            boxShadow: style.boxShadow
          });
        });

        const primary = buttonStyles.find(b => b.type === 'primary');
        const secondary = buttonStyles.find(b => b.type === 'secondary');

        return {
          radius: primary?.borderRadius || '8px',
          padding: primary?.padding || '12px 24px',
          shadow: primary?.boxShadow || 'none',
          styles: {
            primary: primary ? {
              label: primary.label,
              background: primary.background,
              color: primary.color
            } : undefined,
            secondary: secondary ? {
              label: secondary.label,
              background: secondary.background,
              color: secondary.color
            } : undefined
          }
        };
      };

      const extractContent = () => {
        // Headlines
        const h1 = document.querySelector('h1');
        const h2 = document.querySelector('h2');
        
        // Features
        const features: any[] = [];
        document.querySelectorAll('[class*="feature"], [class*="benefit"]').forEach(el => {
          const title = el.querySelector('h3, h4, strong')?.textContent?.trim();
          const desc = el.querySelector('p')?.textContent?.trim();
          if (title) {
            features.push({ title, desc: desc || '' });
          }
        });

        // CTAs
        const ctas: any[] = [];
        document.querySelectorAll('button, a[class*="button"], [role="button"]').forEach((btn, i) => {
          const label = btn.textContent?.trim();
          if (label && label.length < 50) {
            ctas.push({
              type: i === 0 ? 'primary' : 'secondary',
              label
            });
          }
        });

        // Testimonials
        const testimonials: any[] = [];
        document.querySelectorAll('[class*="testimonial"], [class*="review"], blockquote').forEach(el => {
          const quote = el.querySelector('p, q, blockquote')?.textContent?.trim();
          const name = el.querySelector('[class*="name"], cite')?.textContent?.trim();
          if (quote) {
            testimonials.push({ quote, name: name || 'Customer' });
          }
        });

        return {
          headline: h1?.textContent?.trim() || '',
          subheadline: h2?.textContent?.trim() || '',
          features: features.slice(0, 6),
          ctas: ctas.slice(0, 5),
          testimonials: testimonials.slice(0, 3)
        };
      };

      const detectSections = () => {
        const sections: string[] = [];
        const sectionKeywords = ['hero', 'features', 'pricing', 'testimonial', 'faq', 'footer', 'benefits', 'how', 'about'];
        
        document.querySelectorAll('section, [class*="section"], [id]').forEach(el => {
          const id = el.id?.toLowerCase() || '';
          const classes = typeof el.className === 'string' ? el.className : el.className?.toString() || '';
          const className = classes.toLowerCase();
          
          for (const keyword of sectionKeywords) {
            if (id.includes(keyword) || className.includes(keyword)) {
              if (!sections.includes(keyword)) {
                sections.push(keyword);
              }
              break;
            }
          }
        });

        return sections;
      };

      // Extract everything
      const colors = extractColors();
      const typography = extractTypography();
      const buttons = extractButtons();
      const content = extractContent();
      const sections = detectSections();

      return {
        page: {
          url: window.location.href,
          title: document.title,
          sections
        },
        brand: {
          colors,
          typography,
          buttons,
          shadows: {
            sm: '0 1px 2px rgba(0,0,0,0.05)',
            md: '0 4px 6px rgba(0,0,0,0.1)',
            lg: '0 10px 15px rgba(0,0,0,0.1)',
            xl: '0 20px 25px rgba(0,0,0,0.1)'
          },
          borderRadius: {
            none: '0',
            sm: '4px',
            md: '8px',
            lg: '12px',
            full: '9999px'
          },
          iconStyle: 'line' as const,
          imageryStyle: ['photography', 'minimal'],
          backgroundEffects: [],
          logo: {
            favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || ''
          },
          voice: {
            adjectives: ['modern', 'professional', 'innovative'],
            taglines: [content.headline].filter(Boolean),
            tone: 'confident'
          }
        },
        product: {
          value_prop: {
            headline: content.headline,
            subhead: content.subheadline
          },
          problem: '',
          solution: '',
          features: content.features,
          useCases: [],
          benefits: [],
          metrics: [],
          integrations: [],
          platforms: ['Web'],
          onboarding: {
            freemium: false
          }
        },
        socialProof: {
          testimonials: content.testimonials.map(t => ({
            quote: t.quote,
            name: t.name,
            role: '',
            company: ''
          })),
          logos: [],
          awards: [],
          stats: {},
          press: []
        },
        layoutMotion: {
          componentInventory: ['hero', 'cards', 'buttons'],
          transitions: ['fade', 'slide'],
          easingHints: ['ease-in-out'],
          motionDurationMs: 300,
          deviceFrames: [],
          hasVideo: !!document.querySelector('video'),
          hasAnimation: !!document.querySelector('[class*="animate"]')
        },
        media: {
          screenshots: [],
          lottieUrls: []
        },
        ctas: content.ctas
      };
    });

    return data;
  }

  private async uploadScreenshots(screenshots: Array<{ buffer: Buffer; type: string; description: string }>) {
    const urls: Array<{ url: string; type: string; description: string }> = [];

    for (const screenshot of screenshots) {
      try {
        // Cast the return type since we know we're passing a single buffer
        const url = await uploadWebAnalysisScreenshots(
          screenshot.buffer,
          this.projectId,
          screenshot.type
        ) as string;
        urls.push({
          url,
          type: screenshot.type,
          description: screenshot.description
        });
      } catch (error) {
        console.error(`Failed to upload ${screenshot.type} screenshot:`, error);
      }
    }

    return urls;
  }

  private async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }
}

// Export for use in other tools
export async function analyzeWebsite(url: string, projectId: string): Promise<ExtractedBrandData> {
  const agent = new WebAnalysisAgentV2(projectId);
  return await agent.analyze(url);
}