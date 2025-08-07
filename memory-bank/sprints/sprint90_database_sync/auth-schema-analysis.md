# Auth Schema Analysis

## Overview
Investigation into whether the auth-related schemas in dev are required for the application.

## Schemas Found in Dev Only

### 1. `auth` Schema
Contains two functions:
- `auth.session()` - Returns JWT claims from request context
- `auth.user_id()` - Extracts user ID from JWT session

**Purpose**: These appear to be PostgREST/Supabase-style auth helpers for JWT validation.

### 2. `pgrst` Schema
Contains:
- `pgrst.pre_config()` - PostgREST configuration function

**Purpose**: PostgREST server configuration (sets JWT secret, roles, etc.)

### 3. `neon_auth` Schema
Contains:
- `users_sync` table - Appears to be Neon's user synchronization table

**Purpose**: Neon-specific authentication integration

## Application Authentication Analysis

### Current Auth Implementation
The application uses **NextAuth.js v5** with:
- JWT session strategy (not database sessions)
- OAuth providers: GitHub and Google
- Custom Drizzle adapter
- Auth stored in `bazaar-vid_user` and `bazaar-vid_account` tables

### Key Findings
1. **No Database Auth Functions Used**: 
   - All `auth()` calls in code refer to NextAuth's `auth()` function
   - No SQL queries reference `auth.session()` or `auth.user_id()`
   - No raw SQL using these schemas found

2. **NextAuth Configuration** (auth/config.ts):
   ```typescript
   session: {
     strategy: "jwt",  // Using JWT, not database sessions
   }
   ```

3. **Authentication Flow**:
   - User signs in via OAuth (Google/GitHub)
   - NextAuth creates JWT token
   - Session data comes from JWT, not database functions

## Recommendation

### These schemas are NOT required for the application

**Reasoning**:
1. The app uses NextAuth.js with JWT strategy, not PostgREST authentication
2. No code references the auth schema functions
3. These appear to be remnants from a different auth approach (possibly Supabase/PostgREST)

### Action Items
1. **Do NOT add these schemas to production**
2. **Can safely remove from dev** (after backup)
3. **Keep using NextAuth** as the sole authentication method

### Why They Exist in Dev
Likely scenarios:
- Previous attempt to use PostgREST/Supabase authentication
- Neon database template included them by default
- Testing different auth strategies during development

## Summary
The `auth`, `pgrst`, and `neon_auth` schemas are PostgREST/Supabase-related authentication infrastructure that the Bazaar-Vid application does not use. The application relies entirely on NextAuth.js for authentication, making these schemas unnecessary.