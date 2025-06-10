# Single-Call DirectCodeEditor Optimization - Sprint 35

## 🎯 Goal: 90+ seconds → 10 seconds for edits

### Current Performance Issue
- **Surgical**: 3 × GPT-4.1 calls = 90+ seconds 
- **Creative**: 2 × GPT-4.1 calls = 60+ seconds
- **Vercel timeouts**: 180 seconds (barely enough)

### Root Cause
DirectCodeEditor makes multiple sequential LLM calls for what could be a single operation.

## ✅ Proposed Single-Call Architecture

### New Method: `singleCallEdit()`
```typescript
async singleCallEdit(input: DirectCodeEditInput): Promise<DirectCodeEditOutput> {
  const modelConfig = resolveDirectCodeEditorModel(input.editComplexity || 'surgical');
  
  const response = await AIClientService.generateResponse(
    modelConfig,
    [{ role: "user", content: input.userPrompt }],
    { role: "system", content: this.buildUnifiedPrompt(input) },
    { responseFormat: { type: "json_object" } }
  );
  
  const result = this.extractJsonFromResponse(response.content);
  return this.validateAndReturnResult(result, input);
}
```

### Unified System Prompt Structure

**For Surgical Edit (GPT-4o-mini)**:
```
You are a React/Remotion code editor. Make precise surgical edits.

EXISTING CODE:
```tsx
${existingCode}
```

USER REQUEST: "${userPrompt}"
COMPLEXITY: surgical (minimal changes only)

INSTRUCTIONS:
1. Analyze what specific change is requested
2. Make ONLY that change while preserving everything else
3. Detect if the change affects scene duration
4. Return complete modified code with change summary

RESPONSE FORMAT (JSON):
{
  "code": "Complete modified code",
  "changes": ["Specific changes made"],
  "preserved": ["What was kept unchanged"], 
  "reasoning": "Why these changes were made",
  "newDurationFrames": 180 // or null if no change
}

CRITICAL RULES:
- Change ONLY what user requested
- Preserve ALL animations and timing
- Keep component structure identical
- Use existing imports and patterns
```

## 📊 Expected Performance Improvement

### Current Performance
- **Analysis call**: ~30 seconds (GPT-4.1)
- **Modification call**: ~30 seconds (GPT-4.1)  
- **Duration call**: ~30 seconds (GPT-4.1)
- **Total**: 90+ seconds

### With Single Call + Optimal Pack
- **Single unified call**: ~10 seconds (GPT-4o-mini)
- **Total**: 10 seconds
- **Improvement**: 9x faster

### With Single Call + Current Pack  
- **Single unified call**: ~30 seconds (GPT-4.1)
- **Total**: 30 seconds
- **Improvement**: 3x faster

## 🔧 Implementation Plan

### Phase 1: Implement Single-Call Method
1. Create `singleCallEdit()` method
2. Build unified prompts for each complexity level
3. Add proper JSON validation and error handling

### Phase 2: A/B Testing
1. Add feature flag to choose single-call vs multi-call
2. Compare output quality and performance
3. Validate that quality remains high

### Phase 3: Full Migration
1. Replace multi-call methods with single-call
2. Remove old `analyzeRequestedChanges()` and related methods
3. Update all complexity levels to use unified approach

## 🎨 Unified Prompt Strategy

### Surgical Prompt (Fast + Precise)
- Focus: "Make only the requested change"
- Model: GPT-4o-mini (fast)
- Style: Surgical, preserves everything

### Creative Prompt (Quality + Style)  
- Focus: "Improve visual design and style"
- Model: Claude Sonnet 4 (high quality)
- Style: Creative enhancements, modern design

### Structural Prompt (Layout + Organization)
- Focus: "Reorganize layout and structure"  
- Model: Claude Sonnet 4 (complex reasoning)
- Style: Layout changes, animation coordination

## 🚨 Potential Risks & Mitigations

### Risk 1: Quality Degradation
- **Mitigation**: Extensive testing with A/B comparison
- **Fallback**: Keep multi-call as backup option

### Risk 2: Complex Edits Harder to Debug
- **Mitigation**: Enhanced logging and JSON validation
- **Solution**: Better error messages and debug info

### Risk 3: Token Limits
- **Mitigation**: Complexity-appropriate token limits
- **Current limits**: surgical=8k, creative/structural=16k

## 🎯 Success Metrics

### Performance Targets
- ✅ Surgical edits: <15 seconds (vs current 90s)
- ✅ Creative edits: <25 seconds (vs current 60s)  
- ✅ Zero Vercel timeouts
- ✅ 90%+ user satisfaction with edit quality

### Quality Targets
- ✅ Code compiles successfully (same as current)
- ✅ Preserves animations and functionality
- ✅ User intent accurately implemented
- ✅ No regression in edit quality

## 📋 Next Steps

1. **Immediate**: Switch to `optimal-pack` for 3x speed boost
2. **Week 1**: Implement single-call surgical edits
3. **Week 2**: Add creative/structural single-call methods
4. **Week 3**: A/B test and optimize prompts
5. **Week 4**: Full migration and cleanup

This optimization would transform edit experience from "painfully slow" to "smooth and responsive".