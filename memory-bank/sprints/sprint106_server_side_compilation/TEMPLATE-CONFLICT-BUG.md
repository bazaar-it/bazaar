# Template Conflict Bug - Critical Discovery

## The Problem

When a user adds the same template twice to a project, it causes a **duplicate identifier crash** in PreviewPanelG:

```
Uncaught SyntaxError: Identifier 'Square' has already been declared
```

## Why This Happens

### Current Template Flow

1. User clicks "Add Template" (e.g., "audio-animation")
2. `template-operations.ts` checks if template has pre-compiled JS
3. **BUG**: If pre-compiled JS exists, it **bypasses conflict detection entirely**

```typescript
// src/server/api/routers/generation/template-operations.ts (lines 66-82)
const preCompiledJS = getCompiledTemplate(templateId);
const compilationResult = preCompiledJS 
  ? { 
      success: true,
      jsCode: preCompiledJS,  // <-- USES PRE-COMPILED JS DIRECTLY
      // No conflict detection runs!
    }
  : await sceneCompiler.compileScene(...) // <-- Only runs if no pre-compiled
```

### The Fatal Flaw

Templates **ALWAYS** have pre-compiled JS (from `compiled-templates.ts`), so they **NEVER** go through conflict detection.

## Real Example

User adds "audio-animation" template twice:

**Template Instance 1:**
```javascript
// Gets pre-compiled JS with these components:
const Square = () => { ... }
const Soundwaves = () => { ... }
const Counter = () => { ... }
```

**Template Instance 2:**
```javascript
// Gets EXACT SAME pre-compiled JS:
const Square = () => { ... }  // DUPLICATE!
const Soundwaves = () => { ... }  // DUPLICATE!
const Counter = () => { ... }  // DUPLICATE!
```

**Result:** When PreviewPanelG combines them → 💥 CRASH

## Production Impact

Looking at our production data:

### Project: `20b65e69-c032-4b9a-ac7f-fae2ca73a0bb`
- Has **5 identical "Mobile App" templates**
- Each has: `GradientCircle`, `PhoneFrame`, `ProfileCard`, `WorkerCard`, `ServiceCard`, `SectionTitle`
- **This project would crash without our fix**

### Project: `81103426-b1cf-4253-af00-6a9135e0df50`
- Has **multiple "Audio Animation" templates**
- Has **multiple "Mobile App" templates**
- **This project would crash without our fix**

## The Solution

Templates must **ALWAYS** go through `sceneCompiler.compileScene()` for conflict detection:

```typescript
// REMOVE the pre-compiled JS shortcut
// ALWAYS run through compiler for conflict detection
const compilationResult = await sceneCompiler.compileScene(templateCode, {
  projectId,
  sceneId: newSceneId,
  existingScenes: existingScenes.map(s => ({ 
    id: s.id, 
    tsxCode: s.tsxCode, 
    name: s.name 
  }))
});
```

### What This Does

1. **First template added**: Components remain unchanged
   - `Square`, `Soundwaves`, `Counter`

2. **Second template added**: Components get auto-renamed
   - `Square_f5b2d141`, `Soundwaves_f5b2d141`, `Counter_f5b2d141`

3. **Result**: No conflicts, no crashes ✅

## Performance Considerations

- **Current**: 0ms (uses pre-compiled JS)
- **With fix**: ~10-50ms (runs conflict detection)
- **Worth it?**: YES - prevents crashes

The slight performance hit is negligible compared to:
- 35 seconds for AI generation
- User frustration from crashes
- Support tickets from broken projects

## Implementation Priority

**CRITICAL** - This affects any user who:
1. Uses templates (most users)
2. Adds the same template twice (common)
3. Has projects with duplicate templates (already in production)

## Testing Checklist

- [ ] Add same template twice → no crash
- [ ] Add different templates → no conflicts
- [ ] Add template + AI scene with same components → auto-rename works
- [ ] Performance remains acceptable (<100ms)
- [ ] Existing projects with duplicate templates render correctly

## Related Files

- `/src/server/api/routers/generation/template-operations.ts` - Needs fix
- `/src/server/services/compilation/scene-compiler.service.ts` - Already handles conflicts
- `/src/templates/compiled-templates.ts` - Pre-compiled JS source
- `/memory-bank/sprints/sprint106_server_side_compilation/CONFLICT-DETECTION-ANALYSIS.md` - Validation data