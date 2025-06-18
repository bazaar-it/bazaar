# 2-Minute Generation Pipeline Analysis

## Executive Summary

The current Bazaar-Vid generation pipeline takes approximately 2 minutes from user input to generated video scene. This analysis identifies all steps, LLM calls, and bottlenecks in the pipeline, with specific recommendations for optimization.

## Complete Flow Analysis

### 1. User Input → Brain Orchestration (15-20s)

**Flow:**
```
User Message → generation.universal.ts → orchestratorNEW.ts → contextBuilder → intentAnalyzer → Tool Selection
```

**LLM Calls:**
1. **Context Building** (2-5s)
   - No LLM calls, but heavy database queries
   - Fetches scenes, chat history, user preferences
   - Builds image context from conversation

2. **Intent Analysis** (10-15s)
   - **Model**: GPT-4.1 (brain model)
   - **Purpose**: Analyze user intent and select appropriate tool
   - **Input Size**: ~500-2000 tokens (user prompt + context)
   - **Output**: Tool selection JSON with reasoning

### 2. Tool Execution Phase (60-90s)

#### A. ADD Tool - Text-Based Scene Creation (50-70s)

**Flow:**
```
add.ts → layoutGeneratorNEW.ts → CodeGeneratorNEW.ts → Scene Output
```

**LLM Calls:**

1. **Layout Generation** (15-20s)
   - **Model**: Claude Sonnet 4 (layoutGenerator)
   - **Purpose**: Convert user prompt to structured JSON specification
   - **Input**: User prompt + previous scene context
   - **Output**: Detailed JSON layout (~200-500 lines)

2. **Code Generation** (35-50s)
   - **Model**: Claude Sonnet 4 (codeGenerator)
   - **Purpose**: Convert JSON layout to React/Remotion code
   - **Input**: JSON layout + function name + user prompt
   - **Output**: Complete TSX code (200-600 lines)

**Optimization: Fast Path Available**
- If previous scene exists, skip layout generation
- Direct code generation with reference: 20-30s total

#### B. ADD Tool - Image-Based Scene Creation (40-60s)

**Flow:**
```
add.ts → ImageToCodeGeneratorNEW.ts → Scene Output
```

**LLM Calls:**

1. **Image-to-Code Generation** (40-60s)
   - **Model**: Claude Sonnet 4 (codeGenerator with vision)
   - **Purpose**: Generate code directly from images
   - **Input**: Image URLs + vision analysis + user prompt
   - **Output**: Complete TSX code

#### C. EDIT Tool (30-50s)

**Flow:**
```
edit.ts → CreativeEditor/SurgicalEditor → Modified Scene
```

**LLM Calls:**

1. **Creative Edit** (30-50s)
   - **Model**: Claude Sonnet 4 (directCodeEditor.creative)
   - **Purpose**: Major modifications to existing code
   - **Input**: Existing code + user prompt
   - **Output**: Modified TSX code

2. **Surgical Edit** (15-25s)
   - **Model**: GPT-4.1-mini (directCodeEditor.surgical)
   - **Purpose**: Small, targeted changes
   - **Input**: Existing code + specific target
   - **Output**: Modified TSX code

### 3. Database & Storage Operations (10-20s)

**Operations:**
1. Save scene to database (2-3s)
2. Update project memory (1-2s)
3. Store chat messages (1-2s)
4. Update user preferences (async, 5-10s)

### 4. Response Delivery (1-2s)

**Operations:**
1. Format universal response
2. Send to client via tRPC
3. Update UI state

## Total Time Breakdown

### Typical "Add Scene" Request (Text-Based)
- Brain Orchestration: 15-20s
- Layout Generation: 15-20s
- Code Generation: 35-50s
- Database Operations: 10-20s
- **Total: 75-110s (1.25-1.8 minutes)**

### Typical "Add Scene" Request (With Previous Scene)
- Brain Orchestration: 15-20s
- Code Generation (Fast Path): 20-30s
- Database Operations: 10-20s
- **Total: 45-70s (0.75-1.2 minutes)**

### Typical "Edit Scene" Request
- Brain Orchestration: 15-20s
- Code Editing: 15-50s
- Database Operations: 10-20s
- **Total: 40-90s (0.67-1.5 minutes)**

## Identified Bottlenecks

### 1. Sequential LLM Calls
- **Issue**: Layout generation → Code generation happens sequentially
- **Impact**: 50-70s for two-step process
- **Opportunity**: Could be parallelized or combined

### 2. Large Model Usage
- **Issue**: Using GPT-4.1 for brain orchestration on simple requests
- **Impact**: 10-15s for decisions that could be faster
- **Opportunity**: Route simple requests to faster models

### 3. Context Building Overhead
- **Issue**: Building full context even for simple operations
- **Impact**: 2-5s of database queries
- **Opportunity**: Cache context, lazy load non-essential data

### 4. Redundant Processing
- **Issue**: Two-step pipeline (JSON → Code) adds complexity
- **Impact**: Extra LLM call and processing time
- **Opportunity**: Direct prompt-to-code for common patterns

## Optimization Recommendations

### 1. Immediate Optimizations (30-50% improvement)

#### A. Implement Request Routing
```typescript
// Quick decision layer before full brain orchestration
if (isSimpleRequest(userPrompt)) {
  // Route to fast models (GPT-4o-mini, Haiku)
  // Skip heavy context building
}
```

#### B. Parallelize Independent Operations
```typescript
// Current: Sequential
const layout = await generateLayout();
const code = await generateCode(layout);

// Optimized: Parallel where possible
const [contextData, userPrefs] = await Promise.all([
  buildMinimalContext(),
  getUserPreferences()
]);
```

#### C. Implement Caching
- Cache context for 5 minutes (already partially implemented)
- Cache common layout patterns
- Cache code templates for reuse

### 2. Architecture Optimizations (50-70% improvement)

#### A. Single-Step Generation
```typescript
// For common patterns, skip layout generation
const code = await generateCodeDirectly({
  prompt: userPrompt,
  template: getTemplateForPattern(userPrompt),
  previousScene: lastScene
});
```

#### B. Streaming Response
- Stream code as it's generated
- Start UI updates before full completion
- Progressive scene building

#### C. Smart Model Selection
```typescript
const modelConfig = {
  simpleText: 'gpt-4o-mini',      // 2-3s
  complexScene: 'claude-sonnet-4',  // 15-20s
  imageAnalysis: 'gpt-4o',         // 10-15s
  quickEdit: 'claude-haiku'        // 5-10s
};
```

### 3. Advanced Optimizations (70-90% improvement)

#### A. Template-Based Generation
- Pre-generate common scene types
- Use LLM only for customization
- Cache and reuse patterns

#### B. Incremental Updates
- For edits, only regenerate changed portions
- Use diff-based updates
- Minimize code regeneration

#### C. Background Processing
- Pre-generate likely next scenes
- Warm up models with predicted requests
- Speculative execution

## Recommended Implementation Plan

### Phase 1: Quick Wins (1 week)
1. Implement simple request routing
2. Add context caching
3. Enable fast path for all scene types
4. Parallelize independent operations

**Expected improvement: 30-40% (90s → 60s)**

### Phase 2: Architecture Updates (2-3 weeks)
1. Implement single-step generation for common patterns
2. Add streaming responses
3. Optimize model selection per request type
4. Implement template system

**Expected improvement: 50-60% (90s → 40s)**

### Phase 3: Advanced Features (4-6 weeks)
1. Build comprehensive template library
2. Implement incremental updates
3. Add speculative execution
4. Create pattern recognition system

**Expected improvement: 70-80% (90s → 20s)**

## Cost Analysis

### Current Cost per Generation
- Brain (GPT-4.1): ~$0.02
- Layout (Claude Sonnet 4): ~$0.015
- Code Gen (Claude Sonnet 4): ~$0.03
- **Total: ~$0.065 per generation**

### Optimized Cost per Generation
- Smart routing: ~$0.005 for simple
- Templates: ~$0.02 for complex
- **Average: ~$0.015 per generation (77% reduction)**

## Monitoring & Metrics

### Key Metrics to Track
1. **Time to First Byte** (TTFB)
2. **Total Generation Time**
3. **LLM Call Duration** (per model)
4. **Cache Hit Rate**
5. **Template Usage Rate**
6. **Cost per Generation**

### Implementation
```typescript
// Add timing instrumentation
const metrics = {
  orchestrationTime: 0,
  layoutGenTime: 0,
  codeGenTime: 0,
  dbOperationsTime: 0,
  totalTime: 0
};
```

## Conclusion

The current 2-minute generation pipeline can be optimized to under 30 seconds through:
1. Intelligent request routing
2. Model optimization
3. Caching and templates
4. Architectural improvements

The recommended phased approach balances quick wins with long-term improvements, targeting an 80% reduction in generation time while reducing costs by 77%.