# Principle 07: Smart Model Configuration

## The Principle
**Right model for the right task.** Leverage the existing model configuration system.

## Current Model Configuration Files

### 1. Main Config: `/src/config/models.config.ts`
- Defines model schemas and validation
- Has model packs (basic, standard, premium)
- Supports OpenAI and Anthropic providers

### 2. Brain Config: `/src/brain/config/models.config.ts`
- Appears to be a duplicate (should be removed)
- Use the main config instead

## Current Model Structure
```typescript
// From /src/config/models.config.ts
const MODEL_PACKS = {
  basic: {
    brain: { model: "gpt-3.5-turbo", temperature: 0.7 },
    codeGenerator: { model: "gpt-3.5-turbo", temperature: 0.3 },
    // ... other models
  },
  standard: {
    brain: { model: "gpt-4o-mini", temperature: 0.7 },
    codeGenerator: { model: "gpt-4o-mini", temperature: 0.3 },
    directCodeEditor: {
      surgical: { model: "gpt-4o-mini", temperature: 0.2 },
      creative: { model: "gpt-4o-mini", temperature: 0.7 },
    },
    // ... other models
  }
};
```

## Problems to Fix

### 1. Consolidate Configs
```typescript
// ❌ WRONG: Multiple config files
/src/config/models.config.ts
/src/brain/config/models.config.ts

// ✅ RIGHT: Single source
/src/config/models.config.ts only
```

### 2. Simplify Model Access
```typescript
// Current: Complex getter
const model = getModel('codeGenerator');

// Should be: Direct and typed
const model = MODEL_CONFIG.codeGenerator;
```

### 3. Remove Verbose Model Names
```typescript
// Current models defined:
- directCodeEditor.surgical
- directCodeEditor.creative  
- directCodeEditor.structural
- createSceneFromImage
- editSceneWithImage

// Simplify to:
- edit.surgical
- edit.creative
- create.fromImage
- edit.fromImage
```

## Temperature Guidelines

Based on current config:
- **Brain/Decisions**: 0.7 (some creativity)
- **Code Generation**: 0.3 (more precise)
- **Surgical Edits**: 0.2 (very precise)
- **Creative Edits**: 0.7 (more variation)
- **Error Fixes**: 0.1 (deterministic)

## Model Selection by Task

```typescript
// Current mapping in config
{
  brain: "gpt-4o-mini",           // Decisions
  codeGenerator: "gpt-4o-mini",   // Scene creation
  layoutGenerator: "gpt-4o-mini", // Layout JSON
  
  directCodeEditor: {
    surgical: "gpt-4o-mini",      // Small changes
    creative: "gpt-4o-mini",      // Big changes
  },
  
  fixBrokenScene: "gpt-4o-mini",  // Error fixes
  
  // Vision models
  analyzeImage: "gpt-4o-mini",
  createSceneFromImage: "gpt-4o-mini",
}
```

## Recommendations

1. **Delete duplicate config** in `/src/brain/config/`
2. **Use environment-based selection**:
   ```typescript
   const MODEL_PACK = process.env.MODEL_PACK || 'standard';
   ```
3. **Add cost tracking** per model use
4. **Monitor performance** by model type

## Success Criteria
- Single model config file
- Clear model-to-task mapping
- Appropriate temperatures set
- No hardcoded model names
- Easy to switch model packs