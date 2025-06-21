# The Perfect Context System for Bazaar-Vid

## Core Principle: Context Should Enable Understanding, Not Just Information

The perfect context system would understand that creating cohesive videos requires:
1. Visual continuity between scenes
2. Understanding user's creative direction
3. Awareness of the full project narrative
4. Smart reference resolution

## The Perfect Context Architecture

### 1. Smart Scene Context

```typescript
interface SceneContext {
  // Basic metadata
  id: string;
  name: string;
  order: number;
  duration: number;
  
  // Smart code inclusion
  tsxCode?: string; // Included when needed
  
  // Extracted properties (cached)
  dominantColors?: string[];
  animationTypes?: string[];
  layoutPattern?: 'centered' | 'grid' | 'asymmetric' | 'fullscreen';
  textStyles?: {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
  };
  
  // Semantic summary
  contentSummary?: string; // "Blue particle animation with white title"
}
```

### 2. Project Style Profile (Actually Useful)

Instead of vague "user preferences", track concrete patterns:

```typescript
interface ProjectStyleProfile {
  // Automatically extracted from existing scenes
  colorPalette: {
    primary: string[];
    secondary: string[];
    backgrounds: string[];
    text: string[];
  };
  
  // Common patterns detected
  animationStyle: 'smooth' | 'snappy' | 'dramatic' | 'minimal';
  transitionPreference: 'fade' | 'slide' | 'cut' | 'morph';
  
  // Layout tendencies
  layoutPatterns: {
    textPosition: 'center' | 'bottom-third' | 'top' | 'mixed';
    elementDensity: 'minimal' | 'balanced' | 'rich';
  };
  
  // Derived from actual usage
  frequentElements: string[]; // ['particles', 'gradients', 'floating-text']
}
```

### 3. Conversation Intelligence

Replace primitive keyword matching with actual understanding:

```typescript
interface ConversationIntelligence {
  // Recent intents (not just keywords)
  recentIntents: Array<{
    action: 'create' | 'modify' | 'style' | 'fix';
    target: 'scene' | 'animation' | 'text' | 'color';
    timestamp: Date;
  }>;
  
  // Creative direction
  projectNarrative: string; // "Building a tech product launch video"
  currentFocus: string; // "Working on intro sequence"
  
  // User corrections (learn from these!)
  corrections: Array<{
    original: string; // What we generated
    correctedTo: string; // What user changed it to
    lesson: string; // "User prefers slower animations"
  }>;
}
```

### 4. Smart Reference Resolution

```typescript
interface ReferenceContext {
  // Mentioned entities
  mentionedScenes: Map<string, string>; // "scene 1" -> scene-id
  mentionedColors: string[]; // Extracted from conversation
  mentionedStyles: string[]; // "like the previous one", "same as before"
  
  // Temporal references
  recentlyCreated: string[]; // Scene IDs in creation order
  recentlyEdited: string[]; // Scene IDs in edit order
  
  // Visual references
  uploadedImages: Array<{
    url: string;
    context: string; // "logo", "color reference", "layout example"
    extractedColors?: string[];
    extractedLayout?: any;
  }>;
}
```

## How Context Would Be Built

### Phase 1: Quick Scan (Parallel)

```typescript
async buildContext(input: OrchestrationInput) {
  const [
    scenes,
    styleProfile,
    references,
    conversation
  ] = await Promise.all([
    this.getSceneContexts(input.projectId),
    this.getProjectStyleProfile(input.projectId),
    this.extractReferences(input),
    this.analyzeConversation(input.chatHistory)
  ]);
  
  return {
    scenes,
    styleProfile,
    references,
    conversation,
    // Smart code inclusion happens next...
  };
}
```

### Phase 2: Smart Code Inclusion

Based on the user's prompt, intelligently include scene code:

```typescript
enrichContextWithCode(context: Context, decision: BrainDecision) {
  // Always include code for these scenarios
  if (decision.intent === 'match_style') {
    context.scenes = this.includeCodeForScenes(
      context.scenes,
      decision.referencedScenes
    );
  }
  
  if (decision.intent === 'continue_sequence') {
    // Include last 2 scenes for continuity
    context.scenes = this.includeRecentSceneCode(context.scenes, 2);
  }
  
  if (decision.intent === 'create' && context.scenes.length > 0) {
    // Include last scene for style continuity
    context.scenes = this.includeLastSceneCode(context.scenes);
  }
}
```

## How Tools Would Use This Context

### Add Tool with Perfect Context

```typescript
// When user says "add another scene"
addTool.execute({
  userPrompt: "add another scene",
  context: {
    previousScene: {
      code: "...", // Automatically included
      dominantColors: ["#0066CC", "#FFFFFF"],
      animationStyle: "smooth"
    },
    projectStyle: {
      colorPalette: { primary: ["#0066CC"] },
      animationStyle: "smooth",
      frequentElements: ["particles", "fade-in"]
    }
  }
});

// Tool generates scene that automatically matches project style
```

### Edit Tool with Perfect Context

```typescript
// When user says "make scene 2 like scene 1"
editTool.execute({
  targetScene: { id: "scene-2", code: "..." },
  referenceScenes: [{
    id: "scene-1",
    code: "...", // Full code available
    dominantColors: ["#FF6B6B", "#4ECDC4"]
  }],
  intent: "match_style"
});

// Tool can extract exact colors, animations, layouts
```

## Smart Context Caching

To avoid repeated analysis:

```typescript
interface SceneCache {
  sceneId: string;
  version: number; // Increment on edit
  extractedProperties: {
    colors: string[];
    animations: string[];
    layout: string;
    // ... cached analysis
  };
  lastAnalyzed: Date;
}
```

## Context That Learns

Track what context was useful:

```typescript
interface ContextFeedback {
  promptType: string; // "color_match", "style_continue"
  contextProvided: string[]; // What we included
  contextUsed: string[]; // What actually helped
  generationQuality: number; // Based on user actions
}

// Use this to improve context selection over time
```

## The Perfect Context Flow

1. **User**: "Create a new scene with floating elements"
2. **Context Builder**:
   - Sees "floating elements" used in scenes 1 and 3
   - Notices project uses blue/white palette
   - Detects smooth animation preference
   - Includes previous scene code for continuity
3. **Brain**: Understands this is style continuation
4. **Add Tool**: Receives rich context, generates cohesive scene
5. **Result**: New scene perfectly matches project style

## Implementation Priority

### Phase 1: Core Improvements (1 day)
1. Add scene code inclusion for cross-references
2. Extract basic color/style from scenes
3. Improve reference resolution

### Phase 2: Style Intelligence (2 days)
1. Build project style profile
2. Cache extracted properties
3. Smart context selection

### Phase 3: Learning System (1 week)
1. Track context usage
2. Learn from corrections
3. Improve over time

## The Key Insight

Perfect context isn't about having ALL information - it's about having the RIGHT information at the RIGHT time. The current system fails because it provides useless information (empty preferences) while missing critical information (scene code for matching).

A perfect system would:
- See patterns across the project
- Understand user intent deeply
- Provide exactly what tools need
- Learn from every interaction
- Stay fast and focused

This isn't impossible - it's just focused engineering instead of speculative abstraction.