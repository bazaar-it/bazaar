# Feature 006: System Prompt Improvements

**Feature ID**: 006  
**Priority**: HIGH  
**Complexity**: LOW  
**Created**: January 2, 2025  

## Overview

Refine and optimize all system prompts to improve generation quality, reduce token usage, and increase consistency. This feature focuses on systematic testing and refinement of the core prompts that drive the AI video generation pipeline.

## Current State

- 4 main system prompts (reduced from 40+)
- Functional but not optimized for quality or efficiency
- Limited examples and edge case handling
- No systematic testing or version control
- Generic instructions without specialization
- Average token usage higher than necessary

Current prompts:
1. Brain Orchestrator - Tool selection and planning
2. Code Generator - Text/image to Remotion code
3. Code Editor - Precise code modifications  
4. Title Generator - Scene naming from code

## Problem Statement / User Need

Prompt quality directly impacts every user interaction:
- "The AI doesn't quite get what I mean"
- "Sometimes it generates great stuff, sometimes not"
- "It takes multiple tries to get what I want"
- Token costs are higher than necessary

Current issues:
- Inconsistent output quality
- Prompts too verbose, increasing costs
- Missing edge case handling
- No systematic improvement process
- Limited examples for complex scenarios

## Proposed Solution

Implement a systematic prompt improvement framework:

1. **Prompt Testing Framework**: A/B test variations
2. **Token Optimization**: Reduce size while maintaining quality
3. **Example Enhancement**: Add high-quality examples
4. **Specialization**: Context-specific prompt variations
5. **Version Control**: Track and rollback prompt changes
6. **Performance Monitoring**: Measure prompt effectiveness

## Technical Implementation

### Phase 1: Prompt Testing Framework
```typescript
// src/lib/evals/promptTesting.ts
interface PromptTest {
  id: string;
  promptKey: 'brain' | 'generator' | 'editor' | 'title';
  variants: PromptVariant[];
  metrics: TestMetrics;
  status: 'active' | 'completed' | 'failed';
}

interface PromptVariant {
  id: string;
  content: string;
  testGroup: 'control' | 'variant_a' | 'variant_b';
  metrics: {
    uses: number;
    successRate: number;
    avgTokens: number;
    userSatisfaction: number;
    regenerationRate: number;
  };
}

class PromptTestingService {
  async createABTest(
    promptKey: string,
    control: string,
    variants: string[]
  ): Promise<PromptTest> {
    const test = {
      id: generateId(),
      promptKey,
      variants: [
        { id: 'control', content: control, testGroup: 'control' },
        ...variants.map((v, i) => ({
          id: `variant_${i}`,
          content: v,
          testGroup: `variant_${String.fromCharCode(97 + i)}`
        }))
      ],
      status: 'active',
      startedAt: new Date()
    };
    
    await db.insert(promptTests).values(test);
    return test;
  }

  async selectPromptVariant(promptKey: string, userId: string): Promise<string> {
    const activeTest = await this.getActiveTest(promptKey);
    if (!activeTest) return getDefaultPrompt(promptKey);
    
    // Use consistent hashing for user assignment
    const variant = this.assignUserToVariant(userId, activeTest);
    
    // Track usage
    await this.trackUsage(activeTest.id, variant.id);
    
    return variant.content;
  }

  async evaluateTest(testId: string): Promise<TestResults> {
    const test = await this.getTest(testId);
    const stats = await this.calculateStatistics(test);
    
    return {
      winner: this.determineWinner(stats),
      confidence: this.calculateConfidence(stats),
      recommendation: this.generateRecommendation(stats)
    };
  }
}
```

### Phase 2: Optimized Prompt Templates
```typescript
// src/config/prompts/optimized/brain-orchestrator-v2.ts
export const BRAIN_ORCHESTRATOR_OPTIMIZED = `
You are the Brain of Bazaar's video generation system.

CONTEXT:
Project: {projectTitle}
Format: {format} ({width}×{height})
Scenes: {sceneCount}
Style: {dominantStyle}

REQUEST: {userPrompt}

AVAILABLE TOOLS:
- add: Create new scene from text/image
- edit: Modify existing scene (preferred for changes)
- delete: Remove scenes
- trim: Adjust timing

DECISION PROCESS:
1. If modifying existing content → edit
2. If creating new content → add
3. If removing content → delete
4. If adjusting duration → trim

OUTPUT: Single tool selection with parameters.

EXAMPLES:
"Make it blue" → edit(sceneId, "change color to blue")
"Add title" → add("title scene with text")
"Remove second scene" → delete(sceneId)

Be concise. Prefer edit over recreating.`;

// Reduced from 500+ tokens to ~200 tokens while maintaining effectiveness

// src/config/prompts/optimized/code-generator-v2.ts
export const CODE_GENERATOR_OPTIMIZED = `
Generate Remotion React code for: {prompt}

FORMAT: {format} {width}×{height}
STYLE: {projectStyle}

RULES:
- Use only <Sequence>, <AbsoluteFill>, standard HTML
- Include interpolate for animations
- Duration: {duration} frames (30fps)
- Style: {colorPalette}
- {formatSpecificRules}

STRUCTURE:
\`\`\`tsx
<Sequence from={0} durationInFrames={duration}>
  <AbsoluteFill style={containerStyle}>
    {/* Your content */}
  </AbsoluteFill>
</Sequence>
\`\`\`

Examples:
{relevantExamples}`;
```

### Phase 3: Dynamic Example Injection
```typescript
// src/server/services/ai/exampleSelector.ts
class ExampleSelector {
  private examples = new Map<string, Example[]>();

  async selectExamples(
    intent: string,
    context: Context,
    maxTokens: number = 500
  ): Promise<Example[]> {
    // Get all relevant examples
    const candidates = await this.findRelevantExamples(intent, context);
    
    // Score by relevance
    const scored = candidates.map(example => ({
      example,
      score: this.calculateRelevance(example, intent, context)
    }));
    
    // Sort by score
    scored.sort((a, b) => b.score - a.score);
    
    // Select examples within token budget
    const selected: Example[] = [];
    let tokenCount = 0;
    
    for (const { example } of scored) {
      const exampleTokens = this.countTokens(example);
      if (tokenCount + exampleTokens <= maxTokens) {
        selected.push(example);
        tokenCount += exampleTokens;
      }
    }
    
    return selected;
  }

  private calculateRelevance(
    example: Example,
    intent: string,
    context: Context
  ): number {
    let score = 0;
    
    // Semantic similarity
    score += this.semanticSimilarity(example.prompt, intent) * 0.4;
    
    // Context match (format, style, etc)
    score += this.contextMatch(example.context, context) * 0.3;
    
    // Success metrics
    score += example.metrics.successRate * 0.2;
    
    // Recency bonus
    score += this.recencyScore(example.lastUsed) * 0.1;
    
    return score;
  }
}
```

### Phase 4: Prompt Specialization
```typescript
// src/config/prompts/specialized/index.ts
export const SPECIALIZED_PROMPTS = {
  'text-heavy': {
    generator: TEXT_OPTIMIZED_GENERATOR,
    editor: TEXT_OPTIMIZED_EDITOR
  },
  
  'animation-heavy': {
    generator: ANIMATION_OPTIMIZED_GENERATOR,
    editor: ANIMATION_OPTIMIZED_EDITOR
  },
  
  'data-viz': {
    generator: DATA_VIZ_GENERATOR,
    editor: DATA_VIZ_EDITOR
  },
  
  'product-showcase': {
    generator: PRODUCT_SHOWCASE_GENERATOR,
    editor: PRODUCT_SHOWCASE_EDITOR
  }
};

// Intelligent prompt selection
export function selectPrompt(
  basePrompt: string,
  intent: Intent,
  context: Context
): string {
  // Detect specialization need
  const category = detectCategory(intent, context);
  
  // Get specialized prompt if available
  const specialized = SPECIALIZED_PROMPTS[category];
  if (specialized) {
    return specialized[basePrompt] || basePrompt;
  }
  
  return basePrompt;
}
```

### Phase 5: Performance Monitoring
```typescript
// src/server/services/monitoring/promptMetrics.ts
class PromptMetricsService {
  async trackGeneration(params: {
    promptKey: string;
    promptVersion: string;
    tokens: number;
    latency: number;
    success: boolean;
    userAction: 'accepted' | 'regenerated' | 'edited';
  }) {
    await db.insert(promptMetrics).values({
      ...params,
      timestamp: new Date()
    });
    
    // Real-time alerting for degradation
    const recentMetrics = await this.getRecentMetrics(params.promptKey);
    if (this.detectDegradation(recentMetrics)) {
      await this.alertTeam(params.promptKey, recentMetrics);
    }
  }

  async generateReport(): Promise<PromptReport> {
    const metrics = await this.getAllMetrics();
    
    return {
      summary: {
        avgTokensPerGeneration: this.calculateAvgTokens(metrics),
        successRate: this.calculateSuccessRate(metrics),
        regenerationRate: this.calculateRegenerationRate(metrics),
        costPerGeneration: this.calculateCost(metrics)
      },
      
      byPrompt: {
        brain: this.analyzePrompt(metrics, 'brain'),
        generator: this.analyzePrompt(metrics, 'generator'),
        editor: this.analyzePrompt(metrics, 'editor'),
        title: this.analyzePrompt(metrics, 'title')
      },
      
      recommendations: this.generateRecommendations(metrics)
    };
  }
}
```

### Phase 6: Continuous Improvement Pipeline
```typescript
// src/scripts/promptImprovement.ts
async function improvePrompts() {
  // 1. Analyze recent performance
  const metrics = await promptMetrics.getLastWeek();
  
  // 2. Identify underperforming prompts
  const candidates = metrics.filter(m => 
    m.successRate < 0.7 || m.regenerationRate > 0.3
  );
  
  // 3. Generate improvement variations
  for (const candidate of candidates) {
    const variations = await generateVariations(candidate);
    
    // 4. Create A/B test
    await promptTesting.createABTest(
      candidate.promptKey,
      candidate.currentPrompt,
      variations
    );
  }
  
  // 5. Evaluate completed tests
  const completedTests = await promptTesting.getCompletedTests();
  for (const test of completedTests) {
    const result = await promptTesting.evaluateTest(test.id);
    
    if (result.confidence > 0.95) {
      await deployWinningPrompt(result.winner);
    }
  }
}

// Run weekly
cron.schedule('0 0 * * 1', improvePrompts);
```

## Success Metrics

1. **Token Reduction**: 40% decrease in average tokens per generation
2. **Quality Improvement**: 25% reduction in regeneration requests
3. **Success Rate**: Increase from 65% to 85% first-attempt success
4. **Cost Savings**: 35% reduction in OpenAI API costs
5. **User Satisfaction**: 20% increase in quality ratings

## Future Enhancements

1. **Multi-model Testing**: Test prompts across different LLMs
2. **User-specific Prompts**: Personalize based on user preferences
3. **Prompt Chaining**: Multi-step prompts for complex tasks
4. **Visual Prompt Builder**: UI for non-technical prompt creation
5. **Prompt Marketplace**: Share high-performing prompts
6. **Auto-optimization**: AI-driven prompt improvement
7. **Multilingual Prompts**: Support non-English generation

## Implementation Timeline

- **Day 1**: Set up testing framework and metrics
- **Day 2**: Optimize existing prompts, create variations
- **Day 3**: Implement A/B testing system
- **Day 4**: Add specialized prompts and monitoring
- **Ongoing**: Weekly improvement cycles

## Dependencies

- Database tables for metrics and testing
- Analytics infrastructure
- A/B testing framework
- Token counting library

## Risks and Mitigations

1. **Testing Bias**: Early test results might not represent all users
   - Mitigation: Minimum sample size requirements
2. **Prompt Regression**: New prompts might break edge cases
   - Mitigation: Comprehensive test suite, gradual rollout
3. **Model Changes**: OpenAI updates might affect prompts
   - Mitigation: Version locking, regular testing

## Related Features

- AI Backend Improvements (shares optimization goals)
- Typography Agent (needs specialized prompts)
- Transition Agent (requires specific prompt patterns)