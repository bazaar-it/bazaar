# Pipeline Optimization Opportunities

## Current State After Sprint 102
We've already implemented:
- ✅ Database query parallelization (saves 700-1000ms)
- ✅ Code caching with LRU (saves 8-12 seconds on cache hits)
- ✅ API key rotation for load balancing

## Remaining Bottlenecks & Solutions

### 1. 🔥 Claude Taking 55 Seconds for Code Generation
**Problem**: The biggest bottleneck is still Claude's code generation time
**Current**: 55 seconds for complex scenes
**Opportunity**: 30-40 second reduction possible

**Solutions**:
1. **Prompt Optimization**
   - Remove unnecessary examples from prompts (10KB → 3KB)
   - Pre-compute common patterns instead of explaining them
   - Use more concise instructions
   - **Impact**: 20-30% faster first token

2. **Smart Model Selection**
   - Use Haiku for simple scenes (10x faster)
   - Use GPT-4o-mini for medium complexity (5x faster)
   - Reserve Claude Sonnet 4 only for complex animations
   - **Impact**: 70% of scenes could use faster models

3. **Template-Based Generation**
   - Pre-generate common scene types
   - Use templates + modifications instead of full generation
   - **Impact**: 90% reduction for templated scenes

### 2. 🎯 Brain Orchestrator Decision Time
**Problem**: Brain takes 3-4 seconds to decide which tool to use
**Current**: Using GPT-4o-mini for every decision
**Opportunity**: 2-3 second reduction

**Solutions**:
1. **Pattern Matching First**
   - Simple regex for obvious commands ("delete scene X", "make it blue")
   - Skip LLM for clear single-tool operations
   - **Impact**: 80% of simple commands instant

2. **Decision Caching**
   - Cache tool decisions for similar prompts
   - "make it red" → same tool as "make it blue"
   - **Impact**: 30% cache hit rate expected

### 3. 💾 Message History Loading
**Problem**: Loading 100 messages for context every time
**Current**: 300-500ms per request
**Opportunity**: 200-400ms reduction

**Solutions**:
1. **Smart Context Window**
   - Only load last 20 messages initially
   - Load more if brain requests it
   - **Impact**: 60% reduction in DB read time

2. **Message Compression**
   - Store compressed context summaries
   - Only expand when needed
   - **Impact**: 80% smaller context payload

### 4. 🖼️ Image Processing Pipeline
**Problem**: Image analysis takes 8-10 seconds
**Current**: Full vision model analysis every time
**Opportunity**: 5-7 second reduction

**Solutions**:
1. **Progressive Image Analysis**
   - Quick analysis first (2s) for basic info
   - Deep analysis only if needed
   - **Impact**: 70% faster for simple images

2. **Image Feature Caching**
   - Cache extracted features (colors, objects, text)
   - Reuse for similar operations
   - **Impact**: Instant for repeated edits

### 5. 🔄 State Update Propagation
**Problem**: Multiple components re-render on every state change
**Current**: 50-100ms UI lag
**Opportunity**: 40-80ms reduction

**Solutions**:
1. **Selective Subscriptions**
   - Components only subscribe to specific scene changes
   - Use shallow equality checks
   - **Impact**: 80% fewer re-renders

2. **Batch Updates**
   - Group multiple state changes
   - Single render cycle for multiple updates
   - **Impact**: 60% reduction in render cycles

## Quick Wins (Can Implement Today)

### 1. Remove Unused Prompt Content
**File**: `/src/config/prompts/active/code-generator.ts`
- Remove verbose examples
- Simplify instructions
- **Time to implement**: 1 hour
- **Impact**: 5-10 seconds faster generation

### 2. Add Simple Command Shortcuts
**File**: `/src/brain/orchestratorNEW.ts`
```typescript
// Before LLM call, check for simple patterns
if (/^delete scene \d+$/i.test(prompt)) {
  return { tool: 'deleteScene', skip_llm: true };
}
if (/^make (it |scene \d+ )?(red|blue|green|yellow)$/i.test(prompt)) {
  return { tool: 'editScene', skip_llm: true };
}
```
- **Time to implement**: 2 hours
- **Impact**: Instant response for 30% of commands

### 3. Implement Streaming for Long Operations
**Current**: User waits 55 seconds with no feedback
**Solution**: Stream progress updates
```typescript
// In code generator
stream.send({ status: 'analyzing', progress: 10 });
stream.send({ status: 'generating', progress: 50 });
stream.send({ status: 'optimizing', progress: 90 });
```
- **Time to implement**: 3 hours
- **Impact**: Better UX, feels 50% faster

### 4. Pre-warm Models
**Problem**: Cold start adds 2-3 seconds
**Solution**: Keep models warm with ping requests
```typescript
// Every 5 minutes
await AIClient.ping('gpt-4o-mini');
await AIClient.ping('claude-3-haiku');
```
- **Time to implement**: 1 hour
- **Impact**: 2-3 seconds faster first request

## High-Impact Optimizations (1-2 Days)

### 1. Intelligent Model Router
```typescript
class ModelRouter {
  async selectModel(prompt: string, complexity: number) {
    if (complexity < 3) return 'gpt-4o-mini';  // Simple edits
    if (complexity < 6) return 'gpt-4o';       // Medium complexity
    return 'claude-3-sonnet';                  // Complex animations
  }
}
```
- **Impact**: 70% of requests use faster models

### 2. Context Compression Service
```typescript
class ContextCompressor {
  compress(messages: Message[]) {
    // Summarize old messages
    // Keep recent ones intact
    // Maintain critical info
  }
}
```
- **Impact**: 10x smaller context, faster processing

### 3. Template Engine
```typescript
class TemplateEngine {
  async generateFromTemplate(template: string, params: any) {
    // Use pre-built components
    // Modify only what's needed
    // Skip full generation
  }
}
```
- **Impact**: 90% faster for common scenes

## Expected Total Impact

**Current Average Time**: 15-20 seconds per operation
**After Quick Wins**: 10-15 seconds (25-30% improvement)
**After Full Implementation**: 5-8 seconds (60-70% improvement)

## Priority Order

1. **Prompt Optimization** - Biggest bang for buck
2. **Simple Command Shortcuts** - Easy win
3. **Model Router** - Major impact
4. **Streaming Updates** - UX improvement
5. **Template Engine** - Long-term efficiency

## Next Steps

1. Start with quick wins (1 day implementation)
2. Measure impact with timing logs
3. Implement high-impact items based on metrics
4. Continue iterating based on user patterns