# Perfect Template Metadata Structure

## 🎯 The Ideal Metadata System

### Core Principle: Every Extracted Brand Data Point Should Influence Selection

```typescript
export interface PerfectTemplateMetadata {
  // ============================================
  // SECTION 1: BASIC IDENTIFICATION
  // ============================================
  id: string;
  name: string;
  version: string;  // For A/B testing different versions
  
  // ============================================
  // SECTION 2: EMOTIONAL & NARRATIVE ALIGNMENT
  // ============================================
  emotionalBeats: {
    primary: EmotionalBeat[];  // ['problem', 'tension', 'discovery', 'transformation', 'triumph']
    secondary: EmotionalBeat[];  // Additional beats it works for
    intensity: 1 | 2 | 3 | 4 | 5;  // How dramatic/subtle
  };
  
  narrativePurpose: {
    storytelling: StoryPurpose[];  // ['introduce_problem', 'build_tension', 'reveal_solution', 'show_benefits', 'call_to_action']
    pacing: 'slow' | 'medium' | 'fast' | 'variable';
    mood: Mood[];  // ['serious', 'playful', 'inspirational', 'urgent', 'calming']
  };
  
  // ============================================
  // SECTION 3: BRAND ARCHETYPE ALIGNMENT
  // ============================================
  brandArchetypes: {
    perfect: BrandArchetype[];  // ['innovator', 'hero', 'sage', 'explorer']
    compatible: BrandArchetype[];  // Works well with
    avoid: BrandArchetype[];  // Doesn't match these brands
  };
  
  // ============================================
  // SECTION 4: INDUSTRY & AUDIENCE
  // ============================================
  industries: {
    primary: Industry[];  // ['fintech', 'saas', 'ecommerce', 'healthcare']
    secondary: Industry[];  // Also works for
    inappropriate: Industry[];  // Avoid for these
  };
  
  targetAudiences: {
    demographics: {
      ageGroups: AgeGroup[];  // ['gen-z', 'millennial', 'gen-x', 'boomer', 'enterprise']
      roles: ProfessionalRole[];  // ['developer', 'designer', 'executive', 'marketer', 'founder']
      techSavvy: 1 | 2 | 3 | 4 | 5;  // Technical sophistication level
    };
    psychographics: {
      values: Value[];  // ['innovation', 'stability', 'creativity', 'efficiency']
      decisionStyle: 'emotional' | 'logical' | 'social' | 'innovative';
    };
  };
  
  // ============================================
  // SECTION 5: VISUAL CHARACTERISTICS
  // ============================================
  visualStyle: {
    aesthetics: Aesthetic[];  // ['minimal', 'maximalist', 'corporate', 'playful', 'elegant']
    complexity: 'simple' | 'moderate' | 'complex' | 'layered';
    movement: 'static' | 'subtle' | 'dynamic' | 'kinetic';
    depth: '2d' | '2.5d' | '3d';
  };
  
  colorSchemes: {
    primary: ColorScheme[];  // ['monochrome', 'analogous', 'complementary', 'triadic']
    dominantColors: Color[];  // ['dark', 'light', 'vibrant', 'muted', 'neon']
    backgrounds: Background[];  // ['solid', 'gradient', 'pattern', 'image', 'video']
    brandColorCompatibility: {
      requiresDark: boolean;  // Works best with dark brand colors
      requiresLight: boolean;  // Works best with light brand colors
      adaptable: boolean;  // Can work with any colors
    };
  };
  
  typography: {
    style: TypographyStyle[];  // ['serif', 'sans-serif', 'display', 'script', 'monospace']
    weight: FontWeight[];  // ['thin', 'regular', 'bold', 'black']
    hierarchy: 'simple' | 'moderate' | 'complex';
    readability: 1 | 2 | 3 | 4 | 5;  // How easy to read
  };
  
  // ============================================
  // SECTION 6: ANIMATION & MOTION
  // ============================================
  animations: {
    types: AnimationType[];  // ['fade', 'slide', 'scale', 'rotate', 'morph', 'particle']
    timing: {
      curves: TimingCurve[];  // ['linear', 'ease', 'spring', 'bounce']
      speed: 'slow' | 'medium' | 'fast' | 'variable';
      rhythm: 'constant' | 'syncopated' | 'accelerating' | 'decelerating';
    };
    complexity: 1 | 2 | 3 | 4 | 5;  // Animation sophistication
    accessibility: {
      motionSafe: boolean;  // Safe for motion-sensitive users
      reducedMotion: boolean;  // Has reduced motion variant
    };
  };
  
  // ============================================
  // SECTION 7: CONTENT COMPATIBILITY
  // ============================================
  contentTypes: {
    text: {
      optimal: TextContent[];  // ['headline', 'paragraph', 'list', 'quote']
      maxLength: number;  // Maximum text length that works well
      minLength: number;  // Minimum needed to look good
      languages: Language[];  // ['en', 'es', 'zh'] - RTL support etc
    };
    media: {
      images: ImageType[];  // ['product', 'lifestyle', 'abstract', 'logo', 'screenshot']
      videos: VideoType[];  // ['demo', 'talking-head', 'b-roll', 'animation']
      icons: boolean;  // Works well with icons
      illustrations: boolean;  // Works with illustrations
    };
    data: {
      charts: ChartType[];  // ['line', 'bar', 'pie', 'scatter']
      metrics: boolean;  // Good for showing numbers/stats
      comparisons: boolean;  // Good for before/after, A/B
    };
  };
  
  // ============================================
  // SECTION 8: TECHNICAL SPECIFICATIONS
  // ============================================
  technical: {
    duration: {
      default: number;  // Default frames
      min: number;  // Minimum viable duration
      max: number;  // Maximum recommended
      scalable: boolean;  // Can adjust to content
    };
    performance: {
      complexity: 'light' | 'medium' | 'heavy';  // Render complexity
      fileSize: 'small' | 'medium' | 'large';  // Output size
      cpu: 1 | 2 | 3 | 4 | 5;  // CPU intensity
      gpu: 1 | 2 | 3 | 4 | 5;  // GPU requirements
    };
    formats: {
      landscape: FormatSupport;  // { supported: true, optimal: true, notes: '' }
      portrait: FormatSupport;
      square: FormatSupport;
      custom: boolean;  // Supports custom dimensions
    };
    dependencies: {
      libraries: string[];  // ['framer-motion', 'three.js']
      assets: AssetType[];  // ['fonts', 'images', 'videos']
      apis: string[];  // External APIs needed
    };
  };
  
  // ============================================
  // SECTION 9: USAGE PATTERNS & CONTEXT
  // ============================================
  usagePatterns: {
    placement: Placement[];  // ['hero', 'feature', 'testimonial', 'cta', 'transition']
    frequency: 'unique' | 'occasional' | 'repeatable';  // How often can be used in one video
    combinations: {
      worksWith: string[];  // Template IDs that combine well
      conflicts: string[];  // Templates to avoid using together
      sequences: string[][];  // Recommended template sequences
    };
  };
  
  contextualRules: {
    time: {
      seasons: Season[];  // ['spring', 'summer', 'fall', 'winter', 'holiday']
      dayparts: Daypart[];  // ['morning', 'afternoon', 'evening', 'night']
      occasions: Occasion[];  // ['launch', 'sale', 'announcement', 'celebration']
    };
    platform: {
      social: Platform[];  // ['instagram', 'tiktok', 'youtube', 'linkedin']
      advertising: AdPlatform[];  // ['facebook-ads', 'google-ads', 'display']
      website: WebPlacement[];  // ['homepage', 'landing', 'product', 'about']
    };
  };
  
  // ============================================
  // SECTION 10: AI TRAINING DATA
  // ============================================
  aiMetadata: {
    embeddings: number[];  // Vector embedding for similarity matching
    keywords: string[];  // For text matching
    userPhrases: string[];  // Common user descriptions
    descriptions: string[];  // Multiple ways to describe this template
    
    // Performance tracking
    performance: {
      usageCount: number;  // Times used
      avgEngagement: number;  // Average engagement score
      completionRate: number;  // How often watched to end
      conversionRate: number;  // CTA click rate
      userRating: number;  // User satisfaction
    };
    
    // Learning signals
    successMetrics: {
      bestFor: UseCase[];  // Proven successful use cases
      weakFor: UseCase[];  // Doesn't perform well for
      improvements: string[];  // Suggested improvements
    };
  };
  
  // ============================================
  // SECTION 11: CUSTOMIZATION POTENTIAL
  // ============================================
  customization: {
    flexibility: {
      colors: 'fixed' | 'theme' | 'full';  // How much colors can change
      layout: 'fixed' | 'flexible' | 'modular';  // Layout adaptability
      timing: 'fixed' | 'adjustable' | 'dynamic';  // Timing flexibility
      content: 'fixed' | 'replaceable' | 'generative';  // Content adaptability
    };
    
    parameters: {
      exposed: Parameter[];  // What can be customized
      defaults: Record<string, any>;  // Default values
      constraints: Record<string, Constraint>;  // Limits on customization
    };
    
    variants: {
      available: string[];  // Pre-built variants
      auto: boolean;  // Can auto-generate variants
      seasonal: boolean;  // Has seasonal versions
    };
  };
  
  // ============================================
  // SECTION 12: SELECTION SCORING WEIGHTS
  // ============================================
  scoringWeights: {
    brandMatch: number;  // How important is brand alignment (0-1)
    audienceMatch: number;  // How important is audience fit (0-1)
    visualMatch: number;  // How important is visual compatibility (0-1)
    narrativeMatch: number;  // How important is story alignment (0-1)
    industryMatch: number;  // How important is industry fit (0-1)
    // These help the AI prioritize what matters for this template
  };
}
```

## 🎨 Example: Perfect Metadata for "GrowthGraph" Template

```typescript
const GrowthGraphPerfectMetadata: PerfectTemplateMetadata = {
  id: 'GrowthGraph',
  name: 'Growth Graph',
  version: '2.0.0',
  
  emotionalBeats: {
    primary: ['triumph', 'transformation'],
    secondary: ['discovery'],
    intensity: 4  // Pretty dramatic
  },
  
  narrativePurpose: {
    storytelling: ['show_benefits', 'demonstrate_growth', 'build_credibility'],
    pacing: 'medium',
    mood: ['inspirational', 'confident', 'progressive']
  },
  
  brandArchetypes: {
    perfect: ['achiever', 'innovator', 'ruler'],
    compatible: ['sage', 'hero'],
    avoid: ['jester', 'innocent']
  },
  
  industries: {
    primary: ['fintech', 'saas', 'consulting', 'analytics'],
    secondary: ['ecommerce', 'education', 'healthcare'],
    inappropriate: ['luxury', 'entertainment']
  },
  
  targetAudiences: {
    demographics: {
      ageGroups: ['millennial', 'gen-x'],
      roles: ['executive', 'founder', 'investor', 'analyst'],
      techSavvy: 3
    },
    psychographics: {
      values: ['growth', 'efficiency', 'data-driven', 'success'],
      decisionStyle: 'logical'
    }
  },
  
  visualStyle: {
    aesthetics: ['corporate', 'modern', 'professional'],
    complexity: 'moderate',
    movement: 'dynamic',
    depth: '2.5d'
  },
  
  colorSchemes: {
    primary: ['analogous', 'monochrome'],
    dominantColors: ['dark', 'vibrant'],
    backgrounds: ['gradient', 'solid'],
    brandColorCompatibility: {
      requiresDark: false,
      requiresLight: false,
      adaptable: true  // Works with any brand colors
    }
  },
  
  animations: {
    types: ['scale', 'draw', 'fade'],
    timing: {
      curves: ['ease', 'spring'],
      speed: 'medium',
      rhythm: 'accelerating'
    },
    complexity: 3,
    accessibility: {
      motionSafe: true,
      reducedMotion: true
    }
  },
  
  contentTypes: {
    text: {
      optimal: ['metric', 'percentage', 'headline'],
      maxLength: 50,
      minLength: 5,
      languages: ['en', 'es', 'de', 'fr', 'zh']
    },
    media: {
      images: [],  // Doesn't use images
      videos: [],
      icons: true,  // Can use icons
      illustrations: false
    },
    data: {
      charts: ['line', 'bar'],
      metrics: true,  // PERFECT for metrics
      comparisons: true  // Great for before/after
    }
  },
  
  usagePatterns: {
    placement: ['feature', 'testimonial', 'proof'],
    frequency: 'occasional',  // Don't overuse
    combinations: {
      worksWith: ['FastText', 'TeslaStockGraph', 'Today1Percent'],
      conflicts: ['GlitchText', 'ParticleExplosion'],  // Too chaotic together
      sequences: [
        ['Problem', 'GrowthGraph', 'CTA'],  // Show problem then growth
        ['Feature', 'GrowthGraph', 'Testimonial']  // Feature → proof → social
      ]
    }
  },
  
  customization: {
    flexibility: {
      colors: 'full',  // Can adapt to any brand colors
      layout: 'flexible',  // Can adjust grid/spacing
      timing: 'adjustable',  // Can change animation speed
      content: 'replaceable'  // Data is fully replaceable
    },
    parameters: {
      exposed: ['startValue', 'endValue', 'duration', 'colors', 'labels'],
      defaults: {
        startValue: 0,
        endValue: 100,
        duration: 180,
        colors: { line: '#3b82f6', bg: '#1a1a1a' }
      },
      constraints: {
        startValue: { min: -1000, max: 1000000 },
        endValue: { min: -1000, max: 1000000 },
        duration: { min: 60, max: 300 }
      }
    }
  },
  
  scoringWeights: {
    brandMatch: 0.3,
    audienceMatch: 0.2,
    visualMatch: 0.2,
    narrativeMatch: 0.2,
    industryMatch: 0.1
  },
  
  aiMetadata: {
    embeddings: [0.23, 0.45, ...],  // 384-dim vector
    keywords: ['growth', 'chart', 'graph', 'metrics', 'increase', 'revenue', 'performance'],
    userPhrases: [
      'show our growth',
      'revenue going up',
      'metrics improving',
      'performance chart',
      'success graph'
    ],
    descriptions: [
      'Animated line graph showing upward growth',
      'Dynamic chart displaying increasing metrics',
      'Professional growth visualization'
    ],
    performance: {
      usageCount: 1247,
      avgEngagement: 0.82,
      completionRate: 0.91,
      conversionRate: 0.14,
      userRating: 4.6
    },
    successMetrics: {
      bestFor: ['showing growth', 'investor pitches', 'quarterly reports'],
      weakFor: ['emotional stories', 'product demos', 'tutorials'],
      improvements: ['Add more animation varieties', 'Support multiple lines']
    }
  }
};
```

## 🔄 How This Perfect Metadata Enables Smart Selection

### Selection Algorithm with Perfect Metadata:

```typescript
function selectOptimalTemplate(
  scene: HeroJourneyScene,
  brandData: ExtractedBrandData,
  allTemplates: PerfectTemplateMetadata[]
): SelectedTemplate {
  
  const scores = allTemplates.map(template => {
    let score = 0;
    
    // 1. Emotional beat match (0-100 points)
    if (template.emotionalBeats.primary.includes(scene.emotionalBeat)) {
      score += 100;
    } else if (template.emotionalBeats.secondary.includes(scene.emotionalBeat)) {
      score += 50;
    }
    
    // 2. Brand archetype alignment (0-80 points)
    if (template.brandArchetypes.perfect.includes(brandData.archetype)) {
      score += 80;
    } else if (template.brandArchetypes.compatible.includes(brandData.archetype)) {
      score += 40;
    } else if (template.brandArchetypes.avoid.includes(brandData.archetype)) {
      score -= 100;  // Penalty
    }
    
    // 3. Industry match (0-60 points)
    if (template.industries.primary.includes(brandData.industry)) {
      score += 60;
    } else if (template.industries.secondary.includes(brandData.industry)) {
      score += 30;
    } else if (template.industries.inappropriate.includes(brandData.industry)) {
      score -= 50;  // Penalty
    }
    
    // 4. Audience alignment (0-50 points)
    const audienceMatch = calculateAudienceOverlap(
      template.targetAudiences,
      brandData.targetAudience
    );
    score += audienceMatch * 50;
    
    // 5. Visual compatibility (0-40 points)
    if (isColorCompatible(template.colorSchemes, brandData.colors)) {
      score += 40;
    }
    
    // 6. Content type match (0-30 points)
    if (scene.contentType === 'data' && template.contentTypes.data.metrics) {
      score += 30;
    }
    
    // 7. Performance history (0-20 points)
    score += template.aiMetadata.performance.userRating * 4;  // 0-20
    
    // Apply template-specific weights
    const weightedScore = applyWeights(score, template.scoringWeights, {
      brandMatch,
      audienceMatch,
      visualMatch,
      narrativeMatch,
      industryMatch
    });
    
    return {
      template,
      score: weightedScore,
      reasoning: generateReasoning(template, scene, brandData)
    };
  });
  
  // Sort by score and pick best (with some randomization for variety)
  const topTemplates = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  
  // Add slight randomization to top 3 for variety
  const selected = topTemplates[Math.floor(Math.random() * Math.min(3, topTemplates.length))];
  
  return selected.template;
}
```

## 📊 Comparison: Current vs Perfect

| Aspect | Current Metadata | Perfect Metadata |
|--------|-----------------|------------------|
| **Fields** | 12 basic fields | 60+ comprehensive fields |
| **Brand Alignment** | None | Full archetype & industry mapping |
| **Audience Targeting** | None | Demographics & psychographics |
| **Visual Matching** | Basic colors array | Complete color compatibility system |
| **Emotional Mapping** | None | Primary & secondary beats with intensity |
| **Industry Specific** | None | Primary, secondary, and inappropriate |
| **Performance Data** | None | Usage stats and success metrics |
| **Customization Info** | None | Full flexibility and parameter specs |
| **AI Training** | Basic keywords | Embeddings, phrases, and learning signals |
| **Combination Rules** | None | Works with, conflicts, sequences |

## 🚀 Implementation Benefits

With this perfect metadata structure:

1. **Brand-Aligned Selection**: Templates match brand personality, not random
2. **Audience-Optimized**: CFOs get corporate templates, developers get technical ones
3. **Industry-Appropriate**: Fintech gets graphs, fashion gets visual templates
4. **Color Harmony**: Templates compatible with brand colors selected first
5. **Narrative Flow**: Templates that work well in sequence
6. **Performance-Based**: Learn from what works and improve over time
7. **Contextual**: Different selections for different platforms/occasions
8. **Customization-Ready**: Know exactly what can be modified and how

This transforms template selection from a **random lottery** to an **intelligent, data-driven decision** that leverages ALL the brand data we extract!