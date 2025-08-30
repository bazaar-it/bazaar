# Sprint 104: Immediate Action Plan for Pipeline Optimization

## 🎯 Goal: Reduce Average Operation Time from 15s → 5s

## Phase 1: Quick Wins (TODAY - 4 hours)

### 1. Simple Command Shortcuts (30 min)
**File**: `/src/brain/orchestratorNEW.ts`

Add pattern matching BEFORE LLM call:
```typescript
// At the beginning of process() method
const quickDecision = this.tryQuickDecision(input.prompt);
if (quickDecision) {
  console.log(`⚡ [BRAIN] Quick decision: ${quickDecision.tool} (skipped LLM)`);
  return quickDecision;
}

private tryQuickDecision(prompt: string): BrainDecision | null {
  // Delete commands
  if (/^(delete|remove) scene \d+$/i.test(prompt)) {
    const sceneNum = prompt.match(/\d+/)?.[0];
    return {
      success: true,
      toolName: 'deleteScene',
      toolContext: { sceneNumber: parseInt(sceneNum!) },
      reasoning: 'Direct delete command',
      chatResponse: `Deleting scene ${sceneNum}...`
    };
  }
  
  // Simple color changes
  const colorMatch = prompt.match(/^make (it |scene \d+ )?(red|blue|green|yellow|black|white|purple|orange)$/i);
  if (colorMatch) {
    return {
      success: true,
      toolName: 'editScene',
      toolContext: { color: colorMatch[2] },
      reasoning: 'Simple color change',
      chatResponse: `Changing color to ${colorMatch[2]}...`
    };
  }
  
  // Duration changes
  if (/^(make|change|set) (scene \d+ |it )?\d+ seconds?$/i.test(prompt)) {
    return {
      success: true,
      toolName: 'changeDuration',
      toolContext: {},
      reasoning: 'Direct duration change',
      chatResponse: 'Adjusting duration...'
    };
  }
  
  return null;
}
```

**Impact**: Instant response for 30% of commands (saves 3-4 seconds)

### 2. Prompt Size Reduction (1 hour)
**Files**: 
- `/src/config/prompts/active/code-generator.ts`
- `/src/config/prompts/active/brain-orchestrator.ts`

Remove:
- Verbose examples (keep only 1-2 essential ones)
- Redundant instructions
- Overly detailed explanations

**Target**: Reduce from ~10KB to ~3KB per prompt

**Impact**: 20-30% faster first token (saves 10-15 seconds on generation)

### 3. Smart Context Loading (1 hour)
**File**: `/src/server/api/routers/generation/scene-operations.ts`

Change from loading 100 messages to smart loading:
```typescript
// Instead of:
const recentMessages = await db.query.messages.findMany({
  where: eq(messages.projectId, projectId),
  orderBy: [desc(messages.sequence)],
  limit: 100, // Too many!
});

// Use:
const recentMessages = await db.query.messages.findMany({
  where: eq(messages.projectId, projectId),
  orderBy: [desc(messages.sequence)],
  limit: 20, // Start small
});

// Only load more if needed for complex operations
if (needsMoreContext(input.prompt)) {
  const moreMessages = await db.query.messages.findMany({
    where: eq(messages.projectId, projectId),
    orderBy: [desc(messages.sequence)],
    limit: 50,
    offset: 20
  });
}
```

**Impact**: 60% faster context loading (saves 200-400ms)

### 4. Add Performance Timing (30 min)
Add timing logs to identify remaining bottlenecks:
```typescript
const timings = {
  brain: 0,
  generation: 0,
  database: 0,
  total: Date.now()
};

// Throughout the code:
const start = Date.now();
// ... operation ...
timings.brain = Date.now() - start;

// At the end:
console.log('⏱️ Performance:', {
  brain: `${timings.brain}ms`,
  generation: `${timings.generation}ms`,
  database: `${timings.database}ms`,
  total: `${Date.now() - timings.total}ms`
});
```

**Impact**: Identifies next optimization targets

## Phase 2: Model Intelligence (TOMORROW - 4 hours)

### 1. Complexity Analyzer
Create a service to determine scene complexity:
```typescript
class ComplexityAnalyzer {
  analyze(prompt: string): { score: number, model: string } {
    let score = 0;
    
    // Simple operations (score 0-3)
    if (/color|background|text|title/i.test(prompt)) score += 1;
    if (/change|edit|update|modify/i.test(prompt)) score += 1;
    
    // Medium complexity (score 4-6)
    if (/animation|transition|effect/i.test(prompt)) score += 3;
    if (/gradient|shadow|blur/i.test(prompt)) score += 2;
    
    // High complexity (score 7-10)
    if (/complex|detailed|realistic/i.test(prompt)) score += 5;
    if (/3d|particle|physics/i.test(prompt)) score += 4;
    
    // Select model based on score
    if (score <= 3) return { score, model: 'gpt-4o-mini' };    // 10x faster
    if (score <= 6) return { score, model: 'gpt-4o' };        // 5x faster
    return { score, model: 'claude-3-sonnet-20241022' };      // Full power
  }
}
```

**Impact**: 70% of scenes use faster models (saves 30-40 seconds)

### 2. Template Matcher
For common requests, use templates instead of generation:
```typescript
class TemplateMatcher {
  templates = {
    'title_slide': /^(create|make|add) (a )?title (slide|scene)/i,
    'countdown': /^(create|make|add) (a )?countdown/i,
    'logo_reveal': /^(create|make|add) (a )?logo (reveal|animation)/i,
  };
  
  match(prompt: string): string | null {
    for (const [template, pattern] of Object.entries(this.templates)) {
      if (pattern.test(prompt)) {
        return template;
      }
    }
    return null;
  }
  
  async getTemplateCode(template: string, params: any) {
    // Return pre-built, tested code
    const templates = await import('./templates');
    return templates[template](params);
  }
}
```

**Impact**: Instant generation for common scenes (saves 50+ seconds)

## Phase 3: User Experience (Day 3 - 4 hours)

### 1. Streaming Progress
Show users what's happening:
```typescript
// In SSE stream
stream.send({ type: 'progress', stage: 'analyzing', percent: 10 });
stream.send({ type: 'progress', stage: 'understanding_request', percent: 20 });
stream.send({ type: 'progress', stage: 'generating_code', percent: 50 });
stream.send({ type: 'progress', stage: 'optimizing', percent: 80 });
stream.send({ type: 'progress', stage: 'finalizing', percent: 95 });
```

**Impact**: Feels 50% faster due to feedback

### 2. Optimistic Updates
Update UI immediately, rollback if needed:
```typescript
// In VideoState
optimisticUpdate(sceneId: string, changes: Partial<Scene>) {
  // Apply changes immediately
  this.updateScene(sceneId, { ...changes, _optimistic: true });
  
  // Revert if server fails
  return {
    rollback: () => this.revertOptimistic(sceneId)
  };
}
```

**Impact**: Instant UI response

## Expected Results

### Current State
- Simple edit: 15 seconds
- Complex scene: 55 seconds
- Average: 20-25 seconds

### After Phase 1 (TODAY)
- Simple edit: 8 seconds (-47%)
- Complex scene: 45 seconds (-18%)
- Average: 15 seconds (-40%)

### After Phase 2 (TOMORROW)
- Simple edit: 3 seconds (-80%)
- Complex scene: 25 seconds (-55%)
- Average: 8 seconds (-68%)

### After Phase 3 (Day 3)
- Simple edit: 2 seconds (instant feel)
- Complex scene: 20 seconds (with progress)
- Average: 5 seconds (-80%)

## Metrics to Track

```typescript
// Add to every operation
const metrics = {
  operation: 'add_scene',
  prompt_length: prompt.length,
  model_used: 'gpt-4o-mini',
  cache_hit: false,
  quick_decision: true,
  timings: {
    brain: 100,
    generation: 2000,
    database: 50,
    total: 2150
  }
};

await trackMetric(metrics);
```

## Success Criteria

- [ ] 80% of simple commands respond in <3 seconds
- [ ] 50% of complex scenes complete in <20 seconds
- [ ] Average operation time <8 seconds
- [ ] User satisfaction increase (measure via feedback)

## Start NOW With

1. Add quick decision patterns (30 min)
2. Reduce prompt sizes (1 hour)
3. Add timing logs (30 min)
4. Test and measure impact (1 hour)

Total: 3 hours for 40% improvement TODAY