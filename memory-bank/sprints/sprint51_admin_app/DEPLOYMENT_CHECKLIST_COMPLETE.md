# Admin App Deployment Checklist - Complete Guide

## Pre-Deployment Preparation

### 1. Environment Variables Setup
- [ ] **Main App** (bazaar.it) - Ensure all existing variables are configured in Vercel
  - `DATABASE_URL`
  - `AUTH_SECRET` 
  - `NEXTAUTH_URL=https://bazaar.it`
  - `OPENAI_API_KEY`
  - `CLOUDFLARE_R2_*` (all R2 variables)

- [ ] **Admin App** (admin.bazaar.it) - Configure new variables in Vercel
  - `DATABASE_URL` (same as main app)
  - `AUTH_SECRET` (same as main app - CRITICAL!)
  - `NEXTAUTH_URL=https://admin.bazaar.it`
  - `NEXTAUTH_COOKIE_DOMAIN=.bazaar.it` (for production cookie sharing)
  - `NEXT_PUBLIC_APP_URL=https://admin.bazaar.it`
  - `NEXT_PUBLIC_MAIN_APP_URL=https://bazaar.it`
  - `OPENAI_API_KEY` (if admin needs AI features)
  - `CLOUDFLARE_R2_*` (if admin needs file access)

### 2. DNS Configuration
- [ ] Create subdomain `admin.bazaar.it` pointing to Vercel
- [ ] Ensure SSL certificates cover both domains
- [ ] Verify DNS propagation before deployment

### 3. Database Preparation
- [ ] Verify admin users have `isAdmin: true` flag in database
  ```sql
  -- Check admin users
  SELECT id, email, "isAdmin" FROM users WHERE "isAdmin" = true;
  
  -- Grant admin access if needed
  UPDATE users SET "isAdmin" = true WHERE email = 'ceo@company.com';
  ```

### 4. Code Updates Required

#### Update Auth Configuration (`/packages/auth/config.ts`)
- [ ] Add cookie configuration for production subdomain sharing:
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
    }
  }
}
```

#### Fix Admin App Authentication Hook
- [ ] Ensure `useAdminAuth.ts` uses the correct method based on environment
- [ ] Remove any duplicate NEXTAUTH_URL entries from local .env files

## Vercel Deployment Configuration

### Main App (bazaar.it)
- [ ] **No changes needed** - Existing deployment continues as-is
- [ ] Verify CORS headers are configured (already in next.config.js)
- [ ] Ensure it's running the latest code from `monorepo-migration` branch

### Admin App (admin.bazaar.it) - New Deployment
- [ ] **Create new Vercel project** for admin app
- [ ] **Configure Build Settings**:
  - Root Directory: `apps/admin`
  - Build Command: `cd ../.. && npm run build --filter=admin`
  - Output Directory: `.next`
  - Install Command: `cd ../.. && npm install`
  - Framework Preset: Next.js
  - Node Version: 18.x or higher

- [ ] **Configure Environment Variables** (see section 1 above)

- [ ] **Configure Domain**:
  - Add custom domain: `admin.bazaar.it`
  - Enable HTTPS (automatic with Vercel)

## Deployment Steps

### Phase 1: Main App Update
1. [ ] Merge `monorepo-migration` branch to main
2. [ ] Deploy main app with updated monorepo structure
3. [ ] Verify main app still works at bazaar.it
4. [ ] Check API endpoints are accessible

### Phase 2: Admin App Deployment
1. [ ] Create new Vercel project for admin app
2. [ ] Configure all build settings (see above)
3. [ ] Add all environment variables
4. [ ] Deploy admin app
5. [ ] Configure custom domain (admin.bazaar.it)

## Post-Deployment Testing

### Functionality Tests
- [ ] **Main App** (bazaar.it)
  - [ ] User can login
  - [ ] Projects load correctly
  - [ ] Video generation works
  - [ ] No regression in features

- [ ] **Admin App** (admin.bazaar.it)
  - [ ] Admin login redirects to main app
  - [ ] After login, admin dashboard loads
  - [ ] Dashboard metrics display (non-zero if data exists)
  - [ ] User management works
  - [ ] Analytics page loads
  - [ ] Testing tools function

### Technical Verification
- [ ] Check browser DevTools:
  - [ ] Cookies are set with domain `.bazaar.it`
  - [ ] No CORS errors in console
  - [ ] API calls to main app succeed (200 status)
  - [ ] Authentication tokens are valid

- [ ] Verify cross-domain functionality:
  - [ ] Login on bazaar.it
  - [ ] Navigate to admin.bazaar.it
  - [ ] Should be authenticated without re-login
  - [ ] API calls from admin → main work

### Security Checks
- [ ] HTTPS enforced on both domains
- [ ] Secure headers present (X-Frame-Options, etc.)
- [ ] Admin pages return 403 for non-admin users
- [ ] No sensitive data in client-side code

## Rollback Plan

### If Issues Occur:
1. [ ] **Admin App Issues**: Simply disable/remove admin.bazaar.it
   - Main app unaffected
   - No user impact

2. [ ] **Main App Issues**: 
   - Revert to previous deployment in Vercel
   - Monorepo structure is backward compatible

## Monitoring & Maintenance

### Setup Monitoring
- [ ] Configure Vercel Analytics for both apps
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor API response times
- [ ] Track authentication success rates

### Regular Checks
- [ ] Weekly: Review admin usage metrics
- [ ] Monthly: Check for unused dependencies
- [ ] Quarterly: Security audit of admin access

## Known Limitations & Future Work

### Current Limitations:
1. Admin must login through main app first (no direct admin login)
2. Session expires independently on each subdomain
3. File uploads in admin use main app's R2 bucket

### Future Enhancements:
1. Implement OAuth flow for smoother auth
2. Add admin-specific API endpoints
3. Create dedicated admin R2 bucket
4. Add role-based permissions beyond isAdmin flag

## Quick Reference Commands

```bash
# Local Development
npm run dev              # Run both apps
npm run dev:main        # Main app only (port 3000)
npm run dev:admin       # Admin app only (port 3001)

# Building
npm run build           # Build all apps
npm run build:main      # Build main app only
npm run build:admin     # Build admin app only

# Database
npm run db:generate     # Generate migrations
npm run db:migrate      # Apply migrations
npm run db:studio       # Database UI
```

## Success Criteria

### Deployment is successful when:
- ✅ Both apps deployed and accessible
- ✅ Admin can login and access dashboard
- ✅ No errors in production logs
- ✅ Main app functionality unchanged
- ✅ API calls between apps work
- ✅ Cookies shared across subdomains
- ✅ Security headers in place
- ✅ HTTPS enforced

## Contact & Support

### If deployment issues arise:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test DNS resolution
4. Review this checklist

### Common Issues:
- **"Not authenticated"**: Check AUTH_SECRET matches
- **CORS errors**: Verify allowed origins in main app
- **Empty dashboard**: Check if user has isAdmin flag
- **Build failures**: Ensure monorepo dependencies installed

---

**Last Updated**: Sprint 51
**Status**: Ready for deployment
**Risk Level**: Low (admin app is isolated from main app)