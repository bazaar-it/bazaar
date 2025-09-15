# Sprint 106: Implementation Plan (PreviewPanelG Focus)

## The REAL Priority: PreviewPanelG

ShareVideoPlayerClient is not the focus. **PreviewPanelG** in the project generation page is where users spend 99% of their time.

## Current PreviewPanelG Problems

1. **Compiles every scene on every render** (100-200ms per scene)
2. **Duplicate identifier crashes** (even with ErrorBoundary)
3. **State sync issues** (JS not updating after edits)
4. **Memory leaks** (creating new blobs repeatedly)

## Week 1: Fix PreviewPanelG

### Day 1-2: Permissive Server Compilation

```typescript
// compile-scene.ts - Make it permissive
export async function compileSceneToJS(
  tsxCode: string,
  sceneId?: string
): Promise<CompilationResult> {
  let jsCode: string | null = null;
  let error: string | null = null;
  
  try {
    // Step 1: Light cleanup (don't reject)
    let code = tsxCode;
    
    // Remove exports (always safe)
    code = code.replace(/export\s+default\s+/g, '');
    
    // Step 2: Add namespace to prevent conflicts
    if (sceneId) {
      const suffix = `_${sceneId.slice(0, 8)}`;
      // Namespace component declarations
      code = code.replace(
        /const\s+([A-Z][a-zA-Z0-9]*)\s*=/g,
        `const $1${suffix} =`
      );
    }
    
    // Step 3: Compile
    jsCode = transform(code, {
      transforms: ['typescript', 'jsx'],
      production: true
    });
    
  } catch (e) {
    error = e.message;
    // DON'T THROW - let client handle
  }
  
  return {
    success: !!jsCode,
    jsCode,
    error,
    compiledAt: new Date()
  };
}
```

### Day 2-3: Fix PreviewPanelG to Use Pre-compiled JS

```typescript
// PreviewPanelG.tsx - Trust pre-compiled JS
const compileSceneDirectly = useCallback(async (scene: any, index: number) => {
  // PRIORITY: Use pre-compiled JS if available
  const sceneCode = scene.tsxCode || scene.data?.code;
  const preCompiledJS = scene.jsCode || scene.data?.jsCode;
  
  if (preCompiledJS) {
    console.log(`✅ Using pre-compiled JS for scene ${index}`);
    
    // No compilation needed - just use it!
    return {
      isValid: true,
      compiledCode: preCompiledJS,
      componentName: `Scene${index}Component`
    };
  }
  
  // Only compile client-side as last resort
  if (!sceneCode) {
    return createFallbackScene(sceneName, index, 'No code', sceneId);
  }
  
  console.log(`⚠️ Compiling client-side for scene ${index} (no pre-compiled JS)`);
  // ... existing client compilation ...
}, []);
```

### Day 3-4: Fix State Synchronization

```typescript
// PreviewPanelG.tsx - Fix fingerprint to detect JS changes
const scenesFingerprint = useMemo(() => {
  return scenes.map((s, idx) => {
    // Check ALL code locations
    const tsxCode = s.tsxCode || s.data?.code || '';
    const jsCode = s.jsCode || s.data?.jsCode || '';
    
    // Include BOTH in fingerprint
    const codeHash = `${tsxCode.length}_${jsCode.length}`;
    
    return `${idx}-${s.id}-${codeHash}`;
  }).join('|');
}, [scenes]);
```

### Day 4-5: Update Generation Flow

```typescript
// helpers.ts - Always store, never block
export async function storeGeneratedScene(
  sceneData: SceneData,
  projectId: string
): Promise<StoreResult> {
  
  // Compile permissively (with namespace)
  const compilation = await compileSceneToJS(
    sceneData.tsxCode,
    sceneData.id  // Pass ID for namespacing
  );
  
  // ALWAYS STORE (even if compilation failed)
  const stored = await db.insert(scenes).values({
    id: sceneData.id,
    projectId,
    tsxCode: sceneData.tsxCode,
    jsCode: compilation.jsCode,  // Might be null - that's OK!
    jsCompiledAt: compilation.success ? new Date() : null,
    compilationError: compilation.error,
    // ... other fields
  });
  
  // Never regenerate, never block
  return { 
    success: true, 
    sceneId: stored.id,
    hasPrecompiledJS: !!compilation.jsCode
  };
}
```

## Week 2: Multi-Scene Optimization

### Combine Scenes at Compilation

```typescript
// New: Compile multiple scenes together to catch conflicts
async function compileProjectScenes(scenes: Scene[]): Promise<CompiledProject> {
  const compiledScenes = [];
  
  for (const scene of scenes) {
    // Each scene gets its namespace
    const compiled = await compileSceneToJS(scene.tsxCode, scene.id);
    compiledScenes.push({
      ...scene,
      jsCode: compiled.jsCode
    });
  }
  
  // Test combination (but don't block on failure)
  try {
    const combined = combineScenes(compiledScenes);
    return { scenes: compiledScenes, combinedJS: combined };
  } catch {
    // Individual scenes are fine, combination failed
    return { scenes: compiledScenes, combinedJS: null };
  }
}
```

## Testing Focus Areas

### Test 1: Generation → Preview Flow
```
User types prompt → 
AI generates (35s) → 
Store with compilation → 
PreviewPanelG uses pre-compiled JS →
No client compilation needed
```

### Test 2: Edit → Update Flow  
```
User edits in CodePanelG →
Recompile on save →
Update jsCode in DB →
PreviewPanelG detects change →
Re-renders with new JS
```

### Test 3: Multi-Scene Projects
```
5 scenes with duplicate component names →
Each auto-namespaced →
No conflicts →
Preview shows all 5 scenes
```

## What We're NOT Focusing On

- ❌ ShareVideoPlayerClient (not priority)
- ❌ Admin panels (low impact)
- ❌ Template compilation (already works)
- ❌ Export flow (separate sprint)

## Success Metrics for PreviewPanelG

### Performance
- **Current**: 100-200ms compilation per scene per frame
- **Target**: 0ms (using pre-compiled JS)
- **Acceptable**: <10ms (namespace check only)

### Reliability
- **Current**: Duplicate identifiers crash scenes
- **Target**: Auto-namespaced, no conflicts
- **Measure**: 0 "React #130" errors

### User Experience
- **Current**: Laggy, compilation stutters
- **Target**: Smooth 60fps preview
- **Measure**: No dropped frames

## The Key Changes

1. **Server compiles permissively** (never blocks)
2. **Always stores** (even if compilation fails)
3. **PreviewPanelG trusts pre-compiled JS** (no re-compilation)
4. **Auto-namespacing prevents conflicts** (no duplicates)
5. **Fingerprint includes jsCode** (detects updates)

## Implementation Order

1. ✅ Database schema (DONE)
2. 🔄 Permissive compilation (THIS WEEK)
3. 🔄 PreviewPanelG optimization (THIS WEEK)
4. 🔄 Generation flow update (THIS WEEK)
5. ⏳ Remove auto-fix (NEXT WEEK)
6. ⏳ Other panels (FUTURE)

## The Bottom Line

**Focus on PreviewPanelG** - this is where users spend their time. Make it fast, reliable, and smooth. Everything else is secondary.