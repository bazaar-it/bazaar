# Principle 06: Structured Prompts

## The Principle
**Use the structured prompt system.** Keep prompts organized in `/src/brain/config/prompts/`.

## Current Prompt System (Keep This!)

Located in `/src/brain/config/prompts/`:
```
✅ BRAIN_ORCHESTRATOR.md
✅ ADD_SCENE.md  
✅ EDIT_SCENE.md
✅ CODE_GENERATOR.md
✅ LAYOUT_GENERATOR.md
✅ DIRECT_CODE_EDITOR_SURGICAL.md
✅ DIRECT_CODE_EDITOR_CREATIVE.md
✅ FIX_BROKEN_SCENE.md
... and 18 more files
```

This organized structure is GOOD - it provides:
- Clear separation of concerns
- Easy prompt updates without code changes
- Version control for prompt evolution
- Detailed instructions for complex tasks

## Why This System Works

### 1. Maintainability
```typescript
// ✅ GOOD: Load from organized files
const prompt = await loadPrompt('BRAIN_ORCHESTRATOR.md');

// Easy to update prompts without touching code
// Can A/B test different prompt versions
// Clear history of what changed
```

### 2. Complex Instructions
Some tasks NEED detailed prompts:
- Code generation (specific patterns)
- Scene editing (maintain structure)
- Error fixing (precise requirements)
- Image analysis (output format)

### 3. Consistency
Having prompts in files ensures:
- All developers use same prompts
- No accidental modifications
- Easy to review and improve
- Single source of truth

## Prompt Organization

```
/src/brain/config/prompts/
├── Decision Making
│   ├── BRAIN_ORCHESTRATOR.md
│   └── PREFERENCE_EXTRACTOR.md
├── Scene Operations  
│   ├── ADD_SCENE.md
│   ├── EDIT_SCENE.md
│   └── DELETE_SCENE.md
├── Code Generation
│   ├── CODE_GENERATOR.md
│   ├── LAYOUT_GENERATOR.md
│   └── SCENE_BUILDER.md
├── Edit Types
│   ├── DIRECT_CODE_EDITOR_SURGICAL.md
│   ├── DIRECT_CODE_EDITOR_CREATIVE.md
│   └── DIRECT_CODE_EDITOR_STRUCTURAL.md
├── Vision/Images
│   ├── ANALYZE_IMAGE.md
│   ├── CREATE_SCENE_FROM_IMAGE.md
│   └── VISION_ANALYSIS.md
└── Utilities
    ├── FIX_BROKEN_SCENE.md
    └── TITLE_GENERATOR.md
```

## Best Practices

### 1. Keep Prompts Focused
Each file should have ONE clear purpose

### 2. Use Templates
```markdown
<!-- In prompt file -->
You will receive:
- userPrompt: {userPrompt}
- currentCode: {currentCode}
- sceneType: {sceneType}
```

### 3. Include Examples
Show the AI what good output looks like

### 4. Version Changes
Use git to track prompt improvements

## Integration with Code

```typescript
// Clean loading system
import { getSystemPrompt } from '~/config/prompts.config';

// Or from the prompt loader
import { loadPrompt } from '~/brain/config/promptLoader';

const systemPrompt = await loadPrompt('BRAIN_ORCHESTRATOR');
```

## Success Criteria
- All prompts in `/src/brain/config/prompts/`
- Clear file naming convention
- Easy to load and use
- Version controlled
- Well-documented purpose for each