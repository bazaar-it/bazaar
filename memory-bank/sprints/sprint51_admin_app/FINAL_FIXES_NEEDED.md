# Final Fixes Needed for Admin App

## Current Status
- ✅ Duplicate NEXTAUTH_URL removed
- ✅ Authentication hook created (useAdminAuthTRPC)
- ✅ CORS properly configured
- ❓ Dashboard shows zeros
- ❓ User analytics shows validation error

## Root Cause Analysis

### Why Dashboard Shows Zeros
Looking at the logs, the API calls are succeeding (200 status) but returning zero data. This could be because:

1. **Empty Database**: The development database might not have any data
2. **User Not Admin**: The logged-in user might not have `isAdmin: true` in the database
3. **Working As Expected**: If there's no data, zeros are correct

### Why User Analytics Fails
The error `"expected object, received undefined"` suggests the tRPC input isn't being passed correctly. This is likely a batching issue with tRPC.

## Immediate Actions

### 1. Verify Admin Status
Check if your user has admin privileges:

```bash
# Connect to your database and run:
SELECT id, email, "isAdmin" FROM users WHERE email = 'your-email@example.com';
```

If `isAdmin` is false or NULL, update it:
```sql
UPDATE users SET "isAdmin" = true WHERE email = 'your-email@example.com';
```

### 2. Add Test Data (Optional)
If the database is empty and you want to see non-zero metrics:

```sql
-- Add a test user
INSERT INTO users (id, email, name, "createdAt", "isAdmin") 
VALUES ('test-user-1', 'test@example.com', 'Test User', NOW(), false);

-- Add a test project
INSERT INTO projects (id, "userId", name, "createdAt") 
VALUES ('test-project-1', 'your-user-id', 'Test Project', NOW());

-- Add a test scene
INSERT INTO scenes (id, "projectId", name, code, "createdAt") 
VALUES ('test-scene-1', 'test-project-1', 'Test Scene', '// test code', NOW());
```

### 3. Fix User Analytics Query
The issue might be with how the query parameters are being passed. The query looks correct in the code, so this might be a tRPC batching issue.

Temporary fix - try disabling batching in the tRPC client:
```typescript
// In apps/admin/lib/trpc-provider.tsx
httpBatchLink({
  url: '...',
  maxURLLength: 2083, // Add this to prevent batching issues
  // ... rest of config
})
```

## Testing Checklist

1. **Ensure Both Apps Running**:
   ```bash
   npm run dev  # Runs both apps
   ```

2. **Login Flow**:
   - Go to http://localhost:3000
   - Login with your account
   - Check that you see your projects/data there

3. **Access Admin**:
   - Go to http://localhost:3001
   - Should see the admin dashboard
   - If zeros, check database for actual data
   - If not authenticated, check if cookies are being sent

4. **Debug Info**:
   - Open browser DevTools
   - Check Network tab for API calls
   - Look for `checkAdminAccess` call - should return `{isAdmin: true}`
   - Look for `getDashboardMetrics` call - check the response

## Long-term Solutions

### Option 1: Direct Database Access
For the admin app, consider connecting directly to the database instead of going through the main app's API. This would eliminate cross-origin issues.

### Option 2: Proper Subdomain Setup
In production with proper subdomains and cookie configuration, this will work better.

### Option 3: JWT-Based Auth
Instead of cookie-based sessions, use JWT tokens that can be easily passed between apps.

## Summary

The monorepo structure is working correctly. The issues are:
1. **Authentication**: Make sure the user has `isAdmin: true` in database
2. **Empty Data**: Dashboard shows zeros because there might be no data
3. **tRPC Batching**: User analytics might have a batching issue

The admin app is successfully calling the main app's APIs, as shown by the 200 responses. The zeros are likely just reflecting the actual state of the database.