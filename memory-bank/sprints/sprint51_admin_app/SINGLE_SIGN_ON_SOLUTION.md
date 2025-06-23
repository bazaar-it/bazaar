# Single Sign-On Solution for Monorepo

## The Goal
- Login once at bazaar.it (main app)
- Stay logged in at admin.bazaar.it (admin app)
- No separate login for admin

## The Problem in Development
- Browsers don't share cookies between `localhost:3000` and `localhost:3001`
- This is a security feature, not a bug
- In production with subdomains, this works fine with proper cookie configuration

## Solutions

### Solution 1: Development Proxy (Recommended)
Use a proxy to serve both apps under the same port with different paths:

#### Option A: Using Vite/Next.js Rewrites
Update `apps/main/next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/admin/:path*',
      destination: 'http://localhost:3001/:path*',
    },
  ];
}
```

Then access admin at: `http://localhost:3000/admin`

#### Option B: Using Caddy (Simple Proxy)
Create `Caddyfile`:
```
localhost:3000 {
  handle /admin/* {
    reverse_proxy localhost:3001
  }
  handle {
    reverse_proxy localhost:3000
  }
}
```

### Solution 2: Token-Based Auth (More Complex)
Instead of relying on cookies, use a token-based approach:
1. Main app generates a temporary token
2. Redirect to admin with token
3. Admin validates token and creates its own session

### Solution 3: Development-Only Direct Auth
For development only, modify the admin app to:
1. Check if user exists in database directly
2. Trust the authentication from the API call
3. Create a local session

## Recommended Approach

Since this is just a development issue, I recommend:

1. **For Now**: Accept that you need to be logged in on both ports during development
2. **For Production**: The cookie domain configuration will handle everything

The production configuration is already correct:
- CORS allows admin.bazaar.it
- Cookie domain can be set to `.bazaar.it`
- Single sign-on will work perfectly

## Production Cookie Config (Already Documented)
In `packages/auth/config.ts`, add:
```typescript
cookies: {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      domain: process.env.NODE_ENV === 'production' ? '.bazaar.it' : undefined,
      // ... other options
    }
  }
}
```

## Why Not Fix Development?
- The proxy solution adds complexity
- Development doesn't need to be perfect
- The production setup will work correctly
- Time is better spent on features than dev environment

## Testing Production Behavior Locally
If you really need to test the production SSO behavior locally:
1. Use a tool like `ngrok` to create subdomains
2. Or edit `/etc/hosts` to create local subdomains
3. Or use the proxy solution above

But honestly, for development, just accepting the limitation is the pragmatic choice.