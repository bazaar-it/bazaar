/**
 * Brand Personality Analyzer
 *
 * Sprint 126 - URL to Perfect Video
 *
 * Analyzes extracted brand data to produce 6-dimensional personality scores
 * used for intelligent template and music selection.
 */

import OpenAI from 'openai';
import type { BrandPersonality } from '~/lib/types/ai/brand-personality';
import type { VisualAnalysis } from './visual-brand-analyzer';
import { VisualBrandAnalyzer } from './visual-brand-analyzer';

interface BrandData {
  colors?: {
    primary?: string;
    secondary?: string;
    accents?: string[];
    gradients?: Array<{ start: string; end: string }>;
  };
  typography?: {
    fonts?: Array<{ family: string; weight?: string }>;
  };
  copyVoice?: {
    tone?: string;
    taglines?: string[];
    headlines?: string[];
  };
  productNarrative?: {
    value_prop?: { headline?: string; description?: string };
  };
  screenshots?: string[];
  visualAnalysis?: VisualAnalysis;
}

export class BrandPersonalityAnalyzer {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze brand personality from extracted brand data
   */
  async analyzeBrandPersonality(brandData: BrandData): Promise<BrandPersonality> {
    const prompt = this.buildAnalysisPrompt(brandData);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a brand personality analyst. Analyze brand data and return personality scores as JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for consistent scoring
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      let personality = this.validateAndNormalize(parsed);

      // Apply visual analysis adjustments if available
      if (brandData.visualAnalysis) {
        console.log('[BrandPersonalityAnalyzer] Applying visual adjustments...');
        personality = this.applyVisualAdjustments(personality, brandData.visualAnalysis);
      }

      console.log('[BrandPersonalityAnalyzer] Analysis complete:', personality);
      return personality;

    } catch (error) {
      console.error('[BrandPersonalityAnalyzer] Analysis failed:', error);
      // Return neutral fallback
      return this.getDefaultPersonality();
    }
  }

  /**
   * Apply visual analysis adjustments to base personality scores
   */
  private applyVisualAdjustments(
    basePersonality: BrandPersonality,
    visualAnalysis: VisualAnalysis
  ): BrandPersonality {
    const adjustments = VisualBrandAnalyzer.toPersonalityAdjustments(visualAnalysis);

    console.log('[BrandPersonalityAnalyzer] Visual adjustments:', adjustments);

    const adjusted: BrandPersonality = {
      corporate: this.clampScore(basePersonality.corporate + adjustments.corporate),
      minimalist: this.clampScore(basePersonality.minimalist + adjustments.minimalist),
      playful: this.clampScore(basePersonality.playful + adjustments.playful),
      technical: this.clampScore(basePersonality.technical + adjustments.technical),
      bold: this.clampScore(basePersonality.bold + adjustments.bold),
      modern: this.clampScore(basePersonality.modern + adjustments.modern),
    };

    console.log('[BrandPersonalityAnalyzer] Base → Adjusted:', {
      base: basePersonality,
      adjusted,
      visualConfidence: visualAnalysis.confidence
    });

    return adjusted;
  }

  private buildAnalysisPrompt(brandData: BrandData): string {
    const colors = brandData.colors;
    const typography = brandData.typography;
    const copyVoice = brandData.copyVoice;
    const productNarrative = brandData.productNarrative;

    return `Analyze this brand's personality across 6 dimensions. Return scores 0-1 for each dimension as JSON.

BRAND DATA:

Colors:
- Primary: ${colors?.primary || 'Not extracted'}
- Secondary: ${colors?.secondary || 'Not extracted'}
- Accents: ${colors?.accents?.join(', ') || 'Not extracted'}
- Gradients: ${colors?.gradients?.map(g => `${g.start} → ${g.end}`).join(', ') || 'Not extracted'}

Typography:
- Fonts: ${typography?.fonts?.map(f => `${f.family}${f.weight ? ` (${f.weight})` : ''}`).join(', ') || 'Not extracted'}

Copy Voice:
- Tone: ${copyVoice?.tone || 'Not extracted'}
- Taglines: ${copyVoice?.taglines?.slice(0, 3).join(' | ') || 'Not extracted'}
- Headlines: ${copyVoice?.headlines?.slice(0, 3).join(' | ') || 'Not extracted'}

Product:
- Value Prop: ${productNarrative?.value_prop?.headline || 'Not extracted'}
- Description: ${productNarrative?.value_prop?.description?.slice(0, 200) || 'Not extracted'}

Screenshots: ${brandData.screenshots?.length || 0} images available

DIMENSIONS TO SCORE (0-1):

1. corporate (0 = casual startup vibe, 1 = enterprise professional)
   - Formal language, enterprise colors (blues/grays), professional fonts
   - Corporate examples: "Enterprise", "Solutions", serif fonts, navy/gray
   - Casual examples: "Let's go", "Hey", sans-serif, bright colors

2. minimalist (0 = maximalist/busy, 1 = clean/minimal)
   - Color palette size, visual complexity, white space usage
   - Minimalist: 2-3 colors, lots of white, clean fonts (Inter, Helvetica)
   - Maximalist: Many colors, gradients everywhere, decorative fonts

3. playful (0 = serious/formal, 1 = fun/lighthearted)
   - Copy tone, emoji usage, rounded shapes, bright colors
   - Playful: Emojis, casual language, rounded fonts, vibrant colors
   - Serious: No emojis, formal tone, geometric fonts, muted colors

4. technical (0 = emotional/human, 1 = technical/data-driven)
   - Focus on specs vs benefits, code references, technical jargon
   - Technical: "API", "ML", "Infrastructure", monospace fonts, tech colors
   - Emotional: "Transform", "Empower", human stories, warm colors

5. bold (0 = subtle/understated, 1 = bold/attention-grabbing)
   - High contrast, large typography, bright colors, strong statements
   - Bold: Neon colors, large type, ALL CAPS, strong claims
   - Subtle: Pastels, small type, lowercase, understated messaging

6. modern (0 = traditional/classic, 1 = cutting-edge/trendy)
   - Design trends, glassmorphism, gradients, modern fonts
   - Modern: Gradients, glass effects, Variable fonts, "AI-powered"
   - Traditional: Solid colors, classic fonts (Times, Garamond), timeless

Return ONLY valid JSON with this exact structure:
{
  "corporate": 0.0-1.0,
  "minimalist": 0.0-1.0,
  "playful": 0.0-1.0,
  "technical": 0.0-1.0,
  "bold": 0.0-1.0,
  "modern": 0.0-1.0,
  "reasoning": "Brief explanation of key factors influencing scores"
}`;
  }

  /**
   * Validate and normalize personality scores
   */
  private validateAndNormalize(parsed: any): BrandPersonality {
    const personality: BrandPersonality = {
      corporate: this.clampScore(parsed.corporate),
      minimalist: this.clampScore(parsed.minimalist),
      playful: this.clampScore(parsed.playful),
      technical: this.clampScore(parsed.technical),
      bold: this.clampScore(parsed.bold),
      modern: this.clampScore(parsed.modern),
    };

    // Log reasoning if provided
    if (parsed.reasoning) {
      console.log('[BrandPersonalityAnalyzer] Reasoning:', parsed.reasoning);
    }

    return personality;
  }

  /**
   * Clamp score to 0-1 range with default fallback
   */
  private clampScore(value: any): number {
    const num = typeof value === 'number' ? value : 0.5;
    return Math.max(0, Math.min(1, num));
  }

  /**
   * Default neutral personality for fallback
   */
  private getDefaultPersonality(): BrandPersonality {
    return {
      corporate: 0.5,
      minimalist: 0.5,
      playful: 0.5,
      technical: 0.5,
      bold: 0.5,
      modern: 0.5,
    };
  }

}