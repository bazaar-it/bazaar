# Fix: Vercel Production Remotion CLI Error

## Problem
The Lambda rendering service was failing in Vercel production with the error:
```
/bin/sh: 1: npx: not found
```

This occurred because the `lambda-cli.service.ts` was trying to use `npx remotion` commands, but `npx` is not available in Vercel's production environment.

## Solution
Updated the `lambda-cli.service.ts` to use the installed Remotion CLI directly via Node.js instead of npx:

1. **Render command** (line 126):
   - Before: `remotionPath, 'lambda', 'render',`
   - After: `'node', remotionPath, 'lambda', 'render',`

2. **Progress command** (lines 267-273):
   - Before: `'npx', 'remotion', 'lambda', 'progress',`
   - After: `'node', remotionPath, 'lambda', 'progress',`

## Technical Details
- The Remotion CLI is already installed as a dependency (`@remotion/cli`: `^4.0.320`)
- The CLI binary is available at `node_modules/.bin/remotion`
- By using `node` to execute this binary directly, we avoid the need for `npx`
- This approach works in all environments (local development and production)

## Files Modified
- `/src/server/services/render/lambda-cli.service.ts`

## Testing
The fix should be tested by:
1. Running a video export in the production environment
2. Verifying the render starts successfully without the "npx not found" error
3. Checking that progress tracking works correctly

## Related Issues
This was part of Sprint 73 (Silent Progressive Auto-Fix) and addresses the production deployment issue with Remotion Lambda rendering.