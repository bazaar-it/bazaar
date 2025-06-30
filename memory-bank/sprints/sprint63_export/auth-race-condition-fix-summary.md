# Auth Race Condition Fix Summary

## Overview
A critical auth race condition was fixed in commit `957a387` that was causing foreign key constraint errors when users tried to create projects. The issue occurred when OAuth authentication succeeded but the user record wasn't created in the database before attempting to create a project.

## The Problem
1. User authenticates via OAuth (GitHub/Google) 
2. NextAuth creates a session with the user ID
3. User is redirected to `/projects/new`
4. Project creation tries to insert with `userId` foreign key
5. **RACE CONDITION**: User record doesn't exist yet in the database
6. Foreign key constraint error: "userId not present in table"

## Root Cause
The NextAuth adapter with Drizzle ORM uses JWT session strategy, which means:
- Sessions are stored in JWT tokens, not the database
- User creation might be delayed or fail silently
- The auth callback doesn't guarantee the user exists in the database

## The Fix (Commit 957a387)
Added defensive user creation logic in `/projects/new/page.tsx`:

```typescript
// Check if user exists in database
const existingUser = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.id, session.user.id))
  .limit(1);

if (existingUser.length === 0) {
  // Create the user record if missing
  try {
    await db.insert(users).values({
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name || session.user.email?.split('@')[0],
      emailVerified: new Date(), // Mark as verified since they're authenticated
    });
  } catch (error) {
    // Continue even if creation fails (another request might have created it)
  }
}
```

## Key Implementation Details

### Auth Configuration (`/src/server/auth/config.ts`)
- Uses JWT session strategy (not database sessions)
- DrizzleAdapter configured without sessions table
- OAuth providers: GitHub and Google
- `allowDangerousEmailAccountLinking: true` for both providers

### Project Creation Flow
1. **Login redirect**: Default redirect is to `/projects/new`
2. **User check**: Verify user exists in database before any project operations
3. **Auto-creation**: Create user record if missing (idempotent)
4. **Project check**: Fast path - redirect to existing project if found
5. **New project**: Create with retry logic for handling concurrent requests

### Related Fixes
- **Commit 2c329bd**: "new project every time fix" - Fixed issue with projects page
- **Commit 78279e1**: "new projects all the time fix" - Fixed MyProjectsPanel

## Why This Works
1. **Defensive programming**: Don't assume user exists just because session exists
2. **Idempotent**: Safe to run multiple times, won't create duplicate users
3. **Race-tolerant**: Handles concurrent requests gracefully
4. **Fail-safe**: Continues even if user creation fails (might already exist)

## Remaining Considerations
1. The fix is applied in `/projects/new` but similar checks might be needed elsewhere
2. Consider adding user existence check in tRPC middleware for all protected procedures
3. Monitor for any other endpoints that assume user existence based on session alone

## Impact
- Eliminates "userId not present in table" errors
- Ensures smooth onboarding for new OAuth users
- Handles edge cases where adapter fails to create user records