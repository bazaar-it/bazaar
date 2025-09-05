# Current Issue: We Compile But Don't Validate

## What's Already Working ✅
1. **Server-side compilation exists** - `compileSceneToJS()` in helpers.ts
2. **Both TSX and JS are stored** - Database has js_code column
3. **PreviewPanelG can use pre-compiled JS** - Partially implemented

## The CRITICAL Problem 🔴

### We compile but don't validate:
```typescript
// Current code in helpers.ts
const compiledData = prepareSceneDataWithCompilation(tsxCode);
const [newScene] = await db.insert(scenes).values({
  ...compiledData,  // THIS INCLUDES jsCode: null IF COMPILATION FAILED!
});
```

### What happens:
1. LLM generates bad TSX code
2. `compileSceneToJS()` fails and returns `{ success: false, error: "...", jsCode: null }`
3. **WE STILL SAVE IT** with jsCode: null
4. PreviewPanelG gets null JS code
5. Falls back to client compilation
6. Client compilation also fails
7. **Scene shows error UI (but video keeps playing due to error boundaries)**

**UPDATE: Scene isolation EXISTS, so video doesn't crash! But we still compile bad code twice (server + client).**

## The Fix We Need:

### Option 1: Reject bad code entirely
```typescript
const compilationResult = compileSceneToJS(tsxCode);
if (!compilationResult.success) {
  // DON'T SAVE - Tell LLM to try again
  throw new Error(`Generated code won't compile: ${compilationResult.error}`);
}
```

### Option 2: Save but mark as broken
```typescript
const compilationResult = compileSceneToJS(tsxCode);
const [newScene] = await db.insert(scenes).values({
  tsxCode,
  jsCode: compilationResult.jsCode,
  compilationError: compilationResult.error,
  status: compilationResult.success ? 'ready' : 'broken'
});
// Preview checks status before rendering
```

### Option 3: Auto-fix during compilation
```typescript
const compilationResult = compileSceneToJS(tsxCode);
if (!compilationResult.success) {
  // Try to fix common issues
  const fixed = await autoFixCompilationErrors(tsxCode, compilationResult.error);
  const retryResult = compileSceneToJS(fixed);
  // Use fixed version if it works
}
```

## Scene Isolation Already EXISTS! ✅

We already have error boundaries for each scene:

```javascript
// PreviewPanelG already wraps EVERY scene in error boundary!
const errorBoundaryWrapper = `
var ${sceneNamespaceName}ErrorBoundary = class extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Scene ${index} runtime error caught by boundary:', error);
    // Dispatches error event for auto-fix
  }
  render() {
    if (this.state.hasError) {
      // Shows error UI instead of crashing
      return ErrorDisplay();
    }
    return this.props.children;
  }
}`;

// Each scene wrapped:
React.createElement(${sceneNamespaceName}WithErrorBoundary, {})
```

**So scene isolation is WORKING! One bad scene shows error UI, others keep playing.**

## Priority Actions:

1. **Add validation** in helpers.ts - Don't save broken code OR mark as broken
2. ~~**Add error boundaries**~~ - ✅ ALREADY DONE! Each scene has error boundary
3. **Remove fallback compilation** - If no JS, show error, don't compile client-side (waste of CPU)
4. **Add retry logic** - Let LLM fix compilation errors before saving

## Success Metric:
**"LLM can generate 100 scenes and preview never goes blank"**

Not about speed. About reliability.