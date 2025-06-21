# Session Debugging - Admin Access Issue

## Current Situation
- User "Lysaker" (markushogne@gmail.com) IS an admin in the database ✅
- GitHub account (97436243) is properly linked ✅
- But getting "Access Denied" on localhost:3001 ❌

## Root Cause Analysis

### The Cookie Problem
The issue is that cookies set on `localhost:3000` (main app) cannot be read by `localhost:3001` (admin app) due to browser security. This is why:

1. You login on localhost:3000 with GitHub
2. A session cookie is created for localhost:3000
3. Admin app on localhost:3001 cannot read that cookie
4. So it thinks you're not logged in

### Current Flow
1. Admin app checks for session using NextAuth
2. No cookie found (different port)
3. Falls back to checking via API (useAdminAuth)
4. But that also relies on cookies being sent

## Solutions

### Solution 1: Login Directly on Admin App
Since the admin app has its own NextAuth setup, try logging in directly:

1. Go to http://localhost:3001/api/auth/signin
2. Login with GitHub
3. This will create a session cookie for localhost:3001
4. Then the admin check should work

### Solution 2: Use Same Port with Path Routing (Development)
Run both apps on the same port using a reverse proxy:

```nginx
# nginx.conf
server {
  listen 3000;
  
  location /admin {
    proxy_pass http://localhost:3001;
  }
  
  location / {
    proxy_pass http://localhost:3000;
  }
}
```

### Solution 3: Update Cookie Configuration (Production Fix)
This is already documented but won't help in development with different ports.

### Solution 4: Direct Database Session (Quick Dev Fix)
For development only, we could modify the admin app to check the database directly instead of relying on cookies.

## Immediate Action

Try Solution 1 first:
1. Open http://localhost:3001/api/auth/signin
2. Click "Sign in with GitHub"
3. After login, you should be redirected back to admin dashboard
4. Check if you now have access

The key insight is that you need a session cookie specifically for localhost:3001, not just for localhost:3000.