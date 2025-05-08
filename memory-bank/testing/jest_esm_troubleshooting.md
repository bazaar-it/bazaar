// /memory-bank/testing/jest_esm_troubleshooting.md
# Jest ESM Troubleshooting - Current Status

## Current Issue
We're encountering a persistent issue with Jest when testing TypeScript files in our ESM-based project:

```
SyntaxError: Cannot use import statement outside a module
/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/node_modules/zod/lib/locales/en.js:3
import _typeof from "@babel/runtime/helpers/typeof";
^^^^^^
```

## Root Cause Analysis
1. Our project is configured as an ES Module project with `"type": "module"` in package.json
2. Jest's default transformer doesn't properly handle ESM syntax in node_modules
3. The specific issue is with `zod` and related dependencies using ES module syntax
4. Current attempts to configure `transformIgnorePatterns` haven't fully resolved the issue

## Attempted Solutions

1. **Updated Jest Configuration**:
   - Set `extensionsToTreatAsEsm: ['.ts', '.tsx']`
   - Updated `transformIgnorePatterns` to include zod and other ESM dependencies
   - Configured ts-jest with `useESM: true`
   - Added proper mocking for 'openai' package

2. **Mocked Dependencies**:
   - Created explicit mocks for OpenAI instead of relying on path aliases
   - Fixed incorrect import path reference to non-existent `~/server/lib/openai/client`

## Next Steps to Resolve

1. **Update Babel Configuration**:
   - Ensure Babel is properly configured to transform ESM node_modules

2. **Try Node's Native ESM Support**:
   - Update test command to use Node's `--experimental-vm-modules` flag

3. **Fix Jest Module Transformation**:
   - Use a more specific transformation pattern for problematic node_modules
   - Consider using a babel plugin specifically for handling problematic ESM modules

4. **Consider a Jest Alternative**:
   - If Jest ESM issues persist, we might need to evaluate alternatives like Vitest which has better native ESM support

5. **Path Forward for MVP**:
   - Focus on getting component generation tests working first as they're critical for the "GallerySwipe" ad MVP
   - Consider temporarily mocking problematic dependencies more aggressively
