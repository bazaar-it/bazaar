# BAZAAR-300: Fix Component Generation Patterns

## Priority: 🔥 CRITICAL

## Summary
Fix the LLM component generation in the generate page to follow Sprint 25/26 ESM patterns. Currently, generated components use `import React` and `import ... from 'remotion'` which breaks compilation.

## Problem Statement
The generate page LLM is producing code that violates our established ESM component loading patterns:

### Current (Broken) Output:
```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } from 'remotion';

export default function TitleScene() {
  // component code
}
```

### Expected (Working) Output:
```tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function TitleScene() {
  // component code
}
```

## Root Cause
1. **LLM Prompt Issue**: `src/server/api/routers/generation.ts` lines 364-395 explicitly tells LLM to "Import necessary Remotion hooks"
2. **Template Inconsistency**: Multiple templates with different patterns across codebase
3. **No Validation**: No checks for forbidden imports before compilation

## Acceptance Criteria

### ✅ Must Have
1. All generated components use `window.Remotion` destructuring pattern
2. No generated components contain `import React` or `import ... from 'remotion'`
3. Components compile successfully in Monaco editor
4. Remotion Player renders all generated scenes without errors
5. Storyboard descriptive text is NOT hard-coded in component JSX

### ✅ Should Have
1. Validation function to check for forbidden imports
2. Consistent error handling for invalid patterns
3. Clear visual indicators when components use AI vs template code

## Technical Implementation

### 1. Fix LLM Prompt in `src/server/api/routers/generation.ts`

**Current Problematic Prompt** (lines 364-395):
```
The code should:
- Import necessary Remotion hooks (useCurrentFrame, useVideoConfig, etc.)
```

**New Prompt**:
```typescript
const messages = [
  {
    role: 'system' as const,
    content: `You are a Remotion component code generator. Generate React components for video scenes.

CRITICAL REQUIREMENTS:
1. NEVER use import statements for React or Remotion
2. ALWAYS destructure from window.Remotion: const { AbsoluteFill, useCurrentFrame } = window.Remotion;
3. Focus on VISUAL ANIMATION, not descriptive text from storyboard
4. Create engaging animations using interpolate, spring, and frame-based logic

FORBIDDEN PATTERNS:
❌ import React from 'react'
❌ import { ... } from 'remotion'
❌ Hard-coding storyboard text like "A mesmerizing journey..."

REQUIRED PATTERN:
✅ const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
✅ Focus on visual elements: shapes, colors, movement, scaling
✅ Use scene props for data, not hard-coded text

Example structure:
\`\`\`tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function SceneComponent() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Animation logic here
  const scale = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '${style.colorPalette[3]}' }}>
      {/* Visual elements only - no storyboard text */}
    </AbsoluteFill>
  );
}
\`\`\``
  }
];
```

### 2. Add Import Validation Function

**File**: `src/app/projects/[id]/generate/GenerateVideoClient.tsx`

```typescript
// Add before compileComponent function
const validateComponentCode = (code: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check for forbidden imports
  if (/import\s+React/.test(code)) {
    errors.push('Component contains forbidden "import React" statement');
  }
  
  if (/import\s+.*from\s+['"]remotion['"]/.test(code)) {
    errors.push('Component contains forbidden "import ... from \'remotion\'" statement');
  }
  
  // Check for required window.Remotion pattern
  if (!/window\.Remotion/.test(code)) {
    errors.push('Component must use window.Remotion destructuring pattern');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Update compileComponent function
const compileComponent = useCallback(async (codeToCompile: string) => {
  if (!codeToCompile.trim()) {
    setComponentError(new Error('No code to compile.'));
    return;
  }
  
  // Validate code before compilation
  const validation = validateComponentCode(codeToCompile);
  if (!validation.isValid) {
    setComponentError(new Error(`Code validation failed:\n${validation.errors.join('\n')}`));
    return;
  }
  
  // ... rest of compilation logic
}, []);
```

### 3. Update Fallback Component Generation

**File**: `src/app/projects/[id]/generate/GenerateVideoClient.tsx`

```typescript
const generatePlaceholderCode = useCallback((scene: Scene, storyboard: Storyboard | null) => {
  const sceneNameClean = scene.name?.replace(/\s+/g, '') || 'DefaultScene';
  const componentName = `${sceneNameClean}Component`;
  
  return `//src/remotion/components/scenes/${componentName}.tsx
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

interface ${componentName}Props {
  title?: string;
  backgroundColor?: string;
  textColor?: string;
}

export default function ${componentName}({ 
  title = "${scene.name || 'Scene Title'}", 
  backgroundColor = "#1a1a1a",
  textColor = "white"
}: ${componentName}Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, 30], [0, 1], { 
    extrapolateLeft: 'clamp', 
    extrapolateRight: 'clamp' 
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        color: textColor, 
        opacity, 
        padding: 20, 
        textAlign: 'center' 
      }}>
        <h1 style={{ fontSize: Math.max(20, 70 - (title.length / 2)) }}>
          {title}
        </h1>
      </div>
    </AbsoluteFill>
  );
}`;
}, []);
```

### 4. Update Agent Fallback Patterns

**Files**: 
- `src/app/projects/[id]/generate/agents/promptOrchestrator.ts`
- `src/app/projects/[id]/generate/agents/sceneAgent.ts`
- `src/app/projects/[id]/generate/agents/styleAgent.ts`

Update all fallback component generation to use window.Remotion pattern.

## Testing Strategy

### Unit Tests
1. Test `validateComponentCode` function with various input patterns
2. Test fallback component generation produces valid code
3. Test LLM prompt produces expected output format

### Integration Tests
1. Generate complete 5-scene video and verify all components compile
2. Test Remotion Player renders all scenes without errors
3. Verify no console errors during component loading

### Manual Testing
1. Submit bubble animation prompt and verify all 5 scenes compile
2. Check Monaco editor shows no red error indicators
3. Confirm Remotion Player preview works for all scenes
4. Verify generated code follows window.Remotion pattern

## Files to Modify

### Primary Changes
- `src/server/api/routers/generation.ts` - Fix LLM prompt
- `src/app/projects/[id]/generate/GenerateVideoClient.tsx` - Add validation

### Secondary Changes  
- `src/app/projects/[id]/generate/agents/promptOrchestrator.ts` - Update fallback
- `src/app/projects/[id]/generate/agents/sceneAgent.ts` - Update fallback
- `src/server/workers/componentTemplate.ts` - Standardize template

## Definition of Done
1. ✅ LLM generates components using window.Remotion pattern
2. ✅ Validation prevents compilation of invalid patterns
3. ✅ All fallback components use correct pattern
4. ✅ Generated bubble animation compiles and renders successfully
5. ✅ No import statements in any generated component code
6. ✅ Components focus on visual animation, not storyboard text

## Dependencies
- None (self-contained fix)

## Estimated Effort
- **Development**: 4-6 hours
- **Testing**: 2-3 hours
- **Total**: 6-9 hours

## Risk Assessment
- **Low Risk**: Changes are isolated to generation logic
- **High Impact**: Fixes critical user-facing compilation errors
- **Rollback Plan**: Revert LLM prompt changes if issues arise 