# Template Context Engineering - Implementation Guide

## Quick Start Implementation

### Step 1: Create Template Matching Service
```typescript
// src/services/ai/templateMatching.service.ts

import { templates } from '~/templates/registry';

interface TemplateMatch {
  template: Template;
  score: number;
  reasoning: string;
}

export class TemplateMatchingService {
  // Simple keyword-based matching to start
  findBestTemplates(prompt: string, limit = 2): TemplateMatch[] {
    const keywords = this.extractKeywords(prompt.toLowerCase());
    const matches: TemplateMatch[] = [];
    
    for (const template of templates) {
      const score = this.scoreTemplate(template, keywords);
      if (score > 0) {
        matches.push({
          template,
          score,
          reasoning: `Matched keywords: ${keywords.join(', ')}`
        });
      }
    }
    
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  private extractKeywords(prompt: string): string[] {
    // Key animation/style words to match
    const patterns = [
      'particles', 'floating', 'typing', 'text', 'animation',
      'gradient', 'pulse', 'wave', 'growth', 'chart', 'graph',
      'mobile', 'app', 'ui', 'interface', 'button', 'click',
      'modern', 'clean', 'minimal', 'colorful', 'dark',
      'finance', 'fintech', 'tech', 'saas', 'startup'
    ];
    
    return patterns.filter(pattern => prompt.includes(pattern));
  }
  
  private scoreTemplate(template: Template, keywords: string[]): number {
    let score = 0;
    const templateName = template.name.toLowerCase();
    const templateCode = template.getCode().toLowerCase();
    
    for (const keyword of keywords) {
      if (templateName.includes(keyword)) score += 2;
      if (templateCode.includes(keyword)) score += 1;
    }
    
    return score;
  }
}
```

### Step 2: Enhance Context Builder
```typescript
// src/brain/orchestrator_functions/contextBuilder.ts
// ADD to existing buildContext method

import { TemplateMatchingService } from '~/services/ai/templateMatching.service';

export class ContextBuilder {
  private templateMatcher = new TemplateMatchingService();
  
  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
    // ... existing context building code ...
    
    // NEW: Add template examples when appropriate
    const templateContext = await this.buildTemplateContext(input, scenesWithCode);
    
    return {
      // ... existing context fields ...
      
      // NEW: Template context field
      templateContext: templateContext
    };
  }
  
  private async buildTemplateContext(
    input: OrchestrationInput, 
    existingScenes: any[]
  ) {
    // Only add templates when:
    // 1. No existing scenes (first scene)
    // 2. User explicitly asks for style reference
    // 3. Previous generation failed
    
    const shouldUseTemplates = 
      existingScenes.length === 0 || 
      input.prompt.toLowerCase().includes('style') ||
      input.prompt.toLowerCase().includes('like') ||
      input.prompt.toLowerCase().includes('similar');
    
    if (!shouldUseTemplates) {
      return undefined;
    }
    
    console.log('📚 [CONTEXT BUILDER] Adding template examples for better generation');
    
    const matches = this.templateMatcher.findBestTemplates(input.prompt);
    
    if (matches.length === 0) {
      return undefined;
    }
    
    return {
      examples: matches.map(m => ({
        name: m.template.name,
        code: m.template.getCode(),
        reasoning: m.reasoning
      })),
      message: `Using ${matches.length} template(s) as style reference`
    };
  }
}
```

### Step 3: Update Code Generator
```typescript
// src/tools/add/add_helpers/CodeGeneratorNEW.ts
// MODIFY the generateCodeDirect method

async generateCodeDirect(input: CodeGenerationInput): Promise<CodeGenerationOutput> {
  // Build messages for AI
  const messages: AIMessage[] = [];
  
  // System prompt
  messages.push({
    role: 'system',
    content: this.getSystemPrompt(input)
  });
  
  // NEW: Add template context if available
  if (input.templateContext?.examples) {
    const templatePrompt = this.buildTemplatePrompt(input.templateContext);
    messages.push({
      role: 'system',
      content: templatePrompt
    });
  }
  
  // User prompt
  messages.push({
    role: 'user',
    content: input.userPrompt
  });
  
  // ... rest of generation logic ...
}

private buildTemplatePrompt(templateContext: any): string {
  return `
TEMPLATE EXAMPLES FOR REFERENCE:
You have been provided with ${templateContext.examples.length} high-quality template(s) as style reference.
These templates demonstrate professional Remotion code patterns.

${templateContext.examples.map((ex: any, i: number) => `
TEMPLATE ${i + 1}: ${ex.name}
${ex.reasoning}

\`\`\`tsx
${ex.code}
\`\`\`
`).join('\n')}

IMPORTANT: Use these templates as inspiration for:
- Animation timing and easing
- Code structure and organization  
- Visual polish and effects
- Professional quality

But CREATE something NEW that specifically addresses the user's request.
DO NOT copy the templates exactly - adapt and customize them.
`;
}
```

### Step 4: Update Types
```typescript
// src/lib/types/ai/brain.types.ts
// ADD to ContextPacket interface

export interface ContextPacket {
  // ... existing fields ...
  
  templateContext?: {
    examples: Array<{
      name: string;
      code: string;
      reasoning: string;
    }>;
    message: string;
  };
}

// src/tools/helpers/types.ts
// ADD to CodeGenerationInput

export interface CodeGenerationInput {
  // ... existing fields ...
  
  templateContext?: {
    examples: Array<{
      name: string;
      code: string;
      reasoning: string;
    }>;
  };
}
```

### Step 5: Pass Template Context Through Pipeline
```typescript
// src/tools/add/add.ts
// MODIFY generateFromText method

private async generateFromText(input: AddToolInput): Promise<AddToolOutput> {
  const functionName = this.generateFunctionName();
  
  // Check if we have template context from brain
  const templateContext = input.contextPacket?.templateContext;
  
  if (input.previousSceneContext?.tsxCode) {
    // Use previous scene as before
    // ...
  } else {
    // NEW: Pass template context to code generator
    console.log('⚡ [ADD TOOL] Using DIRECT code generation with template context');
    
    const codeResult = await codeGenerator.generateCodeDirect({
      userPrompt: input.userPrompt,
      functionName: functionName,
      projectId: input.projectId,
      projectFormat: input.projectFormat,
      requestedDurationFrames: input.requestedDurationFrames,
      assetUrls: input.assetUrls,
      isYouTubeAnalysis: input.isYouTubeAnalysis,
      templateContext: templateContext, // NEW: Pass templates
    });
    
    // ... rest of the method ...
  }
}
```

## Testing Strategy

### Test Cases
```typescript
// src/tests/templateContext.test.ts

describe('Template Context Engineering', () => {
  it('should match particle templates for particle requests', () => {
    const matcher = new TemplateMatchingService();
    const matches = matcher.findBestTemplates('create floating particles animation');
    
    expect(matches[0].template.name).toContain('Particle');
    expect(matches[0].score).toBeGreaterThan(0);
  });
  
  it('should provide templates for first scene', async () => {
    const contextBuilder = new ContextBuilder();
    const context = await contextBuilder.buildContext({
      prompt: 'create modern text animation',
      projectId: 'test',
      sceneHistory: [], // No previous scenes
    });
    
    expect(context.templateContext).toBeDefined();
    expect(context.templateContext.examples.length).toBeGreaterThan(0);
  });
  
  it('should not provide templates when scenes exist', async () => {
    const contextBuilder = new ContextBuilder();
    const context = await contextBuilder.buildContext({
      prompt: 'add another scene',
      projectId: 'test',
      sceneHistory: [{ id: '1', tsxCode: '...' }], // Has previous scenes
    });
    
    expect(context.templateContext).toBeUndefined();
  });
});
```

## Deployment Plan

### Phase 1: Silent Testing (Day 1-3)
```typescript
// Feature flag in environment
ENABLE_TEMPLATE_CONTEXT=true

// Log but don't use templates
if (process.env.ENABLE_TEMPLATE_CONTEXT) {
  const templates = this.findTemplates(prompt);
  console.log('[EXPERIMENT] Would use templates:', templates);
}
```

### Phase 2: A/B Testing (Day 4-7)
```typescript
// 50% of users get template context
const useTemplates = Math.random() > 0.5;

// Track metrics
analytics.track('generation_with_templates', {
  used_templates: useTemplates,
  success: result.success,
  user_kept_scene: !regenerated
});
```

### Phase 3: Full Rollout (Day 8+)
```typescript
// Enable for all users
// Monitor quality metrics
// Iterate on matching algorithm
```

## Monitoring & Metrics

### Key Metrics to Track
```typescript
interface GenerationMetrics {
  // Quality indicators
  firstGenerationSuccess: boolean;
  compilationErrors: number;
  userRegeneratedScene: boolean;
  
  // Template usage
  templatesProvided: boolean;
  templateNames: string[];
  templateMatchScore: number;
  
  // Performance
  generationTime: number;
  contextBuildTime: number;
}

// Track in database
await db.insert(generationMetrics).values({
  projectId,
  sceneId,
  ...metrics,
  timestamp: new Date()
});
```

### Success Criteria
- **30% reduction** in first-scene regeneration rate
- **50% improvement** in first-scene compilation success
- **No degradation** in generation speed
- **Positive user feedback** on scene quality

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Wrong Templates Selected
```typescript
// Add debugging
console.log('[TEMPLATE MATCH] Keywords:', keywords);
console.log('[TEMPLATE MATCH] Scores:', matches.map(m => 
  `${m.template.name}: ${m.score}`
));

// Solution: Refine keyword extraction
```

#### 2. Templates Overwhelming User Intent
```typescript
// Reduce template influence
const templatePrompt = `
SUBTLE REFERENCE: These templates show good patterns.
PRIMARY FOCUS: The user's specific request.
`;
```

#### 3. Performance Issues
```typescript
// Cache template matching results
const cacheKey = `template:${prompt.substring(0, 50)}`;
const cached = cache.get(cacheKey);
if (cached) return cached;

const result = this.findTemplates(prompt);
cache.set(cacheKey, result, 60 * 60); // 1 hour
return result;
```

## Advanced Enhancements (Future)

### 1. AI-Powered Template Matching
```typescript
// Use GPT to understand intent better
const intent = await ai.analyze(`
  User wants: "${prompt}"
  
  Available template categories:
  - Particles & Effects
  - Text Animations
  - UI Components
  - Data Visualizations
  
  Which categories best match?
`);
```

### 2. Template Combinations
```typescript
// Combine multiple templates for complex requests
if (prompt.includes('text') && prompt.includes('particles')) {
  return [
    templates.find(t => t.name.includes('Typing')),
    templates.find(t => t.name.includes('Particles'))
  ];
}
```

### 3. User Preference Learning
```typescript
// Track which templates lead to kept scenes
interface UserPreference {
  userId: string;
  preferredTemplates: string[];
  avoidedTemplates: string[];
}

// Bias selection toward user preferences
const userPrefs = await getUserPreferences(userId);
matches.forEach(m => {
  if (userPrefs.preferredTemplates.includes(m.template.name)) {
    m.score *= 1.5; // Boost preferred templates
  }
});
```

## Summary

This implementation provides a practical, incremental approach to adding template context to the code generation pipeline. Starting with simple keyword matching and gradually evolving to more sophisticated selection algorithms, we can significantly improve generation quality, especially for first scenes where no previous context exists.

The key insight is that templates are essentially "synthetic previous scenes" - proven, high-quality examples that guide the LLM toward better code generation. By providing 1-2 relevant templates as context, we give the LLM the same advantage it has when generating subsequent scenes in a project.