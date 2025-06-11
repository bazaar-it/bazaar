# Vercel Deployment OpenAI Shim Fix

## Problem
Vercel deployment was failing with error:
```
Error: you must `import 'openai/shims/node'` before importing anything else from openai
```

## Root Cause
OpenAI SDK v4+ requires importing Node.js shims before any other OpenAI imports when running in Node.js environments. This is enforced at the module level.

## Solution
Added `import "openai/shims/node";` at the top of all files that import from OpenAI:

1. **src/server/lib/openai.ts** - Main OpenAI client
2. **src/server/api/routers/voice.ts** - Uses `toFile` from 'openai/uploads'
3. **src/config/models.config.ts** - Had dynamic require() that doesn't work in Next.js builds

## Files Modified
- `/src/server/lib/openai.ts` - Added shim import before OpenAI import
- `/src/server/api/routers/voice.ts` - Added shim import at top
- `/src/config/models.config.ts` - Replaced dynamic require with static import

## Verification
The shim import must be the first OpenAI-related import in each file. Order matters:
```typescript
import "openai/shims/node";  // MUST BE FIRST
import OpenAI from "openai";  // Then other OpenAI imports
```

## Next Steps
- Commit and push these changes
- Redeploy to Vercel to verify fix