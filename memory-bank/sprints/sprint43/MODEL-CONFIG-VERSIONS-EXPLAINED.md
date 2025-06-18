# Model Configuration Versions Explained

## Why 3 Versions?

### 1. `models.config.ts` (ACTIVE)
The main configuration currently in use. This is the one we just cleaned up to have only 4 models.

### 2. `models.config.clean.ts` (EXPERIMENTAL)
An attempt to simplify further by reducing to 3 models:
- `brain` - Orchestration
- `codeGenerator` - All code generation 
- `simple` - Simple tasks like titles

### 3. `models.config.simple.ts` (EXPERIMENTAL)
Another approach that maps models directly to tools:
- Maps to the 5 tools: brain, addScene, editScene, deleteScene, trimScene
- More aligned with tool architecture

These experimental versions are untracked in git (`??`) and not imported anywhere. They appear to be work-in-progress ideas for simplification.

## How Edit Works (No Helper)

Unlike `add` which uses `CodeGeneratorNEW.ts` helper, edit works directly:

```
1. edit.ts receives:
   - tsxCode (existing code)
   - userPrompt (what to change)
   - optional: imageUrls, errorDetails

2. Direct AI call:
   - Uses getModel('editScene') → Claude Sonnet 4
   - Sends existing code + prompt
   - Gets back modified code

3. Returns:
   - Modified tsxCode
   - Success/error status
```

No helper needed because edit is simpler - it just transforms existing code.

## How Trim Works (No AI)

Trim is a **pure function** - no AI needed:

```
1. trim.ts receives:
   - userPrompt (e.g., "make it 3 seconds")
   - currentDuration
   - optional: newDuration, trimFrames

2. Pure logic:
   - Parses duration from prompt
   - Calculates new duration
   - NO AI CALL

3. Returns:
   - New duration value
   - Trimmed frames count
   - Human-readable message
```

## Summary

- **Add**: Uses helper → CodeGeneratorNEW → AI generates new code
- **Edit**: No helper → Direct AI call to modify existing code  
- **Trim**: No AI → Pure function to calculate duration
- **Delete**: No AI → Just returns confirmation

The multiple config files are experimental attempts at simplification that haven't been integrated yet.