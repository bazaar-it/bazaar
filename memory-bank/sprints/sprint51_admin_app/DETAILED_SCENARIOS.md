# Admin Separation: Detailed Scenarios & Edge Cases

## Real-World Scenarios

### Scenario 1: CEO Wants to Add Email Marketing

**Current Situation:**
```typescript
// CEO: "I want to add email campaigns"
// Problem: Has to modify main codebase
// Risk: Could break video generation
```

**With UI-Only Separation:**
```typescript
// CEO creates in admin app:
// admin-app/src/app/email-campaigns/page.tsx ✅
// admin-app/src/app/api/send-email/route.ts ✅

// But needs you for:
// Accessing user database ❌
// Complex email queuing ❌
```

**With Full Monorepo:**
```typescript
// CEO can do everything:
// apps/admin/src/features/email/* ✅
// packages/database/schema/campaigns.ts ✅
// Full independence ✅
```

### Scenario 2: Emergency Bug Fix at 2 AM

**Current Situation:**
```bash
# You need to fix critical bug
# But CEO pushed admin changes
# Git conflicts everywhere!
# Users can't generate videos!
```

**With Separation:**
```bash
# You fix: apps/main/src/broken-thing.ts
# Deploy: Only bazaar.it updates
# Admin untouched, no conflicts
# Users happy, CEO sleeping
```

### Scenario 3: CEO Breaks Something

**Current (Nightmare):**
```typescript
// CEO changes: src/server/api/routers/admin.ts
// Accidentally breaks: import statement
// Result: ENTIRE SITE DOWN 🔴
```

**With UI-Only Separation:**
```typescript
// CEO changes: admin-app/src/components/Dashboard.tsx
// Breaks: Admin dashboard
// Result: Only admin.bazaar.it affected ✅
// Main site still works ✅
```

## Technical Deep Dives

### Authentication Flow - Step by Step

**Problem Visualization:**
```
Step 1: User visits bazaar.it/login
Step 2: Logs in successfully
Step 3: Cookie set: sessionToken=abc123 (domain: bazaar.it)
Step 4: User clicks "Admin Panel" → admin.bazaar.it
Step 5: Browser checks cookies for admin.bazaar.it
Step 6: No cookie found! ❌
Step 7: Redirected to login again 😤
```

**Solution Implementation:**
```typescript
// src/server/auth/config.ts (main app)
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  // ... other config
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: '.bazaar.it' // THE MAGIC DOT!
      }
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: '.bazaar.it' // HERE TOO!
      }
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        // CSRF doesn't need subdomain sharing
      }
    }
  }
};
```

**Testing the Fix:**
```bash
# Local testing with hosts file
127.0.0.1 local.bazaar.it
127.0.0.1 admin.local.bazaar.it

# Start both apps
npm run dev # main on :3000
cd admin && npm run dev # admin on :3001

# Test flow:
1. Visit http://local.bazaar.it:3000/login
2. Login successfully
3. Visit http://admin.local.bazaar.it:3001
4. Should be logged in! ✅
```

### CORS Setup - Complete Example

**Main App API Route:**
```typescript
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';

const handler = async (req: Request) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.ADMIN_URL || 'https://admin.bazaar.it',
        'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
  });

  // Add CORS headers to response
  response.headers.set('Access-Control-Allow-Origin', process.env.ADMIN_URL || 'https://admin.bazaar.it');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
};

export { handler as GET, handler as POST, handler as OPTIONS };
```

**Admin App tRPC Client:**
```typescript
// admin-app/src/lib/trpc.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../src/server/api/root'; // Type sharing issue!

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: process.env.NEXT_PUBLIC_API_URL + '/api/trpc',
      headers() {
        return {
          // Forward cookies for auth
          cookie: typeof window !== 'undefined' ? document.cookie : '',
        };
      },
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include', // Important!
        });
      },
    }),
  ],
});
```

### Type Sharing Strategies

**Problem:** Admin app needs TypeScript types from main app

**Strategy 1: Copy Types (Quick & Dirty)**
```bash
# Script to copy types
cp src/server/api/root.ts admin/src/types/api.ts
cp src/lib/types/* admin/src/types/
```

**Strategy 2: NPM Package (Better)**
```json
// packages/api-types/package.json
{
  "name": "@bazaar/api-types",
  "version": "1.0.0",
  "main": "./index.ts",
  "types": "./index.ts"
}
```

**Strategy 3: Generate Types (Best)**
```typescript
// scripts/generate-api-types.ts
import { appRouter } from '../src/server/api/root';
import { exportedSchema } from 'trpc-to-openapi';

// Generate types file
const types = exportedSchema(appRouter);
// Write to admin app
```

## Deployment Configuration Examples

### Vercel Configuration

**Main App (vercel.json):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "ADMIN_URL": "https://admin.bazaar.it"
  }
}
```

**Admin App (vercel.json):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://bazaar.it",
    "NEXT_PUBLIC_APP_URL": "https://admin.bazaar.it"
  }
}
```

### GitHub Actions

**Separate Workflows:**
```yaml
# .github/workflows/deploy-main.yml
name: Deploy Main App
on:
  push:
    branches: [main]
    paths-ignore:
      - 'admin/**'
      
# .github/workflows/deploy-admin.yml  
name: Deploy Admin App
on:
  push:
    branches: [main]
    paths:
      - 'admin/**'
```

## Cost Analysis

### Current Setup
- 1 Vercel project
- 1 Domain
- 1 Database
- **Monthly: ~$20**

### With Separation
- 2 Vercel projects ($0 if under limits)
- 1 Domain + 1 Subdomain ($0)
- 1 Database (shared)
- **Monthly: ~$20** (same!)

## Migration Checklist

### Pre-Migration
- [ ] Backup everything
- [ ] Document current auth flow
- [ ] List all admin API endpoints
- [ ] Map component dependencies
- [ ] Test subdomain locally
- [ ] Verify CORS requirements

### During Migration
- [ ] Update auth to support subdomains
- [ ] Configure CORS on main app
- [ ] Copy admin UI files
- [ ] Set up admin app structure
- [ ] Configure environment variables
- [ ] Test auth flow extensively

### Post-Migration
- [ ] Verify all admin features work
- [ ] Test CEO workflow
- [ ] Monitor for CORS errors
- [ ] Document new workflow
- [ ] Set up monitoring
- [ ] Plan future improvements

## Common Mistakes to Avoid

1. **Forgetting the dot in cookie domain**
   ```typescript
   domain: 'bazaar.it' ❌
   domain: '.bazaar.it' ✅
   ```

2. **Not handling preflight requests**
   ```typescript
   if (req.method === 'OPTIONS') { /* handle */ }
   ```

3. **Incorrect credential forwarding**
   ```typescript
   fetch(url) ❌
   fetch(url, { credentials: 'include' }) ✅
   ```

4. **Hardcoded URLs in admin app**
   ```typescript
   fetch('http://localhost:3000/api') ❌
   fetch(process.env.NEXT_PUBLIC_API_URL + '/api') ✅
   ```

5. **Not testing locally with subdomains**
   ```bash
   localhost:3000 / localhost:3001 ❌
   local.bazaar.it:3000 / admin.local.bazaar.it:3001 ✅
   ```

## When to Choose What

### Choose UI-Only Separation When:
- Need quick solution (< 1 day)
- CEO mainly needs UI changes
- Want to test the waters
- Low risk tolerance

### Choose Full Monorepo When:
- CEO needs backend independence
- Planning major admin features
- Have time for proper setup
- Want long-term solution

### Choose Branch-Based When:
- Super simple needs
- Very small team
- Temporary solution
- Minimal admin changes

The key is understanding your specific needs and constraints.