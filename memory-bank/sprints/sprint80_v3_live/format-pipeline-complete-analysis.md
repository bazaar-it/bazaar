# Complete Format Pipeline Analysis

## Overview
After tracing the entire generation pipeline, I've identified exactly where format information flows and where it's missing.

## Format Flow Status

### ✅ WHERE FORMAT WORKS:

1. **Project Storage**
   - Stored in: `project.props.meta.format` (landscape/portrait/square)
   - Also stores: width and height values

2. **Generation Helpers** (`/src/server/api/routers/generation/helpers.ts`)
   - Lines 28-38: Correctly extracts format from project
   - Passes to ALL tools as `projectFormat` object

3. **All Generation Tools**
   - `addTool`: ✅ Receives projectFormat
   - `editTool`: ✅ Receives formatContext 
   - `typographyTool`: ✅ Receives projectFormat
   - `imageRecreatorTool`: ✅ Receives projectFormat
   - `trimTool`: ✅ Has access via project lookup

4. **Code Generation Prompts** (AFTER OUR FIXES)
   - `CODE_GENERATOR`: ✅ Uses {{WIDTH}}, {{HEIGHT}}, {{FORMAT}} placeholders
   - `TYPOGRAPHY_GENERATOR`: ✅ Uses format placeholders
   - `IMAGE_RECREATOR`: ✅ Uses format placeholders
   - `CODE_EDITOR`: ✅ Preserves original format (no placeholders needed)

5. **Prompt Enhancement** (AFTER OUR FIX)
   - `ChatPanelG`: ✅ Now passes videoFormat to enhance prompt
   - `enhancePrompt`: ✅ Accepts videoFormat and adjusts suggestions

### ❌ WHERE FORMAT IS MISSING:

1. **Brain Orchestrator**
   - `OrchestrationInput` type: ❌ No format field
   - `scene-operations.ts`: ❌ Doesn't pass format to orchestrator
   - Impact: Brain can't make format-aware decisions

2. **Brain Orchestrator Prompt**
   - No awareness of current project format
   - Can't suggest portrait-specific layouts
   - Can't optimize tool selection based on format

## The Critical Gap

The Brain Orchestrator is making decisions without knowing the video format! This means:
- It might suggest horizontal layouts for portrait videos
- It can't optimize prompts for mobile vs desktop
- Tool selection isn't format-aware

## How Format Gets to Tools (Current Flow)

```
User Prompt → Brain Orchestrator (NO FORMAT) → Tool Decision
                                                      ↓
                                            executeToolFromDecision
                                                      ↓
                                            Extracts Format from DB
                                                      ↓
                                            Passes to Tool (HAS FORMAT)
```

## Ideal Flow

```
User Prompt → Brain Orchestrator (WITH FORMAT) → Format-Aware Decision
                                                          ↓
                                                   Tool + Format Context
```

## Recommended Fixes

### 1. Update OrchestrationInput Type
```typescript
export interface OrchestrationInput {
  // ... existing fields ...
  projectFormat?: {
    format: 'landscape' | 'portrait' | 'square';
    width: number;
    height: number;
  };
}
```

### 2. Pass Format to Orchestrator
In `scene-operations.ts`, before calling orchestrator:
```typescript
// Get project format
const project = await db.query.projects.findFirst({
  where: eq(projects.id, projectId),
  columns: { props: true }
});

const projectFormat = {
  format: project?.props?.meta?.format || 'landscape',
  width: project?.props?.meta?.width || 1920,
  height: project?.props?.meta?.height || 1080
};

// Pass to orchestrator
const orchestratorResponse = await orchestrator.processUserInput({
  // ... existing fields ...
  projectFormat, // ADD THIS
});
```

### 3. Update Brain Orchestrator Prompt
Add format awareness to the brain prompt so it can:
- Suggest vertical layouts for portrait
- Recommend mobile-optimized animations
- Choose appropriate tools based on format

## Summary

The good news: Format flows correctly from tools to code generation.
The gap: Brain Orchestrator doesn't know the format when making decisions.

With the fixes above, the entire pipeline would be format-aware from start to finish.