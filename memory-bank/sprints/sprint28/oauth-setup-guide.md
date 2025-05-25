# OAuth Setup Guide - Production Deployment 🔐

## 🎯 **QUICK OAUTH EXPLANATION**

**OAuth = "Let users login with Google/GitHub instead of creating new passwords"**

### **Why This Matters for Production**
- ✅ **Users trust Google** more than unknown sites
- ✅ **No password management** - Google handles security
- ✅ **Professional appearance** - looks like a real app
- ✅ **Instant credibility** - users feel safe

### **The Flow**
```
User clicks "Login with Google" 
    ↓
Redirects to accounts.google.com
    ↓
User enters Google password (on Google's site, not yours)
    ↓
Google asks: "Allow Bazaar to access your profile?"
    ↓
User clicks "Allow"
    ↓
Google sends secure token to your app
    ↓
Your app creates user account with Google info
    ↓
User is logged in and ready to create videos!
```

## 🤖 **WHAT I CAN IMPLEMENT IN CODEBASE**

### **✅ Already Done**
- [x] NextAuth.js configuration
- [x] OAuth provider setup
- [x] Callback routes (`/api/auth/callback/google`, `/api/auth/callback/github`)
- [x] Session management
- [x] User creation flow
- [x] Environment variable structure

### **🔄 TODO - I Can Add These**
- [ ] **Google Analytics Integration**
  ```typescript
  // Track OAuth events
  gtag('event', 'login', {
    method: 'google'
  });
  ```

- [ ] **Error Tracking**
  ```typescript
  // Track OAuth failures
  Sentry.captureException(oauthError, {
    tags: { provider: 'google' }
  });
  ```

- [ ] **OAuth Health Checks**
  ```typescript
  // API endpoint to verify OAuth config
  GET /api/health/oauth
  ```

## 👤 **WHAT YOU MUST CONFIGURE MANUALLY**

### **🔴 CRITICAL: Google OAuth Console Setup**

**Step 1: Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "New Project"
3. Name it "Bazaar" or "Bazaar Video Generator"
4. Click "Create"

**Step 2: Enable APIs**
1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API" → Enable
3. Search for "Google Identity API" → Enable

**Step 3: Configure OAuth Consent Screen**
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (for public app)
3. Fill out required fields:
   - **App name**: Bazaar
   - **User support email**: your-email@bazaar.it
   - **App domain**: bazaar.it
   - **Authorized domains**: bazaar.it
   - **Developer contact**: your-email@bazaar.it

**Step 4: Create OAuth Credentials**
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Name it "Bazaar Production"
5. **Authorized JavaScript origins**: `https://bazaar.it`
6. **Authorized redirect URIs**: `https://bazaar.it/api/auth/callback/google`
7. Click "Create"
8. **SAVE THE CLIENT ID AND SECRET** - you'll need these!

### **🔴 CRITICAL: GitHub OAuth Setup** (Optional)

**Step 1: Create OAuth App**
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill out:
   - **Application name**: Bazaar
   - **Homepage URL**: `https://bazaar.it`
   - **Authorization callback URL**: `https://bazaar.it/api/auth/callback/github`
4. Click "Register application"
5. **SAVE THE CLIENT ID AND SECRET**

### **🔴 CRITICAL: Environment Variables**

**Add these to your production environment:**
```bash
# OAuth Configuration
NEXTAUTH_URL=https://bazaar.it
NEXTAUTH_SECRET=your-super-secret-key-generate-new-one
GOOGLE_CLIENT_ID=your-google-client-id-from-step-4
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-step-4

# Optional: GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### **🔴 CRITICAL: DNS Configuration**

**Point bazaar.it to your deployment:**
1. **If using Vercel:**
   - Add custom domain in Vercel dashboard
   - Update DNS A record to point to Vercel's IP
   - Vercel handles SSL automatically

2. **If using Railway:**
   - Add custom domain in Railway dashboard
   - Update DNS CNAME to point to Railway
   - Railway handles SSL automatically

## 🧪 **TESTING YOUR OAUTH SETUP**

### **🤖 Automated Tests I Can Create**
```bash
# Test OAuth callback endpoints
npm run test:oauth

# Test session management
npm run test:auth

# Test user creation flow
npm run test:user-flow
```

### **👤 Manual Tests You Must Do**

**Test on bazaar.it (not localhost!):**

1. **Google OAuth Test**
   - Go to `https://bazaar.it`
   - Click "Login with Google"
   - Should redirect to Google
   - Login with your Google account
   - Should redirect back to bazaar.it
   - Should be logged in with your Google profile

2. **Session Persistence Test**
   - After logging in, close browser
   - Reopen and go to bazaar.it
   - Should still be logged in

3. **Logout Test**
   - Click logout
   - Should be logged out
   - Try accessing protected pages
   - Should redirect to login

## 🚨 **COMMON OAUTH ISSUES & FIXES**

### **"redirect_uri_mismatch" Error**
**Problem**: OAuth redirect URL doesn't match what you configured
**Fix**: Make sure these match exactly:
- Google Console: `https://bazaar.it/api/auth/callback/google`
- Your code: Same URL (already configured)

### **"invalid_client" Error**
**Problem**: Wrong Client ID or Secret
**Fix**: Double-check environment variables match Google Console

### **"access_denied" Error**
**Problem**: User clicked "Cancel" or app not approved
**Fix**: Make sure OAuth consent screen is properly configured

### **CORS Errors**
**Problem**: Domain not authorized
**Fix**: Add bazaar.it to authorized domains in Google Console

## 📊 **OAUTH ANALYTICS I CAN ADD**

### **Track These Events:**
- `oauth_login_attempt` - User clicks login button
- `oauth_login_success` - User successfully logs in
- `oauth_login_failure` - OAuth fails
- `oauth_signup` - New user created via OAuth
- `oauth_session_expired` - Session expires

### **Monitor These Metrics:**
- OAuth success rate
- Time to complete OAuth flow
- Most popular OAuth provider
- OAuth error types and frequency

## ✅ **OAUTH PRODUCTION CHECKLIST**

**🤖 Codebase Ready:**
- [x] NextAuth.js configured
- [x] OAuth providers set up
- [x] Callback routes working
- [x] Session management implemented
- [ ] Analytics tracking added (I can do this)
- [ ] Error monitoring added (I can do this)

**👤 Manual Configuration:**
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] Google OAuth credentials created
- [ ] GitHub OAuth app created (optional)
- [ ] Environment variables set in production
- [ ] DNS pointing bazaar.it to deployment
- [ ] SSL certificate working
- [ ] OAuth flow tested on bazaar.it

**🧪 Testing Complete:**
- [ ] Google login works on bazaar.it
- [ ] GitHub login works (if enabled)
- [ ] Session persistence works
- [ ] Logout works
- [ ] Error handling works
- [ ] Analytics tracking works

## 🎯 **READY FOR LAUNCH!**

Once all checkboxes are ✅, your OAuth is production-ready for the Reddit beta launch! 🚀

---

**Need Help?**
- Google OAuth Issues: [Google Cloud Support](https://support.google.com/cloud)
- GitHub OAuth Issues: [GitHub Support](https://support.github.com)
- NextAuth.js Issues: [NextAuth.js Docs](https://next-auth.js.org) 