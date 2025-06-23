# Next Steps and Fixes for Admin App

## Current Status Summary
The monorepo migration is 90% complete. The main blockers are:
1. Duplicate NEXTAUTH_URL in admin .env.local
2. Cookie sharing configuration for production
3. Development workflow needs both apps running

## Immediate Actions Required

### 1. Fix Admin .env.local (Critical)
Remove or comment out line 22 in `/apps/admin/.env.local`:
```bash
# Line 22 - REMOVE THIS:
NEXTAUTH_URL="http://localhost:3000"

# Keep only line 16:
NEXTAUTH_URL=http://localhost:3001
```

### 2. Update Auth Configuration for Production
Add cookie configuration to `/packages/auth/config.ts`:

```typescript
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
        domain: process.env.NODE_ENV === 'production' ? '.bazaar.it' : undefined
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.bazaar.it' : undefined
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.bazaar.it' : undefined
      }
    }
  }
}
```

### 3. Development Workflow Instructions

#### For CEO/Admin User:
```bash
# Step 1: Start both apps
npm run dev  # This starts both apps

# OR run them separately:
# Terminal 1:
npm run dev:main

# Terminal 2:
npm run dev:admin

# Step 2: Login Flow
1. Go to http://localhost:3000 and login
2. Then go to http://localhost:3001
3. The admin app will validate your session via API
```

#### Why Both Apps Must Run:
- Admin app (3001) needs to call main app (3000) APIs
- Authentication validation happens via API calls
- This mimics production where both apps are deployed

## Production Deployment Guide

### Main App (bazaar.it)
1. Deploy as normal
2. Ensure CORS headers are configured (already done ✅)
3. No changes needed

### Admin App (admin.bazaar.it)
1. Update production .env:
   ```
   NEXTAUTH_URL=https://admin.bazaar.it
   NEXT_PUBLIC_MAIN_APP_URL=https://bazaar.it
   ```
2. Deploy to admin.bazaar.it subdomain
3. Ensure SSL certificates cover both domains

## Testing Checklist

### Development Testing
- [ ] Remove duplicate NEXTAUTH_URL from admin .env.local
- [ ] Start both apps (`npm run dev`)
- [ ] Login on main app (port 3000)
- [ ] Access admin app (port 3001)
- [ ] Verify admin dashboard loads with data
- [ ] Check browser console for errors

### Production Testing
- [ ] Update auth config with cookie domain
- [ ] Deploy both apps
- [ ] Test login on bazaar.it
- [ ] Access admin.bazaar.it
- [ ] Verify cookie is shared (check DevTools > Application > Cookies)
- [ ] Test admin functionality

## Known Limitations

### Development
- Must run both apps simultaneously
- Cookies don't share between ports (expected behavior)
- Initial load might be slow while apps start

### Production
- First deploy needs cookie configuration
- Both domains need SSL certificates
- DNS must be configured for admin subdomain

## Alternative Solutions (Future)

### Option 1: OAuth Flow
Instead of cookie sharing, implement OAuth:
1. Admin app redirects to main app for login
2. Main app authenticates and redirects back with token
3. More complex but more flexible

### Option 2: Shared Auth Service
1. Create auth.bazaar.it service
2. Both apps use this for authentication
3. Best for scaling to more apps

## Success Criteria
- ✅ Monorepo structure created
- ✅ Apps can run independently  
- ✅ CORS configured correctly
- ❌ Cookie sharing for production (needs config)
- ❌ Admin .env.local fixed (has duplicate)
- ✅ TypeScript types shared
- ✅ Database shared
- ✅ UI components shared

## Questions to Answer
1. Will admin users always login through main app first? (Current: Yes)
2. Should admin app have its own login page? (Current: No, redirects to main)
3. Do we need session synchronization? (Current: No, API validation is enough)