# New Project & Homepage Routing Fix

## Overview
Fixed all project creation flows to route to the updated `/generate` UI instead of the legacy `/edit` page, including the homepage prompt form, ➕ New Project icon in sidebar, and direct project creation routes.

## Problem Solved
Previously, when users created projects through various entry points, they were redirected to the legacy `/edit` interface instead of the modern `/generate` workspace with chat panel, video player, and improved UX.

## Root Cause
Multiple routing points were hardcoded to redirect to `/edit` instead of `/generate`:
1. Homepage form redirected to `/projects/${projectId}/edit`
2. `NewProjectButton` component redirected to `/projects/${projectId}/edit`
3. Collapsed sidebar button manually routed to `/projects/new` 
4. `/projects/new` page redirected to `/edit`

## Solution Implementation

### 1. Homepage Form Fix
**File**: `src/app/page.tsx`
**Change**: Updated form submission redirect route from `/edit` to `/generate`

```typescript
// Before
const project = await createProject.mutateAsync({
  initialMessage: prompt,
});
if (project?.projectId) {
  router.push(`/projects/${project.projectId}/edit`);
}

// After  
const project = await createProject.mutateAsync({
  initialMessage: prompt,
});
if (project?.projectId) {
  router.push(`/projects/${project.projectId}/generate`);
}
```

### 2. NewProjectButton Component Fix
**File**: `src/components/client/NewProjectButton.tsx`
**Change**: Updated redirect route from `/edit` to `/generate`

```typescript
// Before
router.push(`/projects/${data.projectId}/edit`);

// After  
router.push(`/projects/${data.projectId}/generate`);
```

### 3. GenerateSidebar Collapsed Button Fix
**File**: `src/app/projects/[id]/generate/workspace/GenerateSidebar.tsx`
**Change**: Reverted to original ➕ icon but updated to use tRPC mutation and route to `/generate`

```typescript
// Before
<Button
  onClick={() => router.push('/projects/new')}
>
  <PlusIcon className="h-5 w-5" />
</Button>

// After
<Button
  onClick={handleCreateProject}
>
  <PlusIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
</Button>

// With tRPC mutation:
const createProject = api.project.create.useMutation({
  onSuccess: async (data) => {
    await utils.project.list.invalidate();
    router.push(`/projects/${data.projectId}/generate`);
  }
});
```

### 4. Direct Route Fix
**File**: `src/app/projects/new/page.tsx`
**Change**: Updated redirect destination from `/edit` to `/generate`

```typescript
// Before
redirect(`/projects/${newProject.id}/edit`);

// After
redirect(`/projects/${newProject.id}/generate`);
```

## Benefits
1. **Consistent User Experience**: All project creation flows now route to the same modern interface
2. **Updated UI Access**: Users immediately access the improved workspace with chat panel and video player
3. **Unified Routing**: All project creation paths use the same destination endpoint
4. **Homepage Integration**: Users entering prompts on homepage get the modern experience
5. **Future-Proof**: New projects automatically use the latest interface design

## Testing
- ✅ Homepage prompt form routes to `/generate`
- ✅ Collapsed sidebar ➕ button routes to `/generate`
- ✅ Expanded sidebar "New Project" button routes to `/generate`  
- ✅ Direct `/projects/new` navigation routes to `/generate`
- ✅ Server running correctly on port 3000
- ✅ All routing changes preserve existing functionality
- ✅ Initial message functionality preserved for homepage form

## Result
Users now consistently access the modern `/generate` workspace when creating new projects through any entry point (homepage form, sidebar buttons, direct navigation), providing immediate access to the chat panel, video player, and improved user interface. 