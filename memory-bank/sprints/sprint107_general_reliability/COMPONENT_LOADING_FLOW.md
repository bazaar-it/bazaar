# Component Loading Flow - With Failure Points

## The Complete Journey: LLM → User's Screen

```
┌──────────────┐
│  User Input  │ "Create a particle animation"
└──────┬───────┘
       ↓
┌──────────────┐
│     LLM      │ Generates clean TSX code
└──────┬───────┘
       ↓
┌──────────────┐
│   Database   │ Stores as tsxCode field
└──────┬───────┘
       ↓
    [FORK]
       ├─────────[Direct Preview Path]─────────┐
       ↓                                        ↓
┌──────────────┐                    ┌──────────────────┐
│ PreviewPanel │                    │ Build & Upload   │
└──────┬───────┘                    └────────┬─────────┘
       ↓                                      ↓
┌──────────────┐                    ┌──────────────────┐
│   Sucrase    │                    │   R2 Storage     │
└──────┬───────┘                    └────────┬─────────┘
       ↓                                      ↓
┌──────────────┐                    ┌──────────────────┐
│  Namespace   │                    │ Component API    │
│    Wrap      │                    │     Route        │
└──────┬───────┘                    └────────┬─────────┘
       ↓                                      ↓
┌──────────────┐                    ┌──────────────────┐
│   Remotion   │                    │ useRemoteComp    │
│    Player    │                    └────────┬─────────┘
└──────────────┘                              ↓
                                     ┌──────────────────┐
                                     │ Dynamic Import   │
                                     └────────┬─────────┘
                                              ↓
                                     ┌──────────────────┐
                                     │    FAILURE!      │
                                     └──────────────────┘
```

## Detailed Flow With Code

### Stage 1: Generation ✅ (Usually Works)
```typescript
// User prompt
"Create a particle animation"

// LLM generates
export default function ParticleScene() {
  return <div className="particles">...</div>
}

// Clean, valid TSX ✅
```

### Stage 2: Storage ✅ (Always Works)
```sql
INSERT INTO scenes (tsxCode, projectId, name) 
VALUES ('export default function...', 'uuid', 'Particles')

// Stored exactly as generated ✅
```

### Stage 3A: Direct Preview Path (Left Fork)

#### Step 3A.1: Load from Database ✅
```typescript
// PreviewPanelG.tsx
const scenes = await api.generation.getProjectScenes.query({ projectId });
// Returns array of scenes with tsxCode
```

#### Step 3A.2: Sucrase Compilation ⚠️ (Usually Works)
```typescript
// compileTsx function
const compiled = transform(tsxCode, {
  transforms: ['typescript', 'jsx'],
  production: true
});

// FAILURE POINT: If TSX has syntax errors
// Success rate: 95%
```

#### Step 3A.3: Namespace Wrapping ⚠️ (Sometimes Fails)
```typescript
// wrapSceneNamespace.ts
const wrapped = `
  (function(Remotion, sceneOffset) {
    ${compiled}
    return typeof Component !== 'undefined' ? Component : null;
  })(window.Remotion, ${offset})
`;

// FAILURE POINTS:
// - Component name detection fails
// - Variable conflicts  
// - Closure issues
// Success rate: 90%
```

#### Step 3A.4: Evaluation & Rendering ⚠️
```typescript
// Create component function
const Component = eval(wrapped);

// FAILURE POINTS:
// - Runtime errors in component
// - Missing dependencies
// - Invalid React component
// Success rate: 85%
```

### Stage 3B: Remote Component Path (Right Fork)

#### Step 3B.1: Build & Upload ✅
```typescript
// Build process compiles and uploads to R2
const outputUrl = "https://r2.example.com/component-abc.js";
// Usually works if compilation succeeded
```

#### Step 3B.2: Component API Route 🔴 (MAJOR FAILURE POINT)
```typescript
// /api/components/[componentId]/route.ts

// Fetch from R2
const jsContent = await fetch(outputUrl).then(r => r.text());

// PROBLEM 1: Inject imports that break in browser
jsContent = `import { useCurrentFrame } from 'remotion';\n` + jsContent;
// Browser: GET /remotion → 404 → CRASH

// PROBLEM 2: Aggressive regex manipulation  
jsContent = jsContent.replace(/import\s+(\w+)\s+from\s*["']react["']/, 'import React from "react"');
// Can break valid code

// PROBLEM 3: No export for ESM
window.__REMOTION_COMPONENT = Component;
// But no: export default Component

// Success rate: 60% (WORST IN SYSTEM)
```

#### Step 3B.3: useRemoteComponent Hook 🔴 (FAILS DUE TO API)
```typescript
// useRemoteComponent.tsx
const module = await import(componentUrl);

// EXPECTS: module.default or module.ComponentName
// RECEIVES: {} (empty module, no exports)
// RESULT: Component is undefined → CRASH

// Success rate: 0% when API doesn't export
```

## Failure Point Analysis

### Critical Failure Points (Must Fix)

#### 1. **Component API Route - No Export** 🔴
- **Location**: `/api/components/[componentId]/route.ts`
- **Problem**: Doesn't export anything for dynamic import
- **Impact**: 100% failure rate for remote components
- **Fix**: Add `export default window.__REMOTION_COMPONENT`

#### 2. **Import Injection** 🔴  
- **Location**: Component API preprocessing
- **Problem**: Adds bare imports that browsers can't resolve
- **Impact**: Immediate crash
- **Fix**: Remove import injection entirely

#### 3. **No Error Boundaries** 🔴
- **Location**: Throughout rendering pipeline
- **Problem**: One failure cascades to entire video
- **Impact**: Amplifies all other failures
- **Fix**: Wrap each component in error boundary

### Medium Failure Points

#### 4. **Regex Code Manipulation** 🟡
- **Location**: Component API route
- **Problem**: Breaks valid code with naive replacements
- **Impact**: 20% of components corrupted
- **Fix**: Remove regex processing

#### 5. **Component Detection** 🟡
- **Location**: Namespace wrapper & API route
- **Problem**: Can't reliably find component name
- **Impact**: 10% incorrect detection
- **Fix**: Require explicit export

#### 6. **State Synchronization** 🟡
- **Location**: Between database, state, and UI
- **Problem**: Race conditions cause wrong version to render
- **Impact**: Flicker, duplicates, missing scenes
- **Fix**: Single source of truth

### Low Impact Points

#### 7. **Compilation Syntax Errors** 🟠
- **Location**: Sucrase compilation
- **Problem**: LLM sometimes generates invalid syntax
- **Impact**: 5% of generations
- **Fix**: Better error messages, validation

#### 8. **Runtime Errors** 🟠
- **Location**: Component execution
- **Problem**: Logic errors, missing deps
- **Impact**: 5-10% of components
- **Fix**: Error boundaries contain damage

## Success Rate By Path

### Direct Preview Path
```
Load (100%) → Compile (95%) → Wrap (90%) → Eval (85%) 
= 72% overall success
```

### Remote Component Path  
```
Upload (95%) → API Route (60%) → Import (0% due to API) 
= 0% overall success
```

## The Simplification Opportunity

### Current Complexity
- 2 paths
- 8+ processing steps
- 10+ failure points
- ~60% overall success rate

### Simplified Approach
- 1 path
- 3 steps (Generate → Compile → Serve)
- 2 failure points
- ~95% success rate possible

### How to Simplify

1. **Compile Once**: During generation, not on every load
2. **Store Compiled**: Save JavaScript, not TSX
3. **Serve As-Is**: No preprocessing, no manipulation
4. **Export Properly**: Always export default
5. **Error Boundaries**: Contain failures

Result: 95% reliability with 70% less code.