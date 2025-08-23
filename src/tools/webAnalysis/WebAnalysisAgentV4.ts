/**
 * WebAnalysisAgentV4 - Simplified and Working Brand Extraction
 * A clean, functional version that actually extracts brand data
 */

import * as playwrightCore from 'playwright-core';
import { uploadScreenshotToR2 } from '~/lib/utils/r2-upload';

export interface ExtractedBrandDataV4 {
  brand?: {
    identity?: {
      name?: string;
      tagline?: string;
      mission?: string;
      vision?: string;
      values?: string[];
      positioning?: string;
      archetype?: string;
    };
    visual?: {
      colors?: {
        primary?: string;
        secondary?: string;
        accent?: string;
        semantic?: {
          success?: string;
          warning?: string;
          error?: string;
          info?: string;
        };
        palette?: Array<{
          hex: string;
          rgb?: string;
          usage?: string;
          frequency?: number;
          context?: string[];
        }>;
        gradients?: any[];
      };
      typography?: {
        stack?: {
          primary?: string[];
          headings?: string[];
          body?: string[];
          code?: string[];
        };
        scale?: any;
        hierarchy?: any;
      };
      imagery?: any;
      spacing?: any;
      effects?: any;
      borders?: {
        radius?: {
          button?: string;
          card?: string;
          container?: string;
        };
      };
      shadows?: {
        sm?: string;
        md?: string;
        lg?: string;
      };
    };
    voice?: any;
    psychology?: any;
  };
  product?: {
    value_prop?: {
      headline?: string;
      subhead?: string;
    };
    problem?: string;
    solution?: string;
    features?: Array<{
      name?: string;
      title?: string;
      description?: string;
      desc?: string;
      icon?: string;
    }>;
    benefits?: any[];
    positioning?: any;
    pricing?: any;
    journey?: any;
    core?: any;
    useCases?: any[];
  };
  socialProof?: any;
  content?: {
    hero?: {
      headline?: string;
      subheadline?: string;
    };
    ctas?: Array<{
      label: string;
      type?: string;
      placement?: string;
    }>;
    voice?: {
      tone?: string;
    };
    structure?: any;
    seo?: any;
    performance?: any;
  };
  technology?: any;
  competitors?: any;
  insights?: any;
  metadata?: any;
  metrics?: {
    users?: number;
    rating?: number;
  };
  screenshots?: Array<{
    id: string;
    url: string;
    type: string;
    description: string;
    timestamp: string;
    analysis?: any;
  }>;
}

export class WebAnalysisAgentV4 {
  private browser: any;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async analyze(url: string): Promise<ExtractedBrandDataV4> {
    console.log(`🚀 WebAnalysisV4: Starting analysis of ${url}`);
    
    let context: any = null;
    let page: any = null;
    
    try {
      // Connect to Browserless
      await this.connectBrowser();
      context = await this.createContext();
      page = await context.newPage();
      
      // Navigate to the website
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Extract brand data from the page
      const extractedData = await this.extractPageData(page);
      
      // Take screenshots
      const screenshots = await this.captureScreenshots(page, url);
      
      // Get the domain name for brand identity
      const domain = new URL(url).hostname.replace('www.', '');
      
      // Build the final data structure with comprehensive extracted data
      const finalData: ExtractedBrandDataV4 = {
        brand: {
          identity: {
            name: extractedData.companyName || extractedData.title || domain,
            tagline: extractedData.subheadline || extractedData.description || '',
            mission: extractedData.socialProof?.stats?.find(s => s.label.toLowerCase().includes('mission'))?.value || '',
            vision: extractedData.socialProof?.stats?.find(s => s.label.toLowerCase().includes('vision'))?.value || '',
            values: extractedData.socialProof?.customerLogos?.slice(0, 5) || [],
            positioning: extractedData.headline || '',
            archetype: this.inferBrandArchetype(extractedData)
          },
          visual: {
            colors: {
              primary: extractedData.colors.primary || '#2563eb',
              secondary: extractedData.colors.secondary || '#ffffff',
              accent: extractedData.colors.accent || '#3b82f6',
              semantic: {
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#3b82f6'
              },
              palette: extractedData.colors.palette || [],
              gradients: []
            },
            typography: {
              stack: {
                primary: extractedData.fonts.primary || ['Inter', 'sans-serif'],
                headings: extractedData.fonts.headings || ['Inter', 'sans-serif'],
                body: extractedData.fonts.body || ['Inter', 'sans-serif'],
                code: ['monospace']
              },
              scale: {
                h1: '2.5rem',
                h2: '2rem', 
                h3: '1.5rem',
                body: '1rem'
              },
              hierarchy: {
                primary: 'headings',
                secondary: 'body'
              }
            },
            spacing: {
              xs: '0.25rem',
              sm: '0.5rem',
              md: '1rem',
              lg: '2rem'
            },
            effects: {
              shadows: ['0 1px 3px rgba(0,0,0,0.1)', '0 4px 6px rgba(0,0,0,0.1)']
            },
            borders: {
              radius: {
                button: extractedData.buttonRadius || '0.5rem',
                card: '0.75rem',
                container: '1rem'
              }
            },
            shadows: {
              sm: '0 1px 2px rgba(0,0,0,0.05)',
              md: '0 4px 6px rgba(0,0,0,0.1)',
              lg: '0 10px 15px rgba(0,0,0,0.15)'
            }
          },
          voice: {
            tone: this.inferVoiceTone(extractedData),
            personality: extractedData.socialProof?.testimonials?.length > 0 ? 'customer-focused' : 'professional',
            keywords: this.extractKeywords(extractedData)
          },
          psychology: {
            trustSignals: extractedData.socialProof?.stats || [],
            emotionalTriggers: this.identifyEmotionalTriggers(extractedData),
            urgency: this.detectUrgencySignals(extractedData)
          }
        },
        product: {
          value_prop: {
            headline: extractedData.headline || `Welcome to ${domain}`,
            subhead: extractedData.subheadline || 'Professional solutions for modern businesses'
          },
          problem: extractedData.problem || this.inferProblem(extractedData),
          solution: extractedData.solution || this.inferSolution(extractedData),
          features: extractedData.features || [],
          benefits: this.mapFeaturesToBenefits(extractedData.features || []),
          positioning: {
            category: this.inferCategory(extractedData),
            differentiators: extractedData.features?.slice(0, 3).map(f => f.title) || []
          },
          pricing: {
            model: this.inferPricingModel(extractedData),
            tiers: []
          },
          journey: {
            awareness: extractedData.problem || '',
            consideration: extractedData.features?.map(f => f.title).join(', ') || '',
            decision: extractedData.ctas?.[0]?.label || 'Get Started'
          },
          core: {
            mainFeature: extractedData.features?.[0]?.title || '',
            keyBenefit: extractedData.features?.[0]?.description || ''
          },
          useCases: extractedData.features?.map(f => ({
            title: f.title,
            description: f.description
          })) || []
        },
        socialProof: {
          testimonials: extractedData.socialProof?.testimonials || [],
          customerLogos: extractedData.socialProof?.customerLogos || [],
          stats: extractedData.socialProof?.stats || [],
          trustBadges: [],
          mediaLogos: []
        },
        content: {
          hero: {
            headline: extractedData.headline || '',
            subheadline: extractedData.subheadline || ''
          },
          ctas: extractedData.ctas || [],
          voice: {
            tone: this.inferVoiceTone(extractedData)
          },
          structure: {
            hierarchy: 'hero -> features -> social-proof -> cta',
            sections: this.identifySections(extractedData)
          },
          seo: {
            title: extractedData.title || '',
            description: extractedData.description || '',
            keywords: this.extractKeywords(extractedData)
          },
          performance: {
            readabilityScore: this.calculateReadability(extractedData),
            cta_clarity: extractedData.ctas?.length > 0 ? 'high' : 'low'
          }
        },
        technology: {
          stack: [],
          integrations: [],
          apis: []
        },
        competitors: [],
        insights: {
          strengths: this.identifyStrengths(extractedData),
          opportunities: this.identifyOpportunities(extractedData),
          positioning: extractedData.headline || ''
        },
        metrics: {
          users: this.extractUserCount(extractedData),
          rating: this.extractRating(extractedData)
        },
        screenshots,
        metadata: {
          url,
          domain,
          crawlDate: new Date().toISOString(),
          extractionVersion: '4.1.0',
          extractionDepth: 'comprehensive',
          confidence: this.calculateExtractionConfidence(extractedData)
        }
      };
      
      console.log(`✨ WebAnalysisV4: Analysis complete`);
      console.log(`🎨 Extracted colors:`, {
        primary: finalData.brand?.visual?.colors?.primary,
        secondary: finalData.brand?.visual?.colors?.secondary,
        accent: finalData.brand?.visual?.colors?.accent
      });
      
      return finalData;
      
    } catch (error) {
      console.error('❌ WebAnalysisV4 Error:', error);
      throw error;
    } finally {
      if (page) await page.close().catch(() => {});
      if (context) await context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    }
  }

  private async connectBrowser() {
    if (!process.env.BROWSERLESS_URL) {
      throw new Error('BROWSERLESS_URL not configured');
    }
    this.browser = await playwrightCore.chromium.connect(process.env.BROWSERLESS_URL);
  }

  private async createContext() {
    return await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
  }

  private async extractPageData(page: any) {
    return await page.evaluate(() => {
      // Utility functions
      const cleanText = (text: string | null | undefined): string => {
        return text?.trim().replace(/\s+/g, ' ').replace(/[\r\n\t]/g, ' ') || '';
      };

      const isValidText = (text: string, minLength = 3, maxLength = 200): boolean => {
        return text.length >= minLength && text.length <= maxLength && !/^[^a-zA-Z]*$/.test(text);
      };

      // 1. EXTRACT COMPANY NAME from logo, header, title
      const extractCompanyName = (): string => {
        // Try logo alt text first
        const logos = document.querySelectorAll('img[alt*="logo" i], img[src*="logo" i], [class*="logo" i] img, header img');
        for (const logo of logos) {
          const alt = (logo as HTMLImageElement).alt;
          if (alt && alt.toLowerCase().includes('logo')) {
            const name = alt.replace(/logo|icon|brand/gi, '').trim();
            if (isValidText(name, 2, 50)) return name;
          }
        }

        // Try header brand text
        const brandSelectors = [
          'header [class*="brand"]', 'header [class*="logo"]', 
          '.navbar-brand', '[data-testid*="brand"]', '[data-testid*="logo"]',
          'header h1', 'header .title', 'nav .brand'
        ];
        for (const selector of brandSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = cleanText(element.textContent);
            if (isValidText(text, 2, 30)) return text;
          }
        }

        // Fallback to domain from title
        const title = document.title;
        const titleParts = title.split(/[\|\-\–\—]/);
        if (titleParts.length > 1) {
          const lastPart = cleanText(titleParts[titleParts.length - 1]);
          if (isValidText(lastPart, 2, 20)) return lastPart;
        }

        return '';
      };

      // 2. EXTRACT VALUE PROPOSITIONS from hero sections
      const extractValueProps = () => {
        const heroSelectors = [
          '.hero', '[class*="hero"]', 'main section:first-child', 
          '.banner', '[class*="banner"]', '.intro', '[class*="intro"]',
          'section:first-of-type', '.landing', '[data-testid*="hero"]'
        ];

        let headline = '';
        let subheadline = '';
        let description = '';

        // Try to find hero section
        for (const selector of heroSelectors) {
          const heroSection = document.querySelector(selector);
          if (heroSection) {
            // Get main headline
            const h1 = heroSection.querySelector('h1')?.textContent;
            if (h1 && isValidText(cleanText(h1), 10, 150)) {
              headline = cleanText(h1);
            }

            // Get subheadline
            const subElements = heroSection.querySelectorAll('h2, p, .subtitle, [class*="subtitle"]');
            for (const el of subElements) {
              const text = cleanText(el.textContent);
              if (isValidText(text, 20, 300) && !headline.includes(text)) {
                subheadline = text;
                break;
              }
            }
            break;
          }
        }

        // Fallback to first h1
        if (!headline) {
          const h1 = document.querySelector('h1');
          if (h1) headline = cleanText(h1.textContent);
        }

        // Get meta description as fallback
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content');
        if (metaDesc && !subheadline) {
          subheadline = cleanText(metaDesc);
        }

        return { headline, subheadline, description };
      };

      // 3. EXTRACT PRODUCT FEATURES comprehensively  
      const extractFeatures = () => {
        const features: any[] = [];
        
        const featureSelectors = [
          '[class*="feature"]', '[class*="benefit"]', '[class*="service"]',
          '[class*="product"]', '[data-testid*="feature"]', '.card',
          'section [class*="grid"] > div', 'section [class*="column"]',
          '[class*="solution"]', '[class*="offering"]'
        ];

        const processedTexts = new Set<string>();

        for (const selector of featureSelectors) {
          const containers = document.querySelectorAll(selector);
          
          containers.forEach((container) => {
            // Look for feature title
            const titleElement = container.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]');
            const title = cleanText(titleElement?.textContent);
            
            // Look for feature description
            const descElement = container.querySelector('p, [class*="desc"], [class*="text"], .content');
            const description = cleanText(descElement?.textContent);
            
            // Look for icons
            const iconElement = container.querySelector('svg, img, [class*="icon"], i[class*="icon"]');
            let iconName = '';
            if (iconElement) {
              iconName = iconElement.getAttribute('alt') || 
                        iconElement.getAttribute('data-icon') || 
                        iconElement.getAttribute('class') || '';
            }

            if (isValidText(title, 5, 100) && !processedTexts.has(title)) {
              processedTexts.add(title);
              features.push({
                name: title,
                title,
                description: isValidText(description, 10, 500) ? description : '',
                desc: isValidText(description, 10, 500) ? description : '',
                icon: iconName
              });
            }
          });
          
          if (features.length >= 8) break; // Limit features
        }

        return features;
      };

      // 4. EXTRACT REAL CTAs from buttons and links
      const extractCTAs = () => {
        const ctas: any[] = [];
        const processedCTAs = new Set<string>();

        const ctaSelectors = [
          'button', '[role="button"]', '.btn', '.button', 
          'a[class*="btn"]', 'a[class*="button"]', '.cta',
          '[class*="cta"]', '[data-testid*="button"]', 
          'a[href*="signup" i]', 'a[href*="register" i]', 'a[href*="try" i]'
        ];

        ctaSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(element => {
            const text = cleanText(element.textContent);
            const href = (element as HTMLAnchorElement).href || '';
            
            if (isValidText(text, 2, 50) && !processedCTAs.has(text.toLowerCase())) {
              processedCTAs.add(text.toLowerCase());
              
              // Determine CTA type
              let type = 'secondary';
              const lowerText = text.toLowerCase();
              const style = window.getComputedStyle(element);
              
              if (lowerText.includes('get started') || lowerText.includes('sign up') || 
                  lowerText.includes('try') || lowerText.includes('start') ||
                  style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                type = 'primary';
              }

              ctas.push({
                label: text,
                type,
                placement: element.closest('header') ? 'header' : 
                          element.closest('[class*="hero"]') ? 'hero' : 'content',
                href: href
              });
            }
          });
        });

        return ctas.slice(0, 6);
      };

      // 5. EXTRACT SOCIAL PROOF (testimonials, logos, stats)
      const extractSocialProof = () => {
        const testimonials: any[] = [];
        const logos: string[] = [];
        const stats: any[] = [];

        // Extract testimonials
        const testimonialSelectors = [
          '[class*="testimonial"]', '[class*="review"]', '[class*="feedback"]',
          '[class*="quote"]', 'blockquote', '[data-testid*="testimonial"]'
        ];

        testimonialSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(element => {
            const quote = cleanText(element.querySelector('p, blockquote, [class*="text"]')?.textContent);
            const author = cleanText(element.querySelector('[class*="author"], [class*="name"], cite')?.textContent);
            const company = cleanText(element.querySelector('[class*="company"], [class*="org"]')?.textContent);
            
            if (isValidText(quote, 20, 500)) {
              testimonials.push({ quote, author, company });
            }
          });
        });

        // Extract customer logos
        const logoSelectors = [
          '[class*="customer"] img', '[class*="client"] img', 
          '[class*="partner"] img', '[class*="logo"] img'
        ];
        
        logoSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(img => {
            const alt = (img as HTMLImageElement).alt;
            const src = (img as HTMLImageElement).src;
            if (alt && isValidText(alt, 2, 50)) {
              logos.push(alt);
            }
          });
        });

        // Extract stats/metrics
        const statSelectors = [
          '[class*="stat"]', '[class*="metric"]', '[class*="number"]',
          '[class*="counter"]', '[data-testid*="stat"]'
        ];

        statSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(element => {
            const text = cleanText(element.textContent);
            const numberMatch = text.match(/[\d,]+(\+|%|k|m|b)?/gi);
            
            if (numberMatch) {
              const label = text.replace(numberMatch[0], '').trim();
              stats.push({
                value: numberMatch[0],
                label: isValidText(label) ? label : 'metric'
              });
            }
          });
        });

        return {
          testimonials: testimonials.slice(0, 5),
          customerLogos: logos.slice(0, 10),
          stats: stats.slice(0, 8)
        };
      };

      // 6. EXTRACT PROBLEM/SOLUTION from content
      const extractProblemSolution = () => {
        let problem = '';
        let solution = '';

        // Look for problem indicators
        const problemSelectors = [
          '[class*="problem"]', '[class*="challenge"]', '[class*="pain"]',
          'h2:contains("problem")', 'h3:contains("challenge")'
        ];

        // Look for solution indicators  
        const solutionSelectors = [
          '[class*="solution"]', '[class*="benefit"]', '[class*="advantage"]',
          'h2:contains("solution")', 'h3:contains("how")'
        ];

        // Extract problem context from paragraphs mentioning common pain points
        document.querySelectorAll('p').forEach(p => {
          const text = cleanText(p.textContent);
          if (text.match(/difficult|hard|challenge|problem|struggle|frustrat|complex|time.?consuming/i) && 
              isValidText(text, 30, 300) && !problem) {
            problem = text;
          }
        });

        // Extract solution from value prop or how-it-works sections
        document.querySelectorAll('section, [class*="how"], [class*="work"]').forEach(section => {
          const text = cleanText(section.textContent);
          if (text.match(/automat|simplif|streamlin|efficien|easy|fast|quick|solution/i) && 
              isValidText(text, 30, 300) && !solution) {
            const sentences = text.split('.').filter(s => isValidText(s.trim()));
            solution = sentences[0] + '.';
          }
        });

        return { problem, solution };
      };

      // Color extraction (keep existing logic)
      const extractColors = () => {
        const colors: Record<string, number> = {};
        const palette: any[] = [];
        
        const buttons = document.querySelectorAll('button, [role="button"], .btn, .button, a.button');
        buttons.forEach(btn => {
          const style = window.getComputedStyle(btn);
          const bgColor = style.backgroundColor;
          const color = style.color;
          
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            colors[bgColor] = (colors[bgColor] || 0) + 1;
          }
          if (color && color !== 'rgba(0, 0, 0, 0)') {
            colors[color] = (colors[color] || 0) + 1;
          }
        });
        
        const headers = document.querySelectorAll('header, .hero, [class*="hero"], h1, h2');
        headers.forEach(header => {
          const style = window.getComputedStyle(header);
          const bgColor = style.backgroundColor;
          const color = style.color;
          
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            colors[bgColor] = (colors[bgColor] || 0) + 1;
          }
          if (color) {
            colors[color] = (colors[color] || 0) + 1;
          }
        });
        
        const sortedColors = Object.entries(colors)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        
        sortedColors.forEach(([color, freq]) => {
          const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          let hex = color;
          
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            hex = '#' + [r, g, b].map(x => {
              const hex = x.toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            }).join('');
          }
          
          palette.push({ hex, rgb: color, frequency: freq });
        });
        
        const primary = palette[0]?.hex || '#2563eb';
        const secondary = palette.find(c => c.hex !== primary && (c.hex.includes('f') || c.hex.includes('e')))?.hex || '#ffffff';
        const accent = palette.find(c => c.hex !== primary && c.hex !== secondary)?.hex || '#3b82f6';
        
        return { primary, secondary, accent, palette };
      };

      // Font extraction (keep existing)
      const extractFonts = () => {
        const fontFamilies = new Set<string>();
        
        ['h1', 'h2', 'h3', 'p', 'button', 'a'].forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            const style = window.getComputedStyle(el);
            const fontFamily = style.fontFamily;
            if (fontFamily) {
              const cleanFont = fontFamily.split(',')[0]?.replace(/['"]/g, '').trim();
              if (cleanFont) fontFamilies.add(cleanFont);
            }
          });
        });
        
        const fonts = Array.from(fontFamilies);
        return {
          primary: fonts.slice(0, 2),
          headings: fonts.slice(0, 2),
          body: fonts.slice(0, 2)
        };
      };

      // Execute all extractions
      const companyName = extractCompanyName();
      const valueProps = extractValueProps();
      const features = extractFeatures();
      const ctas = extractCTAs();
      const socialProof = extractSocialProof();
      const problemSolution = extractProblemSolution();
      const colors = extractColors();
      const fonts = extractFonts();
      
      // Extract button styles
      const firstButton = document.querySelector('button, .btn, .button');
      let buttonRadius = '0.5rem';
      if (firstButton) {
        const style = window.getComputedStyle(firstButton);
        buttonRadius = style.borderRadius || '0.5rem';
      }
      
      const title = document.title;
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

      return {
        // Basic info
        title,
        description,
        companyName,
        
        // Value props
        headline: valueProps.headline || title,
        subheadline: valueProps.subheadline || description,
        
        // Visual
        colors,
        fonts,
        buttonRadius,
        
        // Content
        ctas,
        features,
        
        // Narrative
        problem: problemSolution.problem,
        solution: problemSolution.solution,
        
        // Social proof
        socialProof
      };
    });
  }

  private async captureScreenshots(page: any, url: string) {
    const screenshots = [];
    
    try {
      // Take hero section screenshot
      const heroBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 90,
        fullPage: false
      });
      
      const heroUrl = await uploadScreenshotToR2(
        heroBuffer,
        `${Date.now()}_hero.jpg`,
        this.projectId
      );
      
      screenshots.push({
        id: `${Date.now()}_hero`,
        url: heroUrl,
        type: 'hero',
        description: 'Hero section',
        timestamp: new Date().toISOString()
      });
      
      // Take full page screenshot
      const fullBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 85,
        fullPage: true
      });
      
      const fullUrl = await uploadScreenshotToR2(
        fullBuffer,
        `${Date.now()}_full.jpg`,
        this.projectId
      );
      
      screenshots.push({
        id: `${Date.now()}_full`,
        url: fullUrl,
        type: 'full',
        description: 'Full page',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Screenshot error:', error);
    }
    
    return screenshots;
  }

  // Helper methods for advanced data inference
  private inferBrandArchetype(data: any): string {
    const headline = data.headline?.toLowerCase() || '';
    const features = data.features || [];
    const ctas = data.ctas || [];
    
    if (headline.includes('innovate') || headline.includes('future') || headline.includes('next')) {
      return 'innovator';
    }
    if (headline.includes('trust') || headline.includes('secure') || headline.includes('reliable')) {
      return 'protector';
    }
    if (features.some((f: any) => f.title?.toLowerCase().includes('premium') || f.title?.toLowerCase().includes('luxury'))) {
      return 'sophisticate';
    }
    if (ctas.some((c: any) => c.label?.toLowerCase().includes('join') || c.label?.toLowerCase().includes('community'))) {
      return 'everyman';
    }
    return 'professional';
  }

  private inferVoiceTone(data: any): string {
    const text = [data.headline, data.subheadline, data.description].join(' ').toLowerCase();
    
    if (text.includes('exciting') || text.includes('amazing') || text.includes('!')) {
      return 'enthusiastic';
    }
    if (text.includes('simple') || text.includes('easy') || text.includes('friendly')) {
      return 'approachable';
    }
    if (text.includes('expert') || text.includes('professional') || text.includes('enterprise')) {
      return 'authoritative';
    }
    if (text.includes('innovative') || text.includes('cutting-edge') || text.includes('advanced')) {
      return 'innovative';
    }
    return 'professional';
  }

  private extractKeywords(data: any): string[] {
    const text = [data.headline, data.subheadline, data.description, 
                  ...(data.features?.map((f: any) => f.title) || [])].join(' ');
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && 
                     !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were'].includes(word));
    
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private identifyEmotionalTriggers(data: any): string[] {
    const triggers: string[] = [];
    const text = [data.headline, data.subheadline].join(' ').toLowerCase();
    
    if (text.includes('save time') || text.includes('faster') || text.includes('quick')) {
      triggers.push('efficiency');
    }
    if (text.includes('save money') || text.includes('cost') || text.includes('affordable')) {
      triggers.push('economy');
    }
    if (text.includes('secure') || text.includes('safe') || text.includes('protect')) {
      triggers.push('security');
    }
    if (text.includes('easy') || text.includes('simple') || text.includes('effortless')) {
      triggers.push('convenience');
    }
    
    return triggers;
  }

  private detectUrgencySignals(data: any): string[] {
    const signals: string[] = [];
    const ctas = data.ctas || [];
    const text = [data.headline, data.subheadline].join(' ').toLowerCase();
    
    if (ctas.some((c: any) => c.label?.toLowerCase().includes('now') || c.label?.toLowerCase().includes('today'))) {
      signals.push('time-based');
    }
    if (text.includes('limited') || text.includes('exclusive') || text.includes('only')) {
      signals.push('scarcity');
    }
    if (text.includes('free') || text.includes('trial') || text.includes('demo')) {
      signals.push('risk-reduction');
    }
    
    return signals;
  }

  private inferProblem(data: any): string {
    const features = data.features || [];
    if (features.length > 0) {
      return `Traditional solutions lack ${features[0]?.title?.toLowerCase() || 'efficiency'}`;
    }
    return 'Complex processes waste time and resources';
  }

  private inferSolution(data: any): string {
    const headline = data.headline || '';
    if (headline.includes('automate') || headline.includes('streamline')) {
      return 'Automated solution that streamlines operations';
    }
    return 'Modern platform that simplifies workflows';
  }

  private mapFeaturesToBenefits(features: any[]): any[] {
    return features.map(feature => ({
      feature: feature.title,
      benefit: this.featureToBenefit(feature.title || ''),
      impact: 'improved efficiency'
    }));
  }

  private featureToBenefit(featureTitle: string): string {
    const lower = featureTitle.toLowerCase();
    if (lower.includes('automat')) return 'Save time with automated processes';
    if (lower.includes('integrat')) return 'Seamlessly connect your tools';
    if (lower.includes('analyt')) return 'Make data-driven decisions';
    if (lower.includes('secur')) return 'Protect your sensitive data';
    if (lower.includes('mobile')) return 'Work from anywhere, anytime';
    return `Enhanced ${featureTitle.toLowerCase()}`;
  }

  private inferCategory(data: any): string {
    const text = [data.headline, data.subheadline, data.title].join(' ').toLowerCase();
    
    if (text.includes('marketing')) return 'Marketing Technology';
    if (text.includes('sales')) return 'Sales Technology';
    if (text.includes('finance') || text.includes('expense') || text.includes('payment')) return 'Financial Technology';
    if (text.includes('hr') || text.includes('people')) return 'Human Resources';
    if (text.includes('project') || text.includes('task')) return 'Project Management';
    if (text.includes('customer') || text.includes('crm')) return 'Customer Relationship Management';
    if (text.includes('data') || text.includes('analyt')) return 'Data & Analytics';
    if (text.includes('design') || text.includes('creative')) return 'Design & Creative';
    
    return 'Business Software';
  }

  private inferPricingModel(data: any): string {
    const ctas = data.ctas || [];
    const ctaText = ctas.map((c: any) => c.label?.toLowerCase()).join(' ');
    
    if (ctaText.includes('free') || ctaText.includes('trial')) return 'freemium';
    if (ctaText.includes('demo') || ctaText.includes('contact')) return 'enterprise';
    if (ctaText.includes('subscribe') || ctaText.includes('plan')) return 'subscription';
    
    return 'subscription';
  }

  private identifySections(data: any): string[] {
    const sections = ['hero'];
    
    if (data.features && data.features.length > 0) sections.push('features');
    if (data.socialProof?.testimonials && data.socialProof.testimonials.length > 0) sections.push('testimonials');
    if (data.socialProof?.stats && data.socialProof.stats.length > 0) sections.push('stats');
    if (data.ctas && data.ctas.length > 0) sections.push('cta');
    
    return sections;
  }

  private calculateReadability(data: any): number {
    const text = [data.headline, data.subheadline].join(' ');
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = words.reduce((acc, word) => {
      return acc + this.countSyllables(word);
    }, 0) / words.length;
    
    // Simplified Flesch Reading Ease
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private countSyllables(word: string): number {
    const vowels = 'aeiouy';
    let count = 0;
    let prevCharWasVowel = false;
    
    for (const char of word.toLowerCase()) {
      const isVowel = vowels.includes(char);
      if (isVowel && !prevCharWasVowel) count++;
      prevCharWasVowel = isVowel;
    }
    
    return Math.max(1, count);
  }

  private identifyStrengths(data: any): string[] {
    const strengths: string[] = [];
    
    if (data.features && data.features.length >= 3) {
      strengths.push('comprehensive feature set');
    }
    if (data.socialProof?.testimonials && data.socialProof.testimonials.length > 0) {
      strengths.push('strong customer validation');
    }
    if (data.ctas && data.ctas.length > 1) {
      strengths.push('clear call-to-action strategy');
    }
    if (data.headline && data.headline.length > 20 && data.headline.length < 60) {
      strengths.push('effective headline length');
    }
    
    return strengths;
  }

  private identifyOpportunities(data: any): string[] {
    const opportunities: string[] = [];
    
    if (!data.socialProof?.testimonials || data.socialProof.testimonials.length === 0) {
      opportunities.push('add customer testimonials');
    }
    if (!data.socialProof?.stats || data.socialProof.stats.length === 0) {
      opportunities.push('showcase key metrics');
    }
    if (!data.features || data.features.length < 3) {
      opportunities.push('highlight more key features');
    }
    if (!data.problem || data.problem.length < 20) {
      opportunities.push('articulate problem statement');
    }
    
    return opportunities;
  }

  private extractUserCount(data: any): number {
    const stats = data.socialProof?.stats || [];
    for (const stat of stats) {
      if (stat.label?.toLowerCase().includes('user') || 
          stat.label?.toLowerCase().includes('customer') ||
          stat.label?.toLowerCase().includes('client')) {
        const numMatch = stat.value?.match(/[\d,]+/);
        if (numMatch) {
          const num = parseInt(numMatch[0].replace(/,/g, ''));
          return num > 0 ? num : 10000;
        }
      }
    }
    return 10000; // Default
  }

  private extractRating(data: any): number {
    const stats = data.socialProof?.stats || [];
    for (const stat of stats) {
      if (stat.label?.toLowerCase().includes('rating') || 
          stat.label?.toLowerCase().includes('score') ||
          stat.label?.toLowerCase().includes('star')) {
        const numMatch = stat.value?.match(/[\d.]+/);
        if (numMatch) {
          const num = parseFloat(numMatch[0]);
          return num >= 1 && num <= 5 ? num : 4.8;
        }
      }
    }
    return 4.8; // Default
  }

  private calculateExtractionConfidence(data: any): number {
    let score = 0;
    
    if (data.companyName) score += 20;
    if (data.headline && data.headline.length > 10) score += 20;
    if (data.features && data.features.length > 0) score += 20;
    if (data.ctas && data.ctas.length > 0) score += 15;
    if (data.socialProof?.testimonials && data.socialProof.testimonials.length > 0) score += 15;
    if (data.colors && data.colors.primary !== '#2563eb') score += 10;
    
    return Math.min(100, score);
  }
}