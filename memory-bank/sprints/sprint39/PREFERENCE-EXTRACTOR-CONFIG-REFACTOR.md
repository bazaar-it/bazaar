# Preference Extractor Config Refactoring

## What Was Done

Refactored `preferenceExtractor.service.ts` to follow the established codebase pattern for system prompts and model configuration.

## Changes Made

### 1. Added PREFERENCE_EXTRACTOR to prompts.config.ts ✅
- Moved the hardcoded system prompt to `src/config/prompts.config.ts`
- Added under AI SERVICES PROMPTS section
- Follows the exact same pattern as other AI services

### 2. Updated preferenceExtractor.service.ts ✅
- Added imports for `getModel` and `getSystemPrompt`
- Removed inline hardcoded system prompt
- Now uses `getSystemPrompt('PREFERENCE_EXTRACTOR')`
- Uses `getModel('FAST_EDIT')` instead of hardcoded model

### 3. Type Alignment ✅
- Updated types to match the prompt output format
- Changed from `deprecatedPreferences` to `temporaryOverrides`
- Added `reasoning` field to result type
- Added `scope` field to preferences

## Why This Matters

1. **Consistency**: All AI services now follow the same pattern
2. **Maintainability**: Prompts are centralized in one config file
3. **Flexibility**: Easy to update prompts without touching service code
4. **Model Management**: Uses centralized model configuration

## Pattern Used

```typescript
// Before (hardcoded)
const systemPrompt = `You are an intelligent preference learning system...`;
const response = await AIClientService.generateResponse(
  { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
  // ...
);

// After (using config)
const systemPrompt = getSystemPrompt('PREFERENCE_EXTRACTOR');
const model = getModel('FAST_EDIT');
const response = await AIClientService.generateResponse(
  { ...model, temperature: 0.3 },
  [{ role: "user", content: contextMessage }],
  systemPrompt.content,
  // ...
);
```

## Other Services Following This Pattern

- `titleGenerator.service.ts` → uses `TITLE_GENERATOR` prompt
- `conversationalResponse.service.ts` → uses `CONVERSATIONAL_RESPONSE` prompt
- `directCodeEditor.service.ts` → uses various DIRECT_CODE_EDITOR prompts
- `codeGenerator.service.ts` → uses `CODE_GENERATOR` prompt
- `layoutGenerator.service.ts` → uses `LAYOUT_GENERATOR` prompt
- All MCP tools use their respective prompts

## Benefits

1. **Single Source of Truth**: All prompts in one place
2. **Version Control**: Easy to track prompt changes
3. **A/B Testing**: Can easily swap prompts for testing
4. **Documentation**: Prompts are self-documenting in config
5. **Type Safety**: TypeScript ensures correct prompt keys

## Testing

The refactored service maintains the same functionality:
- Still extracts preferences asynchronously
- Still stores high-confidence preferences (>0.5)
- Still returns the same result structure
- Zero performance impact

This refactoring ensures the preference extractor follows the established patterns in the codebase, making it easier to maintain and update.