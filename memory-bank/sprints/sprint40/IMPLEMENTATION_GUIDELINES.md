# Implementation Guidelines & Key Reminders

## 🚨 Critical Rules to Remember

### 1. Database is Truth
```typescript
// These are the ONLY correct field names:
tsxCode   // NOT code, sceneCode, fixedCode
name      // NOT sceneName
duration  // NOT newDurationFrames (always in frames)
```

### 2. No Transformations
```typescript
// ❌ WRONG
return {
  sceneCode: result.code,  // Transformation
  sceneName: result.name,  // Transformation
}

// ✅ CORRECT
return {
  scene: {
    tsxCode: result.tsxCode,  // Direct pass-through
    name: result.name,        // Direct pass-through
  }
}
```

### 3. ConversationalResponse Removal
```typescript
// ❌ WRONG - Extra LLM call
const chatResponse = await this.conversationalResponse.generateResponse({...});

// ✅ CORRECT - Let Brain handle it
// Just return the data, Brain will add chatResponse if needed
```

### 4. Service Consistency
```typescript
// All scene-generating services MUST return:
interface SceneServiceOutput {
  tsxCode: string;   // Exact database field
  name: string;      // Exact database field
  duration: number;  // Exact database field
  reasoning: string;
  debug?: any;
}
```

## 📋 Pre-Implementation Checklist

Before starting any phase:

- [ ] Read the complete analysis document
- [ ] Understand current tool's service chain
- [ ] Check which other tools might be affected
- [ ] Have the evaluation suite ready to test
- [ ] Create a branch for the specific phase

## 🔄 Phase-by-Phase Guidelines

### Phase 1: Remove ConversationalResponse

**Files to modify:**
- All 8 tool files in `/src/server/services/mcp/tools/`
- Remove imports
- Remove service calls
- Make chatResponse optional

**What NOT to change:**
- Tool logic
- Service interfaces (yet)
- Field names (yet)

**Testing:**
- Each tool should still execute
- Check response time improvement
- Verify Brain adds chat responses

### Phase 2: Standardize Field Names

**Order of changes:**
1. Update services first (bottom-up)
2. Then update tools
3. Finally update orchestrator

**Key replacements:**
```typescript
// In services
code → tsxCode
// Keep 'name' as is (already correct)

// In tools
sceneCode → scene.tsxCode
sceneName → scene.name
fixedCode → scene.tsxCode
```

**Watch out for:**
- Duration is already correct (frames)
- Don't change database schema
- Update TypeScript interfaces

### Phase 3: Create Base Interfaces

**File structure:**
```
/src/lib/types/
  /ai/
    tool-contracts.ts      // Tool interfaces
  /api/
    service-contracts.ts   // Service interfaces
```

**Implementation order:**
1. Define base interfaces
2. Update one tool as example
3. Update remaining tools
4. Update services to match

### Phase 4: Standardize Service Usage

**Key decisions:**
- EditSceneWithImage should use DirectCodeEditor
- Always use imageUrls (array) even for single image
- Remove duplicate duration extraction
- Standardize scene lookup

**Consolidation targets:**
- Image handling
- Scene identification
- Duration calculation
- Error handling

### Phase 5: Update Brain System Prompt

**Must include:**
```
When calling tools, use these EXACT field names:
- tsxCode (NOT code or sceneCode)
- name (NOT sceneName)
- imageUrls (NOT imageUrl, always array)
```

## ⚠️ Common Pitfalls to Avoid

### 1. Partial Updates
❌ Don't update tool without updating its services
✅ Update entire chain bottom-up

### 2. Breaking Backwards Compatibility
❌ Don't remove old fields immediately
✅ Add new fields, deprecate old, then remove

### 3. Forgetting Type Updates
❌ Don't just change runtime code
✅ Update TypeScript interfaces first

### 4. Missing Edge Cases
❌ Don't assume happy path
✅ Test with missing fields, errors, edge cases

### 5. Skipping Tests
❌ Don't move to next phase without testing
✅ Run full evaluation suite after each change

## 🎯 Quick Reference

### Which service does each tool use?

| Tool | Primary Service | Secondary Services |
|------|----------------|-------------------|
| addScene | SceneBuilder | LayoutGenerator, CodeGenerator |
| editScene | DirectCodeEditor | - |
| deleteScene | None | - |
| fixBrokenScene | AIClient (direct) | - |
| analyzeImage | AIClient (direct) | - |
| createSceneFromImage | SceneBuilder | LayoutGenerator, CodeGenerator |
| editSceneWithImage | CodeGenerator | Should use DirectCodeEditor |
| changeDuration | None | - |

### Field name mapping

| Current | Should Be | Where Used |
|---------|-----------|------------|
| code | tsxCode | All services |
| sceneCode | tsxCode | All tools |
| fixedCode | tsxCode | FixBrokenScene |
| sceneName | name | All tools |
| changesApplied | changes | FixBrokenScene |

### Required vs Optional fields

| Field | Required? | Default |
|-------|-----------|---------|
| tsxCode | Yes | - |
| name | Yes | - |
| duration | Yes | 180 frames |
| chatResponse | No | Brain generates |
| debug | No | - |
| layoutJson | No | - |

## 📊 Success Metrics

Track these after each phase:

1. **Performance**
   - API response time (should drop 30% after Phase 1)
   - Token usage (should drop with ConversationalResponse removal)

2. **Code Quality**
   - Lines of transformation code (should approach 0)
   - TypeScript errors (should be 0)
   - Duplicate code (should decrease)

3. **Reliability**
   - Evaluation suite pass rate (should stay 100%)
   - Error frequency (should decrease)

## 🔍 Debugging Tips

When something breaks:

1. **Check field names first** - Most issues will be naming mismatches
2. **Follow the chain** - Trace from orchestrator → tool → service
3. **Check TypeScript** - Types should catch most issues
4. **Use debug logging** - Temporarily add console.logs at each layer
5. **Test in isolation** - Test service separately from tool

## 📝 Documentation Updates

After implementation:

1. Update TOOLS_DOCUMENTATION.md with new interfaces
2. Update brain system prompt in prompts.config.ts
3. Update any example code in docs
4. Add migration notes for future reference
5. Update evaluation test expectations

Remember: **Fix at the source, not with transformations!**