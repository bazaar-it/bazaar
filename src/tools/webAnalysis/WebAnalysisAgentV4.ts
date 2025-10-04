/**
 * WebAnalysisAgentV4 - Simplified and Working Brand Extraction
 * A clean, functional version that actually extracts brand data
 */

import * as playwrightCore from 'playwright-core';
import { uploadScreenshotToR2 } from '~/lib/utils/r2-upload';
import { toolsLogger } from '~/lib/utils/logger';

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
    toolsLogger.info(`🚀 WebAnalysisV4: Starting analysis of ${url}`);
    console.log('[WebAnalysisV4] Step 1: Starting analysis');

    let context: any = null;
    let page: any = null;

    try {
      // Connect to Browserless
      console.log('[WebAnalysisV4] Step 2: Connecting to browser...');
      await this.connectBrowser();
      console.log('[WebAnalysisV4] Step 3: Browser connected, creating context...');
      context = await this.createContext();
      console.log('[WebAnalysisV4] Step 4: Context created, opening new page...');
      page = await context.newPage();
      console.log('[WebAnalysisV4] Step 5: Page opened, setting timeout...');

      // Set extended page timeout for complex sites
      page.setDefaultTimeout(60000);

      // Navigate to the website
      try {
        console.log('[WebAnalysisV4] Step 6: Navigating to URL with networkidle...');
        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 45_000,
        });
        console.log('[WebAnalysisV4] Step 7: Navigation successful (networkidle)');
      } catch (error) {
        toolsLogger.warn('⚠️ WebAnalysisV4: networkidle navigation timeout, falling back to domcontentloaded', {
          url,
          message: error instanceof Error ? error.message : String(error),
        });
        console.log('[WebAnalysisV4] Step 7b: Retrying with domcontentloaded...');
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 45_000,
        });
        console.log('[WebAnalysisV4] Step 7c: Navigation successful (domcontentloaded)');
      }

      // Wait a bit longer so heavy hero sections and client logos load
      console.log('[WebAnalysisV4] Step 8: Waiting 4s for content to load...');
      await page.waitForTimeout(4000);
      console.log('[WebAnalysisV4] Step 9: Wait complete, extracting page data...');

      // Extract brand data from the page
      toolsLogger.info('🔍 WebAnalysisV4: Extracting page data...');
      const extractedData = await this.extractPageData(page);
      console.log('[WebAnalysisV4] Step 10: Page data extracted, processing...');
      
      // Log what we actually extracted
      toolsLogger.debug('🔍 WebAnalysisV4: Extracted raw data:', {
        companyName: extractedData.companyName,
        headline: extractedData.headline,
        subheadline: extractedData.subheadline,
        featuresCount: extractedData.features?.length || 0,
        ctasCount: extractedData.ctas?.length || 0,
        colorsFound: {
          primary: extractedData.colors?.primary,
          secondary: extractedData.colors?.secondary,
          paletteSize: extractedData.colors?.palette?.length || 0
        },
        fontsFound: extractedData.fonts,
        socialProofFound: {
          testimonials: extractedData.socialProof?.testimonials?.length || 0,
          stats: extractedData.socialProof?.stats?.length || 0
        }
      });
      
      // Take screenshots with validation
      console.log('[WebAnalysisV4] Step 11: Capturing screenshots...');
      let screenshots: any[] = [];
      if (page && !page.isClosed()) {
        screenshots = await this.captureScreenshots(page, url);
        console.log(`[WebAnalysisV4] Step 12: Screenshots captured (${screenshots.length} total)`);
      } else {
        toolsLogger.warn('⚠️ WebAnalysisV4: Page closed before screenshots, skipping');
        console.log('[WebAnalysisV4] Step 12: Page closed, skipping screenshots');
      }
      
      // Get the domain name for brand identity
      const domain = new URL(url).hostname.replace('www.', '');
      
      // Build the final data structure with comprehensive extracted data
      const finalData: ExtractedBrandDataV4 = {
        brand: {
          identity: {
            name: extractedData.companyName || extractedData.title || domain,
            tagline: extractedData.subheadline || extractedData.description || '',
            mission: extractedData.socialProof?.stats?.find((s: any) => s.label.toLowerCase().includes('mission'))?.value || '',
            vision: extractedData.socialProof?.stats?.find((s: any) => s.label.toLowerCase().includes('vision'))?.value || '',
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
            differentiators: extractedData.features?.slice(0, 3).map((f: any) => f.title) || []
          },
          pricing: {
            model: this.inferPricingModel(extractedData),
            tiers: []
          },
          journey: {
            awareness: extractedData.problem || '',
            consideration: extractedData.features?.map((f: any) => f.title).join(', ') || '',
            decision: extractedData.ctas?.[0]?.label || 'Get Started'
          },
          core: {
            mainFeature: extractedData.features?.[0]?.title || '',
            keyBenefit: extractedData.features?.[0]?.description || ''
          },
          useCases: extractedData.features?.map((f: any) => ({
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
      
      toolsLogger.info(`✨ WebAnalysisV4: Analysis complete`);
      toolsLogger.debug(`🎨 Extracted colors`, {
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
    
    try {
      this.browser = await playwrightCore.chromium.connect(process.env.BROWSERLESS_URL, {
        timeout: 30000 // 30 second timeout for connection
      });
      toolsLogger.info('✅ Connected to Browserless');
    } catch (error: any) {
      toolsLogger.error('❌ Failed to connect to Browserless:', error.message);
      throw new Error(`Browser connection failed: ${error.message}`);
    }
  }

  private async createContext() {
    if (!this.browser) {
      throw new Error('Browser not connected');
    }
    
    return await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      // Add more robust settings
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      javaScriptEnabled: true
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
        const hostname = window.location.hostname.replace(/^www\./i, '');
        const domainSlug = hostname.split('.')[0] || hostname;

        const SKIP_SECTION_SELECTORS = [
          '[class*="customer" i]',
          '[class*="logos" i]',
          '[class*="clients" i]',
          '[class*="partners" i]',
          '[class*="investors" i]',
          '[data-section*="customers" i]',
          '[aria-label*="customers" i]',
        ];

        const isInSkipSection = (node: Element | null): boolean => {
          if (!node) return false;
          return SKIP_SECTION_SELECTORS.some((selector) => node.closest(selector));
        };

        type Candidate = { value: string; weight: number };
        const candidates: Candidate[] = [];
        const pushCandidate = (raw: string | null | undefined, weight: number) => {
          const cleaned = cleanText(raw || '');
          if (!isValidText(cleaned, 2, 50)) return;
          if (candidates.some((candidate) => candidate.value.toLowerCase() === cleaned.toLowerCase())) {
            return;
          }
          candidates.push({ value: cleaned, weight });
        };

        const ogSiteName = document.querySelector('meta[property="og:site_name" i]')?.getAttribute('content');
        pushCandidate(ogSiteName, 12);

        // Header and navigation logos first
        const primaryLogoSelectors = [
          'header img[alt]',
          'nav img[alt]',
          '[data-testid*="logo" i] img[alt]',
          'header svg[aria-label], header svg title',
        ];
        primaryLogoSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((node) => {
            const element = node as Element;
            if (isInSkipSection(element)) return;

            if (element instanceof HTMLImageElement) {
              const alt = element.alt;
              if (alt) {
                if (alt.toLowerCase().includes('logo')) {
                  pushCandidate(alt.replace(/logo|icon|brand/gi, ''), 10);
                } else {
                  pushCandidate(alt, 9);
                }
              }
            }

            if (element.hasAttribute('aria-label')) {
              pushCandidate(element.getAttribute('aria-label'), 9);
            }

            const titleNode = element.querySelector('title');
            if (titleNode) {
              pushCandidate(titleNode.textContent, 9);
            }
          });
        });

        // Header brand text elements
        const brandSelectors = [
          'header [class*="brand" i]',
          'header [class*="logo" i]',
          '.navbar-brand',
          '[data-testid*="brand" i]',
          'header h1',
          'header .title',
          'nav .brand',
          'nav a[aria-label]',
        ];
        brandSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((element) => {
            if (isInSkipSection(element)) return;
            pushCandidate(element.textContent, 8);
          });
        });

        // Broad logo scan if we still do not have candidates
        if (candidates.length === 0) {
          document.querySelectorAll('img[alt*="logo" i], img[src*="logo" i]').forEach((logo) => {
            if (!(logo instanceof HTMLImageElement)) return;
            if (isInSkipSection(logo)) return;
            const alt = logo.alt.replace(/logo|icon|brand/gi, '').trim();
            pushCandidate(alt, 6);
          });
        }

        // Try hero heading text as a fallback signal
        const heroH1 = document.querySelector('main h1')?.textContent || document.querySelector('section h1')?.textContent;
        pushCandidate(heroH1, 5);

        // Meta title parts
        const title = document.title;
        const titleParts = title.split(/[\|\-\–\—]/).map((part) => cleanText(part));
        titleParts.forEach((part, index) => {
          const weight = index === 0 ? 4 : 3;
          pushCandidate(part, weight);
        });

        // Domain-derived fallback (e.g., "Y Combinator" from ycombinator.com)
        const domainWords = domainSlug
          .split(/[-_]/)
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        pushCandidate(domainWords, 3);
        pushCandidate(hostname, 2);

        if (candidates.length === 0) {
          return domainWords || hostname || '';
        }

        const normalizedDomain = domainSlug.replace(/[^a-z0-9]/gi, '').toLowerCase();

        const scored = candidates.map(({ value, weight }) => {
          const normalizedValue = value.replace(/[^a-z0-9]/gi, '').toLowerCase();
          let score = weight;

          if (normalizedDomain && normalizedValue.includes(normalizedDomain)) {
            score += 8;
          } else if (normalizedDomain && normalizedDomain.includes(normalizedValue) && normalizedValue.length >= 3) {
            score += 4;
          }

          if (/customers?|clients?|partners?/i.test(value)) {
            score -= 4;
          }

          // Penalize clearly unrelated household names that do not match the domain
          if (normalizedDomain && normalizedValue && normalizedValue.length > 1 && !normalizedValue.includes(normalizedDomain)) {
            score -= 1;
          }

          return { value, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.value || domainWords || hostname || '';
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

        // Look for problem indicators in text content
        const problemKeywords = ['challenge', 'problem', 'issue', 'struggle', 'pain', 'difficult', 'frustrat', 'complex', 'time-consuming', 'inefficient'];
        const solutionKeywords = ['solution', 'solve', 'fix', 'improve', 'optimize', 'streamline', 'simplify', 'automate', 'transform', 'enhance'];
        
        // Search through all text content
        const allText = document.querySelectorAll('p, h2, h3, li');
        
        allText.forEach((element) => {
          const text = cleanText(element.textContent).toLowerCase();
          
          // Find problem statements
          if (!problem && problemKeywords.some(keyword => text.includes(keyword))) {
            if (isValidText(cleanText(element.textContent), 20, 300)) {
              problem = cleanText(element.textContent);
            }
          }
          
          // Find solution statements
          if (!solution && solutionKeywords.some(keyword => text.includes(keyword))) {
            if (isValidText(cleanText(element.textContent), 20, 300)) {
              solution = cleanText(element.textContent);
            }
          }
        });
        
        // Fallback to feature-based problem/solution
        if (!problem) {
          problem = 'Many businesses struggle with outdated processes and inefficient workflows';
        }
        if (!solution) {
          solution = 'Our platform provides modern tools and automation to streamline your operations';
        }
        
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
            const r = parseInt(rgbMatch[1]!);
            const g = parseInt(rgbMatch[2]!);
            const b = parseInt(rgbMatch[3]!);
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

  private async captureScreenshots(page: any, _url: string) {
    console.log('[WebAnalysisV4] captureScreenshots: Starting...');
    const screenshots = [];

    // Validate page is still open
    if (!page || page.isClosed()) {
      toolsLogger.warn('⚠️ WebAnalysisV4: Page is closed, cannot take screenshots');
      console.log('[WebAnalysisV4] captureScreenshots: Page is closed, aborting');
      return screenshots;
    }
    console.log('[WebAnalysisV4] captureScreenshots: Page is open, proceeding...');
    
    // Helper function to safely take screenshot with retry
    const takeScreenshotWithRetry = async (options: any, maxRetries = 3): Promise<Buffer | null> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Check if page is still valid before each attempt
          if (page.isClosed()) {
            toolsLogger.warn(`⚠️ Screenshot attempt ${attempt}: Page is closed`);
            return null;
          }
          
          const buffer = await page.screenshot(options);
          return buffer;
        } catch (error: any) {
          toolsLogger.warn(`⚠️ Screenshot attempt ${attempt} failed:`, error.message);
          
          if (attempt === maxRetries) {
            toolsLogger.error('❌ All screenshot attempts failed');
            return null;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      return null;
    };
    
    try {
      // Take hero section screenshot with retry
      toolsLogger.info('📸 Taking hero section screenshot...');
      const heroBuffer = await takeScreenshotWithRetry({
        type: 'jpeg',
        quality: 90,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1920, height: 1080 }
      });
      
      if (heroBuffer) {
        try {
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
          toolsLogger.info('✅ Hero screenshot captured and uploaded successfully');
        } catch (uploadError: any) {
          toolsLogger.error('❌ Failed to upload hero screenshot:', uploadError.message);
          // Continue without this screenshot
        }
      } else {
        toolsLogger.warn('⚠️ Failed to capture hero screenshot');
      }
      
      // Small delay between screenshots
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Take full page screenshot with retry
      toolsLogger.info('📸 Taking full page screenshot...');
      const fullBuffer = await takeScreenshotWithRetry({
        type: 'jpeg',
        quality: 85,
        fullPage: true
      });
      
      if (fullBuffer) {
        try {
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
          toolsLogger.info('✅ Full page screenshot captured and uploaded successfully');
        } catch (uploadError: any) {
          toolsLogger.error('❌ Failed to upload full page screenshot:', uploadError.message);
          // Continue without this screenshot
        }
      } else {
        toolsLogger.warn('⚠️ Failed to capture full page screenshot');
      }
      
    } catch (error: any) {
      toolsLogger.error('❌ Screenshot error:', error.message);
      // Don't throw, just return what we have
    }
    
    toolsLogger.info(`📸 Captured ${screenshots.length} screenshot(s)`);
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
