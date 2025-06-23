# Monorepo Development Reality

## The Truth About Cross-Port Authentication

### What We Want (Production)
- User logs in at `bazaar.it`
- Cookie is set with `domain: .bazaar.it`
- User visits `admin.bazaar.it`
- Cookie is shared, user is authenticated
- ✅ Perfect single sign-on

### What We Have (Development)
- User logs in at `localhost:3000`
- Cookie is set for `localhost:3000` only
- User visits `localhost:3001`
- Cookie is NOT shared (browser security)
- ❌ No single sign-on in development

## This is Normal and Expected

**Every company with microservices faces this in development:**
- Netflix engineers don't have SSO between local services
- Uber developers log in separately to each local service
- This is a development environment limitation, not a bug

## Practical Solutions for Development

### Option 1: Accept the Reality (Recommended)
Just log in twice during development:
1. Log in at `localhost:3000` for main app work
2. Log in at `localhost:3001` for admin app work

But wait... the admin app doesn't have a login page because it expects SSO!

### Option 2: Temporary Dev Authentication
For the admin app in development only, add a bypass:

```typescript
// In admin app's middleware or auth check
if (process.env.NODE_ENV === 'development') {
  // In dev, check the main app's API directly
  // Or use a dev-only authentication method
}
```

### Option 3: Use Production-Like Setup Locally
Edit `/etc/hosts`:
```
127.0.0.1 local.bazaar.it
127.0.0.1 admin.local.bazaar.it
```

Then run apps on different ports but access via:
- `http://local.bazaar.it:3000`
- `http://admin.local.bazaar.it:3001`

Configure cookie domain to `.local.bazaar.it`

## The Real Issue

The admin app was designed assuming SSO would always work. In development, we need either:

1. **A development-only login mechanism** for the admin app
2. **A way to validate sessions** without cookies
3. **Accept that we need both apps in production** to test admin features

## Recommendation

**For MVP/Quick Development:**
Add a simple dev-only auth bypass to the admin app that:
1. Only works when `NODE_ENV=development`
2. Allows you to "login" with a hardcoded admin user
3. Is completely removed in production builds

**For Proper Development:**
Set up local subdomains (Option 3) to mimic production

**The Key Point:**
This is a normal development challenge. Don't break the monorepo architecture trying to "fix" it. The production setup will work perfectly.