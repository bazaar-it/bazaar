# Intelligent Template Router Architecture

**Sprint 99 - URL-to-Video Pipeline Enhancement**  
**Focus**: Router Intelligence Layer for Future-Proof Template Selection  
**Date**: 2025-08-23

---

## 🎯 Architecture Context

### Current Development Landscape
- **✅ Template Overhaul** (Other Developer) - Modular templates that auto-adapt to brand JSON
- **✅ LLM Customization** (Existing) - Edit tool makes brand-specific modifications  
- **❌ Smart Router** (Our Focus) - Intelligent template selection logic

### The Strategic Focus
With templates becoming modular and brand-adaptive, **the router becomes the critical intelligence layer** that determines which templates get selected for each emotional beat and brand context.

---

## 🧠 Router Intelligence Requirements

### 1. **Future-Proof Design**
The router must work regardless of template changes:
```typescript
interface IntelligentRouter {
  // Abstract template categories, not specific template IDs
  selectByCharacteristics(
    brandContext: BrandContext,
    emotionalBeat: EmotionalBeat,
    contentRequirements: ContentRequirements
  ): TemplateSelection;
}
```

### 2. **Brand-Context Aware**
Router uses rich brand analysis for intelligent matching:
```typescript
interface BrandContext {
  // Identity & Psychology
  archetype: 'innovator' | 'protector' | 'sophisticate' | 'everyman' | 'professional';
  personality: 'conservative' | 'dynamic' | 'creative' | 'technical' | 'playful';
  voiceTone: 'authoritative' | 'friendly' | 'enthusiastic' | 'professional';
  
  // Visual Characteristics  
  colorScheme: 'light' | 'dark' | 'colorful' | 'monochrome';
  visualComplexity: 'minimal' | 'moderate' | 'rich';
  
  // Industry & Category
  industry: 'fintech' | 'design' | 'developer-tools' | 'ecommerce' | 'saas';
  businessModel: 'b2b' | 'b2c' | 'marketplace' | 'platform';
}
```

### 3. **Content-Requirements Matching**
Router adapts to content complexity and type:
```typescript
interface ContentRequirements {
  // Content Volume
  featureCount: number;
  hasStatistics: boolean;
  hasTestimonials: boolean;
  ctaComplexity: 'single' | 'multiple' | 'complex';
  
  // Content Type
  isAppProduct: boolean;
  isDataHeavy: boolean;
  isVisualProduct: boolean;
  
  // Narrative Needs
  emotionalIntensity: 'low' | 'medium' | 'high';
  informationDensity: 'sparse' | 'balanced' | 'dense';
}
```

---

## 🏗️ Router Architecture Design

### Core Router Class

```typescript
export class IntelligentTemplateRouter {
  private templateAnalyzer: TemplateAnalyzer;
  private brandAnalyzer: BrandAnalyzer;
  private contextMatcher: ContextMatcher;

  constructor() {
    this.templateAnalyzer = new TemplateAnalyzer();
    this.brandAnalyzer = new BrandAnalyzer();
    this.contextMatcher = new ContextMatcher();
  }

  async selectOptimalTemplates(
    narrativeScenes: HeroJourneyScene[],
    brandData: SimplifiedBrandData,
    style: 'minimal' | 'dynamic' | 'bold' = 'dynamic'
  ): Promise<RouterSelection[]> {
    
    // 1. Analyze brand context from extracted data
    const brandContext = await this.brandAnalyzer.analyzeBrandContext(brandData);
    
    // 2. Get available template characteristics (future-proof)
    const availableTemplates = await this.templateAnalyzer.getTemplateCharacteristics();
    
    // 3. For each narrative scene, intelligently select template
    const selections: RouterSelection[] = [];
    
    for (const scene of narrativeScenes) {
      // Analyze content requirements for this scene
      const contentReqs = this.analyzeContentRequirements(scene, brandData);
      
      // Score templates based on fit
      const templateScores = await this.contextMatcher.scoreTemplateCompatibility(
        availableTemplates,
        brandContext,
        scene.emotionalBeat,
        contentReqs,
        style
      );
      
      // Select best template with some intelligent randomization
      const selectedTemplate = this.selectBestFit(templateScores, scene);
      
      selections.push({
        scene,
        template: selectedTemplate,
        reasoning: this.generateSelectionReasoning(selectedTemplate, brandContext, scene),
        confidence: templateScores[0]?.score || 0
      });
    }
    
    return selections;
  }
}
```

### Brand Context Analyzer

```typescript
export class BrandAnalyzer {
  async analyzeBrandContext(brandData: SimplifiedBrandData): Promise<BrandContext> {
    return {
      // Extract archetype from brand psychology
      archetype: this.inferArchetype(brandData),
      
      // Determine personality from voice and features
      personality: this.inferPersonality(brandData),
      
      // Analyze voice tone
      voiceTone: brandData.content?.voice?.tone || 'professional',
      
      // Color scheme analysis
      colorScheme: this.analyzeColorScheme(brandData.brand?.visual?.colors),
      
      // Visual complexity from feature count and content
      visualComplexity: this.inferVisualComplexity(brandData),
      
      // Industry classification
      industry: this.classifyIndustry(brandData),
      
      // Business model inference
      businessModel: this.inferBusinessModel(brandData)
    };
  }

  private inferArchetype(brandData: SimplifiedBrandData): BrandArchetype {
    const headline = brandData.product?.value_prop?.headline?.toLowerCase() || '';
    const features = brandData.product?.features || [];
    
    // Innovation indicators
    if (headline.includes('future') || headline.includes('next-gen') || 
        features.some(f => f.title?.toLowerCase().includes('ai'))) {
      return 'innovator';
    }
    
    // Security/reliability indicators  
    if (headline.includes('secure') || headline.includes('trusted') ||
        features.some(f => f.title?.toLowerCase().includes('security'))) {
      return 'protector';
    }
    
    // Premium/quality indicators
    if (headline.includes('premium') || headline.includes('professional') ||
        brandData.socialProof?.stats?.rating > 4.8) {
      return 'sophisticate';
    }
    
    // Community/accessibility indicators
    if (headline.includes('everyone') || headline.includes('simple') ||
        brandData.ctas?.some(c => c.label?.toLowerCase().includes('join'))) {
      return 'everyman';
    }
    
    return 'professional';
  }

  private classifyIndustry(brandData: SimplifiedBrandData): Industry {
    const content = [
      brandData.product?.value_prop?.headline,
      brandData.product?.value_prop?.subhead,
      brandData.product?.features?.map(f => f.title).join(' ')
    ].join(' ').toLowerCase();
    
    if (content.includes('payment') || content.includes('finance') || 
        content.includes('expense') || content.includes('banking')) {
      return 'fintech';
    }
    
    if (content.includes('design') || content.includes('creative') || 
        content.includes('visual') || content.includes('brand')) {
      return 'design';
    }
    
    if (content.includes('developer') || content.includes('api') || 
        content.includes('code') || content.includes('integration')) {
      return 'developer-tools';
    }
    
    if (content.includes('ecommerce') || content.includes('store') || 
        content.includes('product') || content.includes('retail')) {
      return 'ecommerce';
    }
    
    return 'saas';
  }
}
```

### Template Characteristics Analysis

```typescript
export class TemplateAnalyzer {
  // Future-proof: Analyze actual templates instead of hardcoded lists
  async getTemplateCharacteristics(): Promise<TemplateCharacteristics[]> {
    const availableTemplates = await this.getAvailableTemplates();
    
    return Promise.all(availableTemplates.map(async template => {
      // Analyze template code to infer characteristics
      const code = await this.loadTemplateCode(template.id);
      
      return {
        id: template.id,
        name: template.name,
        
        // Visual characteristics
        aesthetic: this.analyzeAesthetic(code),
        complexity: this.analyzeComplexity(code),
        energy: this.analyzeEnergyLevel(code),
        
        // Content capabilities
        supportsMultipleElements: this.checkMultiElementSupport(code),
        supportsDataViz: this.checkDataVizCapability(code),
        supportsAppFocus: this.checkAppFocusElements(code),
        textCapacity: this.analyzeTextCapacity(code),
        
        // Brand compatibility
        archetypeCompatibility: this.scoreArchetypeCompatibility(code, template.name),
        colorAdaptability: this.checkColorAdaptability(code),
        
        // Technical characteristics
        animationIntensity: this.analyzeAnimationIntensity(code),
        duration: template.duration,
        performance: this.estimatePerformance(code)
      };
    }));
  }

  private analyzeAesthetic(code: string): TemplateAesthetic {
    // Analyze colors and styling in template code
    const hasGradients = /gradient/i.test(code);
    const hasParticles = /particle|floating/i.test(code);
    const hasMinimalDesign = /fade|scale|simple/i.test(code);
    
    if (hasParticles || hasGradients) return 'dynamic';
    if (hasMinimalDesign) return 'minimal';
    return 'balanced';
  }

  private analyzeComplexity(code: string): VisualComplexity {
    // Count visual elements and complexity indicators
    const elementCount = (code.match(/createElement|<\w+/g) || []).length;
    const hasMultipleAnimations = (code.match(/interpolate|spring/g) || []).length > 2;
    const hasComplexLayout = /flex|grid|absolute/i.test(code);
    
    if (elementCount > 15 || hasMultipleAnimations) return 'complex';
    if (elementCount > 8 || hasComplexLayout) return 'moderate';
    return 'simple';
  }

  private scoreArchetypeCompatibility(code: string, name: string): ArchetypeScores {
    const codeAnalysis = code.toLowerCase();
    const nameAnalysis = name.toLowerCase();
    
    return {
      innovator: this.scoreInnovatorFit(codeAnalysis, nameAnalysis),
      protector: this.scoreProtectorFit(codeAnalysis, nameAnalysis),
      sophisticate: this.scoreSophisticateFit(codeAnalysis, nameAnalysis),
      everyman: this.scoreEverymanFit(codeAnalysis, nameAnalysis),
      professional: this.scoreProfessionalFit(codeAnalysis, nameAnalysis)
    };
  }
}
```

### Context Matching Engine

```typescript
export class ContextMatcher {
  async scoreTemplateCompatibility(
    availableTemplates: TemplateCharacteristics[],
    brandContext: BrandContext,
    emotionalBeat: EmotionalBeat,
    contentReqs: ContentRequirements,
    style: 'minimal' | 'dynamic' | 'bold'
  ): Promise<TemplateScoredMatch[]> {
    
    const scoredTemplates = availableTemplates.map(template => {
      // Base emotional beat compatibility
      const beatScore = this.scoreBeatCompatibility(template, emotionalBeat);
      
      // Brand archetype matching
      const archetypeScore = template.archetypeCompatibility[brandContext.archetype] || 0;
      
      // Visual style alignment
      const styleScore = this.scoreStyleAlignment(template, brandContext, style);
      
      // Content requirements fit
      const contentScore = this.scoreContentFit(template, contentReqs);
      
      // Industry-specific preferences
      const industryScore = this.scoreIndustryFit(template, brandContext.industry);
      
      // Penalty for poor fits
      const penalties = this.calculatePenalties(template, brandContext, contentReqs);
      
      const totalScore = beatScore + archetypeScore + styleScore + 
                        contentScore + industryScore - penalties;
      
      return {
        template,
        score: Math.max(0, totalScore),
        breakdown: {
          beatCompatibility: beatScore,
          archetypeAlignment: archetypeScore,
          styleAlignment: styleScore,
          contentFit: contentScore,
          industryFit: industryScore,
          penalties
        },
        reasoning: this.generateScoreReasoning(template, brandContext, emotionalBeat)
      };
    });
    
    // Sort by score and return top candidates
    return scoredTemplates
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(5, scoredTemplates.length)); // Top 5 candidates
  }

  private scoreBeatCompatibility(
    template: TemplateCharacteristics, 
    beat: EmotionalBeat
  ): number {
    const beatPreferences = {
      'problem': {
        energy: 'low',
        complexity: 'simple',
        preferred: ['glitch', 'dark', 'tension']
      },
      'discovery': {
        energy: 'medium',
        complexity: 'moderate', 
        preferred: ['reveal', 'bright', 'scale', 'fade']
      },
      'transformation': {
        energy: 'high',
        complexity: 'complex',
        preferred: ['floating', 'dynamic', 'multi-element']
      },
      'triumph': {
        energy: 'high',
        complexity: 'moderate',
        preferred: ['celebration', 'graph', 'success', 'metrics']
      },
      'invitation': {
        energy: 'medium',
        complexity: 'simple',
        preferred: ['pulse', 'cta', 'welcoming']
      }
    };

    const prefs = beatPreferences[beat];
    let score = 0;
    
    // Energy level alignment
    if (template.energy === prefs.energy) score += 25;
    
    // Complexity alignment
    if (template.complexity === prefs.complexity) score += 20;
    
    // Name/characteristic matching
    const templateName = template.name.toLowerCase();
    const hasPreferredCharacteristic = prefs.preferred.some(pref => 
      templateName.includes(pref)
    );
    if (hasPreferredCharacteristic) score += 30;
    
    return score;
  }

  private scoreIndustryFit(template: TemplateCharacteristics, industry: Industry): number {
    const industryPreferences = {
      'fintech': {
        preferred: ['graph', 'data', 'professional', 'growth'],
        avoid: ['playful', 'particle', 'whimsical'],
        complexityPreference: 'simple'
      },
      'design': {
        preferred: ['creative', 'dynamic', 'visual', 'particle'],
        avoid: ['basic', 'plain'],
        complexityPreference: 'complex'
      },
      'developer-tools': {
        preferred: ['code', 'technical', 'glitch', 'modern'],
        avoid: ['flowery', 'organic'],
        complexityPreference: 'moderate'
      },
      'ecommerce': {
        preferred: ['product', 'showcase', 'carousel'],
        avoid: ['technical', 'data-heavy'],
        complexityPreference: 'moderate'
      },
      'saas': {
        preferred: ['clean', 'professional', 'app'],
        avoid: ['overly-artistic'],
        complexityPreference: 'simple'
      }
    };

    const prefs = industryPreferences[industry];
    let score = 0;
    
    const templateName = template.name.toLowerCase();
    
    // Preferred characteristics
    if (prefs.preferred.some(pref => templateName.includes(pref))) {
      score += 15;
    }
    
    // Avoid characteristics
    if (prefs.avoid.some(avoid => templateName.includes(avoid))) {
      score -= 10;
    }
    
    // Complexity preference alignment
    if (template.complexity === prefs.complexityPreference) {
      score += 10;
    }
    
    return score;
  }
}
```

---

## 🔄 Integration with Existing LLM Customization

### Router Output Format

```typescript
interface RouterSelection {
  scene: HeroJourneyScene;
  template: TemplateCharacteristics;
  reasoning: string;
  confidence: number;
  brandContext: BrandContext;
  customizationHints: {
    emphasizeElements: string[];
    colorPriorities: string[];
    animationAdjustments: string[];
    contentFocus: string[];
  };
}
```

### Enhanced LLM Customization Context

The router provides rich context for the existing LLM customization:

```typescript
// Enhanced customization prompt with router intelligence
const enhancedEditPrompt = `Transform this template with ROUTER INTELLIGENCE CONTEXT:

ROUTER SELECTION REASONING:
${selection.reasoning}

BRAND ARCHETYPE: ${selection.brandContext.archetype}
- Template selected for ${selection.brandContext.archetype} archetype compatibility
- Industry: ${selection.brandContext.industry}
- Personality: ${selection.brandContext.personality}

TEMPLATE OPTIMIZATION HINTS:
- Emphasize: ${selection.customizationHints.emphasizeElements.join(', ')}
- Color priorities: ${selection.customizationHints.colorPriorities.join(', ')}
- Animation style: ${selection.customizationHints.animationAdjustments.join(', ')}
- Content focus: ${selection.customizationHints.contentFocus.join(', ')}

COMPLETE BRAND DATA JSON:
${brandDataJson}

NARRATIVE CONTEXT:
- Scene Title: ${narrativeScene.title}
- Emotional Beat: ${narrativeScene.emotionalBeat}
- Router confidence: ${selection.confidence}%

ENHANCED CUSTOMIZATION REQUIREMENTS:
1. This template was intelligently selected for ${selection.reasoning}
2. Optimize for ${selection.brandContext.archetype} archetype characteristics
3. Match ${selection.brandContext.industry} industry expectations
4. Emphasize router-identified elements: ${selection.customizationHints.emphasizeElements.join(', ')}
5. Apply brand JSON with router context understanding
6. [... existing requirements ...]

Return ONLY the modified code, no explanations.`;
```

---

## 🚀 Implementation Roadmap

### Phase 1: Router Foundation (Week 1)
1. **Create base router classes**
   - `IntelligentTemplateRouter`
   - `BrandAnalyzer` 
   - `TemplateAnalyzer`
   - `ContextMatcher`

2. **Implement brand context analysis**
   - Archetype inference from brand data
   - Industry classification
   - Visual complexity analysis

3. **Create template characteristic detection**
   - Future-proof template analysis
   - Aesthetic classification
   - Content capability detection

### Phase 2: Scoring Engine (Week 2)
1. **Build compatibility scoring**
   - Brand-template compatibility matrices
   - Content requirement matching
   - Industry-specific preferences

2. **Add intelligent selection logic**
   - Multi-factor scoring system
   - Smart randomization within top candidates
   - Confidence scoring

3. **Integration with existing pipeline**
   - Update WebsiteToVideoHandler to use router
   - Pass router context to LLM customization
   - Maintain backward compatibility

### Phase 3: Enhancement & Learning (Week 3)
1. **Add performance tracking**
   - Template selection effectiveness metrics
   - User satisfaction correlation
   - A/B testing framework

2. **Refinement based on data**
   - Adjust scoring algorithms
   - Fine-tune industry classifications
   - Optimize brand archetype detection

### Phase 4: Advanced Intelligence (Future)
1. **Machine learning integration**
   - Learn from successful template selections
   - Optimize scoring based on user feedback
   - Predict template performance

2. **Dynamic characteristic detection**
   - Real-time template analysis
   - Auto-adaptation to new template formats
   - Continuous learning from template changes

---

## 🎯 Expected Outcomes

### Before (Current Hardcoded System)
```
Ramp.com → [GlitchText, ScaleIn, FloatingElements, TeslaStockGraph, PulsingCircles]
Figma.com → [GlitchText, ScaleIn, FloatingElements, TeslaStockGraph, PulsingCircles]
Stripe.com → [GlitchText, ScaleIn, FloatingElements, TeslaStockGraph, PulsingCircles]
```

### After (Intelligent Router System)
```
Ramp.com (FinTech + Professional) → 
  [DarkBGText, FadeIn, GrowthGraph, TeslaStock, LogoTemplate]
  ↳ Router reasoning: "Professional archetype + data-heavy content + conservative industry"

Figma.com (Design + Innovator) → 
  [ParticleExplosion, WipeIn, FloatingElements, HighlightSweep, PulsingCircles]  
  ↳ Router reasoning: "Innovator archetype + creative industry + visual product"

Stripe.com (DevTools + Sophisticate) →
  [GlitchText, SlideIn, CarouselText, CodeTemplate, TypingTemplate]
  ↳ Router reasoning: "Sophisticate archetype + technical content + developer audience"
```

### Key Improvements
1. **Brand-Appropriate Selection** - Templates match brand personality
2. **Industry Alignment** - Templates fit industry expectations  
3. **Content Optimization** - Templates suit content requirements
4. **Intelligent Variety** - Different brands get different templates
5. **Future-Proof Design** - Works regardless of template changes

---

## 💡 Strategic Advantages

### 1. **Future-Proof Architecture**
- Router analyzes template characteristics dynamically
- Works with any template format or structure
- Adapts to template library changes automatically

### 2. **Enhanced LLM Context**
- Router provides rich selection reasoning to LLM
- Better customization prompts with intelligent context
- Improved brand alignment in final output

### 3. **Scalable Intelligence**
- Easy to add new scoring factors
- Simple to adjust for new industries or archetypes
- Built for continuous learning and improvement

### 4. **Perfect Partnership with Modular Templates**
- Router selects optimal templates
- Modular templates auto-adapt to brand JSON
- LLM fine-tunes with intelligent context
- Result: Perfect brand-template-content alignment

---

## 🏁 Conclusion

The **Intelligent Template Router** transforms template selection from a hardcoded bottleneck into a sophisticated matching engine that:

1. **Analyzes brand context** comprehensively
2. **Understands template capabilities** dynamically  
3. **Matches optimally** using multi-factor scoring
4. **Provides rich context** for LLM customization
5. **Adapts to changes** in the template library

This router becomes the **brain** of the system, ensuring that the right templates get selected for each brand, while the modular templates handle the visual adaptation and the LLM handles the fine-tuning.

**Priority**: 🔥 **CRITICAL** - Unlocks full potential of modular template system  
**Timeline**: 3 weeks for full implementation  
**Risk**: 🟢 **LOW** - Additive enhancement, works with existing systems  
**Impact**: 🚀 **TRANSFORMATIVE** - Intelligent brand-aware video generation