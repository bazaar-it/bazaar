# Monorepo Migration: Critical Pitfalls Analysis

## Overview
After analyzing the current admin implementation, here are the critical pitfalls to avoid when migrating to a monorepo structure with separate admin app.

## 🚨 Critical Pitfalls

### 1. **Authentication & Session Sharing**

**Current Setup:**
- NextAuth with JWT strategy
- Session checks `user.isAdmin` from database
- Same AUTH_SECRET for entire app

**Pitfall:**
```typescript
// This will break in separate apps!
const session = await getServerAuthSession();
if (!session?.user?.isAdmin) redirect("/");
```

**Solution:**
```typescript
// packages/auth/src/config.ts
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  // Share session across domains
  cookies: {
    domain: '.bazaar.video' // Works for admin.bazaar.video
  }
}
```

### 2. **Hardcoded API Paths**

**Current Issues:**
```typescript
// Admin testing page - WILL BREAK!
const eventSource = new EventSource('/api/admin/test-stream');
const response = await fetch('/api/admin/run-live-test');
```

**Solution:**
```typescript
// Use environment variables
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const eventSource = new EventSource(`${API_BASE}/api/admin/test-stream`);
```

### 3. **SSE (Server-Sent Events) CORS**

**Current Setup:**
- SSE endpoints assume same-origin
- No CORS headers configured

**Pitfall:**
```
admin.bazaar.video → api.bazaar.video/test-stream
❌ Blocked by CORS policy
```

**Solution:**
```typescript
// API route needs CORS headers
export async function GET(req: Request) {
  const stream = new ReadableStream({...});
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Access-Control-Allow-Origin': 'https://admin.bazaar.video',
      'Access-Control-Allow-Credentials': 'true',
    }
  });
}
```

### 4. **tRPC Client Configuration**

**Current:**
```typescript
// Assumes tRPC is on same domain
import { api } from "~/trpc/react";
const metrics = api.admin.getDashboardMetrics.useQuery();
```

**Pitfall:** Admin app won't know where tRPC backend is

**Solution:**
```typescript
// packages/trpc-client/src/admin.ts
export const adminApi = createTRPCClient({
  links: [
    httpBatchLink({
      url: process.env.NEXT_PUBLIC_TRPC_URL || 'http://localhost:3000/api/trpc',
      headers() {
        return {
          // Forward auth cookies
          cookie: document.cookie,
        };
      },
    }),
  ],
});
```

### 5. **Import Path Chaos**

**Current:**
```typescript
// These will ALL break!
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { AdminSidebar } from "~/components/AdminSidebar";
import type { RouterOutputs } from "~/trpc/shared";
```

**Solution:**
```typescript
// New import structure
import { api } from "@bazaar/trpc-client/admin";
import { Button } from "@bazaar/ui/button";
import { AdminSidebar } from "@admin/components/Sidebar";
import type { RouterOutputs } from "@bazaar/api/types";
```

### 6. **Database & Schema Access**

**Current:**
```typescript
// Admin router directly imports from main app
import { db } from "~/server/db";
import { users, projects, scenes } from "~/server/db/schema";
```

**Solution:**
```typescript
// packages/database/index.ts
export { db } from './client';
export * from './schema';

// Both apps import from shared package
import { db, users, projects } from "@bazaar/database";
```

### 7. **Shared Components Dependency**

**Current Admin Uses:**
- UI components (Button, Card, Badge, etc.)
- AdminVideoPlayer (uses Remotion)
- Chart components
- Layout components

**Pitfall:** Can't copy-paste these to admin app

**Solution:**
```
packages/
├── ui/              # All shadcn components
├── video-player/    # Remotion player wrapper
└── charts/          # Shared chart components
```

### 8. **Environment Variable Management**

**Current:** Everything in one `.env.local`

**New Structure Needed:**
```bash
# .env.shared (root level)
DATABASE_URL=postgresql://...
AUTH_SECRET=shared-secret

# apps/main/.env.local
NEXT_PUBLIC_APP_URL=https://bazaar.video

# apps/admin/.env.local  
NEXT_PUBLIC_APP_URL=https://admin.bazaar.video
NEXT_PUBLIC_API_URL=https://api.bazaar.video
```

### 9. **Build & Deploy Complexity**

**Current:** Simple `next build`

**New Complexity:**
- Need to build shared packages first
- Handle TypeScript project references
- Manage deployment dependencies

**Solution:**
```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    }
  }
}
```

### 10. **Admin-Specific API Routes**

**Current:**
```
/app/api/admin/run-live-test/route.ts
/app/api/admin/test-stream/route.ts
```

**Issue:** These need to be accessible from admin domain

**Options:**
1. Move to main app and handle CORS
2. Duplicate in admin app (maintenance nightmare)
3. Create API gateway (recommended)

## 🎯 Biggest Risks

### 1. **Session/Auth Breaking**
- **Risk**: Users can't access admin after separation
- **Prevention**: Test auth thoroughly before migration

### 2. **API Communication Failure**
- **Risk**: Admin can't reach tRPC/REST endpoints
- **Prevention**: Set up CORS and test all endpoints

### 3. **Type Safety Loss**
- **Risk**: Lose TypeScript benefits across apps
- **Prevention**: Proper package structure with shared types

### 4. **Deployment Complexity**
- **Risk**: CEO deploys admin, breaks main app
- **Prevention**: Separate CI/CD pipelines from start

## 📋 Pre-Migration Checklist

Before starting migration:

- [ ] Backup current working state
- [ ] List all admin dependencies
- [ ] Map all API endpoints used by admin
- [ ] Document all environment variables
- [ ] Test authentication flow
- [ ] Verify SSE/WebSocket requirements
- [ ] Check for hardcoded URLs
- [ ] Identify shared components
- [ ] Plan CORS configuration
- [ ] Design deployment strategy

## 🚀 Migration Strategy

### Phase 0: Preparation (1 hour)
1. Create comprehensive dependency map
2. Set up test environment
3. Document current auth flow
4. List all hardcoded paths

### Phase 1: Package Extraction (2 hours)
1. Create shared packages structure
2. Extract database schema
3. Extract UI components
4. Extract auth configuration
5. Test packages work in main app

### Phase 2: Admin App Creation (1 hour)
1. Initialize admin app
2. Configure imports from packages
3. Move admin routes
4. Set up authentication

### Phase 3: API Integration (2 hours)
1. Configure CORS
2. Update API endpoints
3. Test tRPC connection
4. Verify SSE works

### Phase 4: Testing (1 hour)
1. Test all admin pages
2. Verify auth flow
3. Check API calls
4. Test real-time features

## 🔥 Red Flags to Watch

1. **"Cannot find module"** - Import path issues
2. **"Unauthorized"** - Auth not sharing properly
3. **"CORS blocked"** - API configuration issues
4. **"Type 'X' is not assignable"** - Package versioning
5. **"Cannot connect to database"** - Env var issues

## 💡 Quick Wins

1. **Start with read-only pages** (analytics, users list)
2. **Keep auth in main app initially** (proxy through)
3. **Use npm workspaces** for simple package management
4. **Test locally with different ports** before domains
5. **Keep admin router in main app** (just UI separation)

Remember: The goal is separation of deployment, not complete isolation. The admin should still feel like part of the same system.