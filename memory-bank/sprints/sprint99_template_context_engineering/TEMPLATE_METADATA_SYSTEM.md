# Template Metadata System for Better Matching

## Problem: Template Names Don't Match User Language

Users don't say "WordFlip" or "DotRipple". They say things like:
- "make text that changes"
- "create animated words"
- "add a ripple effect"
- "make it pulse"

## Solution: Rich Metadata for Each Template

Instead of relying on template names, create comprehensive metadata that captures all the ways users might describe each template.

## Implementation: Template Metadata Registry

```typescript
// src/templates/metadata.ts

export interface TemplateMetadata {
  id: string;
  name: string; // Keep original name for backward compatibility
  
  // Matching fields
  keywords: string[];        // Direct keyword matches
  descriptions: string[];     // Natural language descriptions
  userPhrases: string[];     // Common user requests
  categories: string[];       // Multiple categories per template
  styles: string[];          // Visual styles (modern, minimal, playful)
  useCases: string[];        // Business use cases
  
  // Technical metadata
  animations: string[];       // Animation types used
  elements: string[];        // UI elements present
  colors: string[];          // Color schemes
  duration: number;          // In frames
  complexity: 'simple' | 'medium' | 'complex';
  
  // Scoring hints
  primaryUse: string;        // Main purpose
  similarTo: string[];       // IDs of similar templates
}

export const templateMetadata: Record<string, TemplateMetadata> = {
  'WordFlip': {
    id: 'WordFlip',
    name: 'WordFlip',
    keywords: [
      'word', 'flip', 'change', 'cycle', 'rotate', 'switch',
      'text', 'typewriter', 'typing', 'animated text'
    ],
    descriptions: [
      'Text that cycles through different words',
      'Typewriter effect with changing words',
      'Animated text replacement'
    ],
    userPhrases: [
      'make text that changes',
      'cycling through words',
      'show different words one after another',
      'typewriter animation',
      'text that updates',
      'changing text animation'
    ],
    categories: ['text-animation', 'typography', 'transitions'],
    styles: ['modern', 'clean', 'professional'],
    useCases: ['headlines', 'taglines', 'feature lists', 'benefits'],
    animations: ['typewriter', 'fade', 'text-replacement'],
    elements: ['text'],
    colors: ['monochrome'],
    duration: 180,
    complexity: 'simple',
    primaryUse: 'Animated headlines with changing words',
    similarTo: ['TypingTemplate', 'MorphingText', 'CarouselText']
  },
  
  'FloatingParticles': {
    id: 'FloatingParticles',
    name: 'FloatingParticles',
    keywords: [
      'particles', 'floating', 'dots', 'orbs', 'bubbles',
      'background', 'animation', 'ambient', 'motion'
    ],
    descriptions: [
      'Floating particle effects in the background',
      'Animated dots moving in circular patterns',
      'Ambient background animation with particles'
    ],
    userPhrases: [
      'add floating elements',
      'make particles in the background',
      'animated background',
      'moving dots',
      'bubble animation',
      'ambient motion',
      'ai powered look',
      'tech background'
    ],
    categories: ['background', 'effects', 'motion-graphics'],
    styles: ['modern', 'tech', 'futuristic', 'ai'],
    useCases: ['intro', 'background', 'hero', 'ai-products', 'tech-demos'],
    animations: ['float', 'orbit', 'fade', 'glow'],
    elements: ['particles', 'text'],
    colors: ['gradient', 'purple', 'pink', 'blue'],
    duration: 90,
    complexity: 'medium',
    primaryUse: 'Tech/AI product backgrounds with floating particles',
    similarTo: ['PulsingCircles', 'FloatingElements', 'ParticleExplosion']
  },
  
  'PromptUI': {
    id: 'PromptUI',
    name: 'PromptUI',
    keywords: [
      'prompt', 'search', 'input', 'command', 'interface',
      'ui', 'bar', 'field', 'ai', 'chat'
    ],
    descriptions: [
      'Animated search or command interface',
      'AI prompt input with suggestions',
      'Search bar with quick actions'
    ],
    userPhrases: [
      'create a search bar',
      'make an ai interface',
      'command prompt ui',
      'input field animation',
      'chat interface',
      'suggestion box',
      'ai chat ui'
    ],
    categories: ['ui-component', 'interface', 'ai-ui'],
    styles: ['modern', 'clean', 'minimal', 'tech'],
    useCases: ['ai-demos', 'search-features', 'command-interfaces', 'chatbots'],
    animations: ['type', 'fade', 'slide', 'pulse'],
    elements: ['input', 'buttons', 'suggestions', 'icons'],
    colors: ['neutral', 'blue', 'white'],
    duration: 180,
    complexity: 'medium',
    primaryUse: 'AI or search interface demonstrations',
    similarTo: ['AIDialogue', 'Placeholders']
  },
  
  'MobileApp': {
    id: 'MobileApp',
    name: 'MobileApp',
    keywords: [
      'mobile', 'app', 'phone', 'iphone', 'android', 'screen',
      'device', 'ui', 'interface', 'mockup'
    ],
    descriptions: [
      'Mobile app interface in a phone frame',
      'iPhone mockup with animated UI',
      'App demonstration in device frame'
    ],
    userPhrases: [
      'show app on phone',
      'mobile app demo',
      'iphone mockup',
      'app interface',
      'phone screen animation',
      'mobile ui showcase',
      'app preview'
    ],
    categories: ['mockup', 'mobile', 'ui-demo', 'product-showcase'],
    styles: ['realistic', 'modern', 'apple-style'],
    useCases: ['app-demos', 'product-launches', 'features', 'onboarding'],
    animations: ['slide', 'fade', 'scale', 'screen-transition'],
    elements: ['phone-frame', 'screen', 'ui-elements', 'cards'],
    colors: ['ios-blue', 'white', 'gray'],
    duration: 90,
    complexity: 'complex',
    primaryUse: 'Mobile app demonstrations and showcases',
    similarTo: ['DualScreenApp', 'AppJiggle', 'AppDownload']
  },
  
  'GrowthGraph': {
    id: 'GrowthGraph',
    name: 'GrowthGraph',
    keywords: [
      'graph', 'chart', 'growth', 'data', 'analytics', 'statistics',
      'bar', 'visualization', 'metrics', 'performance'
    ],
    descriptions: [
      'Animated bar graph showing growth',
      'Data visualization with spring animations',
      'Statistics chart with smooth animations'
    ],
    userPhrases: [
      'show growth chart',
      'animate statistics',
      'data visualization',
      'performance metrics',
      'bar graph animation',
      'show analytics',
      'revenue growth',
      'success metrics'
    ],
    categories: ['data-viz', 'charts', 'analytics', 'business'],
    styles: ['professional', 'clean', 'corporate'],
    useCases: ['reports', 'presentations', 'dashboards', 'pitch-decks'],
    animations: ['grow', 'spring', 'fade', 'count-up'],
    elements: ['bars', 'labels', 'grid', 'values'],
    colors: ['blue', 'green', 'gradient'],
    duration: 180,
    complexity: 'medium',
    primaryUse: 'Business metrics and growth visualization',
    similarTo: ['TeslaStockGraph', 'FintechUI']
  }
};
```

## Enhanced Matching Algorithm

```typescript
// src/services/ai/templateMatching.service.ts

export class EnhancedTemplateMatchingService {
  private metadata = templateMetadata;
  
  findBestTemplates(prompt: string, limit = 2): TemplateMatch[] {
    const promptLower = prompt.toLowerCase();
    const matches: Map<string, number> = new Map();
    
    for (const [templateId, meta] of Object.entries(this.metadata)) {
      let score = 0;
      
      // 1. Check user phrases (highest weight)
      for (const phrase of meta.userPhrases) {
        if (promptLower.includes(phrase.toLowerCase())) {
          score += 10;
        }
        // Partial match
        const words = phrase.toLowerCase().split(' ');
        const matchedWords = words.filter(w => promptLower.includes(w));
        score += matchedWords.length * 2;
      }
      
      // 2. Check keywords (medium weight)
      for (const keyword of meta.keywords) {
        if (promptLower.includes(keyword)) {
          score += 5;
        }
      }
      
      // 3. Check descriptions (fuzzy match)
      for (const desc of meta.descriptions) {
        const similarity = this.calculateSimilarity(promptLower, desc.toLowerCase());
        score += similarity * 8;
      }
      
      // 4. Check categories
      for (const category of meta.categories) {
        if (promptLower.includes(category.replace('-', ' '))) {
          score += 4;
        }
      }
      
      // 5. Check use cases
      for (const useCase of meta.useCases) {
        if (promptLower.includes(useCase.replace('-', ' '))) {
          score += 3;
        }
      }
      
      // 6. Style matching
      for (const style of meta.styles) {
        if (promptLower.includes(style)) {
          score += 3;
        }
      }
      
      // 7. Animation type matching
      for (const animation of meta.animations) {
        if (promptLower.includes(animation)) {
          score += 2;
        }
      }
      
      if (score > 0) {
        matches.set(templateId, score);
      }
    }
    
    // Sort and return top matches
    const sorted = Array.from(matches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    return sorted.map(([id, score]) => ({
      template: templates.find(t => t.name === id)!,
      score,
      reasoning: this.explainMatch(id, prompt)
    }));
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }
  
  private explainMatch(templateId: string, prompt: string): string {
    const meta = this.metadata[templateId];
    const reasons = [];
    
    // Check what matched
    const promptLower = prompt.toLowerCase();
    
    for (const phrase of meta.userPhrases) {
      if (promptLower.includes(phrase.toLowerCase())) {
        reasons.push(`matches phrase "${phrase}"`);
        break;
      }
    }
    
    const matchedKeywords = meta.keywords.filter(k => 
      promptLower.includes(k)
    );
    if (matchedKeywords.length > 0) {
      reasons.push(`keywords: ${matchedKeywords.join(', ')}`);
    }
    
    if (reasons.length === 0) {
      reasons.push(`similar to ${meta.primaryUse.toLowerCase()}`);
    }
    
    return reasons.join('; ');
  }
}
```

## Smart Category-Based Selection

```typescript
// When user intent is clear, use category-based selection
class CategoryMatcher {
  detectCategory(prompt: string): string[] {
    const categories = [];
    const promptLower = prompt.toLowerCase();
    
    // Text animations
    if (/text|word|type|title|heading|caption/.test(promptLower)) {
      categories.push('text-animation');
    }
    
    // Data visualization
    if (/chart|graph|data|metric|statistic|analytics/.test(promptLower)) {
      categories.push('data-viz');
    }
    
    // Backgrounds
    if (/background|bg|ambient|particle|effect/.test(promptLower)) {
      categories.push('background', 'effects');
    }
    
    // UI demos
    if (/ui|interface|app|screen|mockup|demo/.test(promptLower)) {
      categories.push('ui-demo', 'interface');
    }
    
    // Mobile
    if (/mobile|phone|iphone|android|app/.test(promptLower)) {
      categories.push('mobile');
    }
    
    return categories;
  }
  
  getTemplatesByCategory(categories: string[]): TemplateMetadata[] {
    return Object.values(templateMetadata).filter(meta =>
      categories.some(cat => meta.categories.includes(cat))
    );
  }
}
```

## Usage Examples

```typescript
// User says: "create animated text that cycles through our features"
const matcher = new EnhancedTemplateMatchingService();
const matches = matcher.findBestTemplates(
  "create animated text that cycles through our features"
);
// Returns: WordFlip (high score), CarouselText (medium score)

// User says: "I need a tech background with some motion"
const matches2 = matcher.findBestTemplates(
  "I need a tech background with some motion"
);
// Returns: FloatingParticles (high score), PulsingCircles (medium score)

// User says: "show my app on an iphone"
const matches3 = matcher.findBestTemplates(
  "show my app on an iphone"
);
// Returns: MobileApp (high score), DualScreenApp (medium score)
```

## Benefits of This Approach

1. **Natural Language Matching**: Maps user language to technical template names
2. **Multi-dimensional Scoring**: Considers multiple aspects (keywords, phrases, use cases)
3. **Explainable Matches**: Can tell user why a template was selected
4. **Category-Based Fallback**: When specific matching fails, use categories
5. **Similarity Networks**: Templates know about similar templates
6. **Business Context**: Includes use cases and styles beyond just technical features

## Migration Path

1. Start with top 10 most-used templates
2. Add metadata incrementally
3. A/B test enhanced matching vs. name-only matching
4. Gather user phrases from actual prompts
5. Continuously refine metadata based on usage

This metadata system bridges the gap between how users describe what they want and how templates are technically named, making the context engineering much more effective.