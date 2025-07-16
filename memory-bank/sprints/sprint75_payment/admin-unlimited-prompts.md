# Admin Unlimited Prompts Feature

## Overview
Implemented a bypass for admin users to have unlimited prompts without any rate limiting.

## Implementation

### Database Schema
Users table has an `isAdmin` boolean field that identifies admin users:
```typescript
isAdmin: d.boolean().default(false).notNull()
```

### Usage Service Updates

#### 1. checkPromptUsage Method
Added admin check at the beginning:
```typescript
// Check if user is admin first
const [user] = await db.select({ isAdmin: users.isAdmin })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// Admins have unlimited prompts
if (user?.isAdmin) {
  return {
    allowed: true,
    used: 0,
    limit: 999999, // Show a high number for UI purposes
    message: "Admin - Unlimited prompts"
  };
}
```

#### 2. incrementPromptUsage Method
Skip incrementing usage for admins:
```typescript
// Check if user is admin first
const [user] = await db.select({ isAdmin: users.isAdmin })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

// Skip incrementing for admins
if (user?.isAdmin) {
  return;
}
```

#### 3. getTodayPromptUsage Method
Return unlimited values for admins:
```typescript
// Admins have unlimited prompts
if (user?.isAdmin) {
  return {
    used: 0,
    limit: 999999,
    remaining: 999999,
    purchased: 0
  };
}
```

## Setting Admin Users

To make a user an admin, update the database:
```sql
UPDATE "user" SET "isAdmin" = true WHERE email = 'admin@example.com';
```

## UI Display
- Admins will see "0/999999 free daily" in the prompt usage dropdown
- No purchase modal will appear for admins
- Usage is not tracked for admin users

## Benefits
1. Admins can test without worrying about limits
2. No need to purchase prompts for internal testing
3. Easy to enable/disable via database flag
4. Clean separation between regular users and admins