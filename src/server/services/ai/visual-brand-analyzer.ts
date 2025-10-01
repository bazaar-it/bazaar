/**
 * Visual Brand Analyzer
 *
 * Sprint 126 - URL to Perfect Video
 *
 * Uses GPT-4o Vision to analyze website screenshots and extract visual
 * brand characteristics that can't be captured by DOM scraping alone.
 *
 * This dramatically improves personality analysis accuracy by understanding:
 * - Layout density (minimalist vs maximalist)
 * - Color emotion (energetic vs corporate)
 * - Typography style (modern vs classic)
 * - Imagery type (people vs product vs abstract)
 * - Overall brand archetype
 */

import OpenAI from 'openai';

export interface VisualAnalysis {
  // Core visual metrics
  density: number;              // 0 = maximalist/busy, 1 = minimalist/spacious
  colorEmotion: string;         // 'energetic' | 'corporate' | 'warm' | 'cool' | 'vibrant' | 'muted'
  typographyStyle: string;      // 'modern-sans' | 'classic-serif' | 'playful-rounded' | 'technical-mono'
  imageryType: string;          // 'people' | 'product' | 'abstract' | 'illustration' | 'mixed' | 'minimal'
  layoutStyle: string;          // 'grid' | 'asymmetric' | 'centered' | 'scattered' | 'flowing'
  brandArchetype: string;       // 'creator' | 'sage' | 'hero' | 'caregiver' | 'explorer' | 'rebel'

  // Supporting details
  designEra: string;            // 'modern' | 'contemporary' | 'traditional' | 'futuristic'
  professionalLevel: string;    // 'enterprise' | 'professional' | 'startup' | 'indie'
  emotionalTone: string;        // 'serious' | 'playful' | 'confident' | 'approachable'

  // Confidence and reasoning
  confidence: number;           // 0-1, how confident the analysis is
  reasoning: string;            // Human-readable explanation
}

export interface ScreenshotSelection {
  url: string;
  type: 'hero' | 'features' | 'footer' | 'product' | 'general';
  priority: number;
}

export class VisualBrandAnalyzer {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze screenshots to extract visual brand characteristics
   */
  async analyzeScreenshots(screenshots: string[]): Promise<VisualAnalysis> {
    console.log('[VisualBrandAnalyzer] Analyzing', screenshots.length, 'screenshots');

    // Select best screenshots for analysis (max 3 to control costs)
    const selected = this.selectBestScreenshots(screenshots);
    console.log('[VisualBrandAnalyzer] Selected', selected.length, 'screenshots for vision analysis');

    if (selected.length === 0) {
      console.warn('[VisualBrandAnalyzer] No screenshots to analyze, returning defaults');
      return this.getDefaultAnalysis();
    }

    try {
      // Analyze each screenshot individually
      const analyses = await Promise.all(
        selected.map((s, index) => this.analyzeScreenshot(s.url, s.type, index))
      );

      // Aggregate results
      const aggregated = this.aggregateAnalyses(analyses);

      console.log('[VisualBrandAnalyzer] Analysis complete:', aggregated);
      return aggregated;

    } catch (error) {
      console.error('[VisualBrandAnalyzer] Vision analysis failed:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Analyze a single screenshot with GPT-4o Vision
   */
  private async analyzeScreenshot(
    imageUrl: string,
    type: string,
    index: number
  ): Promise<Partial<VisualAnalysis>> {
    const prompt = this.buildVisionPrompt(type);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high' // High detail for better analysis
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT-4o Vision');
      }

      const parsed = JSON.parse(content);
      console.log(`[VisualBrandAnalyzer] Screenshot ${index + 1} analyzed:`, parsed);

      return parsed;

    } catch (error) {
      console.error(`[VisualBrandAnalyzer] Failed to analyze screenshot ${index + 1}:`, error);
      return {};
    }
  }

  /**
   * Build comprehensive vision analysis prompt
   */
  private buildVisionPrompt(screenshotType: string): string {
    return `You are a brand and design expert. Analyze this website screenshot and extract visual brand characteristics.

Screenshot Type: ${screenshotType}

Analyze and return JSON with these exact fields:

{
  "density": 0.0-1.0,
  "colorEmotion": "energetic|corporate|warm|cool|vibrant|muted",
  "typographyStyle": "modern-sans|classic-serif|playful-rounded|technical-mono",
  "imageryType": "people|product|abstract|illustration|mixed|minimal",
  "layoutStyle": "grid|asymmetric|centered|scattered|flowing",
  "brandArchetype": "creator|sage|hero|caregiver|explorer|rebel",
  "designEra": "modern|contemporary|traditional|futuristic",
  "professionalLevel": "enterprise|professional|startup|indie",
  "emotionalTone": "serious|playful|confident|approachable",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of key visual indicators"
}

SCORING GUIDE:

**density** (0 = busy/maximalist, 1 = minimal/spacious):
- 0.0-0.3: Densely packed, lots of elements, little white space
- 0.3-0.7: Balanced, moderate spacing
- 0.7-1.0: Very minimal, lots of white space, few elements

**colorEmotion**:
- energetic: Bright, saturated colors (orange, electric blue, neon)
- corporate: Navy, gray, muted blues, conservative palette
- warm: Reds, oranges, yellows, inviting tones
- cool: Blues, greens, purples, calming tones
- vibrant: High saturation, bold contrasts
- muted: Pastels, low saturation, soft colors

**typographyStyle**:
- modern-sans: Clean sans-serif (Inter, Helvetica, Arial)
- classic-serif: Traditional serifs (Times, Garamond, Georgia)
- playful-rounded: Rounded friendly fonts
- technical-mono: Monospace, code-like fonts

**imageryType**:
- people: Photos of humans, faces, team shots
- product: Product screenshots, mockups, UI displays
- abstract: Geometric shapes, patterns, illustrations
- illustration: Hand-drawn, illustrated elements
- mixed: Combination of types
- minimal: Very few or no images

**layoutStyle**:
- grid: Organized grid system, aligned elements
- asymmetric: Broken grid, dynamic positioning
- centered: Everything centered, symmetrical
- scattered: Elements placed freely
- flowing: Organic, natural flow

**brandArchetype**:
- creator: Innovative, artistic, imaginative
- sage: Intelligent, expert, informative
- hero: Strong, confident, ambitious
- caregiver: Supportive, nurturing, helpful
- explorer: Adventurous, free, independent
- rebel: Disruptive, bold, revolutionary

**designEra**:
- modern: 2020s design trends (glassmorphism, gradients, large type)
- contemporary: Current but not cutting-edge
- traditional: Timeless, classic design patterns
- futuristic: Experimental, ahead of its time

**professionalLevel**:
- enterprise: Corporate, formal, established company
- professional: Business-like but approachable
- startup: Modern, casual, tech-forward
- indie: Personal, unique, artistic

**emotionalTone**:
- serious: Formal, no-nonsense, professional
- playful: Fun, lighthearted, friendly
- confident: Bold, assertive, strong
- approachable: Warm, welcoming, human

**confidence**: How confident are you in this analysis? (0.5-1.0 typical)

**reasoning**: 2-3 sentence explanation of the most important visual factors

Return ONLY valid JSON.`;
  }

  /**
   * Select best screenshots for analysis (max 3 to control costs)
   */
  private selectBestScreenshots(screenshots: string[]): ScreenshotSelection[] {
    if (screenshots.length === 0) return [];

    // Priority order: hero > features > product > general > footer
    const priorityMap: Record<string, number> = {
      hero: 5,
      features: 4,
      product: 3,
      general: 2,
      footer: 1,
    };

    // Try to infer screenshot type from URL patterns
    const selections: ScreenshotSelection[] = screenshots.map((url, index) => {
      let type: ScreenshotSelection['type'] = 'general';
      let priority = priorityMap.general;

      // Heuristics based on URL or index
      if (index === 0) {
        type = 'hero';
        priority = priorityMap.hero;
      } else if (url.includes('feature') || index === 1) {
        type = 'features';
        priority = priorityMap.features;
      } else if (url.includes('product') || url.includes('app')) {
        type = 'product';
        priority = priorityMap.product;
      } else if (index === screenshots.length - 1) {
        type = 'footer';
        priority = priorityMap.footer;
      }

      return { url, type, priority };
    });

    // Sort by priority and take top 3
    selections.sort((a, b) => b.priority - a.priority);
    return selections.slice(0, 3);
  }

  /**
   * Aggregate multiple screenshot analyses into one
   */
  private aggregateAnalyses(analyses: Array<Partial<VisualAnalysis>>): VisualAnalysis {
    if (analyses.length === 0) {
      return this.getDefaultAnalysis();
    }

    // Average numeric values
    const densities = analyses.map(a => a.density).filter((d): d is number => d !== undefined);
    const confidences = analyses.map(a => a.confidence).filter((c): c is number => c !== undefined);

    const avgDensity = densities.length > 0
      ? densities.reduce((sum, d) => sum + d, 0) / densities.length
      : 0.5;

    const avgConfidence = confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0.7;

    // Pick most common categorical values
    const pickMostCommon = <T extends string>(
      values: (T | undefined)[],
      fallback: T
    ): T => {
      const filtered = values.filter((v): v is T => v !== undefined);
      if (filtered.length === 0) return fallback;

      const counts = filtered.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<T, number>);

      return Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] as T || fallback;
    };

    return {
      density: avgDensity,
      colorEmotion: pickMostCommon(analyses.map(a => a.colorEmotion), 'corporate'),
      typographyStyle: pickMostCommon(analyses.map(a => a.typographyStyle), 'modern-sans'),
      imageryType: pickMostCommon(analyses.map(a => a.imageryType), 'mixed'),
      layoutStyle: pickMostCommon(analyses.map(a => a.layoutStyle), 'grid'),
      brandArchetype: pickMostCommon(analyses.map(a => a.brandArchetype), 'hero'),
      designEra: pickMostCommon(analyses.map(a => a.designEra), 'modern'),
      professionalLevel: pickMostCommon(analyses.map(a => a.professionalLevel), 'professional'),
      emotionalTone: pickMostCommon(analyses.map(a => a.emotionalTone), 'confident'),
      confidence: avgConfidence,
      reasoning: analyses
        .map(a => a.reasoning)
        .filter(Boolean)
        .join(' | ')
    };
  }

  /**
   * Default analysis for fallback
   */
  private getDefaultAnalysis(): VisualAnalysis {
    return {
      density: 0.5,
      colorEmotion: 'corporate',
      typographyStyle: 'modern-sans',
      imageryType: 'mixed',
      layoutStyle: 'grid',
      brandArchetype: 'hero',
      designEra: 'modern',
      professionalLevel: 'professional',
      emotionalTone: 'confident',
      confidence: 0.5,
      reasoning: 'Default analysis due to missing screenshots or analysis failure'
    };
  }

  /**
   * Convert visual analysis to personality adjustments
   * These adjustments will be applied to the base personality scores
   */
  static toPersonalityAdjustments(visual: VisualAnalysis): {
    corporate: number;
    minimalist: number;
    playful: number;
    technical: number;
    bold: number;
    modern: number;
  } {
    const adjustments = {
      corporate: 0,
      minimalist: 0,
      playful: 0,
      technical: 0,
      bold: 0,
      modern: 0,
    };

    // Density → minimalist
    adjustments.minimalist += (visual.density - 0.5) * 0.4; // -0.2 to +0.2

    // Color emotion → multiple dimensions
    switch (visual.colorEmotion) {
      case 'corporate':
        adjustments.corporate += 0.15;
        adjustments.playful -= 0.1;
        break;
      case 'energetic':
      case 'vibrant':
        adjustments.bold += 0.15;
        adjustments.playful += 0.1;
        break;
      case 'muted':
        adjustments.minimalist += 0.1;
        adjustments.bold -= 0.1;
        break;
    }

    // Typography style
    switch (visual.typographyStyle) {
      case 'modern-sans':
        adjustments.modern += 0.15;
        break;
      case 'classic-serif':
        adjustments.modern -= 0.15;
        adjustments.corporate += 0.1;
        break;
      case 'playful-rounded':
        adjustments.playful += 0.2;
        break;
      case 'technical-mono':
        adjustments.technical += 0.2;
        break;
    }

    // Imagery type
    switch (visual.imageryType) {
      case 'people':
        adjustments.technical -= 0.15;
        adjustments.playful += 0.1;
        break;
      case 'product':
        adjustments.technical += 0.1;
        break;
      case 'minimal':
        adjustments.minimalist += 0.15;
        break;
      case 'abstract':
      case 'illustration':
        adjustments.playful += 0.1;
        adjustments.modern += 0.1;
        break;
    }

    // Professional level
    switch (visual.professionalLevel) {
      case 'enterprise':
        adjustments.corporate += 0.2;
        adjustments.playful -= 0.1;
        break;
      case 'startup':
        adjustments.corporate -= 0.1;
        adjustments.modern += 0.15;
        break;
      case 'indie':
        adjustments.playful += 0.15;
        adjustments.corporate -= 0.15;
        break;
    }

    // Emotional tone
    switch (visual.emotionalTone) {
      case 'serious':
        adjustments.corporate += 0.1;
        adjustments.playful -= 0.15;
        break;
      case 'playful':
        adjustments.playful += 0.2;
        break;
      case 'confident':
        adjustments.bold += 0.1;
        break;
    }

    // Design era
    switch (visual.designEra) {
      case 'modern':
      case 'futuristic':
        adjustments.modern += 0.15;
        break;
      case 'traditional':
        adjustments.modern -= 0.15;
        break;
    }

    return adjustments;
  }
}
