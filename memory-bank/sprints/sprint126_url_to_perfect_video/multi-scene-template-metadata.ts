/**
 * Multi-Scene Template Metadata Schema
 *
 * Purpose: Enable AI-powered template selection for URL-to-video generation
 *
 * This schema extends the single-scene metadata with multi-scene specific fields
 * needed for intelligent template matching based on brand personality analysis.
 */

import type { VideoFormat } from "~/lib/types/video/remotion-constants";

/**
 * Brand personality scores from AI analysis (GPT-4o-mini)
 * Each dimension is 0-1, representing how strongly the brand exhibits that trait
 */
export interface BrandPersonality {
  corporate: number;      // 0 = casual startup, 1 = enterprise professional
  minimalist: number;     // 0 = maximalist/busy, 1 = clean/minimal
  playful: number;        // 0 = serious/formal, 1 = fun/lighthearted
  technical: number;      // 0 = emotional/human, 1 = technical/data-driven
  bold: number;           // 0 = subtle/understated, 1 = bold/attention-grabbing
  modern: number;         // 0 = traditional/classic, 1 = cutting-edge/trendy
}

/**
 * Scene beat types following storytelling structure
 * Maps to specific narrative moments in the video
 */
export type SceneBeatType =
  | 'logo_reveal'       // Brand introduction
  | 'tagline'           // Value proposition
  | 'hook'              // Attention grabber
  | 'problem_setup'     // Pain point introduction
  | 'problem_impact'    // Consequences of problem
  | 'solution_intro'    // Introduce product
  | 'solution_feature'  // Specific feature highlight
  | 'proof'             // Social proof/testimonial
  | 'benefit'           // Key benefit highlight
  | 'cta';              // Call to action

/**
 * Industry categories for template matching
 */
export type IndustryCategory =
  | 'saas'              // Software as a service
  | 'mobile_app'        // Mobile applications
  | 'fintech'           // Financial technology
  | 'ecommerce'         // E-commerce/retail
  | 'b2b_service'       // B2B services
  | 'agency'            // Creative agencies
  | 'startup'           // Early-stage startups
  | 'enterprise'        // Large enterprises
  | 'marketplace'       // Marketplace platforms
  | 'product'           // Physical products
  | 'nonprofit'         // Non-profit organizations
  | 'generic';          // Catch-all

/**
 * Individual scene within a multi-scene template
 */
export interface MultiSceneTemplateScene {
  // Scene identification
  id: string;                    // Unique scene ID within template
  name: string;                  // Human-readable scene name
  order: number;                 // 0-indexed order in template

  // Timing
  duration: number;              // Duration in frames (90 frames = 3s at 30fps)

  // Narrative structure
  beatType: SceneBeatType;       // What narrative moment this scene represents

  // Customization requirements
  requires: {
    colors?: string[];           // e.g., ['primary', 'secondary', 'gradient']
    text?: string[];             // e.g., ['headline', 'subtext', 'cta']
    images?: string[];           // e.g., ['logo', 'screenshot', 'hero']
    metrics?: string[];          // e.g., ['value', 'label', 'percentage']
  };

  // Scene metadata for edit tool
  description: string;           // What this scene does (for LLM context)
  editPromptHints: string[];     // Guidance for LLM editing (e.g., "Focus on brand colors", "Keep text short")
}

/**
 * Complete multi-scene template metadata
 * This is what gets stored in the database and used for selection
 */
export interface MultiSceneTemplateMetadata {
  // Basic template info
  id: string;                    // UUID from database
  name: string;                  // "Product Launch", "App Demo", etc.
  description: string;           // Long-form description of template

  // Structure
  sceneCount: number;            // Always 8 for MVP
  totalDuration: number;         // Total frames (720 frames = 24s at 30fps)
  scenes: MultiSceneTemplateScene[];  // Ordered array of scenes

  // Format support
  supportedFormats: VideoFormat[];    // ['landscape'] for MVP, can add portrait/square later

  // AI-powered selection criteria

  /**
   * Target brand personality for this template
   * Used to calculate match score with extracted brand personality
   */
  targetPersonality: BrandPersonality;

  /**
   * Primary industry/use case this template is designed for
   * Used as boosting factor in selection algorithm
   */
  primaryIndustry: IndustryCategory[];  // Can match multiple industries

  /**
   * Keywords that indicate this template is a good match
   * e.g., ["mobile", "app", "download", "iOS", "Android"] for App Demo
   */
  industryKeywords: string[];

  /**
   * Content requirements - what brand data is needed
   * Used to filter out templates if brand lacks required data
   */
  contentRequirements: {
    requiresLogo?: boolean;        // Must have logo extracted
    requiresSocialProof?: boolean; // Must have testimonials/stats
    requiresScreenshots?: boolean; // Must have product screenshots
    requiresProblem?: boolean;     // User should provide problem statement
    minFeatureCount?: number;      // Minimum number of features needed
  };

  /**
   * Visual style indicators
   */
  visualStyle: {
    animationIntensity: 'minimal' | 'moderate' | 'high';
    colorUsage: 'monochrome' | 'duotone' | 'full-palette';
    textDensity: 'minimal' | 'moderate' | 'heavy';
    motionStyle: 'smooth' | 'energetic' | 'dramatic';
  };

  /**
   * Example use cases (for documentation/debugging)
   */
  exampleBrands?: string[];      // e.g., ["Stripe", "Notion", "Linear"]

  /**
   * Admin metadata
   */
  adminOnly: boolean;            // Only visible to admins
  isActive: boolean;             // Can be selected by algorithm
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template selection scoring result
 */
export interface TemplateSelectionScore {
  template: MultiSceneTemplateMetadata;
  score: number;                 // 0-1, higher is better
  breakdown: {
    personalityMatch: number;    // 0-1
    industryMatch: number;       // 0-1
    contentAvailability: number; // 0-1
    keywordMatch: number;        // 0-1
  };
  reasoning: string;             // Human-readable explanation
}

/**
 * Example template metadata for "Product Launch" template
 */
export const PRODUCT_LAUNCH_TEMPLATE: MultiSceneTemplateMetadata = {
  id: "product-launch-24s",
  name: "Product Launch",
  description: "Perfect for announcing new products or features. Follows classic problem-solution-proof structure with strong call to action.",

  sceneCount: 8,
  totalDuration: 720, // 24 seconds at 30fps

  scenes: [
    {
      id: "scene-1-logo-reveal",
      name: "Logo Reveal",
      order: 0,
      duration: 90,
      beatType: 'logo_reveal',
      requires: {
        colors: ['primary', 'gradient'],
        images: ['logo'],
      },
      description: "Introduce brand with logo animation and background gradient",
      editPromptHints: [
        "Apply brand gradient to background",
        "Center logo and ensure good contrast",
        "Keep animation subtle and professional"
      ]
    },
    {
      id: "scene-2-tagline",
      name: "Tagline",
      order: 1,
      duration: 90,
      beatType: 'tagline',
      requires: {
        colors: ['primary', 'secondary'],
        text: ['headline'],
      },
      description: "Main value proposition or tagline",
      editPromptHints: [
        "Use brand's main tagline or value prop",
        "Keep text to 5-8 words maximum",
        "Use primary brand font"
      ]
    },
    {
      id: "scene-3-problem-setup",
      name: "Problem Setup",
      order: 2,
      duration: 90,
      beatType: 'problem_setup',
      requires: {
        text: ['headline', 'subtext'],
      },
      description: "Introduce the pain point your product solves",
      editPromptHints: [
        "Use user-provided problem statement if available",
        "Keep tone empathetic",
        "Visual should convey frustration/difficulty"
      ]
    },
    {
      id: "scene-4-problem-impact",
      name: "Problem Impact",
      order: 3,
      duration: 90,
      beatType: 'problem_impact',
      requires: {
        text: ['headline'],
      },
      description: "Show consequences of the problem",
      editPromptHints: [
        "Amplify the pain point",
        "Use metrics if available (e.g., 'costing you 10 hours/week')",
        "Keep visual consistent with problem theme"
      ]
    },
    {
      id: "scene-5-solution-intro",
      name: "Solution Intro",
      order: 4,
      duration: 90,
      beatType: 'solution_intro',
      requires: {
        text: ['headline'],
        colors: ['primary'],
        images: ['logo']
      },
      description: "Introduce your product as the solution",
      editPromptHints: [
        "Transition from dark/problem to bright/solution",
        "Show product name and logo",
        "Use confident, optimistic tone"
      ]
    },
    {
      id: "scene-6-key-feature",
      name: "Key Feature",
      order: 5,
      duration: 90,
      beatType: 'solution_feature',
      requires: {
        text: ['headline', 'subtext'],
        images: ['screenshot']
      },
      description: "Highlight main feature or differentiator",
      editPromptHints: [
        "Use user-provided differentiator if available",
        "Show product screenshot if available",
        "Focus on #1 benefit"
      ]
    },
    {
      id: "scene-7-social-proof",
      name: "Social Proof",
      order: 6,
      duration: 90,
      beatType: 'proof',
      requires: {
        text: ['headline', 'subtext'],
        metrics: ['value']
      },
      description: "Build credibility with stats or testimonials",
      editPromptHints: [
        "Use extracted social proof stats if available",
        "Show numbers prominently (e.g., '10,000+ users')",
        "Add testimonial quote if available"
      ]
    },
    {
      id: "scene-8-cta",
      name: "Call to Action",
      order: 7,
      duration: 90,
      beatType: 'cta',
      requires: {
        text: ['cta'],
        colors: ['primary']
      },
      description: "Clear call to action",
      editPromptHints: [
        "Use brand's CTA copy if available (e.g., 'Get Started')",
        "Make button prominent with brand primary color",
        "Keep message simple and action-oriented"
      ]
    }
  ],

  supportedFormats: ['landscape'],

  targetPersonality: {
    corporate: 0.6,      // Slightly corporate but not too formal
    minimalist: 0.7,     // Clean and focused
    playful: 0.3,        // Professional but not boring
    technical: 0.5,      // Balanced between technical and emotional
    bold: 0.6,           // Confident but not aggressive
    modern: 0.8,         // Contemporary feel
  },

  primaryIndustry: ['saas', 'startup', 'product'],

  industryKeywords: [
    'launch', 'new', 'product', 'feature', 'release',
    'software', 'app', 'tool', 'platform', 'solution'
  ],

  contentRequirements: {
    requiresLogo: true,
    requiresSocialProof: false,  // Nice to have but not required
    requiresScreenshots: false,
    requiresProblem: false,      // Can work without user input
    minFeatureCount: 1
  },

  visualStyle: {
    animationIntensity: 'moderate',
    colorUsage: 'full-palette',
    textDensity: 'moderate',
    motionStyle: 'smooth'
  },

  exampleBrands: [
    "Stripe", "Notion", "Linear", "Vercel", "Figma"
  ],

  adminOnly: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * Template selection algorithm
 *
 * This is the core logic that picks the best template for a given brand
 */
export function calculateTemplateScore(
  template: MultiSceneTemplateMetadata,
  brandPersonality: BrandPersonality,
  brandData: {
    hasLogo: boolean;
    hasSocialProof: boolean;
    hasScreenshots: boolean;
    featureCount: number;
    detectedKeywords: string[];  // From product description, headlines, etc.
  }
): TemplateSelectionScore {

  // 1. Calculate personality match (0-1)
  const personalityDiffs = Object.keys(brandPersonality).map(key => {
    const k = key as keyof BrandPersonality;
    return Math.abs(brandPersonality[k] - template.targetPersonality[k]);
  });
  const avgPersonalityDiff = personalityDiffs.reduce((sum, diff) => sum + diff, 0) / personalityDiffs.length;
  const personalityMatch = 1 - avgPersonalityDiff;  // Convert diff to match score

  // 2. Calculate industry/keyword match (0-1)
  const keywordMatches = template.industryKeywords.filter(keyword =>
    brandData.detectedKeywords.some(brandKeyword =>
      brandKeyword.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  const keywordMatch = Math.min(keywordMatches.length / 3, 1);  // Normalize to 0-1 (3+ matches = perfect)

  // 3. Calculate content availability (0-1)
  let contentScore = 1.0;

  if (template.contentRequirements.requiresLogo && !brandData.hasLogo) {
    contentScore -= 0.3;  // Missing required logo
  }
  if (template.contentRequirements.requiresSocialProof && !brandData.hasSocialProof) {
    contentScore -= 0.2;  // Missing social proof (less critical)
  }
  if (template.contentRequirements.requiresScreenshots && !brandData.hasScreenshots) {
    contentScore -= 0.2;
  }
  if (template.contentRequirements.minFeatureCount &&
      brandData.featureCount < template.contentRequirements.minFeatureCount) {
    contentScore -= 0.3;  // Missing features
  }

  contentScore = Math.max(contentScore, 0);  // Clamp to 0

  // 4. Combine scores with weights
  const weights = {
    personality: 0.6,   // Most important: brand fit
    industry: 0.25,     // Important: use case match
    content: 0.15       // Less important: we can work around missing content
  };

  const finalScore =
    (personalityMatch * weights.personality) +
    (keywordMatch * weights.industry) +
    (contentScore * weights.content);

  // Generate reasoning
  const reasoning = generateReasoning(
    template,
    personalityMatch,
    keywordMatch,
    contentScore,
    brandData
  );

  return {
    template,
    score: finalScore,
    breakdown: {
      personalityMatch,
      industryMatch: keywordMatch,
      contentAvailability: contentScore,
      keywordMatch
    },
    reasoning
  };
}

function generateReasoning(
  template: MultiSceneTemplateMetadata,
  personalityMatch: number,
  keywordMatch: number,
  contentScore: number,
  brandData: any
): string {
  const reasons: string[] = [];

  if (personalityMatch > 0.8) {
    reasons.push(`Strong personality match (${(personalityMatch * 100).toFixed(0)}%)`);
  } else if (personalityMatch < 0.6) {
    reasons.push(`Personality mismatch (${(personalityMatch * 100).toFixed(0)}%)`);
  }

  if (keywordMatch > 0.6) {
    reasons.push(`Industry keywords align well`);
  }

  if (contentScore < 1.0) {
    if (!brandData.hasLogo) reasons.push(`Missing logo`);
    if (!brandData.hasSocialProof) reasons.push(`No social proof available`);
  }

  if (reasons.length === 0) {
    reasons.push(`Good all-around match`);
  }

  return reasons.join('. ');
}

/**
 * Select best template for a brand
 */
export function selectBestTemplate(
  templates: MultiSceneTemplateMetadata[],
  brandPersonality: BrandPersonality,
  brandData: {
    hasLogo: boolean;
    hasSocialProof: boolean;
    hasScreenshots: boolean;
    featureCount: number;
    detectedKeywords: string[];
  }
): TemplateSelectionScore {

  // Score all templates
  const scored = templates
    .filter(t => t.isActive)
    .map(template => calculateTemplateScore(template, brandPersonality, brandData));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return best match
  return scored[0];
}