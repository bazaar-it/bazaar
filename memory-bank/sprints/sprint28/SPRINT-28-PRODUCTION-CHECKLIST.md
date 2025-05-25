# SPRINT 28: PRODUCTION DEPLOYMENT CHECKLIST 🚀

**Status**: GOING LIVE TONIGHT  
**Target**: Reddit Beta Users  
**Date**: May 25, 2025  
**Domain**: bazaar.it

## 🎯 MISSION CRITICAL - MUST COMPLETE BEFORE LIVE

### 🔐 **1. OAUTH & AUTHENTICATION**

#### **What is OAuth?**
OAuth (Open Authorization) is a secure authorization framework that allows users to log in using their existing accounts (Google, GitHub, etc.) without sharing passwords with your app. Here's how it works:

1. **User clicks "Login with Google"** → Redirects to Google's servers
2. **Google authenticates user** → User enters their Google credentials on Google's site (not yours)
3. **Google asks for permission** → "Allow Bazaar to access your basic profile?"
4. **User approves** → Google sends a secure token back to your app
5. **Your app uses token** → To get user info and create/login the user

**Why OAuth for production domain?**
- ✅ **Security**: Users never enter passwords on your site
- ✅ **Trust**: Users trust Google/GitHub more than unknown sites
- ✅ **Convenience**: No password reset flows, account management
- ✅ **Domain Validation**: OAuth providers verify your domain ownership

#### **OAuth Production Setup Checklist**

**🤖 CODEBASE (I CAN IMPLEMENT):**
- [x] NextAuth.js configuration in place
- [x] OAuth provider setup in code
- [x] Environment variable structure defined
- [x] Callback routes configured
- [x] Session management implemented
- [ ] **TODO**: Add Google Analytics tracking for auth events
- [ ] **TODO**: Add Vercel Analytics for user flow tracking
- [ ] **TODO**: Add error tracking for auth failures

**👤 MANUAL (YOU MUST CONFIGURE):**
- [ ] **Google OAuth Console Setup**
  - [ ] Create new project in [Google Cloud Console](https://console.cloud.google.com)
  - [ ] Enable Google+ API and Google Identity API
  - [ ] Configure OAuth consent screen with bazaar.it domain
  - [ ] Add authorized redirect URIs: `https://bazaar.it/api/auth/callback/google`
  - [ ] Get production Client ID and Client Secret
  - [ ] Test OAuth flow on staging environment first

- [ ] **GitHub OAuth Setup** (if using)
  - [ ] Create OAuth App in GitHub Settings → Developer settings
  - [ ] Set Homepage URL: `https://bazaar.it`
  - [ ] Set Authorization callback URL: `https://bazaar.it/api/auth/callback/github`
  - [ ] Get production Client ID and Client Secret

- [ ] **DNS & Domain Setup**
  - [ ] Point bazaar.it to Vercel/deployment platform
  - [ ] Configure SSL certificate (auto via Vercel)
  - [ ] Verify domain ownership with OAuth providers

### 🗄️ **2. DATABASE (NEON POSTGRES)**

**🤖 CODEBASE (I CAN IMPLEMENT):**
- [x] Database schema and migrations ready
- [x] Connection pooling configured
- [x] Drizzle ORM setup complete
- [ ] **TODO**: Add database health check endpoint
- [ ] **TODO**: Add connection monitoring
- [ ] **TODO**: Add query performance logging

**👤 MANUAL (YOU MUST CONFIGURE):**
- [ ] **Production Database Setup**
  - [ ] Create production Neon database (separate from dev)
  - [ ] Configure connection pooling for production load
  - [ ] Set up database backups (daily minimum)
  - [ ] Update `DATABASE_URL` environment variable
  - [ ] Run all migrations on production DB: `npm run db:migrate`
  - [ ] Verify all tables exist and have correct schema
  - [ ] Test database connection from production environment

- [ ] **Data Integrity Checks**
  - [ ] Run schema validation: `npm run db:validate`
  - [ ] Check all foreign key constraints
  - [ ] Verify indexes are created for performance
  - [ ] Test user creation, project creation, scene generation flows
  - [ ] Ensure no dev/test data in production DB

- [ ] **Performance & Monitoring**
  - [ ] Set up Neon monitoring dashboard
  - [ ] Configure connection limits
  - [ ] Set up slow query alerts
  - [ ] Test database under load (simulate 50+ concurrent users)

### ☁️ **3. R2 STORAGE (CLOUDFLARE)**

**🤖 CODEBASE (I CAN IMPLEMENT):**
- [x] R2 client configuration ready
- [x] Upload/download utilities implemented
- [x] CORS configuration in code
- [ ] **TODO**: Add file upload progress tracking
- [ ] **TODO**: Add storage usage monitoring
- [ ] **TODO**: Add automatic cleanup for old files

**👤 MANUAL (YOU MUST CONFIGURE):**
- [ ] **Production R2 Bucket Setup**
  - [ ] Create production R2 bucket (separate from dev)
  - [ ] Configure CORS for bazaar.it domain
  - [ ] Set up bucket policies for public read access
  - [ ] Update R2 credentials in environment variables
  - [ ] Test file upload/download from production

- [ ] **R2 Configuration Validation**
  - [ ] Verify `R2_ACCOUNT_ID` is correct
  - [ ] Verify `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`
  - [ ] Test scene publishing pipeline end-to-end
  - [ ] Verify published scenes are accessible via public URLs
  - [ ] Test CDN performance and caching

### 🌍 **4. ENVIRONMENT VARIABLES & SECRETS**

**🤖 CODEBASE (I CAN IMPLEMENT):**
- [x] Environment variable validation
- [x] Type-safe env config
- [ ] **TODO**: Add environment health check
- [ ] **TODO**: Add startup validation for all required vars

**👤 MANUAL (YOU MUST CONFIGURE):**
- [ ] **Production Environment Setup**
  - [ ] Create production environment in Vercel/Railway
  - [ ] Generate new secrets for production (don't reuse dev secrets)
  - [ ] Update deployment platform with production env vars
  - [ ] Verify no dev/staging URLs or credentials in production config

- [ ] **Required Environment Variables Checklist**
  ```bash
  # Database
  DATABASE_URL=postgresql://...
  
  # Auth
  NEXTAUTH_URL=https://bazaar.it
  NEXTAUTH_SECRET=your-production-secret
  GOOGLE_CLIENT_ID=your-production-google-id
  GOOGLE_CLIENT_SECRET=your-production-google-secret
  
  # R2 Storage
  R2_ACCOUNT_ID=your-r2-account
  R2_ACCESS_KEY_ID=your-r2-key
  R2_SECRET_ACCESS_KEY=your-r2-secret
  R2_BUCKET_NAME=your-production-bucket
  
  # OpenAI
  OPENAI_API_KEY=your-openai-key
  
  # Analytics (I can add these)
  NEXT_PUBLIC_GA_ID=your-google-analytics-id
  VERCEL_ANALYTICS_ID=your-vercel-analytics-id
  
  # Monitoring
  SENTRY_DSN=your-sentry-dsn (optional)
  ```

### 🔍 **5. MONITORING & ANALYTICS**

**🤖 CODEBASE (I CAN IMPLEMENT):**
- [ ] **Google Analytics Integration**
  - [ ] Add GA4 tracking script
  - [ ] Track key user events (signup, scene generation, sharing)
  - [ ] Set up conversion funnels
  - [ ] Add page view tracking
  - [ ] Add custom events for video generation flow

- [ ] **Vercel Analytics Integration**
  - [ ] Add Vercel Analytics package
  - [ ] Track performance metrics
  - [ ] Monitor Core Web Vitals
  - [ ] Track user engagement metrics

- [ ] **Error Tracking (Sentry)**
  - [ ] Add Sentry configuration
  - [ ] Track JavaScript errors
  - [ ] Track API errors
  - [ ] Set up performance monitoring
  - [ ] Add user context to errors

- [ ] **Custom Monitoring**
  - [ ] Add health check endpoints
  - [ ] Track scene generation success rates
  - [ ] Monitor API response times
  - [ ] Track user retention metrics

**👤 MANUAL (YOU MUST CONFIGURE):**
- [ ] **Analytics Setup**
  - [ ] Create Google Analytics 4 property for bazaar.it
  - [ ] Get GA tracking ID
  - [ ] Set up Vercel Analytics (if using Vercel)
  - [ ] Configure privacy-compliant tracking

- [ ] **Monitoring Setup**
  - [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
  - [ ] Configure alert thresholds
  - [ ] Set up notification channels (email, Slack)

### 🚀 **6. DEPLOYMENT & INFRASTRUCTURE**

**🤖 CODEBASE (I CAN IMPLEMENT):**
- [x] Production build configuration
- [x] Performance optimizations
- [ ] **TODO**: Add build-time health checks
- [ ] **TODO**: Add deployment validation tests
- [ ] **TODO**: Add performance monitoring

**👤 MANUAL (YOU MUST CONFIGURE):**
- [ ] **Domain & SSL**
  - [ ] Configure custom domain bazaar.it on deployment platform
  - [ ] Verify SSL certificate is valid and auto-renewing
  - [ ] Test HTTPS redirects work correctly
  - [ ] Update all OAuth redirect URIs to use bazaar.it

- [ ] **Performance Optimization**
  - [ ] Enable gzip compression (usually automatic)
  - [ ] Configure CDN for static assets
  - [ ] Test page load speeds (aim for <3s initial load)

### 🧪 **7. TESTING STRATEGY**

**🤖 AUTOMATED TESTS (I CAN CREATE & RUN):**
- [ ] **Unit Tests**
  - [ ] Authentication flow tests
  - [ ] Database operation tests
  - [ ] Scene generation tests
  - [ ] Component validation tests

- [ ] **Integration Tests**
  - [ ] API endpoint tests
  - [ ] Database migration tests
  - [ ] File upload/download tests
  - [ ] OAuth callback tests

- [ ] **End-to-End Tests**
  - [ ] User signup flow
  - [ ] Scene generation workflow
  - [ ] Project creation and management
  - [ ] Video preview functionality

- [ ] **Performance Tests**
  - [ ] Load testing for concurrent users
  - [ ] Database query performance
  - [ ] File upload performance
  - [ ] Scene generation speed

**👤 MANUAL TESTING (YOU MUST DO):**
- [ ] **Critical User Flow Testing**
  - [ ] Test Google OAuth login/signup on bazaar.it
  - [ ] Test GitHub OAuth login/signup (if enabled)
  - [ ] Verify user profile creation
  - [ ] Test logout and re-login
  - [ ] Test session persistence across browser restarts

- [ ] **Core Video Generation**
  - [ ] Test scene generation from chat
  - [ ] Test scene editing with @scene(id) syntax
  - [ ] Test preview panel updates
  - [ ] Test code panel editing and compilation
  - [ ] Test storyboard panel scene management

- [ ] **Project Management**
  - [ ] Test project creation
  - [ ] Test project renaming
  - [ ] Test project persistence across sessions
  - [ ] Test multiple projects per user

- [ ] **Cross-Browser Testing**
  - [ ] Test on Chrome (latest)
  - [ ] Test on Firefox (latest)
  - [ ] Test on Safari (latest)
  - [ ] Test on Edge (latest)

- [ ] **Mobile Responsiveness**
  - [ ] Test on iOS Safari
  - [ ] Test on Android Chrome
  - [ ] Verify workspace panels work on mobile
  - [ ] Test touch interactions

### 🛡️ **8. SECURITY CHECKLIST**

**🤖 CODEBASE (I CAN IMPLEMENT):**
- [x] API authentication middleware
- [x] Input validation with Zod schemas
- [x] SQL injection protection via Drizzle ORM
- [ ] **TODO**: Add rate limiting middleware
- [ ] **TODO**: Add CSRF protection
- [ ] **TODO**: Add security headers

**👤 MANUAL (YOU MUST VERIFY):**
- [ ] **API Security**
  - [ ] Verify all tRPC procedures have proper authentication
  - [ ] Test unauthorized access attempts return 401/403
  - [ ] Verify user can only access their own projects
  - [ ] Test malicious input handling

- [ ] **Content Security**
  - [ ] Verify generated scene code is sandboxed
  - [ ] Test malicious code injection attempts
  - [ ] Verify file upload restrictions (if any)
  - [ ] Test XSS protection

### 📱 **9. REDDIT BETA LAUNCH PREP**

**🤖 CODEBASE (I CAN IMPLEMENT):**
- [ ] **Analytics for Launch**
  - [ ] Track Reddit referral traffic
  - [ ] Monitor signup conversion from Reddit
  - [ ] Track user engagement metrics
  - [ ] Add launch day dashboard

**👤 MANUAL (YOU MUST DO):**
- [ ] **Content Preparation**
  - [ ] Prepare demo video showing key features
  - [ ] Write compelling beta announcement post
  - [ ] Prepare FAQ for common questions
  - [ ] Create simple onboarding guide

- [ ] **Community Management**
  - [ ] Set up monitoring for Reddit mentions
  - [ ] Prepare responses for common issues
  - [ ] Have team ready for real-time support
  - [ ] Set up feedback collection system

- [ ] **Launch Day Monitoring**
  - [ ] Monitor server performance during traffic spike
  - [ ] Watch error rates and response times
  - [ ] Monitor database connections and R2 usage
  - [ ] Be ready to scale resources if needed

## 🧪 **AUTOMATED TESTING IMPLEMENTATION**

**I can create and run these tests:**

### **Unit Tests**
```bash
npm run test:unit
```
- Authentication utilities
- Database queries
- Scene validation
- Component compilation

### **Integration Tests**
```bash
npm run test:integration
```
- API endpoints
- Database operations
- File operations
- OAuth flows

### **E2E Tests**
```bash
npm run test:e2e
```
- User workflows
- Scene generation
- Project management

### **Performance Tests**
```bash
npm run test:performance
```
- Load testing
- Database performance
- Scene generation speed

## 🚨 **CRITICAL FAILURE SCENARIOS & ROLLBACK PLAN**

### **If OAuth Fails**
- [ ] Have backup email/password auth ready
- [ ] Document OAuth troubleshooting steps
- [ ] Have Google/GitHub support contacts ready

### **If Database Fails**
- [ ] Have database backup ready to restore
- [ ] Document connection string rollback
- [ ] Have Neon support contact ready

### **If R2 Storage Fails**
- [ ] Have fallback to local storage temporarily
- [ ] Document R2 troubleshooting steps
- [ ] Have Cloudflare support contact ready

### **If Traffic Overwhelms System**
- [ ] Have scaling plan ready (upgrade Vercel/Railway plan)
- [ ] Have database connection pool scaling ready
- [ ] Have CDN caching configured

## ✅ **FINAL GO/NO-GO CHECKLIST**

**Before announcing to Reddit:**

**🤖 AUTOMATED CHECKS (I CAN RUN):**
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Performance tests within acceptable limits
- [ ] Build deploys successfully
- [ ] Health checks all green

**👤 MANUAL VERIFICATION (YOU MUST DO):**
- [ ] OAuth login works on bazaar.it
- [ ] All core features tested and working
- [ ] Database is stable and backed up
- [ ] R2 storage is working and accessible
- [ ] Monitoring is set up and alerting
- [ ] Team is ready for support
- [ ] Rollback plan is documented and tested

**🎯 READY TO LAUNCH!** 🚀

---

## 📞 **EMERGENCY CONTACTS**

- **Neon Database**: [Support Portal](https://neon.tech/support)
- **Cloudflare R2**: [Support Portal](https://support.cloudflare.com)
- **Vercel**: [Support Portal](https://vercel.com/support)
- **Google OAuth**: [Support Portal](https://support.google.com/cloud)

---

**Remember**: Better to delay launch by a few hours to fix critical issues than to launch broken and lose user trust! 🛡️ 