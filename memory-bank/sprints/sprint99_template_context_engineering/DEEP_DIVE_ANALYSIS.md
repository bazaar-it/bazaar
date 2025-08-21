# Deep Dive: Template-Based Context Engineering for Enhanced Code Generation

## Executive Summary

### Key Findings
- **LLM performs significantly better with contextual examples** - Previous scenes act as style guides
- **Templates are proven high-quality scene examples** ready to use as context
- **Current system only uses previous scenes** when available, missing opportunity for first scenes
- **Template similarity matching** can provide relevant examples for any generation request
- **1-2 contextual examples** dramatically improve code generation quality and consistency

### Strategic Implications
- **Immediate quality improvement** for first scenes in projects (currently weakest point)
- **Consistent styling** across all generated scenes through template guidance
- **Reduced generation failures** by providing working code patterns
- **Better user satisfaction** through higher quality initial generations

## Technical Deep Dive

### Current State Analysis

#### Context Building System (`contextBuilder.ts`)
```typescript
// Current context building focuses on:
- Scene history with full TSX code
- Recent chat messages (last 5)
- Image context from uploads
- Web analysis context
- Project assets (logos, images)

// MISSING: Template examples for code generation
```

#### Code Generation Flow
1. **Intent Analysis** → Determines tool selection (add/edit/delete)
2. **Context Building** → Gathers relevant information
3. **Code Generation** → Uses context to generate Remotion code
4. **Validation** → Fixes common issues

**Critical Gap**: When `previousSceneContext` is null (first scene), the LLM has no code examples to reference.

### Template System Architecture

#### Available Templates (60+ proven scenes)
```
src/templates/
├── Motion Graphics (FloatingParticles, PulsingCircles, WaveAnimation)
├── UI Components (MobileApp, FintechUI, DualScreenApp)
├── Text Animations (TypingTemplate, GradientText, WordFlip)
├── Transitions (FadeIn, SlideIn, WipeIn, ScaleIn)
├── Backgrounds (BlueBG, PinkBG, SunriseBG, DarkForestBG)
└── Interactive (CursorClickScene, AppJiggle, AudioAnimation)
```

Each template provides:
- **Working Remotion code** (validated and tested)
- **Specific animation patterns** (timing, easing, effects)
- **Style conventions** (colors, layouts, typography)
- **Duration standards** (30fps frame calculations)

### Proposed Architecture: Template Context Enhancement

#### 1. Template Similarity Matcher
```typescript
interface TemplateMatcher {
  findSimilarTemplates(prompt: string, limit: number): Template[];
  analyzeIntentForTemplates(intent: IntentAnalysis): Template[];
  scoreTemplateRelevance(template: Template, context: Context): number;
}
```

**Matching Strategies**:
- **Keyword Matching**: "particles" → FloatingParticles template
- **Intent Matching**: "text animation" → TypingTemplate, WordFlip
- **Style Matching**: "modern UI" → FintechUI, MobileApp
- **Format Matching**: TikTok format → vertical templates

#### 2. Enhanced Context Builder
```typescript
class EnhancedContextBuilder extends ContextBuilder {
  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
    const baseContext = await super.buildContext(input);
    
    // NEW: Add template examples when no previous scenes
    if (!input.previousSceneContext || baseContext.sceneHistory.length === 0) {
      const templateExamples = await this.getTemplateExamples(input);
      baseContext.templateContext = {
        examples: templateExamples,
        reasoning: "Using templates as style reference"
      };
    }
    
    return baseContext;
  }
  
  private async getTemplateExamples(input: OrchestrationInput) {
    // 1. Analyze user intent
    const keywords = this.extractKeywords(input.prompt);
    
    // 2. Find matching templates
    const matcher = new TemplateMatcher();
    const templates = matcher.findSimilarTemplates(input.prompt, 2);
    
    // 3. Return template code as examples
    return templates.map(t => ({
      name: t.name,
      code: t.getCode(),
      style: t.category
    }));
  }
}
```

#### 3. Modified Code Generator Prompt
```typescript
const enhancedPrompt = `
${existingPrompt}

TEMPLATE CONTEXT:
When provided with template examples, use them as style guides:
1. Match the animation patterns and timing
2. Adapt the visual style to user requirements
3. Use similar code structure and conventions
4. DO NOT copy exactly - adapt and customize

Example Templates Provided:
${context.templateContext?.examples.map(e => 
  `- ${e.name}: Professional ${e.style} template`
).join('\n')}

Your task: Create a scene that matches the user's request while 
incorporating the quality and style patterns from these templates.
`;
```

### Implementation Phases

#### Phase 1: Template Registry Enhancement (Week 1)
```typescript
// src/templates/registry.ts
export const templateRegistry = {
  getByCategory(category: string): Template[],
  getByKeywords(keywords: string[]): Template[],
  getByFormat(format: VideoFormat): Template[],
  getSimilarTo(template: Template): Template[],
  
  // Metadata for matching
  metadata: {
    'floating-particles': {
      keywords: ['particles', 'floating', 'animated', 'background'],
      category: 'motion-graphics',
      style: 'modern',
      complexity: 'medium'
    }
    // ... for all templates
  }
};
```

#### Phase 2: Intelligent Matcher (Week 1-2)
```typescript
class TemplateMatchingService {
  // Keyword-based matching
  matchByKeywords(prompt: string): ScoredTemplate[] {
    const keywords = this.extractKeywords(prompt);
    return this.scoreTemplates(keywords);
  }
  
  // Intent-based matching
  matchByIntent(intent: IntentAnalysis): ScoredTemplate[] {
    if (intent.action === 'text-animation') {
      return this.getTextTemplates();
    }
    // ... other intent mappings
  }
  
  // Style-based matching
  matchByStyle(styleReference: string): ScoredTemplate[] {
    // "Apple-style" → clean, minimal templates
    // "TikTok-style" → vertical, energetic templates
  }
  
  // Combined scoring
  getBestMatches(input: MatchInput): Template[] {
    const scores = [
      ...this.matchByKeywords(input.prompt),
      ...this.matchByIntent(input.intent),
      ...this.matchByStyle(input.style)
    ];
    return this.dedupeAndSort(scores).slice(0, 2);
  }
}
```

#### Phase 3: Context Integration (Week 2)
```typescript
// src/brain/orchestrator_functions/contextBuilder.ts
async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
  const context = await this.buildBaseContext(input);
  
  // Enhanced: Add template context
  if (this.shouldAddTemplateContext(context)) {
    const templateService = new TemplateMatchingService();
    const templates = templateService.getBestMatches({
      prompt: input.prompt,
      intent: input.intent,
      format: input.projectFormat
    });
    
    context.templateExamples = templates.map(t => ({
      code: t.getCode(),
      description: `Example: ${t.name} - ${t.description}`
    }));
  }
  
  return context;
}

private shouldAddTemplateContext(context: ContextPacket): boolean {
  return (
    // No previous scenes available
    context.sceneHistory.length === 0 ||
    // User is creating first scene
    context.sceneNumber === 1 ||
    // Explicitly requested style change
    context.intent.includes('style') ||
    // Quality improvement needed
    context.previousGenerationFailed
  );
}
```

#### Phase 4: Prompt Enhancement (Week 2-3)
```typescript
// src/config/prompts/active/code-generator.ts
export const CODE_GENERATOR_WITH_TEMPLATES = {
  ...CODE_GENERATOR,
  content: `
    ${CODE_GENERATOR.content}
    
    TEMPLATE EXAMPLES:
    When template examples are provided, they demonstrate high-quality
    Remotion code patterns. Use them as inspiration while creating
    unique content for the user's specific request.
    
    Guidelines for using templates:
    1. STRUCTURE: Follow similar component organization
    2. ANIMATIONS: Adapt timing and easing patterns
    3. STYLE: Match quality level and polish
    4. PATTERNS: Use proven animation techniques
    5. CUSTOMIZE: Always tailor to user's specific needs
    
    Remember: Templates are guides, not exact copies. Create something
    new that incorporates their best qualities.
  `
};
```

### Performance & Quality Metrics

#### Expected Improvements
1. **First Scene Quality**: 40-60% improvement in initial generation
2. **Style Consistency**: 80% better adherence to requested styles
3. **Generation Success Rate**: 25% reduction in failed generations
4. **User Satisfaction**: Measurable increase in scenes kept vs regenerated

#### Measurement Strategy
```typescript
interface QualityMetrics {
  generationAttempts: number;
  successfulFirstTry: boolean;
  userRegenerated: boolean;
  compilationErrors: number;
  styleMatchScore: number;
}

// Track before/after template context implementation
const metricsService = {
  trackGeneration(projectId: string, metrics: QualityMetrics),
  compareWithBaseline(metrics: QualityMetrics): Improvement,
  reportImprovements(): Report
};
```

### Risk Analysis & Mitigation

#### Potential Issues
1. **Over-reliance on templates** → Ensure diversity through rotation
2. **Incorrect template matching** → Fallback to no-template generation
3. **Performance overhead** → Cache template matching results
4. **Template staleness** → Regular template quality audits

#### Mitigation Strategies
```typescript
const safeguards = {
  // Rotate template selections
  diversityCheck: (recent: Template[], candidate: Template) => boolean,
  
  // Validate template relevance
  relevanceThreshold: 0.7, // Minimum score to use template
  
  // Performance optimization
  cacheStrategy: 'lru-cache',
  maxCacheSize: 100,
  
  // Quality assurance
  templateAudit: 'monthly'
};
```

## Implementation Roadmap

### Week 1: Foundation
- [ ] Create template metadata system
- [ ] Build keyword extraction service
- [ ] Implement basic template matcher
- [ ] Add template context to ContextPacket type

### Week 2: Integration
- [ ] Enhance context builder with template selection
- [ ] Modify code generator to accept template context
- [ ] Update prompts to leverage templates
- [ ] Test with various generation scenarios

### Week 3: Optimization
- [ ] Implement caching for template matching
- [ ] Add relevance scoring algorithms
- [ ] Create feedback loop for template effectiveness
- [ ] Deploy A/B testing framework

### Week 4: Scale & Monitor
- [ ] Deploy to production with feature flag
- [ ] Monitor quality metrics
- [ ] Gather user feedback
- [ ] Iterate on matching algorithms

## Advanced Concepts

### Dynamic Template Learning
```typescript
class TemplateEvolution {
  // Learn from successful user generations
  async addUserGeneratedTemplate(scene: Scene, metrics: QualityMetrics) {
    if (metrics.userSatisfaction > 0.9) {
      await this.analyzeForTemplatePatterns(scene);
      await this.considerForTemplateLibrary(scene);
    }
  }
  
  // Evolve template selection based on usage
  async updateTemplateScores(usage: TemplateUsage[]) {
    for (const use of usage) {
      if (use.resultKept) {
        this.increaseRelevanceScore(use.template, use.context);
      }
    }
  }
}
```

### Multi-Template Composition
```typescript
// Combine multiple templates for complex requests
const compositeGeneration = {
  // "Create text with particles and transitions"
  combineTemplates: [
    'TypingTemplate',     // Text animation base
    'FloatingParticles',  // Particle effects
    'FadeIn'             // Transition style
  ],
  
  mergingStrategy: 'layer-components',
  conflictResolution: 'user-intent-priority'
};
```

### Context-Aware Template Selection
```typescript
interface SmartTemplateSelector {
  // Consider full project context
  selectTemplates(input: {
    currentScenes: Scene[];
    brandAssets: Asset[];
    userPreferences: Preferences;
    requestIntent: Intent;
  }): Template[];
  
  // Maintain style consistency
  ensureConsistency(selected: Template[], existing: Scene[]): boolean;
  
  // Adapt to user feedback
  learnFromFeedback(selected: Template[], kept: boolean): void;
}
```

## Conclusion

Template-based context engineering represents a significant opportunity to improve code generation quality, especially for first scenes where no previous context exists. By providing 1-2 high-quality template examples matched to user intent, we can achieve substantial improvements in generation success rates and user satisfaction.

The implementation is straightforward, building on existing systems without requiring architectural changes. The template matcher can be progressively enhanced, starting with simple keyword matching and evolving to sophisticated intent-based selection.

This approach aligns perfectly with the observation that "our LLM produces so much better results when there is a previous scene" - we're essentially providing synthetic "previous scenes" from our curated template library, ensuring every generation benefits from contextual examples.

## Next Steps

1. **Validate approach** with small-scale prototype
2. **Measure baseline** generation quality metrics
3. **Implement Phase 1** template registry enhancements
4. **A/B test** template context vs. no template context
5. **Iterate** based on quality improvements
6. **Scale** to full production deployment

The system is ready for this enhancement - all components are in place, we just need to connect them intelligently.