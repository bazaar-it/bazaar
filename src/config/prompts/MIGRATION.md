# Prompts Migration Guide

## Overview
We've modularized the prompts system from a single 1000+ line file to individual files for each active prompt.

## Architecture Changes

### Before:
- Single `prompts.config.ts` with 40+ prompts
- Most prompts unused
- Hard to track what's actually being used

### After:
```
prompts/
├── active/              # 5 actively used prompts
│   ├── brain-orchestrator.ts
│   ├── code-generator.ts      # Universal (text/image/reference)
│   ├── code-editor.ts         # Universal (all edit types)
│   ├── title-generator.ts
│   └── conversational-response.ts
└── deprecated/          # Old prompts for reference
```

## Code Updates Required

### 1. Edit Tool (src/tools/edit/edit.ts)
```typescript
// OLD
const systemPrompt = getSystemPrompt('DIRECT_CODE_EDITOR_SURGICAL_UNIFIED');

// NEW
const systemPrompt = getSystemPrompt('CODE_EDITOR');
```

### 2. Add Tool (src/tools/add/add_helpers/CodeGeneratorNEW.ts)
```typescript
// OLD - Three different prompts
getParameterizedPrompt('CODE_GENERATOR', {...})
getParameterizedPrompt('CODE_GENERATOR_WITH_REFERENCE', {...})
getParameterizedPrompt('IMAGE_CODE_GENERATOR', {...})

// NEW - One universal prompt
getParameterizedPrompt('CODE_GENERATOR', {...})
```

### 3. Update Context Building
The universal CODE_GENERATOR prompt now handles all scenarios. Pass context in the user message:
- For images: Include image URLs and description
- For reference: Include previous scene code
- For text: Just the user prompt

## Benefits

1. **Clarity**: Only 5 active prompts instead of 40+
2. **Maintainability**: Each prompt in its own file with documentation
3. **Flexibility**: Universal prompts adapt based on context
4. **Performance**: Smaller config file, faster imports

## Temporary Compatibility

The new config includes aliases for old prompt names to prevent immediate breaking:
```typescript
CODE_GENERATOR_WITH_REFERENCE: CODE_GENERATOR,
IMAGE_CODE_GENERATOR: CODE_GENERATOR,
DIRECT_CODE_EDITOR_SURGICAL_UNIFIED: CODE_EDITOR,
```

These should be removed after updating all references.