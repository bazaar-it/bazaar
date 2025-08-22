import { chromium, type Page } from 'playwright';
import { uploadWebAnalysisScreenshots } from '~/lib/utils/r2-upload';

/**
 * Comprehensive website extraction for AI video generation
 * Captures everything needed to recreate brand, story, and UI motion
 */

export interface BrandExtraction {
  colors: {
    primary: string;
    secondary: string;
    accents: string[];
    neutrals: string[];
    gradients: Array<{
      stops: string[];
      angle: number;
      type: 'linear' | 'radial';
    }>;
  };
  typography: {
    fonts: Array<{
      family: string;
      weights: number[];
      fallback?: string;
    }>;
    scale: {
      h1: { size: string; weight: string; lineHeight: string; letterSpacing: string; textTransform?: string };
      h2: { size: string; weight: string; lineHeight: string; letterSpacing: string; textTransform?: string };
      h3: { size: string; weight: string; lineHeight: string; letterSpacing: string; textTransform?: string };
      h4: { size: string; weight: string; lineHeight: string; letterSpacing: string; textTransform?: string };
      h5: { size: string; weight: string; lineHeight: string; letterSpacing: string; textTransform?: string };
      h6: { size: string; weight: string; lineHeight: string; letterSpacing: string; textTransform?: string };
      body: { size: string; weight: string; lineHeight: string; letterSpacing: string };
      caption: { size: string; weight: string; lineHeight: string; letterSpacing: string };
    };
  };
  buttons: {
    primary: {
      label: string;
      backgroundColor: string;
      color: string;
      borderRadius: string;
      padding: string;
      fontSize: string;
      fontWeight: string;
      boxShadow?: string;
      hoverState?: {
        backgroundColor: string;
        transform?: string;
      };
    };
    secondary?: any;
    tertiary?: any;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  iconography: {
    style: 'line' | 'filled' | 'duotone' | 'mixed';
    detectedIcons: string[];
  };
  imageryStyle: string[]; // ['photography', 'illustration', '3D', 'isometric', 'abstract']
  backgroundEffects: string[]; // ['noise', 'glassmorphism', 'mesh-gradient', 'patterns']
  logo: {
    light?: string;
    dark?: string;
    monochrome?: string;
    favicon?: string;
    ogImage?: string;
    safeAreaPx?: number;
  };
}

export interface CopyVoice {
  voice: {
    adjectives: string[]; // ['confident', 'playful', 'technical']
    tone: string;
  };
  valueProposition: {
    headline: string;
    subheadline: string;
  };
  taglines: string[];
  ctas: {
    primary: string;
    secondary: string;
    tertiary?: string;
  };
  forbiddenWords?: string[];
  preferredSynonyms?: Record<string, string>;
}

export interface ProductNarrative {
  audience: {
    roles: string[];
    companySize: string;
    industry: string[];
  };
  problem: string;
  solution: string;
  useCases: Array<{
    title: string;
    description: string;
  }>;
  benefits: Array<{
    label: string;
    metric: string;
    source?: string;
  }>;
  metrics: Array<{
    value: string;
    label: string;
    context?: string;
  }>;
  features: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  integrations: Array<{
    name: string;
    logo?: string;
    priority: number;
  }>;
  platforms: string[]; // ['Web', 'iOS', 'Android', 'Desktop']
  onboarding: {
    model: 'free-trial' | 'freemium' | 'waitlist' | 'demo';
    trialLength?: number;
    ssoOptions?: string[];
  };
}

export interface SocialProof {
  testimonials: Array<{
    quote: string;
    name: string;
    role: string;
    company: string;
    avatar?: string;
    source?: string;
  }>;
  caseStudies: Array<{
    company: string;
    result: string;
    metric: string;
    link?: string;
  }>;
  trustBadges: {
    security: string[]; // ['SOC2', 'ISO27001', 'GDPR']
    payments: string[]; // ['Stripe', 'PayPal']
    awards: string[];
    press: Array<{
      name: string;
      logo?: string;
    }>;
  };
  logos: string[]; // Customer logos
  stats: {
    customers?: string;
    uptime?: string;
    rating?: string;
  };
}

export interface LayoutMotion {
  sections: string[]; // ['hero', 'features', 'social-proof', 'pricing', 'faq', 'footer']
  componentInventory: string[]; // ['cards', 'tabs', 'accordions', 'carousels', 'code-blocks']
  motionHints: {
    hasAnimations: boolean;
    animationTypes: string[]; // ['fade', 'slide', 'scale', 'parallax']
    easingFunctions: string[];
    averageDuration: number;
    scrollTriggers: boolean;
  };
  deviceFrames: string[]; // ['MacBook', 'iPhone', 'iPad']
  transitions: {
    preferred: string[];
    duration: number;
  };
}

export interface MediaAssets {
  screenshots: Array<{
    url: string;
    device?: string;
    aspectRatio: string;
    context: string;
  }>;
  videos: Array<{
    url: string;
    type: 'hero' | 'demo' | 'testimonial';
    duration?: number;
  }>;
  animations: Array<{
    url: string;
    type: 'lottie' | 'gif' | 'svg';
  }>;
  downloadables: Array<{
    title: string;
    type: string;
    url: string;
  }>;
  socialLinks: Record<string, string>;
}

export interface EnhancedWebAnalysis {
  url: string;
  title: string;
  description?: string;
  timestamp: string;
  
  brand: BrandExtraction;
  copy: CopyVoice;
  product: ProductNarrative;
  socialProof: SocialProof;
  layout: LayoutMotion;
  media: MediaAssets;
  
  pricing?: {
    model: string;
    currency: string;
    tiers: Array<{
      name: string;
      price: number;
      billing: string;
      features: string[];
    }>;
  };
  
  technical?: {
    framework?: string;
    analytics?: string[];
    seo: {
      metaTitle: string;
      metaDescription: string;
      ogImage?: string;
    };
  };
  
  extractionMeta: {
    confidence: Record<string, number>;
    sources: Record<string, 'text' | 'css' | 'image' | 'meta'>;
    warnings: string[];
  };
}

export class EnhancedWebAnalyzer {
  
  async analyzeWebsite(url: string, projectId?: string, userId?: string): Promise<EnhancedWebAnalysis> {
    console.log(`🎨 Starting enhanced extraction for: ${url}`);
    
    let browser;
    try {
      // Check production environment
      if (process.env.NODE_ENV === 'production' && !process.env.BROWSERLESS_URL) {
        throw new Error('Enhanced extraction requires browser access in production');
      }
      
      // Launch browser
      if (process.env.BROWSERLESS_URL) {
        const { chromium: playwrightCore } = await import('playwright-core');
        browser = await playwrightCore.connect(process.env.BROWSERLESS_URL);
      } else {
        browser = await chromium.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
      
      const page = await browser.newPage();
      
      // Navigate and wait for full load
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait for fonts to load
      await page.evaluate(() => {
        return document.fonts.ready;
      });
      
      // Extract everything
      const extraction = await this.extractAllData(page, url);
      
      // Take screenshots for visual reference
      const screenshots = await this.captureScreenshots(page, projectId, userId);
      
      return {
        ...extraction,
        url,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error('❌ Enhanced extraction failed:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  private async extractAllData(page: Page, url: string): Promise<EnhancedWebAnalysis> {
    const data = await page.evaluate(() => {
      
      // Helper: Extract computed styles
      const getStyles = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        return {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          letterSpacing: styles.letterSpacing,
          textTransform: styles.textTransform,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          borderRadius: styles.borderRadius,
          padding: styles.padding,
          boxShadow: styles.boxShadow,
        };
      };
      
      // Extract color palette
      const extractColors = () => {
        const colors = new Map<string, number>();
        const elements = document.querySelectorAll('*');
        
        elements.forEach(el => {
          const styles = window.getComputedStyle(el);
          ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
            const value = styles[prop as any];
            if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
              colors.set(value, (colors.get(value) || 0) + 1);
            }
          });
        });
        
        // Sort by frequency and categorize
        const sorted = Array.from(colors.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([color]) => color);
        
        return {
          primary: sorted[0] || '#000000',
          secondary: sorted[1] || '#666666', 
          accents: sorted.slice(2, 5),
          neutrals: sorted.filter(c => {
            // Detect grays/neutrals
            const rgb = c.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const [r, g, b] = rgb.map(Number);
              return Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
            }
            return false;
          }).slice(0, 5),
          gradients: Array.from(document.querySelectorAll('*'))
            .map(el => {
              const bg = window.getComputedStyle(el).backgroundImage;
              if (bg.includes('gradient')) {
                const match = bg.match(/linear-gradient\(([^)]+)\)/);
                if (match) {
                  const parts = match[1].split(',');
                  const angle = parts[0].includes('deg') ? parseInt(parts[0]) : 180;
                  const stops = parts.slice(1).map(s => s.trim());
                  return { stops, angle, type: 'linear' as const };
                }
              }
              return null;
            })
            .filter(Boolean)
            .slice(0, 3)
        };
      };
      
      // Extract typography scale
      const extractTypography = () => {
        const fonts = new Set<string>();
        const weights = new Set<number>();
        
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el);
          const family = style.fontFamily.split(',')[0]?.replace(/["']/g, '').trim();
          if (family) fonts.add(family);
          const weight = parseInt(style.fontWeight);
          if (!isNaN(weight)) weights.add(weight);
        });
        
        const scale = {} as any;
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
          const el = document.querySelector(tag);
          if (el) {
            const s = window.getComputedStyle(el);
            scale[tag] = {
              size: s.fontSize,
              weight: s.fontWeight,
              lineHeight: s.lineHeight,
              letterSpacing: s.letterSpacing,
              textTransform: s.textTransform || 'none'
            };
          }
        });
        
        // Body and caption
        const body = document.querySelector('p, .text-base, body');
        if (body) {
          const s = window.getComputedStyle(body);
          scale.body = {
            size: s.fontSize,
            weight: s.fontWeight,
            lineHeight: s.lineHeight,
            letterSpacing: s.letterSpacing
          };
        }
        
        const caption = document.querySelector('.text-sm, .caption, small');
        if (caption) {
          const s = window.getComputedStyle(caption);
          scale.caption = {
            size: s.fontSize,
            weight: s.fontWeight,
            lineHeight: s.lineHeight,
            letterSpacing: s.letterSpacing
          };
        }
        
        return {
          fonts: Array.from(fonts).map(family => ({
            family,
            weights: Array.from(weights).sort()
          })),
          scale
        };
      };
      
      // Extract button styles
      const extractButtons = () => {
        const buttons: any = {};
        
        // Primary button
        const primary = document.querySelector('button.primary, .btn-primary, [class*="primary"], button:not([class*="secondary"]):not([class*="tertiary"])');
        if (primary) {
          const s = window.getComputedStyle(primary);
          buttons.primary = {
            label: primary.textContent?.trim() || 'Get Started',
            backgroundColor: s.backgroundColor,
            color: s.color,
            borderRadius: s.borderRadius,
            padding: s.padding,
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
            boxShadow: s.boxShadow
          };
          
          // Try to detect hover state
          primary.classList.add('hover');
          const hoverStyles = window.getComputedStyle(primary);
          if (hoverStyles.backgroundColor !== s.backgroundColor) {
            buttons.primary.hoverState = {
              backgroundColor: hoverStyles.backgroundColor,
              transform: hoverStyles.transform
            };
          }
          primary.classList.remove('hover');
        }
        
        // Secondary button
        const secondary = document.querySelector('.btn-secondary, [class*="secondary"]');
        if (secondary) {
          const s = window.getComputedStyle(secondary);
          buttons.secondary = {
            label: secondary.textContent?.trim() || 'Learn More',
            backgroundColor: s.backgroundColor,
            color: s.color,
            borderRadius: s.borderRadius,
            padding: s.padding,
            fontSize: s.fontSize,
            fontWeight: s.fontWeight
          };
        }
        
        return buttons;
      };
      
      // Extract shadows
      const extractShadows = () => {
        const shadows = new Set<string>();
        document.querySelectorAll('*').forEach(el => {
          const shadow = window.getComputedStyle(el).boxShadow;
          if (shadow && shadow !== 'none') {
            shadows.add(shadow);
          }
        });
        
        const sorted = Array.from(shadows).sort((a, b) => {
          // Sort by blur radius (rough)
          const aBlur = parseInt(a.split(' ')[2] || '0');
          const bBlur = parseInt(b.split(' ')[2] || '0');
          return aBlur - bBlur;
        });
        
        return {
          sm: sorted[0] || 'none',
          md: sorted[1] || sorted[0] || 'none',
          lg: sorted[2] || sorted[1] || sorted[0] || 'none',
          xl: sorted[3] || sorted[2] || sorted[1] || sorted[0] || 'none'
        };
      };
      
      // Extract border radius scale
      const extractBorderRadius = () => {
        const radii = new Set<string>();
        document.querySelectorAll('*').forEach(el => {
          const radius = window.getComputedStyle(el).borderRadius;
          if (radius && radius !== '0px') {
            radii.add(radius);
          }
        });
        
        const sorted = Array.from(radii)
          .map(r => parseInt(r))
          .filter(r => !isNaN(r))
          .sort((a, b) => a - b);
        
        return {
          sm: `${sorted[0] || 4}px`,
          md: `${sorted[Math.floor(sorted.length / 3)] || 8}px`,
          lg: `${sorted[Math.floor(sorted.length * 2 / 3)] || 16}px`,
          xl: `${sorted[sorted.length - 2] || 24}px`,
          full: '9999px'
        };
      };
      
      // Extract copy and voice
      const extractCopy = () => {
        const hero = document.querySelector('h1, .hero h2, [class*="hero"] h1');
        const subhero = document.querySelector('.hero p, .subtitle, [class*="hero"] p');
        
        const ctas = Array.from(document.querySelectorAll('button, .btn, a[class*="btn"]'))
          .map(el => el.textContent?.trim())
          .filter(Boolean);
        
        return {
          voice: {
            adjectives: [], // Would need NLP
            tone: 'professional' // Default
          },
          valueProposition: {
            headline: hero?.textContent?.trim() || '',
            subheadline: subhero?.textContent?.trim() || ''
          },
          taglines: Array.from(document.querySelectorAll('.tagline, .slogan, [class*="tagline"]'))
            .map(el => el.textContent?.trim())
            .filter(Boolean) as string[],
          ctas: {
            primary: ctas[0] || 'Get Started',
            secondary: ctas[1] || 'Learn More',
            tertiary: ctas[2]
          }
        };
      };
      
      // Extract product narrative
      const extractProduct = () => {
        const features = Array.from(document.querySelectorAll('.feature, [class*="feature"]:not([class*="featured"])'))
          .slice(0, 6)
          .map(el => {
            const title = el.querySelector('h3, h4, .title, [class*="title"]');
            const desc = el.querySelector('p, .description, [class*="desc"]');
            return {
              title: title?.textContent?.trim() || '',
              description: desc?.textContent?.trim() || '',
              icon: '' // Would need icon detection
            };
          });
        
        const benefits = Array.from(document.querySelectorAll('[class*="benefit"], [class*="stat"]'))
          .slice(0, 4)
          .map(el => {
            const text = el.textContent?.trim() || '';
            const match = text.match(/(\d+[%x]?)\s*(.+)/);
            return match ? {
              metric: match[1],
              label: match[2]
            } : null;
          })
          .filter(Boolean) as any[];
        
        return {
          audience: {
            roles: [],
            companySize: '',
            industry: []
          },
          problem: '',
          solution: '',
          useCases: [],
          benefits,
          metrics: [],
          features,
          integrations: [],
          platforms: [],
          onboarding: {
            model: 'free-trial' as const,
            trialLength: 14
          }
        };
      };
      
      // Extract social proof
      const extractSocialProof = () => {
        const testimonials = Array.from(document.querySelectorAll('.testimonial, [class*="testimonial"], blockquote'))
          .slice(0, 3)
          .map(el => {
            const quote = el.querySelector('p, .quote, [class*="quote"]');
            const name = el.querySelector('.name, [class*="name"]:not([class*="company"])');
            const role = el.querySelector('.role, .title, [class*="role"], [class*="title"]');
            const company = el.querySelector('.company, [class*="company"]');
            
            return {
              quote: quote?.textContent?.trim() || el.textContent?.trim() || '',
              name: name?.textContent?.trim() || '',
              role: role?.textContent?.trim() || '',
              company: company?.textContent?.trim() || ''
            };
          });
        
        const logos = Array.from(document.querySelectorAll('.logos img, .customers img, [class*="logo"] img'))
          .map(img => (img as HTMLImageElement).alt || (img as HTMLImageElement).title)
          .filter(Boolean);
        
        return {
          testimonials,
          caseStudies: [],
          trustBadges: {
            security: [],
            payments: [],
            awards: [],
            press: []
          },
          logos,
          stats: {}
        };
      };
      
      // Extract layout and motion
      const extractLayout = () => {
        const sections = Array.from(document.querySelectorAll('section, [class*="section"]'))
          .map(el => {
            const classes = typeof el.className === 'string' ? el.className : el.className?.toString() || '';
            if (classes.includes('hero')) return 'hero';
            if (classes.includes('feature')) return 'features';
            if (classes.includes('testimonial') || classes.includes('social')) return 'social-proof';
            if (classes.includes('pricing')) return 'pricing';
            if (classes.includes('faq')) return 'faq';
            if (classes.includes('footer')) return 'footer';
            return null;
          })
          .filter(Boolean) as string[];
        
        // Detect animation presence
        const hasAnimations = Array.from(document.querySelectorAll('*')).some(el => {
          const transition = window.getComputedStyle(el).transition;
          const animation = window.getComputedStyle(el).animation;
          return (transition && transition !== 'none') || (animation && animation !== 'none');
        });
        
        return {
          sections,
          componentInventory: [],
          motionHints: {
            hasAnimations,
            animationTypes: [],
            easingFunctions: [],
            averageDuration: 300,
            scrollTriggers: false
          },
          deviceFrames: [],
          transitions: {
            preferred: ['fade', 'slide'],
            duration: 300
          }
        };
      };
      
      // Extract media assets
      const extractMedia = () => {
        const images = Array.from(document.querySelectorAll('img'))
          .filter(img => {
            const src = (img as HTMLImageElement).src;
            return src && !src.includes('logo') && !src.includes('icon');
          })
          .slice(0, 10)
          .map(img => ({
            url: (img as HTMLImageElement).src,
            aspectRatio: `${(img as HTMLImageElement).naturalWidth}:${(img as HTMLImageElement).naturalHeight}`,
            context: (img as HTMLImageElement).alt || ''
          }));
        
        const videos = Array.from(document.querySelectorAll('video'))
          .map(video => ({
            url: (video as HTMLVideoElement).src || (video.querySelector('source') as HTMLSourceElement)?.src || '',
            type: 'demo' as const
          }));
        
        return {
          screenshots: images,
          videos,
          animations: [],
          downloadables: [],
          socialLinks: {}
        };
      };
      
      // Main extraction
      const title = document.title;
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      
      return {
        title,
        description,
        brand: {
          colors: extractColors(),
          typography: extractTypography(),
          buttons: extractButtons(),
          shadows: extractShadows(),
          borderRadius: extractBorderRadius(),
          iconography: {
            style: 'line' as const,
            detectedIcons: []
          },
          imageryStyle: [],
          backgroundEffects: [],
          logo: {
            favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || '',
            ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
          }
        },
        copy: extractCopy(),
        product: extractProduct(),
        socialProof: extractSocialProof(),
        layout: extractLayout(),
        media: extractMedia(),
        technical: {
          seo: {
            metaTitle: title,
            metaDescription: description,
            ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
          }
        },
        extractionMeta: {
          confidence: {},
          sources: {},
          warnings: []
        }
      };
    });
    
    return data as EnhancedWebAnalysis;
  }
  
  private async captureScreenshots(page: Page, projectId?: string, userId?: string) {
    console.log('📸 Capturing multi-viewport screenshots...');
    
    const viewports = [
      { name: 'mobile', width: 390, height: 844, device: 'iPhone 14' },
      { name: 'tablet', width: 768, height: 1024, device: 'iPad' },
      { name: 'desktop', width: 1440, height: 900, device: 'MacBook' },
      { name: 'wide', width: 1920, height: 1080, device: 'Full HD' },
    ];
    
    const screenshots: Array<{
      name: string;
      viewport: string;
      width: number;
      height: number;
      device: string;
      buffer: Buffer;
      url?: string;
    }> = [];
    
    for (const viewport of viewports) {
      console.log(`  📱 Capturing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Wait for any responsive changes to settle
      await page.waitForTimeout(500);
      
      // Capture hero section (above fold)
      const heroScreenshot = await page.screenshot({ 
        type: 'png', 
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height
        }
      });
      
      screenshots.push({
        name: `${viewport.name}_hero`,
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        device: viewport.device,
        buffer: heroScreenshot,
      });
      
      // For desktop/wide, also capture a scrolled view
      if (viewport.name === 'desktop' || viewport.name === 'wide') {
        // Scroll to middle of page
        await page.evaluate(() => {
          const maxScroll = document.body.scrollHeight - window.innerHeight;
          window.scrollTo(0, maxScroll / 2);
        });
        await page.waitForTimeout(300);
        
        const midScreenshot = await page.screenshot({ 
          type: 'png', 
          fullPage: false 
        });
        
        screenshots.push({
          name: `${viewport.name}_middle`,
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          device: viewport.device,
          buffer: midScreenshot,
        });
        
        // Scroll back to top for next viewport
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }
    
    // Upload all screenshots if projectId provided
    if (projectId && userId) {
      try {
        console.log('  ☁️ Uploading screenshots to R2...');
        
        for (const screenshot of screenshots) {
          const key = `projects/${projectId}/brand-extraction/${screenshot.name}.png`;
          const uploadResult = await uploadWebAnalysisScreenshots(
            { [screenshot.name]: screenshot.buffer },
            projectId,
            userId
          );
          
          if (uploadResult && uploadResult[screenshot.name]) {
            screenshot.url = uploadResult[screenshot.name];
          }
        }
        
        console.log('  ✅ Screenshots uploaded successfully');
      } catch (error) {
        console.error('  ❌ Failed to upload screenshots:', error);
      }
    }
    
    // Return structured screenshot data
    return {
      screenshots: screenshots.map(s => ({
        name: s.name,
        viewport: s.viewport,
        width: s.width,
        height: s.height,
        device: s.device,
        url: s.url,
      })),
      raw: screenshots.reduce((acc, s) => {
        acc[s.name] = s.buffer;
        return acc;
      }, {} as Record<string, Buffer>)
    };
  }
}