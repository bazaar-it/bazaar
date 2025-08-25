/**
 * BrandAnalyzerV2 - Comprehensive Brand Analysis from Pre-Extracted Data
 * 
 * Takes extraction results and produces a massive, detailed BrandJSON
 * using LLM analysis of screenshots, HTML, and computed styles.
 */

import OpenAI from 'openai';
import { toolsLogger } from '~/lib/utils/logger';

// Import the proper Sprint 99.5 types
interface Color {
  hex: string;
  rgb?: [number, number, number];
  role?: 'primary' | 'secondary' | 'accent' | 'background' | 'text' | 'border';
  confidence?: number;
  source?: 'css' | 'computed' | 'image';
}

interface FontSpec {
  family: string;
  fallback?: string;
  weight?: number;
  size?: string;
  lineHeight?: string;
  letterSpacing?: string;
  source?: 'css' | 'computed';
}

interface Evidence {
  screenshotId?: string;
  domSelector?: string;
  confidence: number;
  extractedAt: string;
}

interface TextContent {
  text: string;
  formatted?: string;
  tokens?: number;
  evidence: Evidence;
}

interface Section {
  id: string;
  name: string;
  type: 'hero' | 'features' | 'testimonials' | 'pricing' | 'stats' | 'cta' | 'other';
  order: number;
  evidence: Evidence;
  
  content: {
    headline?: TextContent;
    subheadline?: TextContent;
    body?: TextContent[];
    bullets?: TextContent[];
    ctas?: Array<{
      label: string;
      href?: string;
      type: 'primary' | 'secondary' | 'text';
      icon?: string;
      evidence: Evidence;
    }>;
  };
  
  visual: {
    layout: 'single-column' | 'two-column' | 'three-column' | 'grid' | 'masonry';
    alignment: 'left' | 'center' | 'right';
    background?: {
      type: 'color' | 'gradient' | 'image';
      value: string;
    };
    spacing: 'compact' | 'normal' | 'spacious';
    screenshots: string[];
  };
}

export interface BrandJSONV2 {
  id: string;
  url: string;
  extractionId: string;
  createdAt: string;
  
  // THE MAIN CONTENT - Direct LLM outputs
  visualAnalysis?: any;  // Everything GPT-4.1-mini extracted from screenshots
  contentAnalysis?: any; // Everything from HTML analysis
  synthesis?: any;       // Combined insights
  
  // Brand identity
  brand: {
    name?: string;
    tagline?: string;
    mission?: string;
    vision?: string;
    values?: string[];
    archetype?: string;
    voice: string[];
    evidence: Evidence;
  };
  
  // Design system
  design: {
    colors: {
      primary: Color;
      secondary?: Color;
      accent?: Color;
      background: Color;
      text: Color;
      muted?: Color;
      palette?: Color[];
      gradients?: string[];
      evidence: Evidence;
    };
    
    typography: {
      headings: FontSpec;
      body: FontSpec;
      ui?: FontSpec;
      code?: FontSpec;
      evidence: Evidence;
    };
    
    spacing: {
      unit: number;
      scale: number[];
    };
    
    borders: {
      radius: string;
      width: string;
      color?: Color;
    };
    
    shadows?: {
      sm?: string;
      md?: string;
      lg?: string;
    };
  };
  
  // Product & features
  product: {
    value_proposition: {
      headline?: string;
      subheadline?: string;
      evidence: Evidence;
    };
    
    problem?: string;
    solution?: string;
    
    features: Array<{
      id: string;
      title: string;
      description?: string;
      icon?: string;
      evidence: Evidence;
    }>;
    
    benefits?: string[];
    targetAudience?: string[];
    useCases?: Array<{
      title: string;
      description: string;
    }>;
    
    pricing?: {
      model?: 'subscription' | 'one-time' | 'freemium' | 'custom';
      tiers?: Array<{
        name: string;
        price?: string;
        features?: string[];
      }>;
    };
  };
  
  // Social proof
  socialProof: {
    testimonials?: Array<{
      quote: string;
      author?: string;
      company?: string;
      role?: string;
      avatar?: string;
      evidence: Evidence;
    }>;
    
    customerLogos?: Array<{
      name: string;
      logoUrl?: string;
    }>;
    
    stats?: Array<{
      value: string;
      label: string;
      context?: string;
      evidence: Evidence;
    }>;
    
    awards?: string[];
    certifications?: string[];
    mediaLogos?: string[];
  };
  
  // Page sections
  sections: Section[];
  
  // Content analysis
  content: {
    keywords?: string[];
    emotionalTriggers?: string[];
    painPoints?: string[];
    benefits?: string[];
    differentiators?: string[];
    
    tone?: {
      primary: string;
      attributes: string[];
    };
    
    readability?: {
      score: number;
      level: string;
    };
  };
  
  // Visual elements
  visuals: {
    photos?: Array<{
      id: string;
      screenshotRef: string;
      message: string;
      purpose: 'hero' | 'feature' | 'testimonial' | 'decoration' | 'product';
      evidence: Evidence;
    }>;
    
    uiComponents?: Array<{
      id: string;
      type: 'dashboard' | 'card' | 'form' | 'chart' | 'interface' | 'widget';
      rebuildSpec: {
        layout: string;
        styling: Record<string, string>;
        components: string[];
        interactions?: string[];
      };
      evidence: Evidence;
    }>;
    
    icons?: Array<{
      type: string;
      usage: string;
      style: 'line' | 'solid' | 'duotone';
    }>;
  };
  
  // Confidence scoring
  confidence: {
    overall: number;
    breakdown: {
      structure: number;
      content: number;
      visual: number;
      brand: number;
      product: number;
    };
  };
  
  // Metadata
  metadata: {
    analysisVersion: string;
    timestamp: string;
    processingTime: number;
    tokensUsed?: number;
  };
}

export class BrandAnalyzerV2 {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  /**
   * Analyze pre-extracted data to produce comprehensive BrandJSON
   */
  async analyze(extractionData: {
    url: string;
    html: { raw?: string; cleaned?: string; rendered?: string };
    screenshots: Array<{ id: string; type: string; url?: string; dimensions?: any }>;
    styles: { palette: string[]; fonts: any[] };
    metadata: any;
  }): Promise<BrandJSONV2> {
    const startTime = Date.now();
    toolsLogger.info('🧠 BrandAnalyzerV2: Starting comprehensive brand analysis');
    
    try {
      // Step 1: Visual Analysis with GPT-4 Vision
      const visualAnalysis = await this.analyzeVisuals(extractionData.screenshots);
      
      // Step 2: Content Analysis from HTML
      const contentAnalysis = await this.analyzeContent(extractionData.html);
      
      // Step 3: Style System Analysis
      const styleAnalysis = this.analyzeStyles(extractionData.styles);
      
      // Step 4: Comprehensive Brand Synthesis
      const brandSynthesis = await this.synthesizeBrand({
        visual: visualAnalysis,
        content: contentAnalysis,
        styles: styleAnalysis,
        url: extractionData.url,
        metadata: extractionData.metadata,
      });
      
      // Step 5: Build Complete BrandJSON
      const brandJson = this.buildBrandJSON({
        url: extractionData.url,
        extractionId: `ext_${Date.now()}`,
        visual: visualAnalysis,
        content: contentAnalysis,
        styles: styleAnalysis,
        synthesis: brandSynthesis,
        screenshots: extractionData.screenshots,
      });
      
      // Add metadata
      brandJson.metadata = {
        analysisVersion: '2.0.0',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        tokensUsed: 0, // We'll track this in real implementation
      };
      
      // Log what we're returning
      console.log('='.repeat(80));
      console.log('📦 FINAL BRANDJSON BEING RETURNED:');
      console.log('Brand name:', brandJson.brand?.name);
      console.log('Main headline:', brandJson.product?.value_proposition?.headline);
      console.log('Visual analysis keys:', Object.keys(brandJson.visualAnalysis || {}));
      console.log('Has visual analysis content?', !!brandJson.visualAnalysis);
      console.log('Visual TEXT CONTENT sample:', JSON.stringify(brandJson.visualAnalysis?.['TEXT CONTENT'], null, 2)?.substring(0, 500));
      console.log('='.repeat(80));
      
      toolsLogger.info('✅ BrandAnalyzerV2: Analysis complete', {
        processingTime: brandJson.metadata.processingTime,
        confidence: brandJson.confidence.overall,
      });
      
      return brandJson;
      
    } catch (error) {
      toolsLogger.error('❌ BrandAnalyzerV2: Analysis failed', error);
      throw error;
    }
  }
  
  /**
   * Analyze screenshots using GPT-4.1-mini with enhanced detail extraction
   */
  private async analyzeVisuals(screenshots: any[]): Promise<any> {
    if (!screenshots || screenshots.length === 0) {
      return { error: 'No screenshots available' };
    }
    
    // Get both full and hero screenshots for comprehensive analysis
    const fullShot = screenshots.find(s => s.type === 'full');
    const heroShot = screenshots.find(s => s.type === 'viewport') || screenshots[0];
    
    if (!heroShot?.url && !fullShot?.url) {
      return { error: 'No valid screenshot URLs' };
    }
    
    // Prefer R2 URLs over base64
    const primaryUrl = heroShot?.url || fullShot?.url;
    const secondaryUrl = fullShot?.url !== heroShot?.url ? fullShot?.url : null;
    
    // Check if URLs are R2 URLs (good) or base64 (problematic)
    const isR2 = primaryUrl.includes('r2.dev');
    
    // EXTENSIVE LOGGING - NO TRUNCATION
    toolsLogger.info('🖼️ FULL SCREENSHOT URLs:', {
      heroUrl: heroShot?.url || 'NO HERO URL',
      fullUrl: fullShot?.url || 'NO FULL URL',
      isR2Url: isR2,
      hasFullPage: !!fullShot,
      hasHero: !!heroShot
    });
    
    console.log('='.repeat(80));
    console.log('🔍 EXACT URLs BEING SENT TO GPT-4.1-MINI:');
    console.log('HERO URL:', heroShot?.url);
    console.log('FULL URL:', fullShot?.url);
    console.log('='.repeat(80));
    
    try {
      const prompt = `You are analyzing website screenshots to extract comprehensive brand, content, and UI information. 

IMPORTANT: Look at EVERY visible text element, UI component, and visual detail in the screenshots.

Extract and structure the following information in detailed JSON format:

1. **TEXT CONTENT** (Extract ALL visible text):
   - Main headline (exact text)
   - Subheadlines (exact text)
   - Body copy paragraphs (full text)
   - Button labels (all CTAs)
   - Navigation menu items
   - Footer text
   - Any testimonial quotes
   - Statistics or numbers displayed

2. **BRAND IDENTITY**:
   - Company/product name (from logo or header)
   - Tagline or value proposition (exact wording)
   - Mission statement if visible
   - Brand personality (professional, playful, innovative, etc.)

3. **FEATURES & BENEFITS** (List ALL mentioned):
   - Feature titles and descriptions
   - Benefit statements
   - Value propositions
   - Use cases mentioned

4. **UI COMPONENTS** (Describe in detail):
   - Hero section layout and elements
   - Card components (describe content)
   - Forms visible (type and fields)
   - Buttons (style, color, text)
   - Icons used and their context
   - Navigation style
   - Footer structure

5. **VISUAL DESIGN**:
   - Color scheme (provide hex codes if identifiable)
   - Typography (serif vs sans-serif, bold vs light)
   - Spacing (compact vs spacious)
   - Visual style (minimal, complex, modern, classic)
   - Images/illustrations style

6. **SOCIAL PROOF**:
   - Customer logos (list company names)
   - Testimonials (quote text and attribution)
   - Statistics/metrics (exact numbers and context)
   - Awards or certifications
   - Trust badges

7. **SECTIONS IDENTIFIED**:
   - List each major section (hero, features, testimonials, pricing, etc.)
   - Describe the content focus of each section

Please be EXTREMELY detailed and extract EVERY piece of text and UI element you can see. This will be used to recreate the brand experience.

Return a comprehensive JSON object with all findings.`;

      // Build content array with all available screenshots
      const contentArray: any[] = [{ type: 'text', text: prompt }];
      
      // Add hero/viewport screenshot
      if (heroShot?.url) {
        console.log('📸 ADDING HERO SCREENSHOT TO CONTENT ARRAY:');
        console.log('   URL:', heroShot.url);
        contentArray.push({
          type: 'image_url',
          image_url: { 
            url: heroShot.url,
            detail: 'high' // Request high detail analysis
          }
        });
      }
      
      // Add full page screenshot if different from hero
      if (fullShot?.url && fullShot.url !== heroShot?.url) {
        console.log('📸 ADDING FULL PAGE SCREENSHOT TO CONTENT ARRAY:');
        console.log('   URL:', fullShot.url);
        contentArray.push({
          type: 'text',
          text: 'Here is the FULL PAGE screenshot showing all sections below the fold:'
        });
        contentArray.push({
          type: 'image_url',
          image_url: { 
            url: fullShot.url,
            detail: 'high' // Request high detail analysis
          }
        });
      }
      
      console.log('📤 SENDING TO OPENAI API:');
      console.log('   Number of images:', contentArray.filter(c => c.type === 'image_url').length);
      console.log('   Model:', 'gpt-4.1-mini');
      
      let response;
      try {
        response = await this.openai.chat.completions.create({
          model: 'gpt-4.1-mini', // Using gpt-4.1-mini for cost efficiency
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing website screenshots to extract detailed brand, content, and UI information. Always return valid JSON with comprehensive details.'
            },
            {
              role: 'user',
              content: contentArray
            }
          ],
          max_tokens: 4000, // Increased for more detailed response
          temperature: 0.3,
          response_format: { type: "json_object" } // Force JSON response
        });
      } catch (apiError: any) {
        console.error('❌ OPENAI API ERROR:', apiError.message);
        console.error('   Error code:', apiError.code);
        console.error('   Error type:', apiError.type);
        if (apiError.message?.includes('download')) {
          console.error('   🚨 OPENAI CANNOT ACCESS THE URLS!');
          console.error('   URLs that failed:');
          contentArray.filter(c => c.type === 'image_url').forEach(img => {
            console.error('     -', img.image_url.url);
          });
        }
        throw apiError;
      }
      
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from GPT-4.1-mini vision analysis');
      
      console.log('📥 GPT-4.1-MINI RESPONSE:');
      console.log('   Response length:', content.length);
      console.log('   First 1000 chars:', content.substring(0, 1000));
      console.log('='.repeat(80));
      
      // Parse the JSON response
      try {
        const parsed = JSON.parse(content);
        toolsLogger.info('✅ Successfully parsed GPT-4.1-mini vision response');
        return parsed;
      } catch (e) {
        toolsLogger.error('❌ Failed to parse GPT-4V response:', e);
        // If not valid JSON, extract what we can
        return {
          raw: content,
          extracted: this.extractFromText(content),
        };
      }
      
    } catch (error) {
      toolsLogger.error('Visual analysis error:', error);
      return { error: 'Visual analysis failed' };
    }
  }
  
  /**
   * Analyze HTML content for text and structure
   */
  private async analyzeContent(html: any): Promise<any> {
    if (!html?.cleaned) {
      return { error: 'No HTML content available' };
    }
    
    try {
      // Truncate HTML to fit in context (take first 10k chars)
      const htmlSnippet = html.cleaned.substring(0, 10000);
      
      const prompt = `Analyze this HTML content and extract comprehensive information. Focus on:

1. Text Content:
   - Main headlines and value propositions
   - Feature descriptions
   - Benefits and selling points
   - CTAs and their messages

2. Structure:
   - Page sections (hero, features, testimonials, etc.)
   - Content hierarchy
   - Navigation structure

3. Product/Service:
   - What problem does it solve?
   - Who is the target audience?
   - Key features and capabilities
   - Pricing information if present

4. Social Proof:
   - Testimonial quotes
   - Customer names or logos mentioned
   - Statistics or achievements
   - Awards or certifications

5. Brand Voice:
   - Tone (professional, casual, technical, friendly)
   - Key messaging themes
   - Emotional triggers used
   - Pain points addressed

HTML Content:
${htmlSnippet}

Return a comprehensive JSON object with all findings.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing website content and extracting brand, product, and marketing information. Always return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from content analysis');
      
      try {
        return JSON.parse(content);
      } catch (e) {
        return { raw: content };
      }
      
    } catch (error) {
      toolsLogger.error('Content analysis error:', error);
      return { error: 'Content analysis failed' };
    }
  }
  
  /**
   * Analyze extracted styles
   */
  private analyzeStyles(styles: any): any {
    // Use categorized colors if available
    const categorized = styles.categorized;
    
    return {
      colors: {
        palette: styles.palette || [],
        primary: categorized?.primary || styles.palette?.[0] || '#000000',
        secondary: categorized?.secondary || styles.palette?.[1] || '#ffffff',
        accent: categorized?.accent || styles.palette?.[2],
        buttonColors: categorized?.buttonColors || [],
        headingColors: categorized?.headingColors || [],
        backgroundColors: categorized?.backgroundColors || []
      },
      typography: {
        fonts: styles.fonts || [],
        primary: styles.fonts?.[0]?.family || 'sans-serif',
      },
    };
  }
  
  /**
   * Synthesize all analysis into comprehensive brand understanding
   */
  private async synthesizeBrand(data: any): Promise<any> {
    const prompt = `Based on the following analysis data from a website, create a comprehensive brand synthesis:

Visual Analysis: ${JSON.stringify(data.visual, null, 2)}
Content Analysis: ${JSON.stringify(data.content, null, 2)}
Style Analysis: ${JSON.stringify(data.styles, null, 2)}
URL: ${data.url}

Synthesize this into:
1. Clear brand identity and positioning
2. Target audience profile
3. Key value propositions
4. Product/service understanding
5. Competitive differentiators
6. Brand personality and voice
7. Customer journey insights

Return a detailed JSON object with your synthesis.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a brand strategist synthesizing website analysis data into actionable brand insights.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.4,
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) return {};
      
      try {
        return JSON.parse(content);
      } catch (e) {
        return { raw: content };
      }
    } catch (error) {
      toolsLogger.error('Brand synthesis error:', error);
      return {};
    }
  }
  
  /**
   * Build the final comprehensive BrandJSON
   */
  private buildBrandJSON(data: any): BrandJSONV2 {
    const now = new Date().toISOString();
    
    // SIMPLIFIED: Just pass through everything the LLMs extracted
    // The entire visual analysis from GPT-4.1-mini analyzing screenshots
    const visualAnalysis = data.visual || {};
    // The content analysis from HTML
    const contentAnalysis = data.content || {};
    // The synthesis combining both
    const synthesis = data.synthesis || {};
    
    // Extract basic metadata for convenience
    const brandName = visualAnalysis['BRAND IDENTITY']?.['Company/product name'] || 
                     visualAnalysis['TEXT CONTENT']?.['Brand name'] ||
                     contentAnalysis.companyName ||
                     this.extractDomainName(data.url);
    
    const mainHeadline = visualAnalysis['TEXT CONTENT']?.['Main headline'] || 
                        contentAnalysis.headlines?.[0] || 
                        '';
    
    return {
      id: `brand_${Date.now()}`,
      url: data.url,
      extractionId: data.extractionId,
      createdAt: now,
      
      // MAIN CONTENT: Pass through EVERYTHING the LLMs extracted
      // This is the gold - all the detailed analysis from the screenshots
      visualAnalysis: visualAnalysis,  // Everything GPT-4.1-mini saw in the screenshots
      contentAnalysis: contentAnalysis, // Everything from HTML analysis
      synthesis: synthesis,             // Combined insights
      
      // Minimal structure - everything comes from LLM analysis
      brand: {
        name: brandName,
        tagline: mainHeadline,
        mission: visualAnalysis['BRAND IDENTITY']?.['Mission statement'] || '',
        vision: visualAnalysis['BRAND IDENTITY']?.['Vision'] || '',
        values: visualAnalysis['BRAND IDENTITY']?.['Values'] || [],
        archetype: visualAnalysis['BRAND IDENTITY']?.['Brand personality'] || '',
        voice: visualAnalysis['BRAND IDENTITY']?.['Voice'] || [],
        evidence: {
          screenshotId: data.screenshots?.[0]?.id,
          confidence: 0.85,
          extractedAt: now,
        },
      },
      
      // Design directly from computed styles
      design: {
        colors: data.styles?.colors || {},
        typography: data.styles?.typography || {},
        spacing: {
          unit: 8,
          scale: [4, 8, 16, 24, 32, 48, 64]
        },
        borders: {
          radius: '8px',
          width: '1px'
        },
        shadows: {},
      },
      
      // Product info from visual analysis
      product: {
        value_proposition: {
          headline: mainHeadline,
          subheadline: visualAnalysis['TEXT CONTENT']?.['Subheadlines']?.[0] || '',
          evidence: {
            confidence: 0.9,
            extractedAt: now,
          },
        },
        problem: visualAnalysis['FEATURES & BENEFITS']?.['Problem'] || '',
        solution: visualAnalysis['FEATURES & BENEFITS']?.['Solution'] || '',
        features: visualAnalysis['FEATURES & BENEFITS']?.['Feature titles'] || [],
        benefits: visualAnalysis['FEATURES & BENEFITS']?.['Benefit statements'] || [],
        targetAudience: visualAnalysis['FEATURES & BENEFITS']?.['Target audience'] || [],
        useCases: visualAnalysis['FEATURES & BENEFITS']?.['Use cases mentioned'] || [],
        pricing: visualAnalysis['FEATURES & BENEFITS']?.['Pricing'] || undefined,
      },
      
      // Social proof from visual analysis
      socialProof: {
        testimonials: visualAnalysis['SOCIAL PROOF']?.['Testimonials'] || [],
        customerLogos: visualAnalysis['SOCIAL PROOF']?.['Customer logos'] || [],
        stats: visualAnalysis['SOCIAL PROOF']?.['Statistics/metrics'] || [],
        awards: visualAnalysis['SOCIAL PROOF']?.['Awards'] || [],
        certifications: visualAnalysis['SOCIAL PROOF']?.['Certifications'] || [],
        mediaLogos: visualAnalysis['SOCIAL PROOF']?.['Media logos'] || [],
      },
      
      sections: visualAnalysis['SECTIONS IDENTIFIED'] || [],
      
      content: {
        keywords: visualAnalysis['TEXT CONTENT']?.['Keywords'] || [],
        emotionalTriggers: visualAnalysis['TEXT CONTENT']?.['Emotional triggers'] || [],
        painPoints: visualAnalysis['TEXT CONTENT']?.['Pain points'] || [],
        benefits: visualAnalysis['TEXT CONTENT']?.['Benefits'] || [],
        differentiators: visualAnalysis['TEXT CONTENT']?.['Differentiators'] || [],
        
        tone: {
          primary: visualAnalysis['VISUAL DESIGN']?.['Tone'] || '',
          attributes: visualAnalysis['VISUAL DESIGN']?.['Attributes'] || [],
        },
        
        readability: {
          score: 0,
          level: '',
        },
      },
      
      visuals: {
        photos: [],
        uiComponents: visualAnalysis['UI COMPONENTS'] || [],
        icons: visualAnalysis['UI COMPONENTS']?.['Icons'] || [],
      },
      
      confidence: {
        overall: visualAnalysis ? 0.85 : 0.5,
        breakdown: {
          structure: visualAnalysis['SECTIONS IDENTIFIED'] ? 0.9 : 0.5,
          content: visualAnalysis['TEXT CONTENT'] ? 0.85 : 0.5,
          visual: visualAnalysis['VISUAL DESIGN'] ? 0.8 : 0.5,
          brand: visualAnalysis['BRAND IDENTITY'] ? 0.85 : 0.5,
          product: visualAnalysis['FEATURES & BENEFITS'] ? 0.85 : 0.5,
        },
      },
      
      metadata: {
        analysisVersion: '2.0.0',
        timestamp: now,
        processingTime: 0,
      },
    };
  }
  
  // Helper methods
  private extractDomainName(url: string): string {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain.split('.')[0] || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }
  
  // Simplified helper methods - we're not using most of these anymore
  // but keeping for backwards compatibility
  
  private identifySections(visual: any, content: any): Section[] {
    const sections: Section[] = [];
    const now = new Date().toISOString();
    
    // Always add a hero section
    sections.push({
      id: 'hero',
      name: 'Hero Section',
      type: 'hero',
      order: 0,
      evidence: {
        confidence: 0.95,
        extractedAt: now,
      },
      content: {
        headline: {
          text: visual.contentStructure?.mainHeadline || content.headlines?.[0] || '',
          evidence: {
            confidence: 0.9,
            extractedAt: now,
          },
        },
        subheadline: {
          text: visual.contentStructure?.subheadline || content.subheadlines?.[0] || '',
          evidence: {
            confidence: 0.85,
            extractedAt: now,
          },
        },
        ctas: visual.contentStructure?.ctas || [],
      },
      visual: {
        layout: 'single-column',
        alignment: 'center',
        spacing: 'spacious',
        screenshots: [],
      },
    });
    
    // Add features section if features exist
    if (visual.contentStructure?.features?.length > 0 || content.features?.length > 0) {
      sections.push({
        id: 'features',
        name: 'Features',
        type: 'features',
        order: 1,
        evidence: {
          confidence: 0.85,
          extractedAt: now,
        },
        content: {
          headline: {
            text: 'Features',
            evidence: {
              confidence: 0.7,
              extractedAt: now,
            },
          },
        },
        visual: {
          layout: 'three-column',
          alignment: 'center',
          spacing: 'normal',
          screenshots: [],
        },
      });
    }
    
    // Add testimonials section if they exist
    if (visual.socialProof?.testimonials?.length > 0 || content.testimonials?.length > 0) {
      sections.push({
        id: 'testimonials',
        name: 'Testimonials',
        type: 'testimonials',
        order: 2,
        evidence: {
          confidence: 0.8,
          extractedAt: now,
        },
        content: {},
        visual: {
          layout: 'two-column',
          alignment: 'center',
          spacing: 'normal',
          screenshots: [],
        },
      });
    }
    
    return sections;
  }
  
  private extractUIComponents(visual: any): any[] {
    const components: any[] = [];
    
    if (visual.uiComponents) {
      visual.uiComponents.forEach((comp: any) => {
        components.push({
          id: `ui_${Date.now()}_${Math.random()}`,
          type: comp.type || 'card',
          rebuildSpec: {
            layout: comp.layout || 'vertical',
            styling: comp.styling || {},
            components: comp.components || [],
            interactions: comp.interactions || [],
          },
          evidence: {
            confidence: 0.7,
            extractedAt: new Date().toISOString(),
          },
        });
      });
    }
    
    return components;
  }
  
  private extractFromText(text: string): any {
    // Basic extraction from non-JSON text
    const result: any = {};
    
    // Try to extract company name
    const nameMatch = text.match(/company[:\s]+([^,\n]+)/i);
    if (nameMatch && nameMatch[1]) result.companyName = nameMatch[1].trim();
    
    // Try to extract tagline
    const taglineMatch = text.match(/tagline[:\s]+([^,\n]+)/i);
    if (taglineMatch && taglineMatch[1]) result.tagline = taglineMatch[1].trim();
    
    // Extract colors
    const colorMatches = text.matchAll(/#[0-9a-fA-F]{6}/g);
    result.colors = Array.from(colorMatches).map(m => m[0]);
    
    return result;
  }
}