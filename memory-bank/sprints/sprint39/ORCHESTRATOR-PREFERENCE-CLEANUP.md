# Orchestrator Preference Extraction Cleanup

## What Was Done

Removed redundant preference extraction logic from the orchestrator since we now have proper AI-powered preference learning in the contextBuilder.

## Changes Made

### 1. Removed Basic extractUserPreferences Method ✅
- This method was doing simple keyword matching (e.g., looking for "modern", "fast", "minimal")
- Now handled by AI-powered preferenceExtractor service with confidence scoring

### 2. Removed extractUserPreferencesFromResult Method ✅
- This was trying to extract preferences from orchestration results
- Preferences are now learned during context building, not after execution

### 3. Updated buildContextPacket Method ✅
- Removed the call to extractUserPreferences
- Now relies solely on contextBuilder preferences
- Simplified preference merging - only merges legacy DB preferences with AI-extracted ones

### 4. Cleaned Up Memory Bank Preference Storage ✅
- Removed code that was storing preferences after each orchestration
- Preference storage is now handled by preferenceExtractor service

## Why This Cleanup Was Necessary

1. **Duplicate Logic**: The orchestrator had its own basic preference extraction that was competing with the AI-powered system
2. **Inferior Implementation**: Simple keyword matching vs intelligent AI analysis
3. **Wrong Location**: Preferences should be extracted during context building, not in the orchestrator
4. **Maintenance Burden**: Two separate systems doing the same thing

## Architecture After Cleanup

```
User Request
    ↓
ContextBuilder (with AI preference learning)
    ├─→ Loads existing preferences from DB
    ├─→ Analyzes conversation with AI
    └─→ Triggers async preference learning
    ↓
Orchestrator
    ├─→ Receives preferences from contextBuilder
    └─→ Uses them for tool decisions
```

## Benefits

1. **Single Source of Truth**: All preference extraction happens in one place
2. **Better Quality**: AI-powered extraction is more accurate than keyword matching
3. **Cleaner Code**: Removed ~80 lines of redundant code
4. **Async Learning**: Preferences are learned in background, zero performance impact

## What Remains

The orchestrator now focuses on its core responsibilities:
- Tool selection and routing
- Context packet preparation
- Workflow execution
- Memory bank updates (minus preference extraction)

Preference learning is now entirely handled by the contextBuilder and preferenceExtractor services.