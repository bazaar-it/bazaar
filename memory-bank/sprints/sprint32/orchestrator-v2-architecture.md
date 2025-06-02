# Orchestrator V2: Context-Driven Async Architecture

## User's Key Insights

### 1. Async Image Analysis
**Problem**: Currently image analysis blocks brain decisions
**Solution**: Always start image analysis async when image is uploaded
- Brain makes decision while image analysis runs in parallel
- Even if brain decides "delete scene" or "ask clarify", we still get rich context for project memory

### 2. Context Accumulation System
**Critical Need**: Support 30+ prompt iterations for 4 scenes
**Examples**:
- Prompt 1: "I like modern, fast-paced scenes, 2 seconds long"
- Prompt 15: "Make that button in scene 2 bigger" ← Should work!

**Context Sources**:
- Chat history summaries
- User preferences/style guidelines
- Previous scene JSON structures
- Image analysis results
- Scene relationships

### 3. Simplified Decision Architecture
**Core Flow**: User Input → Brain → SceneBuilder OR SceneEditor
- **SceneBuilder**: New scenes (handles first scene vs subsequent scenes differently)
- **SceneEditor**: Edits to existing scenes

### 4. Strategic JSON vs Direct Code
**JSON Path** (Preferred):
- Rich context/complex requests
- First scene in project
- Image-driven scenes
- Better context preservation for future references

**Direct Path** (Simple cases):
- Simple text edits
- Style tweaks
- When previous JSON provides good template

## Implementation Architecture

### Phase 1: Async Processing
```typescript
async processUserInput(input: UserInput) {
  // Start image analysis immediately (don't wait)
  const imageAnalysisPromise = input.image ? 
    this.analyzeImageAsync(input.image) : null;
    
  // Brain makes decision with current context
  const brainDecision = await this.brainOrchestrator.decide(input, currentContext);
  
  // Image analysis completes in background
  if (imageAnalysisPromise) {
    imageAnalysisPromise.then(analysis => {
      this.projectMemory.addImageContext(analysis);
    });
  }
  
  return this.executeDecision(brainDecision, input);
}
```

### Phase 2: Context Enrichment System
```typescript
interface ProjectMemory {
  userPreferences: UserPreferences;
  sceneRelationships: SceneRelationship[];
  chatHistory: ChatSummary[];
  imageAnalyses: ImageAnalysis[];
  jsonTemplates: SceneJSON[];
}

interface ContextEnrichment {
  enrichForSceneBuilder(input: UserInput): EnrichedContext;
  enrichForSceneEditor(input: UserInput, targetScene: Scene): EnrichedContext;
  summarizeChatHistory(): ChatSummary;
  extractUserPreferences(): UserPreferences;
}
```

### Phase 3: Smart Path Selection
```typescript
class SceneBuilder {
  async buildScene(input: UserInput, context: EnrichedContext) {
    if (this.shouldUseJSONPath(input, context)) {
      return this.buildViaJSON(input, context);
    } else {
      return this.buildDirectly(input, context);
    }
  }
  
  private shouldUseJSONPath(input: UserInput, context: EnrichedContext): boolean {
    return (
      input.hasImage ||
      input.isComplex ||
      context.isFirstScene ||
      context.hasRichContext
    );
  }
}
```

## Key Benefits

1. **Performance**: Image analysis doesn't block brain decisions
2. **Context**: Rich memory enables "that button in scene 2" references
3. **Flexibility**: JSON vs Direct based on actual need
4. **Scalability**: Handles 30+ prompt workflows effectively
5. **User Experience**: Faster responses, better continuity

## Next Steps

1. Implement async image analysis
2. Build ProjectMemory system
3. Add ContextEnrichment service
4. Update Brain Orchestrator for simplified decisions
5. Enhance SceneBuilder/SceneEditor with context awareness

## Questions to Resolve

1. How long should we retain chat history? (Full session vs summarized)
2. Should JSON templates be scene-specific or project-wide?
3. How to handle conflicting user preferences across prompts?
4. What's the fallback when context enrichment fails? 