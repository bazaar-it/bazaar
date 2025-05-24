# Current State Analysis: Generate Page Implementation

## Executive Summary

The generate page (`src/app/projects/[id]/generate/`) is functional but has **critical issues** with component code generation that violate the lessons learned in Sprint 25 and 26. The main problem is that the LLM is generating code with `import React` and `import ... from 'remotion'` statements, which breaks the ESM component loading pattern we established.

## Current Architecture Overview

### ✅ What's Working Well

1. **Storyboard JSON as Single Source of Truth**: The system correctly uses a unified storyboard JSON structure
2. **Progressive Enhancement**: Fallback → AI enhancement flow works
3. **tRPC Integration**: Server-side LLM calls are properly implemented
4. **Monaco Editor**: Code editing interface is functional
5. **Remotion Player**: Preview system works when code compiles

### ❌ Critical Issues

#### 1. **Component Code Generation Violates ESM Patterns**

**Problem**: The LLM in `src/server/api/routers/generation.ts` is generating code like:

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } from 'remotion';

export default function TitleScene() {
  // component code
}
```

**Why This Breaks**: According to Sprint 25/26 lessons, we should **never** import React or Remotion in generated components. The correct pattern is:

```tsx
const { AbsoluteFill, useCurrentFrame } = window.Remotion;

export default function TitleScene() {
  // component code
}
```

#### 2. **Multiple Component Templates with Different Patterns**

**Current State**: We have multiple templates:
- `src/server/workers/componentTemplate.ts` - Uses `import React from 'react'` ❌
- `src/scripts/debug/debug-component-template.tsx` - Uses `window.React` ✅
- Generated code from LLM - Uses imports ❌

**Problem**: Inconsistent patterns across the codebase

#### 3. **LLM Prompt Doesn't Follow Sprint 26 Guidelines**

**Current Prompt** (lines 364-395 in `generation.ts`):
```
The code should:
- Import necessary Remotion hooks (useCurrentFrame, useVideoConfig, etc.)
- Use the provided style colors and typography
- Animate elements based on the current frame
- Be a default export
```

**Problem**: This explicitly tells the LLM to use imports, which is wrong.

#### 4. **Storyboard Text Leaking into Components**

**Issue**: Generated components include storyboard text like "A mesmerizing journey of expansion and explosion" directly in the JSX, rather than focusing on visual animation.

## Detailed Code Analysis

### Current LLM Component Generation Flow

1. **User submits prompt** → "create a 8 seconds dramatic animation - a see thru glass bubble, slowly expanding, and then exploding, and the logo 'bazaar' appear"

2. **Scene Planning** → Creates 5 scenes with descriptive text in props

3. **Component Generation** → LLM generates code with:
   - ❌ `import React from 'react'`
   - ❌ `import { ... } from 'remotion'`
   - ❌ Hard-coded storyboard text in JSX
   - ❌ Inconsistent patterns across scenes

4. **Compilation** → Fails with "Failed to resolve module specifier 'remotion'"

### Working Pattern Example

From user's example, this code **works**:

```tsx
const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

export default function TitleScene() {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 75, 150], [0.5, 1.5, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#fff', justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,87,51,0.5)',
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
}
```

## Root Cause Analysis

### 1. **LLM Prompt Design**
- Current prompt explicitly instructs LLM to use imports
- No guidance about window.Remotion pattern
- No restrictions on storyboard text inclusion

### 2. **Template Inconsistency**
- Multiple templates with different patterns
- No single canonical template being used

### 3. **Missing Validation**
- No checks for forbidden imports before compilation
- No enforcement of Sprint 26 patterns

## Impact Assessment

### User Experience Impact
- **High**: Components fail to compile, showing error banners
- **High**: Inconsistent behavior across scenes
- **Medium**: Storyboard text clutters visual output

### Development Impact
- **High**: Violates established architecture patterns
- **Medium**: Makes debugging difficult due to inconsistent patterns
- **Low**: Requires manual code fixes for each generation

## Compliance with Sprint 25/26 Lessons

| Sprint 25/26 Requirement | Current Status | Compliance |
|---------------------------|----------------|------------|
| Single React/Remotion instance | ❌ Multiple instances via imports | **FAIL** |
| Window globals pattern | ❌ Not used in generation | **FAIL** |
| No bare imports | ❌ LLM generates imports | **FAIL** |
| ESM compilation ready | ❌ Code doesn't compile | **FAIL** |
| Source map preservation | ❌ Can't compile to test | **FAIL** |

## Next Steps Required

### Immediate Fixes (Sprint 26)
1. **Fix LLM Prompt** - Update generation.ts to use window.Remotion pattern
2. **Standardize Template** - Create single canonical template
3. **Add Validation** - Check for forbidden imports before compilation
4. **Update Fallback Code** - Ensure fallback components use correct pattern

### Medium Term (Future Sprints)
1. **Implement esbuild Pipeline** - Move to production-ready build system
2. **Add Component Library** - Pre-built templates for common patterns
3. **Enhanced Validation** - Comprehensive code quality checks

## Files Requiring Changes

### High Priority
- `src/server/api/routers/generation.ts` - Fix LLM prompt
- `src/server/workers/componentTemplate.ts` - Standardize template
- `src/app/projects/[id]/generate/GenerateVideoClient.tsx` - Add validation

### Medium Priority
- `src/app/projects/[id]/generate/agents/` - Update fallback patterns
- Component verification scripts - Update test patterns

## Success Criteria

### Definition of Done
1. ✅ All generated components use `window.Remotion` pattern
2. ✅ No components contain `import React` or `import ... from 'remotion'`
3. ✅ Components compile successfully in Monaco editor
4. ✅ Remotion Player renders components without errors
5. ✅ Storyboard text is not hard-coded in component JSX
6. ✅ Consistent patterns across all generation paths

### Validation Tests
1. Generate 5-scene video and verify all components compile
2. Check generated code contains no forbidden imports
3. Verify Remotion Player renders all scenes
4. Confirm animations work as expected 