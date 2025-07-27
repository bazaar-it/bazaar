# Dynamic Context Extension - Sprint 85

## Overview: Static + Dynamic Context System

The context engineering system can be powerfully extended with **dynamic context gathering** - where agents actively search for and incorporate real-time information based on user requests.

## Example: "In the style of X"

When a user says: **"Create animated text in the style of Apple's keynote presentations"**

### Current System (Static Only)
```
User Request → Select Contexts ['typography'] → Generate
Result: Generic animated text
```

### Enhanced System (Static + Dynamic)
```
User Request → Detect Style Reference → Gather Dynamic Context → Combine with Static → Generate
Result: Text with Apple's specific minimalism, fonts, timing, colors
```

## Architecture for Dynamic Context

### 1. Context Gathering Agent
```typescript
// src/contexts/dynamic/contextGatherer.ts
export class DynamicContextGatherer {
  async gatherStyleContext(styleName: string): Promise<DynamicContext> {
    // Step 1: Search for style information
    const searchResults = await this.searchWeb(`${styleName} design system motion graphics`);
    
    // Step 2: Extract key characteristics
    const styleAnalysis = await this.analyzeStyle(searchResults);
    
    // Step 3: Generate context markdown
    return {
      content: this.generateContextMarkdown(styleAnalysis),
      confidence: styleAnalysis.confidence,
      sources: searchResults.sources
    };
  }

  async searchWeb(query: string): Promise<SearchResults> {
    // Use web search API or scraping
    // Focus on: color palettes, typography, animation timing, visual principles
  }

  async analyzeStyle(results: SearchResults): Promise<StyleAnalysis> {
    // Use AI to extract:
    // - Color schemes
    // - Typography choices
    // - Animation patterns
    // - Layout principles
    // - Timing and pacing
  }
}
```

### 2. Context Combination System
```typescript
// Enhanced Context Manager
export class ContextManager {
  private staticContexts: Map<string, Context> = new Map();
  private dynamicCache: Map<string, DynamicContext> = new Map();

  async getContext(
    staticContextIds: string[], 
    dynamicRequests?: DynamicContextRequest[]
  ): Promise<string> {
    // Load static contexts
    const staticContexts = await this.loadStaticContexts(staticContextIds);
    
    // Gather dynamic contexts if requested
    const dynamicContexts = [];
    if (dynamicRequests) {
      for (const request of dynamicRequests) {
        const cached = this.dynamicCache.get(request.key);
        if (cached && !this.isExpired(cached)) {
          dynamicContexts.push(cached);
        } else {
          const fresh = await this.gatherDynamicContext(request);
          this.dynamicCache.set(request.key, fresh);
          dynamicContexts.push(fresh);
        }
      }
    }
    
    // Merge all contexts intelligently
    return this.mergeContexts(staticContexts, dynamicContexts);
  }

  private mergeContexts(
    staticContexts: Context[], 
    dynamicContexts: DynamicContext[]
  ): string {
    // Priority: Dynamic > Specialized > Base
    // Dynamic contexts override static when there's conflict
    
    return `
## Base Instructions
${staticContexts.filter(c => c.category === 'base').map(c => c.content).join('\n\n')}

## Specialized Context
${staticContexts.filter(c => c.category === 'specialized').map(c => c.content).join('\n\n')}

## Dynamic Style Context
${dynamicContexts.map(d => d.content).join('\n\n')}

## Platform Optimizations
${staticContexts.filter(c => c.category === 'platform').map(c => c.content).join('\n\n')}
    `.trim();
  }
}
```

### 3. Enhanced Brain Orchestrator
```typescript
// Updated Brain Orchestrator
class BrainOrchestratorV2 {
  async process(input: ProcessInput): Promise<ContextualDecision> {
    // Detect style references
    const styleReferences = this.detectStyleReferences(input.prompt);
    
    // Select static contexts
    const staticContexts = await this.selectStaticContexts(input);
    
    // Prepare dynamic context requests
    const dynamicRequests: DynamicContextRequest[] = [];
    
    if (styleReferences.length > 0) {
      for (const style of styleReferences) {
        dynamicRequests.push({
          type: 'style',
          key: `style:${style}`,
          query: style,
          priority: 'high'
        });
      }
    }
    
    return {
      action: 'generate',
      contexts: staticContexts,
      dynamicRequests: dynamicRequests,
      reasoning: `Using ${staticContexts.join(', ')} with dynamic style context for ${styleReferences.join(', ')}`,
      confidence: 0.9
    };
  }

  private detectStyleReferences(prompt: string): string[] {
    const patterns = [
      /in the style of\s+([^,.\n]+)/gi,
      /like\s+([^,.\n]+?)(?:'s|'s)/gi,
      /similar to\s+([^,.\n]+)/gi,
      /inspired by\s+([^,.\n]+)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+style/gi
    ];
    
    const references = [];
    for (const pattern of patterns) {
      const matches = prompt.matchAll(pattern);
      for (const match of matches) {
        references.push(match[1].trim());
      }
    }
    
    return [...new Set(references)];
  }
}
```

## Real-World Examples

### Example 1: Brand Style Reference
```typescript
// User: "Create a loading animation in the style of Stripe"

// Dynamic Context Gathered:
`## Stripe Design System Context

### Color Palette
- Primary: #635BFF (Stripe Purple)
- Secondary: #0A2540 (Dark Blue)
- Accent: #00D924 (Green for success)
- Background: #F6F9FC (Light gray)

### Animation Principles
- Subtle, smooth transitions (300-400ms)
- Micro-interactions on hover
- Spring animations with low bounce
- Loading states use shimmer effects

### Typography
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI'
- Clean, minimal text
- High contrast ratios

### Visual Style
- Gradient overlays with subtle animations
- Rounded corners (4-8px)
- Soft shadows for depth
- Clean, minimal layouts`

// Combined with static 'loading-animation' context
// Result: Stripe-styled loading animation
```

### Example 2: Cultural Style Reference
```typescript
// User: "Create a title sequence in the style of Japanese anime"

// Dynamic Context Gathered:
`## Japanese Anime Style Context

### Animation Techniques
- Speed lines for emphasis
- Dramatic camera movements
- Hold frames for impact
- Particle effects (sakura, sparkles)

### Typography
- Bold, impactful text
- Often uses perspective/3D
- Glowing or outlined text
- Dramatic reveals

### Color Usage
- High saturation
- Gradient backgrounds
- Light bloom effects
- Dramatic contrast

### Timing
- Quick cuts (10-20 frames)
- Pause for emphasis (30-60 frames)
- Acceleration/deceleration curves`
```

### Example 3: Era-Based Style
```typescript
// User: "Make it look like 1980s retro computing"

// Dynamic Context Gathered:
`## 1980s Retro Computing Context

### Visual Elements
- CRT monitor effects (scanlines, curve)
- Phosphor glow (green/amber)
- Pixel fonts (8x8, 16x16)
- Terminal-style interfaces

### Colors
- Limited palette (16 colors)
- Neon: #FF006E, #00F5FF, #FFDD00
- Terminal: #00FF00 on #000000
- CGA palette for authenticity

### Animation Style
- Blinking cursors
- Character-by-character text
- Glitch effects
- Low frame rate (10-15 fps feel)`
```

## Implementation Benefits

### 1. Infinite Flexibility
```typescript
// Users can reference ANY style
"in the style of Wes Anderson films"
"like Discord's onboarding"
"similar to Bloomberg Terminal"
"inspired by Swiss design"
```

### 2. Always Current
```typescript
// Dynamic gathering gets latest info
"in the style of iOS 18" // Gets current design language
"like Spotify Wrapped 2024" // Gets this year's style
```

### 3. Combinable
```typescript
// Mix multiple style references
"Typography like Apple with colors like Spotify"
// Gathers both style contexts and merges
```

### 4. Learning System
```typescript
// Cache successful combinations
styleCache.set("apple-keynote", {
  context: generatedContext,
  usage: 47,
  rating: 4.8,
  lastUpdated: Date.now()
});
```

## Technical Implementation

### Phase 1: Basic Style Gathering
```typescript
// Simple web search integration
class BasicStyleGatherer {
  async gather(styleName: string): Promise<string> {
    // Search for "{styleName} design system"
    // Extract colors, fonts, principles
    // Return as markdown context
  }
}
```

### Phase 2: AI-Powered Analysis
```typescript
// Smart style analysis
class SmartStyleGatherer {
  async gather(styleName: string): Promise<string> {
    // Multi-source gathering
    const sources = await Promise.all([
      this.searchDesignSystems(styleName),
      this.searchBrandGuidelines(styleName),
      this.analyzeExamples(styleName)
    ]);
    
    // AI consolidation
    return this.consolidateWithAI(sources);
  }
}
```

### Phase 3: Visual Analysis
```typescript
// Analyze actual examples
class VisualStyleGatherer {
  async gather(styleName: string, examples?: string[]): Promise<string> {
    if (examples?.length > 0) {
      // Use vision API to analyze examples
      const visualAnalysis = await this.analyzeVisuals(examples);
      return this.generateContextFromVisuals(visualAnalysis);
    }
    // Fall back to text search
  }
}
```

## Caching Strategy

```typescript
interface CacheEntry {
  key: string;
  content: string;
  confidence: number;
  sources: string[];
  created: number;
  ttl: number; // Time to live in seconds
  usageCount: number;
}

class DynamicContextCache {
  private cache = new Map<string, CacheEntry>();
  
  set(key: string, content: DynamicContext, ttl = 86400) {
    this.cache.set(key, {
      ...content,
      created: Date.now(),
      ttl,
      usageCount: 0
    });
  }
  
  get(key: string): DynamicContext | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.created > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    entry.usageCount++;
    return entry;
  }
}
```

## Privacy & Performance Considerations

### 1. User Consent
```typescript
// Ask before searching
if (styleReferences.detected && !userConsent.dynamicSearch) {
  return {
    needsConsent: true,
    message: "Would you like me to search for style information about X?"
  };
}
```

### 2. Rate Limiting
```typescript
// Prevent excessive searches
const rateLimiter = new RateLimiter({
  maxRequests: 10,
  perMinutes: 5,
  perUser: true
});
```

### 3. Parallel Processing
```typescript
// Gather while generating
const [staticGeneration, dynamicContext] = await Promise.all([
  this.generateWithStaticContext(staticContexts),
  this.gatherDynamicContext(styleReference)
]);
```

## Future Enhancements

### 1. Visual Style Matching
- User uploads example → AI extracts style → generates context
- "Make it look like this" with image attachment

### 2. Multi-Modal Context
- Analyze videos for motion style
- Extract timing from audio
- Color extraction from images

### 3. Collaborative Filtering
- "Users who liked X style also used Y"
- Popular style combinations
- Community-contributed contexts

### 4. Style Evolution Tracking
- "iOS style" automatically updates with new releases
- Track design trend changes
- Version-specific contexts

## Conclusion

By combining static context files with dynamic context gathering, we create an incredibly powerful and flexible system that can adapt to any style reference while maintaining the simplicity of the context-based approach. This gives users unlimited creative possibilities while keeping the implementation clean and maintainable.