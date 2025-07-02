# Feature 004: AI Prompt Backend Improvements

**Feature ID**: 004  
**Priority**: HIGH  
**Complexity**: MEDIUM  
**Created**: January 2, 2025  

## Overview

Enhance the AI prompt backend to provide better context understanding, improved generation quality, and more consistent outputs. This feature focuses on making the AI smarter about understanding user intent, maintaining style consistency, and generating higher-quality video scenes on the first attempt.

## Current State

- Brain Orchestrator provides basic context
- Single-pass generation without refinement
- Limited project history awareness
- No style consistency tracking between scenes
- Minimal few-shot examples in prompts
- Generic prompts without specialization

## Problem Statement / User Need

Users experience inconsistent generation quality and often need to regenerate scenes multiple times:
- "The AI doesn't understand the style I want"
- "Each scene looks different even when I want consistency"
- "I have to be very specific or it generates something random"
- "It doesn't remember what I asked for in previous scenes"

Current metrics show:
- 35% of generations require regeneration
- Style consistency complaints in 40% of feedback
- Users spend excessive time crafting perfect prompts

## Proposed Solution

Implement a comprehensive context enhancement system with multi-level improvements:

1. **Enhanced Context Building**: Gather rich project context
2. **Style Consistency System**: Track and maintain visual coherence
3. **Prompt Chaining**: Multi-step generation for complex requests
4. **Few-Shot Learning**: Inject high-quality examples
5. **Feedback Loop**: Learn from user corrections

## Technical Implementation

### Phase 1: Enhanced Context Builder
```typescript
// src/server/services/brain/contextBuilder.ts
class EnhancedContextBuilder {
  async buildContext(projectId: string, currentPrompt: string) {
    const [
      projectStyle,
      recentScenes,
      userPreferences,
      colorPalette,
      animationPatterns,
      componentLibrary,
      narrativeFlow
    ] = await Promise.all([
      this.extractProjectStyle(projectId),
      this.getRecentScenes(projectId, 3),
      this.getUserPreferences(userId),
      this.extractDominantColors(projectId),
      this.detectAnimationStyle(projectId),
      this.getUsedComponents(projectId),
      this.analyzeStoryProgression(projectId)
    ]);

    return {
      // Current context
      projectStyle,
      recentScenes,
      userPreferences,
      
      // New enhanced context
      colorPalette: {
        primary: colorPalette.primary,
        secondary: colorPalette.secondary,
        accent: colorPalette.accent,
        usage: colorPalette.distribution
      },
      
      animationPatterns: {
        preferredEasing: animationPatterns.easing,
        typicalDuration: animationPatterns.avgDuration,
        complexity: animationPatterns.complexity
      },
      
      componentLibrary: {
        frequentlyUsed: componentLibrary.top5,
        customComponents: componentLibrary.custom,
        importPatterns: componentLibrary.imports
      },
      
      narrativeFlow: {
        currentChapter: narrativeFlow.position,
        storyArc: narrativeFlow.arc,
        nextExpected: narrativeFlow.suggestions
      },
      
      technicalConstraints: {
        targetFormat: project.format,
        dimensions: { width: project.width, height: project.height },
        performance: await this.assessPerformanceNeeds(projectId)
      }
    };
  }

  private async extractProjectStyle(projectId: string) {
    const scenes = await getProjectScenes(projectId);
    
    return {
      typography: {
        fonts: this.extractFonts(scenes),
        sizes: this.extractFontSizes(scenes),
        weights: this.extractFontWeights(scenes)
      },
      spacing: {
        margins: this.extractSpacing(scenes, 'margin'),
        padding: this.extractSpacing(scenes, 'padding'),
        gaps: this.extractGaps(scenes)
      },
      animations: {
        types: this.extractAnimationTypes(scenes),
        timings: this.extractTimings(scenes),
        easings: this.extractEasings(scenes)
      }
    };
  }
}
```

### Phase 2: Multi-Step Prompt Chaining
```typescript
// src/server/services/ai/promptChaining.ts
class PromptChainExecutor {
  async executeChain(userPrompt: string, context: EnhancedContext) {
    // Step 1: Intent Analysis
    const intent = await this.analyzeIntent(userPrompt, context);
    
    // Step 2: Requirement Extraction
    const requirements = await this.extractRequirements(intent, context);
    
    // Step 3: Component Selection
    const components = await this.selectComponents(requirements, context);
    
    // Step 4: Layout Generation
    const layout = await this.generateLayout(components, context);
    
    // Step 5: Animation Planning
    const animations = await this.planAnimations(layout, context);
    
    // Step 6: Code Generation
    const code = await this.generateCode({
      layout,
      animations,
      style: context.projectStyle,
      components
    });
    
    // Step 7: Optimization Pass
    const optimized = await this.optimizeCode(code, context);
    
    return {
      code: optimized,
      metadata: {
        intent,
        components: components.map(c => c.name),
        animations: animations.map(a => a.type),
        confidence: this.calculateConfidence(intent, requirements)
      }
    };
  }

  private async analyzeIntent(prompt: string, context: EnhancedContext) {
    const response = await llm.complete({
      prompt: INTENT_ANALYSIS_PROMPT,
      variables: {
        userPrompt: prompt,
        recentHistory: context.recentScenes,
        projectContext: context.narrativeFlow
      }
    });
    
    return {
      primary: response.primaryIntent,
      secondary: response.secondaryIntents,
      complexity: response.complexity,
      suggestedApproach: response.approach
    };
  }
}
```

### Phase 3: Few-Shot Example System
```typescript
// src/config/prompts/examples/sceneExamples.ts
export const CATEGORIZED_EXAMPLES = {
  'text-animation': {
    simple: {
      prompt: "Animated title that fades in",
      code: `
<Sequence>
  <AbsoluteFill style={{ backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
    <div style={{
      fontSize: 60,
      fontWeight: 'bold',
      color: 'white',
      opacity: interpolate(frame, [0, 30], [0, 1])
    }}>
      Welcome
    </div>
  </AbsoluteFill>
</Sequence>`,
      explanation: "Simple fade using interpolate on opacity"
    },
    
    complex: {
      prompt: "Typewriter effect with cursor",
      code: `// Complete typewriter implementation...`,
      explanation: "Character-by-character reveal with blinking cursor"
    }
  },
  
  'data-viz': {
    barChart: {
      prompt: "Animated bar chart showing growth",
      code: `// Bar chart with staggered animation...`,
      explanation: "Bars grow with staggered delay for visual appeal"
    },
    
    lineChart: {
      prompt: "Line graph that draws itself",
      code: `// SVG path animation implementation...`,
      explanation: "SVG stroke-dasharray technique for draw effect"
    }
  },
  
  'product-showcase': {
    rotation: {
      prompt: "3D product rotation",
      code: `// 3D transform with rotation...`,
      explanation: "CSS 3D transforms for depth"
    },
    
    features: {
      prompt: "Product with feature callouts",
      code: `// Product image with animated labels...`,
      explanation: "Staggered reveal of feature points"
    }
  }
};

// Intelligent example selection
export function selectRelevantExamples(
  intent: Intent, 
  context: EnhancedContext
): Example[] {
  const category = mapIntentToCategory(intent);
  const complexity = determineComplexityNeeded(context);
  
  return [
    CATEGORIZED_EXAMPLES[category][complexity],
    ...findSimilarExamples(intent, context, 2)
  ];
}
```

### Phase 4: Style Consistency Tracker
```typescript
// src/server/services/brain/styleConsistency.ts
class StyleConsistencyService {
  async ensureConsistency(
    newSceneCode: string, 
    projectId: string
  ): Promise<string> {
    const projectStyle = await this.getProjectStyleGuide(projectId);
    
    // Parse the new scene
    const ast = parse(newSceneCode);
    
    // Apply consistent styling
    traverse(ast, {
      JSXAttribute(path) {
        if (path.node.name.name === 'style') {
          const styles = evaluateStyleObject(path.node.value);
          
          // Apply project-wide styles
          if (styles.color && !projectStyle.colors.includes(styles.color)) {
            styles.color = this.findClosestColor(styles.color, projectStyle.colors);
          }
          
          if (styles.fontFamily && !projectStyle.fonts.includes(styles.fontFamily)) {
            styles.fontFamily = projectStyle.fonts.primary;
          }
          
          // Update AST
          path.node.value = styleObjectToAST(styles);
        }
      }
    });
    
    return generate(ast).code;
  }

  private async getProjectStyleGuide(projectId: string) {
    const cache = await redis.get(`style-guide:${projectId}`);
    if (cache) return JSON.parse(cache);
    
    const scenes = await getProjectScenes(projectId);
    const styleGuide = {
      colors: this.extractAllColors(scenes),
      fonts: this.extractAllFonts(scenes),
      spacing: this.extractSpacingSystem(scenes),
      animations: this.extractAnimationPatterns(scenes)
    };
    
    await redis.set(`style-guide:${projectId}`, JSON.stringify(styleGuide), 3600);
    return styleGuide;
  }
}
```

### Phase 5: Feedback Learning System
```typescript
// src/server/services/ai/feedbackLearning.ts
class FeedbackLearningService {
  async trackGeneration(generationId: string, result: GenerationResult) {
    await db.insert(generationTracking).values({
      id: generationId,
      prompt: result.prompt,
      context: result.context,
      generatedCode: result.code,
      timestamp: new Date()
    });
  }

  async trackUserEdit(generationId: string, editedCode: string) {
    const original = await this.getGeneration(generationId);
    const diff = computeDiff(original.generatedCode, editedCode);
    
    await db.insert(userEdits).values({
      generationId,
      originalCode: original.generatedCode,
      editedCode,
      diff,
      editType: this.classifyEdit(diff)
    });
    
    // Learn from the edit
    await this.updatePromptWeights(original.prompt, diff);
  }

  private async updatePromptWeights(prompt: string, diff: Diff) {
    // Analyze what the user changed
    const changes = this.analyzeChanges(diff);
    
    // Update prompt templates if pattern detected
    if (changes.pattern) {
      await this.suggestPromptImprovement(prompt, changes);
    }
    
    // A/B test tracking
    if (changes.severity === 'major') {
      await this.flagForReview(prompt, changes);
    }
  }
}
```

## Success Metrics

1. **Generation Quality**: Reduce regeneration rate from 35% to 15%
2. **Style Consistency**: 90% of users report consistent styling
3. **First-Time Success**: Increase first-attempt satisfaction by 40%
4. **Context Awareness**: 80% of generations use project context effectively
5. **Performance**: Maintain sub-2s generation time despite enhancements

## Future Enhancements

1. **User-Specific Learning**: Personalized generation based on user history
2. **Semantic Understanding**: Natural language parsing for better intent
3. **Visual Similarity**: Use computer vision to ensure visual consistency
4. **Prompt Templates**: User-created templates for common patterns
5. **Collaborative Learning**: Learn from all users' corrections
6. **Real-time Suggestions**: Suggest completions as user types
7. **Multi-language Support**: Generate in user's preferred language

## Implementation Timeline

- **Week 1**: Enhanced context builder and style tracking
- **Week 2**: Prompt chaining system
- **Week 3**: Few-shot examples and example selection
- **Week 4**: Feedback learning system and A/B testing

## Dependencies

- Enhanced Brain Orchestrator
- Scene analysis capabilities  
- Redis for caching style guides
- Database schema for tracking edits
- LLM with sufficient context window

## Risks and Mitigations

1. **Increased Latency**: More context might slow generation
   - Mitigation: Parallel processing, smart caching
2. **Over-fitting**: Too much context might reduce creativity
   - Mitigation: Balance context with temperature settings
3. **Complexity**: System becomes harder to debug
   - Mitigation: Comprehensive logging, modular design

## Related Features

- Scene Transitions (needs consistent styling)
- Typography Agent (shares prompt improvements)
- System Prompt Improvements (complementary effort)