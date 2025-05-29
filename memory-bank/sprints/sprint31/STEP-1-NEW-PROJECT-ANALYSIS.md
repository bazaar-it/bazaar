# Step 1 – New Project: Ideas vs Reality Analysis (Sprint 31)

## Purpose
This document analyzes the user's thoughts and ideas against the actual codebase implementation to provide a "one source of truth" with real references.

## User's Ideas & Thoughts

### 1. Authentication Strategy: Guest vs Login-Required
**User's Question**: "Are we committing to no guest or anonymous project post-MVP, or do we want to keep the guest mode on the roadmap?"

**Current Reality** (with code references):
- **ALL project operations are behind authentication** via `protectedProcedure`
- **Reference**: `src/server/api/trpc.ts:119-132` - `protectedProcedure` middleware throws `UNAUTHORIZED` if no session
- **Reference**: `src/server/api/routers/project.ts:3` - All project routes use `protectedProcedure`
- **Reference**: `src/app/page.tsx` - Landing page checks authentication and redirects to login if unauthenticated

**Trade-off Analysis**:
✅ **Current Approach Benefits**:
- Simple architecture - no complexity around guest sessions
- All data tied to user IDs - clean database relationships
- No orphaned guest projects to manage
- Consistent user experience

❌ **Guest Mode Benefits (if implemented)**:
- Lower barrier to entry - users can try before signing up
- Better conversion funnel - users see value before committing
- Competitive advantage - many tools require immediate signup

**Implementation Complexity for Guest Mode**:
- Would require new `publicProcedure` routes for project operations
- Database schema changes to handle nullable `userId`
- Session management for guest projects
- Migration strategy for guest→authenticated user projects
- Rate limiting for anonymous users

### 2. Welcome Animation in Remotion Player
**User's Idea**: "Default scene 1, kind of initial props... just like a simple animation, like a nice looking animation, that always is the first kind of thing"

**Current Reality** (with code references):
- **Reference**: `src/types/remotion-constants.ts:27-35` - `createDefaultProjectProps()` returns:
  ```typescript
  {
    meta: { duration: 10, title: "New Project", backgroundColor: "#111" },
    scenes: [], // Empty scenes array
  }
  ```
- **No default welcome scene** - projects start completely empty
- **Reference**: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:700-720` - Shows UI welcome message instead

**Implementation Requirements**:
- Modify `createDefaultProjectProps()` to include a default scene
- Create a welcome animation component (React/Remotion)
- Ensure it's replaceable when user adds first scene
- Consider making it skippable/removable

### 3. Initial Chat Message as LLM Message
**User's Idea**: "I want the first initial message in the chat panel from our system to be UI-wise, like an actual chat message from the LLM"

**Current Reality** (with code references):
- **Reference**: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:700-720` - `getWelcomeMessage()` function:
  ```typescript
  const getWelcomeMessage = () => (
    <div className="text-center py-8">
      <div className="bg-muted/80 rounded-[15px] shadow-sm p-4 mx-auto max-w-md">
        <h3 className="font-medium text-base mb-2">Welcome to your new project!</h3>
        // ... UI-style welcome message
      </div>
    </div>
  );
  ```
- **Current**: UI component styled as a card/panel
- **Desired**: Styled as an actual chat message from assistant

**Implementation Requirements**:
- Modify `getWelcomeMessage()` to return a message-style component
- Use same styling as assistant messages in chat
- Consider adding it as a system message to the database vs just UI

## Technical Implementation Analysis

### Current New Project Flow (Actual Code)

1. **Landing Page** (`src/app/page.tsx`):
   - Checks authentication
   - If unauthenticated → redirects to login
   - If authenticated → shows "Try for Free" button

2. **Project Creation** (`src/server/api/routers/project.ts:58-125`):
   ```typescript
   create: protectedProcedure
     .input(z.object({
       initialMessage: z.string().min(1).max(2000).optional(),
     }).optional())
     .mutation(async ({ ctx, input }) => {
       // AI title generation if initialMessage provided
       // Falls back to "Untitled Video" + incremental numbering
       // Creates project with createDefaultProjectProps()
       // Processes initialMessage asynchronously if provided
     })
   ```

3. **Default Props** (`src/types/remotion-constants.ts:27-35`):
   ```typescript
   export function createDefaultProjectProps(): InputProps {
     return {
       meta: { duration: 10, title: "New Project", backgroundColor: "#111" },
       scenes: [], // Empty - no welcome animation
     };
   }
   ```

4. **Generate Page** (`src/app/projects/[id]/generate/page.tsx`):
   - Loads project data
   - Shows ChatPanelG with welcome UI message
   - Empty Remotion player (no scenes)

### Authentication Architecture

**All tRPC routes use `protectedProcedure`**:
- `src/server/api/trpc.ts:119-132` - Middleware that requires authentication
- Throws `UNAUTHORIZED` error if no session
- **No guest/anonymous access currently possible**

## Recommendations

### 1. Authentication Strategy Decision
**Recommendation**: Keep login-required for MVP, plan guest mode for post-MVP

**Rationale**:
- Current architecture is clean and functional
- Guest mode adds significant complexity
- Better to validate core product with authenticated users first
- Can add guest mode later as growth optimization

**If implementing guest mode later**:
- Create `publicProcedure` variants for project operations
- Add `userId: string | null` to projects table
- Implement session-based guest project storage
- Add migration flow for guest→authenticated

### 2. Welcome Animation Implementation
**Recommendation**: Add default welcome scene to `createDefaultProjectProps()`

**Implementation**:
```typescript
export function createDefaultProjectProps(): InputProps {
  return {
    meta: { duration: 10, title: "New Project", backgroundColor: "#111" },
    scenes: [
      {
        id: uuidv4(),
        type: "welcome",
        start: 0,
        duration: 60,
        data: {
          name: "Welcome Scene",
          // Welcome animation props
        },
      }
    ],
  };
}
```

### 3. Chat Welcome Message as LLM Message
**Recommendation**: Modify `getWelcomeMessage()` to use chat message styling

**Implementation**:
- Style welcome message as assistant message
- Use same rounded bubble styling
- Consider adding to database as system message for consistency

## Next Steps

1. **Decision needed**: Guest mode priority (post-MVP recommended)
2. **Design needed**: Welcome animation specification
3. **Implementation**: Chat message styling for welcome
4. **Testing**: Ensure changes don't break existing flow

## Code References Summary

- **Authentication**: `src/server/api/trpc.ts:119-132`
- **Project Creation**: `src/server/api/routers/project.ts:58-125`
- **Default Props**: `src/types/remotion-constants.ts:27-35`
- **Welcome Message**: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx:700-720`
- **Landing Page**: `src/app/page.tsx` 