# Current vs Proposed System Analysis

## Current Agent-Based System

### How It Works Now

```typescript
// 1. Brain Orchestrator decides which tool/agent to use
const decision = await brainOrchestrator.process({
  prompt: "Create animated typography",
  chatHistory: [...],
});
// Returns: { toolName: 'typographyScene', ... }

// 2. Tool execution with hardcoded prompts
switch(decision.toolName) {
  case 'typographyScene':
    // Should use TYPOGRAPHY_AGENT prompt but actually uses CODE_GENERATOR
    const result = await generateCode(CODE_GENERATOR, prompt);
    break;
    
  case 'imageRecreatorScene':
    // Should use IMAGE_RECREATOR prompt but actually uses CODE_GENERATOR
    const result = await generateCode(CODE_GENERATOR, prompt);
    break;
}
```

### Problems Illustrated

1. **Separate Tools, Same Logic**
```typescript
// Typography tool
export const typographySceneTool = {
  name: 'typographyScene',
  execute: async (input) => {
    // Uses generic CODE_GENERATOR, not TYPOGRAPHY_AGENT
    return generateWithPrompt(CODE_GENERATOR, input);
  }
};

// Image recreator tool  
export const imageRecreatorSceneTool = {
  name: 'imageRecreatorScene',
  execute: async (input) => {
    // Uses generic CODE_GENERATOR, not IMAGE_RECREATOR
    return generateWithPrompt(CODE_GENERATOR, input);
  }
};

// Both do the same thing!
```

2. **Can't Combine Capabilities**
```typescript
// User: "Create animated text that recreates this uploaded image style"
// Current system: Has to choose ONE tool
// - typographyScene OR imageRecreatorScene
// - Can't do both
```

3. **Adding New Capabilities = New Agent**
```typescript
// Want to add particle effects?
// Current approach:
// 1. Create new PARTICLE_AGENT prompt
// 2. Create new particleSceneTool
// 3. Update brain orchestrator to know about it
// 4. Add new tool execution logic
// 5. Deploy everything
```

## Proposed Context-Based System

### How It Would Work

```typescript
// 1. Brain Orchestrator selects contexts, not tools
const decision = await brainOrchestrator.process({
  prompt: "Create animated typography with particle effects",
  chatHistory: [...],
});
// Returns: { 
//   action: 'generate',
//   contexts: ['typography', 'particle-effects', 'animations'],
//   reasoning: "User wants text with particle animations"
// }

// 2. Single generator with dynamic contexts
const contextualPrompt = await contextManager.load(decision.contexts);
const result = await universalGenerator.generate({
  basePrompt: CODE_GENERATOR,
  contextPrompt: contextualPrompt,
  userPrompt: prompt,
});
```

### Benefits Illustrated

1. **One Generator, Many Contexts**
```typescript
// Universal generator
export const universalGenerator = {
  async generate(input: GenerateInput) {
    // Combine base + contexts + user prompt
    const fullPrompt = `
      ${input.basePrompt}
      
      ## Specialized Context
      ${input.contextPrompt}
      
      ## User Request
      ${input.userPrompt}
    `;
    
    return generateWithPrompt(fullPrompt, input);
  }
};

// Contexts are just files
// /contexts/typography.context.md
// /contexts/particle-effects.context.md
// /contexts/image-style-matching.context.md
```

2. **Easy Combination of Capabilities**
```typescript
// User: "Create animated text that recreates this uploaded image style"
// New system: Load multiple contexts
const contexts = ['typography', 'image-recreation', 'style-matching'];
const result = await universalGenerator.generate({
  contexts: contexts,
  userPrompt: userPrompt,
  images: uploadedImages,
});
```

3. **Adding New Capabilities = New Context File**
```typescript
// Want to add particle effects?
// New approach:
// 1. Create /contexts/particle-effects.context.md
// 2. That's it! No code changes needed

// contexts/particle-effects.context.md
`## Particle Effects Context

When generating scenes with particles:
- Use react-three-fiber for 3D particles
- Implement physics with @react-three/rapier
- Common patterns: burst, flow, orbit, scatter
- Performance: limit to 1000 particles on mobile
...`
```

### Real-World Examples

#### Example 1: Typography + Brand Colors
```typescript
// Current: Can't easily do this
// Proposed:
const result = await generate({
  contexts: ['typography', 'brand-colors'],
  prompt: "Animated heading using our brand colors",
  brandAssets: { colors: ['#FF6B6B', '#4ECDC4'] }
});
```

#### Example 2: Data Viz + Animation
```typescript
// Current: Would need separate data-viz agent
// Proposed:
const result = await generate({
  contexts: ['data-visualization', 'smooth-animations'],
  prompt: "Animated bar chart showing quarterly growth",
  data: quarterlyData
});
```

#### Example 3: Platform-Specific Generation
```typescript
// Current: Hardcoded in each tool
// Proposed:
const result = await generate({
  contexts: ['typography', 'tiktok-optimization'],
  prompt: "Create viral text animation for TikTok",
  format: 'vertical'
});
```

### Context File Structure

```markdown
<!-- contexts/typography.context.md -->
# Typography Generation Context

## Core Principles
- Text should be readable at all sizes
- Animations should enhance, not distract
- Mobile-first sizing approach

## Technical Guidelines
- Use Remotion's <Sequence> for timing
- Implement spring() for smooth animations
- Font loading via next/font for performance

## Common Patterns
1. **Fade In**: opacity 0->1 with translateY
2. **Typewriter**: Character-by-character reveal
3. **Word Wave**: Staggered word animations

## Code Templates
\```typescript
// Basic animated text component
export const AnimatedText: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  ...
}
\```

## Style Considerations
- Minimum font size: 16px mobile, 20px desktop
- Contrast ratio: 4.5:1 minimum
- Line height: 1.5 for body, 1.2 for headings
```

### Implementation Phases

#### Phase 1: Context System (Week 1)
```typescript
// 1. Context manager
class ContextManager {
  private cache = new Map<string, string>();
  
  async loadContext(name: string): Promise<string> {
    if (this.cache.has(name)) return this.cache.get(name);
    
    const content = await fs.readFile(`/contexts/${name}.context.md`);
    this.cache.set(name, content);
    return content;
  }
}

// 2. Context selector (AI-powered)
async function selectContexts(prompt: string): Promise<string[]> {
  // Use small model to pick relevant contexts
  const contexts = await ai.analyze(prompt, availableContexts);
  return contexts;
}
```

#### Phase 2: Migration (Week 2)
```typescript
// Convert existing prompts to contexts
// TYPOGRAPHY_AGENT -> typography.context.md
// IMAGE_RECREATOR -> image-recreation.context.md
// CODE_GENERATOR -> base-generation.context.md
```

#### Phase 3: Testing (Week 3)
```typescript
// Evaluation framework for context combinations
const testCases = [
  {
    prompt: "Create animated text",
    expectedContexts: ['typography'],
    quality: 'high'
  },
  {
    prompt: "Recreate this image with animated text",
    expectedContexts: ['typography', 'image-recreation'],
    quality: 'high'
  }
];
```

### Performance Comparison

| Metric | Current System | Proposed System |
|--------|---------------|-----------------|
| Adding new capability | New agent + deploy | Add context file |
| Combining features | Not possible | Load multiple contexts |
| Prompt management | Hardcoded in code | Markdown files |
| Context awareness | Limited | Full project context |
| Maintenance | Update code | Update markdown |
| Testing | Test each agent | Test context combos |

### Migration Strategy

1. **Keep Both Systems** initially
2. **Route specific requests** to new system
3. **Measure quality** differences
4. **Gradually migrate** all requests
5. **Deprecate old agents** once stable

This approach gives us flexibility, modularity, and easy maintenance while solving current limitations.