# CRITICAL: Inconsistent Project Creation Pathways

**Date**: 2025-01-25  
**Priority**: CRITICAL  
**Status**: Analysis Complete, Solution Required  

## Problem Summary

The user has discovered **two separate project creation pathways** that result in inconsistent user experiences depending on authentication state and navigation path. This creates unpredictable behavior that confuses users.

## Two Distinct Scenarios

### Scenario 1: Already Logged In Users
**Pathway**: Homepage "Try for Free" button or Sidebar "New Project" button

**Flow**:
1. User clicks "Try for Free" (homepage) or "New Project" (sidebar)
2. Triggers `api.project.create.useMutation()` tRPC call
3. Uses `createDefaultProjectProps()` from `src/types/remotion-constants.ts`
4. Creates welcome scene with animated content
5. Inserts rich markdown welcome message into database

**Results**:
- ✅ Title: "Untitled Video X" (with incremental numbering)
- ✅ Beautiful welcome video with animations, particles, gradients
- ✅ Rich markdown welcome message stored in database
- ✅ Proper scene duration (150 frames / 5 seconds)

### Scenario 2: Fresh Login (Cache Cleared)
**Pathway**: Login → `/projects/new` page → Direct database insertion

**Flow**:
1. User logs in via GitHub/Google OAuth
2. Login callback redirects to `/projects/new` (hardcoded)
3. `/projects/page.tsx` automatically redirects to `/projects/new` 
4. Direct database insertion with minimal props
5. NO database welcome message creation

**Results**:
- ❌ Title: "New Project X" (different naming convention)
- ❌ Hardcoded minimal props without welcome scene
- ❌ NO welcome message in chat
- ❌ Different default props structure

## Root Cause Analysis

### 1. Hardcoded Login Callback URL
```typescript
// src/app/login/page.tsx
signIn("github", { callbackUrl: "/projects/new" });
signIn("google", { callbackUrl: "/projects/new" });
```

### 2. Automatic Redirect in Projects Page
```typescript
// src/app/projects/page.tsx
// If user has no projects, redirect to create a new one
if (userProjects.length === 0) {
  redirect("/projects/new");
}

// Show projects dashboard (this should be implemented properly in the future)
// For now, redirect to create new project as the main flow
redirect("/projects/new");
```

### 3. Two Different Project Creation Systems

**tRPC Route** (`src/server/api/routers/project.ts`):
```typescript
props: createDefaultProjectProps(), // Rich welcome scene
title: "Untitled Video" // Incremental "Untitled Video X"
// + Database welcome message insertion
```

**Direct Page Route** (`src/app/projects/new/page.tsx`):
```typescript
props: {
  meta: {
    duration: 10,
    title: titleToInsert, // "New Project X"
    backgroundColor: "#111",
  },
  scenes: [], // Empty scenes array
},
// NO welcome message creation
```

## Technical Details

### Different Title Generation
- **tRPC**: Uses `like(projects.title, 'Untitled Video%')` pattern matching
- **Direct**: Uses `like(projects.title, 'New Project%')` pattern matching

### Different Default Props
- **tRPC**: Uses `createDefaultProjectProps()` → Welcome scene + 150 frame duration
- **Direct**: Hardcoded minimal props → Empty scenes + 10 second duration

### Different Welcome Message Systems
- **tRPC**: Inserts comprehensive markdown welcome message into database
- **Direct**: NO message creation - relies on UI-only fallbacks

## Recommended Solution

### Option A: Unify via tRPC (RECOMMENDED)
**Change login callback to use tRPC project creation**

1. **Modify Login Callbacks**:
   ```typescript
   // Instead of: { callbackUrl: "/projects/new" }
   // Use: { callbackUrl: "/projects/create" }
   ```

2. **Create New Route** `/projects/create/page.tsx`:
   ```typescript
   export default async function CreateProjectPage() {
     // Redirect to homepage with createProject=true flag
     // Let homepage handle tRPC creation
     redirect("/?createProject=true");
   }
   ```

3. **Enhance Homepage**:
   ```typescript
   // Detect URL parameter and auto-trigger project creation
   useEffect(() => {
     if (searchParams.get('createProject') === 'true' && session?.user) {
       handleTryForFree();
     }
   }, [searchParams, session]);
   ```

### Option B: Enhance Direct Route
**Make `/projects/new` use same logic as tRPC**

1. **Import createDefaultProjectProps** in `/projects/new/page.tsx`
2. **Add welcome message creation** after project insertion
3. **Unify title generation** to use "Untitled Video X" pattern

## Impact Assessment

- **User Experience**: CRITICAL - Users get completely different experiences based on login state
- **Support Burden**: Users report "missing welcome video" without understanding why
- **Code Maintenance**: Two separate systems to maintain and debug
- **Data Consistency**: Different project structures in database

## Next Steps

1. **Immediate**: Document this issue in sprint planning
2. **Design**: Choose between Option A vs Option B approach
3. **Implementation**: Unify the project creation pathways
4. **Testing**: Verify both login and existing-user flows work identically
5. **Validation**: Test with cache clearing to ensure consistency

## Files Involved

- `src/app/login/page.tsx` - OAuth callback URLs
- `src/app/projects/page.tsx` - Auto-redirect logic  
- `src/app/projects/new/page.tsx` - Direct creation route
- `src/server/api/routers/project.ts` - tRPC creation route
- `src/types/remotion-constants.ts` - Default props function
- `src/app/page.tsx` - Homepage Try for Free button
- `src/components/client/NewProjectButton.tsx` - Sidebar button

---

**This issue explains the mysterious "welcome video missing" reports and must be prioritized for consistent user experience.** 