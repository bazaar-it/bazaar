# Variable Name Collision Analysis

## The Problem

When multiple scenes are combined into a single composition, they share the same JavaScript scope. This causes "Identifier already declared" errors when scenes use the same variable names.

### Example:
```javascript
// Scene 1
let accumulatedFrames = 0;  // Declares accumulatedFrames

// Scene 2  
let accumulatedFrames = 0;  // ERROR: Identifier 'accumulatedFrames' has already been declared
```

## Current State

### What's Breaking:
- Both scenes use `let accumulatedFrames = 0;` at the global scope
- Both scenes use `let sequences_H7K9M2P3 = [];` (though with different IDs)
- The script arrays are properly suffixed (script_mddbr9xt, script_H7K9M2P3)

### Why Auto-Fix Might Not Trigger:
1. The error is happening during multi-scene compilation, not individual scene compilation
2. The PreviewPanelG is dispatching the error event correctly
3. The auto-fix system should be catching it, but may be rate-limited or in cooldown

## Solutions Implemented

### 1. Updated Code Generation Prompts
All three prompts now include explicit instructions:
- CODE_GENERATOR: Added rule #6 about global variable suffixes
- TYPOGRAPHY_GENERATOR: Added critical variable naming rules
- IMAGE_RECREATOR: Added same rules

### 2. Key Instructions Added:
```
ALL variables declared outside the component function MUST have the scene ID as a suffix:
- let accumulatedFrames_ABC123 = 0; (NOT let accumulatedFrames = 0;)
- let currentIndex_ABC123 = 0; (NOT let currentIndex = 0;)
```

## Immediate Workarounds

### Option 1: Manual Fix
Edit the generated code to add suffixes:
```javascript
// Change this:
let accumulatedFrames = 0;

// To this:
let accumulatedFrames_H7K9M2P3 = 0;
```

### Option 2: Force Auto-Fix
1. Delete one of the scenes
2. Regenerate it (should now follow new naming rules)

### Option 3: Edit Tool
Use the edit tool with: "Fix the 'accumulatedFrames already declared' error by renaming the variable to accumulatedFrames_[SCENEID]"

## Long-term Solution

The prompt updates should ensure all future generated code uses unique variable names. However, existing scenes will need to be fixed manually or regenerated.

## Testing Needed

1. Generate a new scene after these prompt updates
2. Verify it uses suffixed variable names
3. Check that multi-scene compilation works without conflicts