# Cookie and CORS Analysis for Monorepo Admin App

## Issues Found

### 1. Duplicate NEXTAUTH_URL in Admin .env.local
**Problem**: The admin app's `.env.local` has conflicting NEXTAUTH_URL entries:
```
Line 16: NEXTAUTH_URL=http://localhost:3001     # Correct
Line 22: NEXTAUTH_URL="http://localhost:3000"    # Wrong - this overrides the correct one!
```

**Impact**: The second entry (line 22) overrides the first, causing the admin app to think it's running on port 3000, breaking authentication redirects.

**Fix**: Remove line 22 or comment it out.

### 2. Cookie Sharing Between Ports (Development)
**Problem**: In development, the main app (port 3000) and admin app (port 3001) cannot share cookies by default because browsers treat different ports as different origins.

**Current Flow**:
1. User logs in on main app (localhost:3000)
2. Cookie is set for localhost:3000 only
3. Admin app (localhost:3001) cannot read this cookie
4. Admin app calls `/api/admin/validate-session` to check auth status
5. But the cookie isn't sent with the request due to cross-origin restrictions

**Solutions**:
1. **Development Workaround**: The current approach (API validation) works but requires both apps running
2. **Better Development Setup**: Use a reverse proxy (like nginx) to serve both apps under same port with different paths
3. **Production Fix**: Use subdomains with proper cookie configuration (see below)

### 3. Production Cookie Sharing
**Current State**: Not configured for cross-subdomain cookie sharing

**What's Needed**:
```typescript
// In packages/auth/config.ts
export const authConfig = {
  // ... existing config
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // THIS IS THE KEY PART:
        domain: process.env.NODE_ENV === 'production' ? '.bazaar.it' : undefined
      }
    }
  }
}
```

**How it works**:
- Setting `domain: '.bazaar.it'` (note the leading dot) makes the cookie available to:
  - bazaar.it
  - admin.bazaar.it
  - any.subdomain.bazaar.it

### 4. CORS Configuration Review
**Current State**: ✅ Properly configured
```javascript
// Main app next.config.js
const allowedOrigin = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001' 
  : 'https://admin.bazaar.it';
```

**Production Ready**: Yes, the CORS headers will allow admin.bazaar.it to call bazaar.it APIs.

## Recommended Actions

### Immediate Fixes
1. **Fix .env.local**: Remove duplicate NEXTAUTH_URL on line 22
2. **Add cookie domain configuration** to auth config for production

### Development Experience Improvements
1. **Option A**: Continue with current API validation approach (works but requires both apps)
2. **Option B**: Set up local nginx proxy:
   ```nginx
   # Local development proxy
   server {
     listen 3000;
     
     location / {
       proxy_pass http://localhost:3000;
     }
     
     location /admin {
       proxy_pass http://localhost:3001;
     }
   }
   ```

### Production Deployment Checklist
1. ✅ CORS headers configured
2. ❌ Cookie domain needs configuration
3. ✅ Separate deployments ready
4. ❌ Environment variables need updating:
   - Admin app needs `NEXTAUTH_URL=https://admin.bazaar.it`
   - Both apps need `AUTH_COOKIE_DOMAIN=.bazaar.it`

## Alternative Architecture Consideration

Instead of cookie sharing, consider using a dedicated auth service:
1. Auth happens on auth.bazaar.it
2. Issues JWT tokens
3. Both apps validate tokens independently
4. No cookie sharing complexity

This is more complex initially but scales better for multiple apps.

## Testing Strategy

### Development Testing
```bash
# Terminal 1
npm run dev:main

# Terminal 2  
npm run dev:admin

# Browser
1. Open http://localhost:3000 and login
2. Open http://localhost:3001 in same browser
3. Check if authenticated (currently won't work due to cookie issue)
4. Check Network tab for validate-session API call
```

### Production Testing
1. Deploy main app to bazaar.it
2. Deploy admin app to admin.bazaar.it
3. Configure cookie domain in auth
4. Test cross-subdomain authentication

## Summary

The monorepo structure is solid, but authentication between apps needs work:
1. **Quick fix**: Remove duplicate NEXTAUTH_URL
2. **Medium fix**: Add cookie domain configuration for production
3. **Long-term**: Consider dedicated auth service or OAuth flow