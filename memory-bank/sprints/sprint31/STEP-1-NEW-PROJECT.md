//memory-bank/sprints/sprint31/STEP-1-NEW-PROJECT.md

# Step 1 - New Project Initialization: Detailed Analysis

## Overview

This document provides a comprehensive analysis of the new project initialization flow in the Bazaar video generation system. It covers the exact technical implementation, system state, and modular architecture from when a user initiates a new project until they reach the generate page ready to submit their first prompt.

## User Flow Paths to New Project

### Path 1: Landing Page - "Try for Free" Button

**Location**: `src/app/page.tsx` (lines 23-30)

**User Action**: User clicks the "Try for Free" button on the landing page

**Technical Implementation**:
```typescript
const handleTryForFree = async () => {
  if (status === "authenticated" && session?.user) {
    // Create a new project and redirect to generator
    const project = await createProject.mutateAsync({});
    if (project?.projectId) {
      router.push(`/projects/${project.projectId}/generate`);
    }
  } else {
    setShowLogin(true);
  }
};
```

**System Behavior**:
1. **Authentication Check**: If user is not authenticated, shows login modal
2. **Project Creation**: Calls `api.project.create.useMutation()` with empty input
3. **Redirect**: Navigates to `/projects/{projectId}/generate`

### Path 2: Within App - "New Project" Button

**Location**: `src/components/client/NewProjectButton.tsx`

**User Action**: User clicks "New Project" button from within the app (sidebar, etc.)

**Technical Implementation**:
```typescript
const createProject = api.project.create.useMutation({
  onSuccess: async (data) => {
    setIsRedirecting(true);
    await utils.project.list.invalidate();
    router.push(`/projects/${data.projectId}/generate`);
  }
});
```

**System Behavior**:
1. **Project Creation**: Same tRPC mutation as Path 1
2. **Cache Invalidation**: Invalidates project list to refresh UI
3. **Redirect**: Navigates to generate page for new project

## Backend Project Creation Logic

**Location**: `src/server/api/routers/project.ts` (lines 54-118)

### Title Generation Process

1. **AI Title Generation** (if `initialMessage` provided):
   - Calls `generateTitle()` service with the initial message
   - Falls back to incremental naming on error

2. **Incremental Naming** (default):
   - Queries existing projects with pattern `'Untitled Video%'`
   - Finds highest number in existing "Untitled Video X" titles
   - Generates next available number: `"Untitled Video"` or `"Untitled Video {N}"`

### Database Operations

```typescript
const inserted = await executeWithRetry(() => ctx.db
  .insert(projects)
  .values({
    userId: ctx.session?.user?.id || 'system',
    title,
    props: createDefaultProjectProps(),
  })
  .returning());
```

**Database Record Created**:
- `id`: UUID (auto-generated)
- `userId`: Current user's ID
- `title`: Generated title (e.g., "Untitled Video" or "Untitled Video 2")
- `props`: Default project properties
- `createdAt`: Current timestamp
- `updatedAt`: Current timestamp

### Default Project Properties

**Location**: `src/types/remotion-constants.ts` (lines 30-37)

```typescript
export function createDefaultProjectProps(): InputProps {
  return {
    meta: { 
      duration: 10, // Start with empty duration for new projects
      title: "New Project",
      backgroundColor: "#111"
    },
    scenes: [], // Start with empty scenes array for new projects
  };
}
```

### Async Initial Message Processing

If `initialMessage` is provided (currently only from API, not UI):
```typescript
if (input?.initialMessage && input.initialMessage.trim().length > 0) {
  processUserMessageInProject(ctx, insertResult.id, input.initialMessage)
    .catch((error: unknown) => {
      console.error(`Error processing initial message for project ${insertResult.id}:`, error);
    });
}
```

**Note**: This is fire-and-forget - project creation completes regardless of message processing success.

## System State After Project Creation

### Database State

**Projects Table**:
```sql
INSERT INTO projects (
  id,           -- UUID (e.g., "123e4567-e89b-12d3-a456-426614174000")
  userId,       -- User's ID from session
  title,        -- "Untitled Video" or "Untitled Video N"
  props,        -- JSON: { meta: { duration: 10, title: "New Project", backgroundColor: "#111" }, scenes: [] }
  createdAt,    -- Current timestamp
  updatedAt     -- Current timestamp
)
```

**Related Tables**:
- `patches`: Empty (no patches applied yet)
- `scenePlans`: Empty (no scene plans created yet)
- `messages`: Empty (no chat messages yet)

### Frontend State on Generate Page

**Location**: `src/app/projects/[id]/generate/page.tsx`

**Page Load Process**:
1. **Project Validation**: Fetches project by ID, validates user ownership
2. **Component Rendering**: Renders `GenerateWorkspaceRoot` with project data
3. **Initial Props**: Passes empty scenes array and default meta to workspace

**UI Components Initialized**:
- `ChatPanelG`: Ready for user input, shows welcome message for new projects
- `WorkspaceContentAreaG`: Shows empty state (no scenes to preview)
- `GenerateSidebar`: Shows project title, new project button, empty project list

### Welcome Message Logic

**Location**: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx` (lines 648-660)

```typescript
// Get welcome message for new projects (V1 logic)
const isNewProject = !messages || messages.length === 0;

if (isNewProject) {
  return (
    <div className="text-center py-8 text-gray-500">
      <h3 className="font-medium text-base mb-2">Welcome to your new project!</h3>
      <p className="text-sm">Describe what you want to create and I'll generate it for you.</p>
    </div>
  );
}
```

## Modular Architecture Analysis

### Component Responsibilities

1. **Landing Page** (`src/app/page.tsx`):
   - **Input**: User click, session status
   - **Output**: Login modal or project creation + redirect
   - **Responsibility**: Entry point, authentication gate

2. **NewProjectButton** (`src/components/client/NewProjectButton.tsx`):
   - **Input**: User click
   - **Output**: Project creation + redirect + cache invalidation
   - **Responsibility**: Reusable project creation trigger

3. **Project Router** (`src/server/api/routers/project.ts`):
   - **Input**: tRPC mutation call (optional initialMessage)
   - **Output**: Project ID or error
   - **Responsibility**: Database operations, title generation, validation

4. **Generate Page** (`src/app/projects/[id]/generate/page.tsx`):
   - **Input**: Project ID from URL, user session
   - **Output**: Workspace UI with project data
   - **Responsibility**: Project access control, workspace initialization

5. **Workspace Components**:
   - **ChatPanelG**: User input interface, welcome messages
   - **WorkspaceContentAreaG**: Scene preview and management
   - **GenerateSidebar**: Navigation, project management

### Data Flow Architecture

```
User Action → Frontend Component → tRPC Mutation → Database → Redirect → Generate Page → Workspace UI
```

**Specific Flow**:
1. User clicks "Try for Free" or "New Project"
2. Frontend calls `api.project.create.useMutation()`
3. Backend creates database record with `createDefaultProjectProps()`
4. Frontend receives `projectId` and redirects to `/projects/{id}/generate`
5. Generate page validates access and renders workspace
6. Workspace shows empty state ready for first prompt

## Key Technical Details

### Error Handling

1. **Database Errors**: Wrapped in `executeWithRetry()` for connection issues
2. **Title Generation**: Falls back to incremental naming if AI fails
3. **Async Processing**: Initial message processing is fire-and-forget
4. **Frontend Errors**: Mutation errors prevent redirect, show loading states

### Performance Considerations

1. **Cache Management**: Project list invalidated after creation
2. **Optimistic Updates**: UI shows "Creating..." during mutation
3. **Redirect Prevention**: Multiple clicks blocked during creation
4. **Database Efficiency**: Single insert operation with returning clause

### Security & Validation

1. **Authentication**: Required for all project operations
2. **Authorization**: User can only access their own projects
3. **Input Validation**: Title length limits, UUID validation
4. **SQL Injection**: Protected by Drizzle ORM parameterized queries

## Current Limitations & Opportunities

### Limitations

1. **No Initial Message UI**: Landing page doesn't capture user intent
2. **Generic Titles**: AI title generation not used from UI flows
3. **No Templates**: All projects start completely empty
4. **No Onboarding**: No guided first-time user experience

### Optimization Opportunities

1. **Intent Capture**: Add prompt input on landing page
2. **Smart Titles**: Use AI title generation for all new projects
3. **Template Selection**: Offer starting templates or examples
4. **Progressive Enhancement**: Guide users through first scene creation

## Conclusion

The new project initialization is well-architected with clear separation of concerns. The system reliably creates empty projects and gets users to the generate page ready for interaction. The modular structure supports future enhancements without major refactoring.

**Current Status**: ✅ Functional and stable
**Architecture**: ✅ Modular and extensible  
**User Experience**: ⚠️ Basic but functional
**Optimization Potential**: 🚀 High (intent capture, templates, onboarding)
