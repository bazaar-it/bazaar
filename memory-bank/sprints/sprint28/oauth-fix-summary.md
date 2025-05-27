# Google OAuth Fix Summary

## 🚨 **Root Cause of OAuthAccountNotLinked Error**

The error `https://bazaar.it/login?error=OAuthAccountNotLinked` is caused by:

1. **Empty Google Client Credentials**: The debug logs show `"client_id": ""` indicating `GOOGLE_CLIENT_ID` is not set
2. **Environment Variable Mismatch**: Code was looking for wrong variable names
3. **Account Linking Configuration**: Missing proper account linking setup

## ✅ **Fixes Applied**

### 1. **Environment Variable Names Fixed**
- ❌ **Before**: `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` 
- ✅ **After**: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### 2. **Account Linking Enabled**
- Added `allowDangerousEmailAccountLinking: true` to both Google and GitHub providers
- Added proper `signIn` callback to handle OAuth account linking
- Enabled debug mode for development

### 3. **Code Changes Made**
- `src/server/auth/config.ts`: Fixed environment variable names and added account linking

## 🔧 **Required Environment Variables**

You need to set these environment variables in your production environment:

```bash
# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id-from-console
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-console

# GitHub OAuth  
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://bazaar.it

# Database
DATABASE_URL=your-neon-database-url
```

## 🎯 **Google Cloud Console Configuration**

Based on your screenshots, the Google Cloud Console is configured correctly:

- ✅ **Client ID**: `1031779451616-57d2urghlapftvtpdb4qcq0dil3fl4gg.apps.googleusercontent.com`
- ✅ **Authorized JavaScript origins**: `https://bazaar.it`
- ✅ **Authorized redirect URIs**: `https://bazaar.it/api/auth/callback/google`

## 🔍 **How to Verify the Fix**

1. **Check Environment Variables**: Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in production
2. **Test OAuth Flow**: Try signing in with Google - should no longer show OAuthAccountNotLinked error
3. **Check Debug Logs**: In development, you should see the actual client_id in logs instead of empty string

## 🚀 **Next Steps**

1. **Set Environment Variables**: Add the correct Google OAuth credentials to your production environment
2. **Deploy Changes**: Deploy the updated auth configuration
3. **Test**: Try Google OAuth login with a non-test user

The main issue was that the environment variables weren't set correctly, causing NextAuth to try to authenticate with empty credentials, which Google rejects and causes the account linking error. 