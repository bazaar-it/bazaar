# Admin App Debugging Analysis

## Issues Identified

### 1. Dashboard Shows All Zeros
**Symptom**: Admin dashboard displays 0 for all metrics (users, projects, scenes)

**API Calls**: Succeeding (200 status) but returning empty data

**Possible Causes**:
1. User might not have admin privileges
2. Database might be empty (development database)
3. Authentication context not being passed correctly

### 2. User Analytics Page Error
**Symptom**: Getting validation error: "expected object, received undefined"

**Error Details**:
```
❌ tRPC failed on admin.getUserAnalytics: [
  {
    "code": "invalid_type",
    "expected": "object",
    "received": "undefined",
    "path": [],
    "message": "Required"
  }
]
```

**Root Cause**: The tRPC client might not be sending the input parameters correctly due to batching issues.

## Authentication Flow Analysis

### Current Setup:
1. Admin app uses `useAdminAuth` hook to validate sessions
2. This calls the main app's `/api/admin/validate-session` endpoint
3. Admin app also has its own NextAuth setup via `@bazaar/auth`

### Potential Issues:
1. **Cookie Not Shared**: Browser can't share cookies between localhost:3000 and localhost:3001
2. **Session Context**: The admin app might not have the proper session context for tRPC calls
3. **Cross-Origin Requests**: Even with CORS, the authentication might not be properly forwarded

## Quick Debugging Steps

### 1. Check if User is Actually Admin
In the main app database, verify the user has `isAdmin: true`:
```sql
SELECT id, email, isAdmin FROM users WHERE email = 'your-email@example.com';
```

### 2. Test Direct API Call
Try calling the API directly from browser:
```
http://localhost:3000/api/trpc/admin.getDashboardMetrics?batch=1&input=%7B%7D
```

### 3. Check Session in Admin App
Add debugging to admin app to verify session:
```typescript
// In admin app page
console.log('Session:', session);
console.log('Is Admin:', session?.user?.isAdmin);
```

## Solutions to Try

### Solution 1: Fix getUserAnalytics Input
The error suggests the input isn't being passed. This might be a tRPC batching issue. Try:

1. Disable batching temporarily
2. Or ensure the query has proper default values

### Solution 2: Direct Database Access
For development, the admin app could connect directly to the database instead of going through the main app's API.

### Solution 3: Shared Session Store
Use a shared Redis or database session store that both apps can access.

## Next Steps

1. **Verify Admin Status**: Check if the logged-in user actually has admin privileges in the database
2. **Test Authentication**: Add console logs to verify session is being passed
3. **Check tRPC Setup**: Ensure the tRPC client is properly configured with authentication headers
4. **Consider Direct DB**: For MVP, admin app could read directly from database

## Development Workflow Recommendation

For now, the simplest approach is:
1. Login to main app first (sets session)
2. Admin app validates via API (current approach)
3. But ensure the user has `isAdmin: true` in database

The zeros might simply indicate an empty development database or a non-admin user.