# Implementation Plan: Smart Template Selection

## 🎯 Goal: Transform Random Selection → Intelligent Brand-Aligned Selection

### Phase 1: Quick Wins (2-3 hours)
**Make existing system use brand data without major refactoring**

#### 1.1 Enhance Current Metadata (30 min)
```typescript
// Add to existing metadata.ts for each template:
export const enhancedTemplateMetadata: Record<string, EnhancedMetadata> = {
  'GrowthGraph': {
    ...existingMetadata,
    // NEW FIELDS:
    emotionalBeats: ['triumph', 'transformation'],
    industries: ['fintech', 'saas', 'analytics'],
    brandArchetypes: ['achiever', 'innovator'],
    audienceRoles: ['executive', 'founder', 'investor'],
    colorCompatibility: 'adaptable',  // 'dark' | 'light' | 'adaptable'
    dataFriendly: true,  // Good for metrics/stats
  }
}
```

#### 1.2 Update Template Selector (1 hour)
```typescript
// In template-selector.ts
private async selectTemplateForBeat(
  scene: HeroJourneyScene,
  style: 'minimal' | 'dynamic' | 'bold',
  brandData?: any,
  usedTemplates?: Set<string>
): Promise<SelectedTemplate> {
  
  // NEW: Build brand context for selection
  const brandContext = {
    archetype: brandData?.brand?.identity?.archetype || 'professional',
    industry: this.inferIndustry(brandData),
    audience: brandData?.product?.targetAudience?.[0] || 'general',
    primaryColor: brandData?.brand?.visual?.colors?.primary,
    hasMetrics: brandData?.socialProof?.stats?.length > 0
  };
  
  // NEW: Score templates based on brand fit
  const candidates = this.beatToTemplateMap[scene.emotionalBeat]?.[style] || [];
  const scored = candidates.map(templateId => ({
    id: templateId,
    score: this.scoreTemplateFit(templateId, brandContext, scene)
  }));
  
  // Sort by score and pick from top 3 for variety
  const sorted = scored.sort((a, b) => b.score - a.score);
  const topChoices = sorted.slice(0, 3);
  const selected = topChoices[Math.floor(Math.random() * topChoices.length)];
  
  return this.loadTemplate(selected.id, scene);
}

// NEW: Scoring function
private scoreTemplateFit(
  templateId: string, 
  brandContext: BrandContext, 
  scene: HeroJourneyScene
): number {
  const metadata = enhancedTemplateMetadata[templateId];
  if (!metadata) return 0;
  
  let score = 0;
  
  // Industry match (0-30 points)
  if (metadata.industries?.includes(brandContext.industry)) {
    score += 30;
  }
  
  // Archetype match (0-25 points)
  if (metadata.brandArchetypes?.includes(brandContext.archetype)) {
    score += 25;
  }
  
  // Data compatibility (0-20 points)
  if (brandContext.hasMetrics && metadata.dataFriendly) {
    score += 20;
  }
  
  // Audience match (0-15 points)
  if (metadata.audienceRoles?.includes(brandContext.audience)) {
    score += 15;
  }
  
  // Emotional beat match (0-10 points)
  if (metadata.emotionalBeats?.includes(scene.emotionalBeat)) {
    score += 10;
  }
  
  return score;
}
```

#### 1.3 Expand Template Pool (30 min)
```typescript
// Add ALL registry templates to beatToTemplateMap
private beatToTemplateMap = {
  problem: {
    minimal: ['DarkBGGradientText', 'FadeIn', 'DarkForestBG', 'BlueBG', 'SpaceGreyBG'],
    dynamic: ['GlitchText', 'MorphingText', 'DrawOn', 'WipeIn', 'HighlightSweep'],
    bold: ['ParticleExplosion', 'GlitchText', 'WaveAnimation', 'AudioAnimation'],
  },
  // ... expand all sections to include all 45 templates
}
```

### Phase 2: Smart Matching (3-4 hours)
**Implement intelligent template matching based on brand data**

#### 2.1 Create Brand Analyzer Service
```typescript
// New file: /src/services/ai/brandAnalyzer.service.ts
export class BrandAnalyzerService {
  analyzeBrand(brandData: ExtractedBrandData): BrandProfile {
    return {
      archetype: this.detectArchetype(brandData),
      industry: this.detectIndustry(brandData),
      audience: this.analyzeAudience(brandData),
      visualStyle: this.analyzeVisualStyle(brandData),
      contentFocus: this.analyzeContent(brandData),
      emotionalTone: this.analyzeEmotion(brandData)
    };
  }
  
  private detectArchetype(data): BrandArchetype {
    const headline = data.headline?.toLowerCase() || '';
    const features = data.features || [];
    
    if (headline.includes('innovate') || headline.includes('future')) {
      return 'innovator';
    }
    if (headline.includes('trust') || headline.includes('secure')) {
      return 'protector';
    }
    if (features.some(f => f.title?.includes('premium'))) {
      return 'sophisticate';
    }
    // ... more logic
    return 'professional';
  }
  
  private detectIndustry(data): Industry {
    const keywords = this.extractKeywords(data);
    
    if (keywords.includes('payment') || keywords.includes('expense')) {
      return 'fintech';
    }
    if (keywords.includes('deploy') || keywords.includes('code')) {
      return 'developer-tools';
    }
    // ... more logic
  }
}
```

#### 2.2 Create Template Matcher Service
```typescript
// New file: /src/services/ai/templateMatcher.service.ts
export class TemplateMatcherService {
  matchTemplates(
    brandProfile: BrandProfile,
    scene: HeroJourneyScene,
    allTemplates: TemplateMetadata[]
  ): TemplateMatch[] {
    
    return allTemplates.map(template => {
      const score = this.calculateScore(template, brandProfile, scene);
      return { template, score, reasoning: this.explainMatch(template, brandProfile) };
    }).sort((a, b) => b.score - a.score);
  }
  
  private calculateScore(
    template: TemplateMetadata,
    profile: BrandProfile,
    scene: HeroJourneyScene
  ): number {
    let score = 0;
    
    // Emotional beat alignment (40%)
    if (template.emotionalBeats?.primary?.includes(scene.emotionalBeat)) {
      score += 40;
    }
    
    // Brand archetype fit (25%)
    if (template.brandArchetypes?.perfect?.includes(profile.archetype)) {
      score += 25;
    }
    
    // Industry relevance (20%)
    if (template.industries?.primary?.includes(profile.industry)) {
      score += 20;
    }
    
    // Audience match (15%)
    const audienceOverlap = this.calculateAudienceOverlap(
      template.targetAudiences,
      profile.audience
    );
    score += audienceOverlap * 15;
    
    return score;
  }
}
```

### Phase 3: Full Implementation (1-2 days)
**Complete overhaul with perfect metadata structure**

#### 3.1 Migrate to Perfect Metadata Structure
- Convert all 45 templates to new metadata format
- Add missing fields progressively
- Implement TypeScript interfaces

#### 3.2 Create ML-Based Selection
```typescript
// Use embeddings for semantic similarity
export class AITemplateSelector {
  private embeddings: Map<string, number[]>;
  
  async selectTemplate(
    brandData: ExtractedBrandData,
    scene: HeroJourneyScene
  ): Promise<SelectedTemplate> {
    // Generate embedding for current context
    const contextEmbedding = await this.generateEmbedding({
      brand: brandData,
      scene: scene
    });
    
    // Find most similar templates
    const similarities = this.calculateSimilarities(contextEmbedding);
    
    // Apply business rules and constraints
    const filtered = this.applyConstraints(similarities, scene);
    
    return filtered[0];
  }
}
```

#### 3.3 Implement Learning System
```typescript
// Track and learn from usage
export class TemplatePerformanceTracker {
  async trackUsage(
    templateId: string,
    context: UsageContext,
    outcome: UsageOutcome
  ) {
    // Store in database
    await db.insert(templateUsage).values({
      templateId,
      brandArchetype: context.brandArchetype,
      industry: context.industry,
      emotionalBeat: context.emotionalBeat,
      engagement: outcome.engagement,
      completion: outcome.completion,
      conversion: outcome.conversion
    });
    
    // Update template metadata with performance
    await this.updateTemplatePerformance(templateId);
  }
  
  async getRecommendations(context: UsageContext): Promise<string[]> {
    // Query successful combinations
    const successful = await db.query.templateUsage.findMany({
      where: and(
        eq(templateUsage.brandArchetype, context.brandArchetype),
        eq(templateUsage.industry, context.industry),
        gte(templateUsage.engagement, 0.8)
      ),
      orderBy: desc(templateUsage.engagement)
    });
    
    return successful.map(s => s.templateId);
  }
}
```

## 📋 Implementation Checklist

### Immediate (Today):
- [ ] Add basic brand fields to existing metadata (industries, archetypes)
- [ ] Update selector to score templates based on brand fit
- [ ] Expand beatToTemplateMap to include all 45 templates
- [ ] Add logging to track what templates are selected and why

### Short-term (This Week):
- [ ] Create BrandAnalyzer service
- [ ] Implement smart scoring algorithm
- [ ] Add template combination rules
- [ ] Create A/B testing framework

### Medium-term (Next Sprint):
- [ ] Migrate to perfect metadata structure
- [ ] Implement ML-based selection
- [ ] Add performance tracking
- [ ] Create feedback loop for learning

## 🎯 Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Template Variety | ~25 templates | 45 templates | Unique templates used per day |
| Brand Alignment | 0% | 80% | Manual review of selections |
| Industry Match | Random | 90% accurate | Industry-appropriate templates |
| Audience Match | None | 70% accurate | Role-appropriate content |
| User Satisfaction | Unknown | 4.5/5 | Post-generation survey |
| Repeat Usage | Unknown | 60% | Same template reuse rate |

## 🚀 Expected Impact

### Before:
- Random template selection
- No brand consideration
- Limited variety (25 templates)
- Generic output

### After:
- Smart, brand-aligned selection
- Industry-specific templates
- Full variety (45+ templates)
- Personalized, on-brand output

### ROI:
- **Development Time**: 8-16 hours
- **Expected Improvement**: 300% better brand alignment
- **User Satisfaction**: +40% expected increase
- **Template Utilization**: 180% increase (25 → 45 templates)