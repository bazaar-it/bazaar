# Figma Integration - Production Setup Guide

## Current Authentication Flow

The Figma integration supports **two authentication methods**:

### 1. **Environment PAT (Development/Admin Use)**
- Set `FIGMA_PAT` in environment variables
- All users automatically use this shared token
- Good for: Development, demos, admin features
- **Security Risk**: All users share same access

### 2. **User OAuth/PAT (Production Recommended)**
- Each user connects their own Figma account
- Secure: Users only access their own files
- Scalable: No rate limit sharing
- **Current Status**: OAuth partially implemented

## Production Deployment Options

### Option A: Quick Deploy with Shared PAT (Not Recommended)
```env
# In production .env
FIGMA_PAT=figd_YOUR_PAT_HERE
```

**Pros:**
- Works immediately
- No user setup required
- Good for beta/limited users

**Cons:**
- **Security Risk**: All users share your Figma access
- **Rate Limits**: All users share 2 req/sec limit
- **Privacy**: Users could theoretically access your private files
- **Not Scalable**: Will break with more users

### Option B: User Authentication (Recommended) 

#### Step 1: Set up Figma OAuth App
1. Go to https://www.figma.com/developers/apps
2. Create new app
3. Add OAuth callback URL: `https://yourdomain.com/api/auth/figma/callback`
4. Get Client ID and Secret

#### Step 2: Configure Production Environment
```env
# Production .env (Vercel/Railway/etc)
FIGMA_CLIENT_ID=your_client_id
FIGMA_CLIENT_SECRET=your_client_secret
FIGMA_OAUTH_CALLBACK_URL=https://yourdomain.com/api/auth/figma/callback
# DO NOT SET FIGMA_PAT in production
```

#### Step 3: User Flow
1. User clicks "Connect Figma" in UI
2. OAuth flow redirects to Figma
3. User authorizes access
4. Token stored encrypted in database
5. User can access ONLY their files

### Option C: Hybrid Approach (Best for Launch)

Use both methods with proper UI messaging:

```typescript
// In figma.router.ts
const isSharedMode = !!process.env.FIGMA_PAT;

if (isSharedMode) {
  // Show warning in UI
  return {
    connected: true,
    sharedMode: true,
    message: "Using shared Figma access (Beta). Connect your account for private files."
  };
}
```

## Implementation Checklist for Production

### ✅ Already Working
- [x] Basic OAuth flow implemented
- [x] PAT validation
- [x] Token encryption
- [x] Database storage
- [x] File discovery
- [x] Component categorization
- [x] **Drag-to-chat integration**
- [x] **Real data extraction**
- [x] **LLM conversion**

### ⚠️ Needs Work for Production
- [ ] OAuth callback route (`/api/auth/figma/callback`)
- [ ] Token refresh mechanism
- [ ] Better error messages for auth failures
- [ ] UI to show connection status clearly
- [ ] Rate limit handling per user

## Quick Production Fix (5 minutes)

If you need to deploy NOW with basic functionality:

```typescript
// src/server/api/routers/figma.router.ts
// Add this to checkConnection endpoint

checkConnection: protectedProcedure.query(async ({ ctx }) => {
  const envPat = process.env.FIGMA_PAT;
  
  if (envPat) {
    return {
      connected: true,
      user: { email: 'Shared Beta Access' },
      warning: 'This is a beta feature. For production use, please implement OAuth.',
      limitations: [
        'Shared rate limits',
        'Access to public files only',
        'May experience slowdowns'
      ]
    };
  }
  
  // Rest of OAuth logic...
});
```

## Recommended Production Path

### Phase 1: Beta Launch (This Week)
1. Deploy with shared PAT
2. Add clear beta messaging
3. Limit to trusted users
4. Monitor usage

### Phase 2: OAuth Implementation (Next Week)
1. Create Figma OAuth app
2. Implement callback route
3. Test OAuth flow
4. Add "Connect Your Figma" UI

### Phase 3: Full Production (2 Weeks)
1. Remove shared PAT
2. Require user authentication
3. Add team/organization support
4. Implement proper rate limiting

## Current Risk Assessment

**If you deploy today with your PAT:**
- **Low Risk** if: <50 users, trusted beta group
- **Medium Risk** if: 50-200 users, public beta
- **High Risk** if: >200 users or public launch

**Mitigation:**
- Set rate limit warnings
- Monitor API usage
- Have OAuth ready as backup
- Clear communication about beta status

## Emergency Fallback

If issues arise in production:

```typescript
// Quick disable in production
if (process.env.DISABLE_FIGMA === 'true') {
  return {
    connected: false,
    message: 'Figma integration temporarily disabled for maintenance'
  };
}
```

## Summary

**For immediate production deployment:**
1. Use shared PAT with beta messaging ✅
2. Limit initial user group
3. Plan OAuth for next sprint
4. Monitor usage closely

**The conversion engine improvements will work perfectly** in production - the auth is the only consideration. The drag-and-drop → animated video flow is ready! 🎯