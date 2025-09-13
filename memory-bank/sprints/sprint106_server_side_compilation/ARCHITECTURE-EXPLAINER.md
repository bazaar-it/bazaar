# Phase 1 Explainer — Server‑Side Compilation (What, Why, How)

## TL;DR
- Scenes are compiled to JS on the server when created/edited.
- We store TSX and JS together; `js_compiled_at` confirms compilation.
- Wrapper no longer injects Remotion destructure; duplicates are gone.
- JS appends `return ComponentName;` so `new Function(js)` works reliably.

## Before vs After
Before
- 9 scattered client compilation paths; frequent “Identifier already declared” errors
- Wrapper injected `const { ... } = window.Remotion` — collided with scene code
- Templates bypassed detection → crashes when combined

After (Phase 1)
- Server compiles TSX → JS
- Scene JS preserved with top‑level `const { ... } = window.Remotion`
- Wrapper no longer injects duplicate destructure
- Function constructor can execute compiled JS via auto‑return

## Why This Works
- Linear flow: User → Chat → API → Compiler → DB → Preview/Export
- Single responsibility: Generation creates code; compiler compiles; UI renders
- No duplication: Only scene code declares Remotion imports at top‑level

## Evidence (DB Snapshot)
- Scenes: e.g., Fast Text, Fruit BG, Today 1%, New Scene – Animate
- Frames: 430, 240, 135, 90
- Each has `js_compiled_at` within ms; JS includes auto‑added return statement

## Runtime Path
1) TSX saved
2) Compiler (Sucrase) transforms TSX → JS (export stripped, return appended)
3) UI fetches scene; uses JS for execution; TSX for code editing
4) Export uses the same JS (no SSR duplication)

## How Scene Execution Actually Works

Let me show you the complete flow with real code:

### Step 1: What the LLM/Developer Writes
```javascript
// Original TSX (what you see in the editor):
export default function FruitBG() {
  const { AbsoluteFill } = window.Remotion;
  return <AbsoluteFill style={{ background: 'orange' }} />;
}
```

### Step 2: What the Compiler Produces
```javascript
// Compiled JS (stored in database):
function FruitBG() {
  const { AbsoluteFill } = window.Remotion;
  return React.createElement(AbsoluteFill, { style: { background: 'orange' } });
}
// Auto-added return
return FruitBG;
```

### Step 3: How PreviewPanelG Executes It
```javascript
// In the browser:
const sceneJS = "function FruitBG() { ... } return FruitBG;";  // From DB

// Create a function from string:
const sceneFunction = new Function(sceneJS);

// Execute the function to get the component:
const FruitBGComponent = sceneFunction();  // This returns FruitBG because of the "return FruitBG;"

// Now we can render it:
React.createElement(FruitBGComponent);  // Renders the scene!
```

### Why Not Use Modules/Import?
- **Modules need files**: `import` only works with actual files on disk
- **We have strings**: Scenes are stored as text in the database
- **Function() accepts strings**: Can execute string code dynamically
- **Security**: Function() is safer than eval() with proper sandboxing

## Common Questions
- Q: Why keep top‑level `const { ... } = window.Remotion`?
  - A: Scenes are browser‑executed via Function; Remotion is provided via window; keeping it top‑level is simplest and fastest.

- Q: Why append `return ComponentName;`?
  - A: **Here's exactly what's happening**:
    
    When developers write scenes, they use ES6 modules:
    ```javascript
    // Developer writes (TSX):
    export default function MyScene() {
      return <AbsoluteFill>Hello</AbsoluteFill>;
    }
    ```
    
    But we execute scenes using `new Function()`, which is NOT a module system:
    ```javascript
    // How we execute in browser:
    const sceneCode = "function MyScene() { ... }";  // No export!
    const func = new Function(sceneCode);
    const Component = func();  // What does func() return???
    ```
    
    **The problem**: Functions don't return anything unless you explicitly `return` something!
    
    ```javascript
    // Without return:
    new Function("function MyScene() { ... }")();  // Returns: undefined ❌
    
    // With return added by compiler:
    new Function("function MyScene() { ... }; return MyScene;")();  // Returns: MyScene component ✅
    ```
    
    **In simple terms**: `export` is for files/modules. `return` is for functions. Since we're running code as a function (not importing as a module), we need `return` not `export`.

- Q: What about SSR/Lambda?
  - A: Works because we execute in a controlled runtime. Phase 2 introduces a parameterized Function for even stronger isolation.

## What Changed in Code (Behaviorally)
- Wrapper: removed injection of `const { ... } = window.Remotion`
- Preview panels: prefer server‑compiled JS over client compilation
- Templates: treated the same as generated scenes and compiled server‑side

## Next (Phase 2 Overview)
- Add `compilation_version`, `compile_meta` (timings/tool)
- Parameterized Function execution (no global window dependency)
- Background backfill + metrics

