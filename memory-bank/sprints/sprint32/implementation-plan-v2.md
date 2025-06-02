# Implementation Plan: Async Context-Driven Architecture

## Current vs Target Architecture

### Current Issues
1. Image analysis blocks brain decisions (`orchestrator.ts:43-52`)
2. No context accumulation between prompts
3. Hard-coded service selection logic
4. Limited context for scene references

### Target Architecture
1. Async image analysis parallel to brain decisions
2. Rich ProjectMemory system
3. SceneBuilder/SceneEditor pattern with context
4. Smart JSON vs Direct code selection

## Implementation Phases

### Phase 1: Async Image Processing (HIGH PRIORITY)
**Files to Modify**: `src/server/services/brain/orchestrator.ts`

**Current Code** (lines 43-52):
```typescript
// Pre-analyze images before brain decision
if (input.image) {
  console.log('🖼️ Analyzing uploaded image...');
  visionAnalysis = await this.analyzeImage.execute({
    imageUrl: input.image.url,
    projectId: input.projectId,
    analysisType: 'scene_creation'
  });
}
```

**New Code**:
```typescript
// Start image analysis async (don't block brain)
let imageAnalysisPromise: Promise<any> | null = null;
if (input.image) {
  console.log('🖼️ Starting async image analysis...');
  imageAnalysisPromise = this.analyzeImageAsync(input.image, input.projectId);
}

// Brain decides with current context (doesn't wait for image)
const brainDecision = await this.decideBrainAction(input, context);

// Store image analysis when it completes
if (imageAnalysisPromise) {
  imageAnalysisPromise.then(analysis => {
    this.projectMemory.addImageContext(input.projectId, analysis);
  }).catch(err => console.error('Image analysis failed:', err));
}
```

### Phase 2: ProjectMemory System
**New Files to Create**:
- `src/lib/services/projectMemory.service.ts`
- `src/lib/services/contextEnrichment.service.ts`

**Database Changes** (add to schema):
```sql
-- Project memory tables
CREATE TABLE project_memory (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL,
  context_type VARCHAR NOT NULL, -- 'user_preference', 'chat_summary', 'image_analysis'
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scene_relationships (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR NOT NULL,
  scene_id VARCHAR NOT NULL,
  references TEXT[], -- ["scene_2_button", "background_color"]
  json_template JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 3: SceneBuilder Enhancement
**Files to Modify**: 
- `src/lib/services/sceneBuilder.service.ts`
- `src/lib/services/directCodeEditor.service.ts`

**Current SceneBuilder** (limited context):
```typescript
async buildScene(prompt: string, projectId: string): Promise<Scene>
```

**Enhanced SceneBuilder**:
```typescript
async buildScene(
  input: UserInput, 
  enrichedContext: EnrichedContext
): Promise<Scene> {
  if (this.shouldUseJSONPath(input, enrichedContext)) {
    return this.buildViaJSON(input, enrichedContext);
  } else {
    return this.buildDirectly(input, enrichedContext);
  }
}

private shouldUseJSONPath(input: UserInput, context: EnrichedContext): boolean {
  return (
    input.hasImage ||
    input.complexity > 'simple' ||
    context.isFirstScene ||
    context.previousScenes.length === 0 ||
    context.userPreferences.alwaysUseJSON
  );
}
```

### Phase 4: Brain Orchestrator Simplification
**File to Modify**: `src/server/services/brain/orchestrator.ts`

**Current Complex Logic** (lines 100-130):
Multiple service calls, complex decision tree

**Simplified Logic**:
```typescript
async processUserInput(input: UserInput): Promise<ProcessingResult> {
  // 1. Start async image analysis
  const imageAnalysisPromise = this.startImageAnalysisIfNeeded(input);
  
  // 2. Enrich context from project memory
  const enrichedContext = await this.contextEnrichment.enrich(input);
  
  // 3. Brain makes simple decision
  const decision = await this.brain.decide(input, enrichedContext);
  
  // 4. Execute decision with appropriate service
  const result = await this.executeDecision(decision, input, enrichedContext);
  
  // 5. Update project memory
  await this.updateProjectMemory(input, result, enrichedContext);
  
  return result;
}

private async executeDecision(
  decision: BrainDecision, 
  input: UserInput, 
  context: EnrichedContext
): Promise<ProcessingResult> {
  switch (decision.action) {
    case 'addScene':
      return this.sceneBuilder.buildScene(input, context);
    case 'editScene':
      return this.sceneEditor.editScene(input, context, decision.targetScene);
    case 'deleteScene':
      return this.deleteScene.execute(decision.targetScene);
    case 'askClarify':
      return this.generateClarification(input, context);
  }
}
```

## File Structure Changes

### New Services
```
src/lib/services/
├── projectMemory.service.ts        # Context storage & retrieval
├── contextEnrichment.service.ts    # Enrich input with project context
└── sceneEditor.service.ts          # Dedicated scene editing (rename from directCodeEditor)
```

### Modified Services
```
src/server/services/brain/
└── orchestrator.ts                 # Simplified async orchestration

src/lib/services/
├── sceneBuilder.service.ts         # Enhanced with context awareness
└── aiClient.service.ts            # Add async image analysis method
```

## Testing Strategy

### Unit Tests
- ProjectMemory: Context storage/retrieval
- ContextEnrichment: Context building from history
- SceneBuilder: JSON vs Direct path selection

### Integration Tests
- Async image analysis doesn't block workflow
- Context accumulation across multiple prompts
- Scene references work ("that button in scene 2")

### E2E Tests
- 30+ prompt workflow with context preservation
- Image upload with async analysis
- Mixed text/image prompt handling

## Rollout Plan

### Week 1: Phase 1 Implementation
- Implement async image analysis
- Modify orchestrator.ts
- Test image upload performance

### Week 2: Phase 2-3 Implementation  
- Build ProjectMemory system
- Enhance SceneBuilder with context
- Database schema updates

### Week 3: Phase 4 & Testing
- Simplify brain orchestrator
- Comprehensive testing
- Performance optimization

### Week 4: Production Deployment
- Feature flags for gradual rollout
- Monitor context accumulation performance
- User feedback collection

## Success Metrics

1. **Performance**: Image analysis async reduces response time by 30%
2. **Context**: "that button in scene 2" references work 95% of time  
3. **User Experience**: 30+ prompt workflows feel seamless
4. **System**: JSON vs Direct selection improves code quality

## Risk Mitigation

1. **Async Complexity**: Comprehensive error handling for image analysis
2. **Context Bloat**: Implement smart context summarization
3. **Memory Usage**: Periodic cleanup of old project memory
4. **Backward Compatibility**: Feature flags for gradual migration 