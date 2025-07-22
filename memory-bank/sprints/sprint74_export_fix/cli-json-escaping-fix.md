# Sprint 74: Lambda Export CLI JSON Escaping Fix

## Problem
Video export was failing with shell parsing errors when using the CLI approach for Lambda rendering. The error messages showed:
```
/bin/sh: command substitution: line 0: syntax error near unexpected token `-50%,'
/bin/sh: command substitution: line 0: `translate(-50%, -50%) scale(${logoScale})'
You passed --props but it was neither valid JSON nor a file path to a valid JSON file.
```

## Root Cause
The issue was caused by passing the entire scene object (including `tsxCode`) as JSON props via command line arguments. The shell was interpreting template literal backticks in the code as command substitution, causing parsing errors.

## Solution Implemented

### 1. Minimal Props Approach
Instead of passing the entire scene object, we now only pass minimal required data:
```typescript
const inputProps = {
  scenes: scenes.map(scene => ({
    id: scene.id,
    name: scene.name,
    duration: scene.duration,
    jsCode: scene.jsCode || scene.compiledCode, // Only pre-compiled code
    // Don't include tsxCode as it has problematic characters for CLI
  })),
  projectId,
  width,
  height,
};
```

### 2. File-Based Props
To avoid shell escaping issues entirely, props are now written to a temporary file:
```typescript
const propsFile = path.join(os.tmpdir(), `remotion-props-${projectId}-${Date.now()}.json`);
fs.writeFileSync(propsFile, JSON.stringify(inputProps));

// CLI uses file path instead of inline JSON
'--props', propsFile,
```

### 3. Cleanup
The temporary props file is cleaned up after use to avoid cluttering the temp directory.

## Results
- Export now completes successfully in ~20 seconds
- No more shell parsing errors
- Clean logs showing the entire process:
  - Props written to temp file
  - Lambda render started
  - Progress tracked
  - Download URL provided
  - Temp file cleaned up

## Key Learnings
1. **Avoid passing complex JSON via CLI arguments** - Use files for complex data
2. **Be mindful of shell special characters** - Backticks, $, quotes can cause issues
3. **Only pass necessary data** - Pre-compiled code is sufficient for Lambda
4. **Always cleanup temp files** - Prevent disk space issues

## Implementation Details
Modified files:
- `/src/server/services/render/lambda-cli.service.ts` - Main fix implementation

The fix ensures robust video export functionality that handles complex scene code without shell interpretation issues.