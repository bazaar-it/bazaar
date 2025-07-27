# Context Engineering Implementation Plan

## Quick POC Implementation (Start Here)

### Step 1: Create Context Directory Structure
```bash
/src/contexts/
├── base/
│   ├── generation.context.md    # Base generation rules
│   └── editing.context.md       # Base editing rules
├── specialized/
│   ├── typography.context.md    # Text animations
│   ├── image-recreation.md     # Image to code
│   ├── particles.context.md    # Particle effects
│   ├── data-viz.context.md     # Charts/graphs
│   └── transitions.context.md  # Scene transitions
├── platform/
│   ├── tiktok.context.md       # TikTok optimizations
│   ├── youtube.context.md      # YouTube optimizations
│   └── instagram.context.md    # Instagram optimizations
└── index.ts                    # Context manager
```

### Step 2: Simple Context Manager
```typescript
// src/contexts/index.ts
export interface Context {
  id: string;
  category: 'base' | 'specialized' | 'platform';
  name: string;
  description: string;
  content: string;
  tags: string[];
  combinableWith: string[]; // Which contexts work well together
  priority: number; // For conflict resolution
}

export class ContextManager {
  private contexts: Map<string, Context> = new Map();
  private cache: Map<string, string> = new Map();

  async initialize() {
    // Load all context files on startup
    const contextFiles = await glob('./contexts/**/*.context.md');
    
    for (const file of contextFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const metadata = this.extractMetadata(content);
      const id = path.basename(file, '.context.md');
      
      this.contexts.set(id, {
        id,
        content,
        ...metadata
      });
    }
  }

  async getContext(contextIds: string[]): Promise<string> {
    const cacheKey = contextIds.sort().join(':');
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Sort by priority for proper merging
    const contexts = contextIds
      .map(id => this.contexts.get(id))
      .filter(Boolean)
      .sort((a, b) => b!.priority - a!.priority);

    // Merge contexts intelligently
    const merged = this.mergeContexts(contexts as Context[]);
    this.cache.set(cacheKey, merged);
    
    return merged;
  }

  private mergeContexts(contexts: Context[]): string {
    // Base context first, then specialized, then platform
    const base = contexts.filter(c => c.category === 'base');
    const specialized = contexts.filter(c => c.category === 'specialized');
    const platform = contexts.filter(c => c.category === 'platform');

    return `
${base.map(c => c.content).join('\n\n')}

## Specialized Instructions
${specialized.map(c => c.content).join('\n\n')}

## Platform Optimizations  
${platform.map(c => c.content).join('\n\n')}
    `.trim();
  }

  private extractMetadata(content: string): Partial<Context> {
    // Extract YAML frontmatter or special comments
    const metadataMatch = content.match(/^---\n(.*?)\n---/s);
    if (metadataMatch) {
      return yaml.parse(metadataMatch[1]);
    }
    return {};
  }
}

// Singleton instance
export const contextManager = new ContextManager();
```

### Step 3: Enhanced Brain Orchestrator
```typescript
// src/brain/orchestratorNEW.ts - Modified version
interface ContextualDecision {
  action: 'generate' | 'edit' | 'delete' | 'trim';
  contexts: string[];
  reasoning: string;
  confidence: number;
  suggestedContexts?: string[]; // Additional contexts user might want
}

class BrainOrchestratorV2 {
  async process(input: ProcessInput): Promise<ContextualDecision> {
    const contextSuggestions = await this.analyzeForContexts(input);
    
    const systemPrompt = `
You are a director AI that selects appropriate contexts for video generation.

Available contexts:
${this.getAvailableContextsList()}

Based on the user's request, select the most appropriate contexts.
You can combine multiple contexts for complex requests.

Examples:
- "Create animated text" → ['typography']
- "Create text with particles" → ['typography', 'particles']
- "Recreate this image as animated scene" → ['image-recreation', 'transitions']
- "Create TikTok-ready text animation" → ['typography', 'tiktok', 'transitions']

Return a decision with:
- action: What to do (generate/edit/delete/trim)
- contexts: Array of context IDs to use
- reasoning: Why these contexts
- confidence: 0-1 score
- suggestedContexts: Other contexts that might enhance the result
    `;

    const decision = await this.llm.complete({
      systemPrompt,
      userPrompt: this.buildPrompt(input),
      responseFormat: 'json'
    });

    return decision;
  }

  private async analyzeForContexts(input: ProcessInput): Promise<string[]> {
    // Smart context detection based on content
    const contexts: string[] = [];

    // Check for text-related keywords
    if (/text|typography|heading|title|words/i.test(input.prompt)) {
      contexts.push('typography');
    }

    // Check for uploaded images
    if (input.images?.length > 0) {
      contexts.push('image-recreation');
    }

    // Check for platform mentions
    if (/tiktok|reels|shorts/i.test(input.prompt)) {
      contexts.push('tiktok');
    }

    // Check for animation types
    if (/particle|confetti|explosion/i.test(input.prompt)) {
      contexts.push('particles');
    }

    if (/chart|graph|data|visualization/i.test(input.prompt)) {
      contexts.push('data-viz');
    }

    return contexts;
  }
}
```

### Step 4: Universal Generator with Contexts
```typescript
// src/tools/universal/generator.ts
export class UniversalGenerator {
  async generate(input: {
    prompt: string;
    contexts: string[];
    images?: string[];
    projectContext?: ProjectContext;
    existingScenes?: Scene[];
  }): Promise<GenerationResult> {
    // Load and merge contexts
    const contextPrompt = await contextManager.getContext(input.contexts);
    
    // Build complete prompt
    const fullPrompt = this.buildPrompt({
      base: CODE_GENERATOR,
      contexts: contextPrompt,
      projectInfo: input.projectContext,
      userRequest: input.prompt,
      images: input.images,
      existingScenes: input.existingScenes
    });

    // Generate with context-aware prompt
    const result = await this.llm.generate({
      prompt: fullPrompt,
      temperature: this.getTemperatureForContexts(input.contexts),
      maxTokens: 4000
    });

    return {
      code: result.code,
      usedContexts: input.contexts,
      confidence: result.confidence
    };
  }

  private getTemperatureForContexts(contexts: string[]): number {
    // Different contexts might need different creativity levels
    if (contexts.includes('data-viz')) return 0.3; // More deterministic
    if (contexts.includes('particles')) return 0.8; // More creative
    return 0.6; // Default
  }

  private buildPrompt(input: any): string {
    return `
${input.base}

## Contextual Instructions
${input.contexts}

## Project Context
Current format: ${input.projectInfo?.format || 'landscape'}
Existing scenes: ${input.existingScenes?.length || 0}
Brand colors: ${input.projectInfo?.brandColors?.join(', ') || 'none'}

## User Request
${input.userRequest}

${input.images?.length > 0 ? `
## Uploaded Images
The user has uploaded ${input.images.length} image(s) for reference.
Analyze and incorporate their style, colors, and composition.
` : ''}

Generate a complete Remotion component following all guidelines above.
    `;
  }
}
```

### Step 5: Context Files Examples

```markdown
<!-- contexts/specialized/typography.context.md -->
---
name: Typography Animations
description: Advanced text animation patterns
tags: [text, animation, typography]
combinableWith: [particles, transitions, brand-colors]
priority: 50
---

# Typography Animation Context

## Core Principles
1. **Readability First**: Animations enhance, never hinder reading
2. **Performance**: Use CSS/Spring animations over frame calculations
3. **Accessibility**: Respect prefers-reduced-motion

## Required Imports
```typescript
import { spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
```

## Animation Patterns

### 1. Staggered Word Animation
```typescript
const words = text.split(' ');
const wordDelay = 5; // frames between words

return words.map((word, i) => {
  const wordStart = i * wordDelay;
  const opacity = interpolate(
    frame,
    [wordStart, wordStart + 20],
    [0, 1],
    { extrapolateLeft: 'clamp' }
  );
  
  return (
    <span key={i} style={{ opacity, display: 'inline-block' }}>
      {word}&nbsp;
    </span>
  );
});
```

### 2. Character Wave Effect
```typescript
const chars = text.split('');
const waveDelay = 2;

return chars.map((char, i) => {
  const charStart = i * waveDelay;
  const y = spring({
    frame: frame - charStart,
    fps: 30,
    from: 20,
    to: 0,
    config: { damping: 100, stiffness: 200 }
  });
  
  return (
    <span key={i} style={{ 
      display: 'inline-block',
      transform: `translateY(${y}px)`
    }}>
      {char}
    </span>
  );
});
```

## Mobile Optimizations
- Minimum font size: 24px for mobile
- Increase letter-spacing by 0.02em
- Reduce animation complexity on portrait formats

## Common Mistakes to Avoid
1. Don't animate every character for long texts
2. Avoid simultaneous x/y/scale/rotation animations
3. Never use blur or complex filters on text
4. Keep spring configs consistent across elements
```

```markdown
<!-- contexts/platform/tiktok.context.md -->
---
name: TikTok Optimizations
description: TikTok-specific video requirements
tags: [platform, social, mobile]
combinableWith: [typography, transitions, particles]
priority: 80
---

# TikTok Platform Context

## Format Requirements
- Aspect Ratio: 9:16 (1080x1920)
- Duration: 15-60 seconds ideal
- Safe Zone: 10% padding on all sides

## Visual Guidelines
1. **Hook in First 3 Seconds**: Start with impact
2. **Vertical-First Design**: Center important elements
3. **Bold & Large**: Everything 2x bigger than desktop
4. **High Contrast**: Assume outdoor viewing

## Technical Optimizations
```typescript
// Always include safe zone padding
const safeZone = {
  top: 192,    // 10% of 1920
  bottom: 192,
  left: 108,   // 10% of 1080  
  right: 108
};

// Increase all font sizes by 1.5x
const mobileFontScale = 1.5;

// Faster animations (attention span)
const animationSpeed = 1.4; // 40% faster
```

## Content Patterns
- Start with movement/animation
- Use vertical motion (natural scroll)
- Keep text centered and large
- Layer elements vertically
- Quick cuts every 3-5 seconds

## Color Strategy
- High saturation colors
- Strong contrast ratios (7:1+)
- Avoid pure white backgrounds
- Use gradients for depth
```

### Step 6: Migration Path from Current System

```typescript
// src/server/api/routers/generation/executeDecision.ts
export async function executeDecisionWithContexts(
  decision: ContextualDecision,
  projectId: string,
  userId: string
) {
  // New path: Use contexts
  if (decision.contexts && decision.contexts.length > 0) {
    const generator = new UniversalGenerator();
    
    return await generator.generate({
      prompt: decision.prompt,
      contexts: decision.contexts,
      projectContext: await getProjectContext(projectId),
      images: decision.images
    });
  }
  
  // Fallback: Old tool-based system
  return await executeToolFromDecision(decision, projectId, userId);
}
```

### Step 7: Testing Strategy

```typescript
// src/lib/evals/context-system-eval.ts
const contextTestCases = [
  {
    name: "Typography only",
    prompt: "Create animated heading saying Welcome",
    expectedContexts: ['typography'],
    validate: (result) => {
      return result.code.includes('interpolate') &&
             result.code.includes('opacity');
    }
  },
  {
    name: "Typography + Platform",
    prompt: "Create TikTok text animation",
    expectedContexts: ['typography', 'tiktok'],
    validate: (result) => {
      return result.code.includes('1080x1920') &&
             result.code.includes('safeZone');
    }
  },
  {
    name: "Complex combination",
    prompt: "Create data visualization with particles for Instagram",
    expectedContexts: ['data-viz', 'particles', 'instagram'],
    validate: (result) => {
      return result.code.includes('chart') &&
             result.code.includes('particle') &&
             result.code.includes('1080x1080');
    }
  }
];
```

## Rollout Plan

### Week 1: Foundation
1. Create context directory structure
2. Implement ContextManager
3. Write first 3 context files (typography, image, particles)
4. Basic testing

### Week 2: Integration
1. Modify brain orchestrator for context selection
2. Create UniversalGenerator
3. Wire up with existing system (parallel path)
4. A/B testing framework

### Week 3: Migration
1. Convert all existing prompts to contexts
2. Add platform-specific contexts
3. Performance optimization
4. Cache warming strategies

### Week 4: Polish
1. Context combination rules
2. Conflict resolution
3. User-facing context hints
4. Documentation and training

## Success Metrics

1. **Code Reduction**: 50% less code than current system
2. **Flexibility**: Support 10+ context combinations
3. **Performance**: No increase in generation time
4. **Quality**: Equal or better output quality
5. **Maintenance**: Adding new capabilities in <1 hour