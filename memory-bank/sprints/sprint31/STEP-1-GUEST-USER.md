# Step 1 - Guest User Mode Design

## Overview
This document outlines a system design for implementing a **Limited Guest Mode** in the Bazaar video generation platform, allowing users to submit 5-7 prompts before requiring login. The goal is to reduce friction for new users, enhance the "instant demo" factor, and potentially boost conversion rates and shareability, while managing the added complexity in authentication and data persistence.

## Current System (Auth-Only)
- **Permission Model**: All operations are behind `protectedProcedure` in tRPC, requiring `ctx.session.user.id` for data association and authorization.
- **Advantages**: Simplifies development with a single user identification method, avoids edge cases with guest data.
- **Disadvantages**: High funnel friction as users must log in before experiencing the core value proposition.

## Proposed System (Limited Guest Mode)
### Key Features
- Allow guest users to submit 5-7 prompts without authentication.
- Improve user acquisition by lowering the barrier to entry.
- Enhance viral shareability through instant access to video generation.

### Technical Design
#### 1. Guest Identification
- **Guest ID Generation**: Upon first visit, generate a unique `guestId` (UUID) and store it in a cookie (e.g., `bazaar_guest_id`) with a long expiration (e.g., 30 days).
- **Persistence**: Store `guestId` in a new database table `guest_sessions` to track guest activities and enforce prompt limits.

#### 2. Database Changes
- Create a new table `guest_sessions` with the following schema:
  ```sql
  CREATE TABLE guest_sessions (
    guest_id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    prompt_count INTEGER DEFAULT 0,
    project_ids TEXT[] DEFAULT '{}'
  );
  ```
- Link guest projects to `guest_id` in the `projects` table by adding a nullable `guest_id` column:
  ```sql
  ALTER TABLE projects ADD COLUMN guest_id TEXT NULL;
  ```

#### 3. Authentication Logic
- **Dual-Path Auth Checks**: Modify tRPC middleware to allow operations with either `userId` (from session) or `guestId` (from cookie). Implement a helper function to resolve identity:
  ```typescript
  const resolveIdentity = (ctx: any) => {
    const userId = ctx.session?.user?.id;
    const guestId = ctx.req.cookies['bazaar_guest_id'];
    return { userId, guestId, isGuest: !userId && !!guestId };
  };
  ```
- **Prompt Limit Enforcement**: In each mutation, check `prompt_count` from `guest_sessions` if operating as a guest. Block further actions if limit (e.g., 7) is reached, prompting login/signup.
- **Public Procedures**: For routes accessed by guests, either duplicate logic in public procedures or adjust `protectedProcedure` to conditionally allow guest access with usage limits.

#### 4. Project Persistence
- **Guest Projects**: Store projects created by guests in the `projects` table with `guest_id` instead of `user_id`. Track associated `project_ids` in `guest_sessions` for quick lookup.
- **Temporary Data**: Guest data is retained for 30 days (or as per cookie expiration) unless migrated to a user account.

#### 5. Data Migration on Login/Signup
- **Migration Trigger**: When a guest logs in or signs up, check for `bazaar_guest_id` cookie. If present, fetch associated projects from `projects` where `guest_id` matches.
- **Update Records**: Reassign projects to the new `user_id` and clear `guest_id`:
  ```sql
  UPDATE projects SET user_id = $newUserId, guest_id = NULL WHERE guest_id = $guestId;
  DELETE FROM guest_sessions WHERE guest_id = $guestId;
  ```
- **Cookie Cleanup**: Clear the `bazaar_guest_id` cookie post-migration.

#### 6. User Experience
- **Seamless Transition**: Notify guests about the prompt limit with a subtle UI counter (e.g., "Prompts left: 5/7"). On limit reached, show a modal prompting login/signup with a message like "Loved creating videos? Sign up to unlock unlimited prompts!"
- **Shareability**: Ensure guest-generated videos can be shared (e.g., public view links), incentivizing sign-up for continued editing.

### Trade-offs
| **Approach**              | **Pros**                                                       | **Cons**                                                                 | **Implementation Effort**                                      |
|---------------------------|----------------------------------------------------------------|--------------------------------------------------------------------------|----------------------------------------------------------------|
| **Auth-Only (Status Quo)** | - Simplest permission model<br>- All data keyed by `userId` for easy persistence | - Zero “instant demo” factor<br>- Funnel friction at first click         | No new work — keep protected tRPC routes as is.              |
| **Limited Guest Mode**    | - Users can try 5-8 prompts instantly<br>- Improves viral shareability   | - Must generate & persist `guestId` cookie<br>- Dual-path auth checks in every mutation<br>- Data migration when guest logs in | - Add `guest_sessions` table<br>- Guard each router with `(userId || guestId)` logic<br>- Add usage counter + potential paywall logic. |

### Complexity Analysis
- **Guest Mode Pros**: Significantly lowers barrier to entry, allowing users to experience the core value proposition (video generation) before committing. This could boost conversion rates and shareability.
- **Guest Mode Cons**: Introduces complexity in tRPC routing, as many procedures are `protectedProcedures` expecting `ctx.session.user.id`. Solutions include separate public procedures (code duplication) or temporary guest IDs (complex auth logic). Additionally, handling project persistence for guests (local storage vs. temporary DB records) and migrating data upon login/signup adds overhead.
- **Auth-Only Simplicity**: Requiring login simplifies development by ensuring a `userId` for data association and authorization, avoiding edge cases with guest data.

### Implementation Effort Estimation
- **Database Schema Changes**: 1-2 days (adding `guest_sessions`, modifying `projects` table).
- **Authentication Middleware**: 2-3 days (dual-path logic, cookie handling).
- **Prompt Limit Logic**: 1-2 days (counter and blocking mechanism).
- **Data Migration**: 2-3 days (logic to reassign projects on login/signup).
- **UI Adjustments**: 1-2 days (prompt counter, login prompt modal).
- **Total Effort**: Approximately 7-12 days, potentially spanning a sprint depending on team capacity and testing requirements.

### Recommendation for Sprint 31
Given the complexity and effort required, implementing Limited Guest Mode should be deferred to a backlog ticket post-MVP. For Sprint 31, focus on lower-complexity, high-impact UX enhancements like the welcome animation and chat-style greeting. Guest mode can be revisited when user acquisition metrics indicate significant drop-off due to login friction.

### Open Questions
- **Metric Priority**: Which metric matters more for Sprint 31—lowering first-prompt friction to drive user acquisition, or shipping faster by maintaining simplicity? (Ownership: Product Manager decision)
- **Long-term Roadmap**: If guest mode is critical for post-MVP growth, should we allocate time now for foundational changes to avoid larger retrofits later?

## Next Steps
- Review this design with the product and engineering teams to assess priority against Sprint 31 goals.
- If approved for a future sprint, begin with database schema updates and middleware adjustments as the foundational components.

*Document created on 2025-05-29 as part of Sprint 31 planning for Bazaar video generation system enhancements.*
