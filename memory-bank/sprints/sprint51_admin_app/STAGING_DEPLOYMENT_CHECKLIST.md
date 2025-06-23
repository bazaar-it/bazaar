# Staging Deployment Checklist - Dev Branch Preview

## Overview
Before deploying to production, we'll test the monorepo migration and admin app separation on a staging/preview environment using Vercel's branch deployments.

## Pre-Staging Setup

### 1. Branch Strategy
- [ ] Current branch: `monorepo-migration` 
- [ ] Create feature branch: `staging-admin-deployment` (or use existing)
- [ ] Ensure all current changes are committed

### 2. Vercel Preview Deployments

#### Main App Preview
- [ ] Vercel should automatically create preview deployment for branch
- [ ] Preview URL format: `bazaar-vid-git-[branch-name]-[team].vercel.app`
- [ ] No additional configuration needed (uses existing project)

#### Admin App Preview - NEW
- [ ] Create new Vercel project: `bazaar-vid-admin`
- [ ] Connect to same GitHub repo
- [ ] Configure to deploy from `monorepo-migration` branch
- [ ] Set root directory: `apps/admin`

## Staging Environment Variables

### Main App Staging (.env or Vercel Dashboard)
```env
# Keep existing production variables
DATABASE_URL=postgresql://... (same production DB is fine for staging)
AUTH_SECRET=... (must match admin app)
NEXTAUTH_URL=https://[main-preview-url].vercel.app
OPENAI_API_KEY=...
CLOUDFLARE_R2_* (all R2 variables)
```

### Admin App Staging - NEW
```env
DATABASE_URL=... (same as main app)
AUTH_SECRET=... (same as main app - CRITICAL!)
NEXTAUTH_URL=https://[admin-preview-url].vercel.app
NEXT_PUBLIC_APP_URL=https://[admin-preview-url].vercel.app
NEXT_PUBLIC_MAIN_APP_URL=https://[main-preview-url].vercel.app

# For staging, we'll use separate cookie domains
NEXTAUTH_COOKIE_DOMAIN=.vercel.app  # This allows cookie sharing on Vercel previews
```

## Vercel Configuration for Admin App

### Build & Development Settings
- [ ] **Framework Preset**: Next.js
- [ ] **Root Directory**: `apps/admin`
- [ ] **Build Command**: `cd ../.. && npm run build --filter=admin`
- [ ] **Output Directory**: `.next`
- [ ] **Install Command**: `cd ../.. && npm install`
- [ ] **Development Command**: `cd ../.. && npm run dev:admin`

### Environment Variables (Vercel Dashboard)
- [ ] Add all variables from "Admin App Staging" section above
- [ ] Set for "Preview" environment only (not Production yet)

## Deployment Steps

### 1. Push to Staging Branch
```bash
# Ensure you're on the right branch
git checkout monorepo-migration  # or your feature branch

# Push latest changes
git add .
git commit -m "chore: prepare for staging deployment"
git push origin monorepo-migration
```

### 2. Vercel Deployments
- [ ] **Main App**: Automatic preview deployment should trigger
- [ ] **Admin App**: 
  - [ ] Go to new Vercel project
  - [ ] Trigger manual deployment if needed
  - [ ] Select branch: `monorepo-migration`

### 3. Get Preview URLs
- [ ] Main app preview URL: `___________________.vercel.app`
- [ ] Admin app preview URL: `___________________.vercel.app`

## Staging Testing Checklist

### Basic Functionality
- [ ] **Main App** ([main-preview-url].vercel.app)
  - [ ] Homepage loads without errors
  - [ ] User can register/login
  - [ ] Projects page accessible
  - [ ] Video generation works
  - [ ] Chat functionality operational

- [ ] **Admin App** ([admin-preview-url].vercel.app)
  - [ ] Redirects to main app for login
  - [ ] After login on main, can access admin dashboard
  - [ ] Dashboard shows metrics (may be zeros)
  - [ ] User management page loads
  - [ ] Analytics page accessible

### Cross-Domain Authentication (Staging Limitations)
**Note**: Full cookie sharing may not work perfectly on Vercel preview URLs due to domain restrictions. Test what's possible:

- [ ] Login on main preview app
- [ ] Navigate to admin preview app
- [ ] May need to login again (this is OK for staging)
- [ ] Verify API calls from admin → main work with auth

### API Integration Tests
- [ ] From admin app, check Network tab:
  - [ ] tRPC calls to main app succeed
  - [ ] No CORS errors (check console)
  - [ ] Auth headers properly sent

### Mobile Responsiveness
- [ ] Test admin dashboard on mobile viewport
- [ ] Verify sidebar collapse works
- [ ] Check table responsiveness

## Troubleshooting Staging Issues

### Common Staging Problems

1. **"Not authenticated" in admin app**
   - Check AUTH_SECRET matches exactly
   - Verify NEXTAUTH_URL is set correctly for each app
   - May need to clear cookies and re-login

2. **CORS errors**
   - Ensure main app allows admin preview URL in CORS config
   - Update `apps/main/next.config.js` temporarily:
   ```javascript
   const allowedOrigins = [
     'http://localhost:3001',
     'https://admin.bazaar.it',
     process.env.ADMIN_PREVIEW_URL // Add this
   ]
   ```

3. **Build failures**
   - Check Vercel build logs
   - Ensure monorepo dependencies are resolved
   - Verify turbo.json configuration

4. **Empty dashboard data**
   - Normal if using test database
   - Verify database connection
   - Check if test user has isAdmin flag

## Staging Sign-off Criteria

Before proceeding to production:

- [ ] Both apps deploy successfully
- [ ] No TypeScript errors in build
- [ ] Basic user flows work (login, view projects)
- [ ] Admin can access dashboard (even if re-login needed)
- [ ] No console errors in browser
- [ ] API integration verified
- [ ] Build times acceptable (< 5 minutes)

## Notes for Production

Based on staging results, note any changes needed for production:

1. **Cookie Domain**: Will change from `.vercel.app` to `.bazaar.it`
2. **CORS Origins**: Update to final production URLs
3. **Environment Variables**: Switch to production values
4. **DNS**: Set up admin.bazaar.it subdomain

## Quick Commands

```bash
# Local testing before push
npm run build          # Build all apps
npm run dev           # Test both apps locally

# Check for issues
npm run typecheck     # TypeScript validation
npm run lint          # Linting

# Deploy specific app (if manual deploy needed)
vercel --prod=false   # Deploy preview from CLI
```

## Rollback Plan for Staging

If staging has critical issues:
1. Main app: Vercel will keep previous preview deployment
2. Admin app: Can disable/delete preview deployment
3. No impact on production environment

---

**Status**: Ready for staging deployment
**Risk**: Zero (preview environments only)
**Next Step**: After successful staging, use DEPLOYMENT_CHECKLIST_COMPLETE.md for production