# 🚀 Production Launch Checklist - GitHub & Figma Integrations

## Overview
This document provides a comprehensive, measurable checklist for launching GitHub and Figma integrations in production. **DO NOT launch until ALL required items are checked off.**

---

## 📊 Launch Criteria
- **Minimum Success Rate**: 95% for all integration tests
- **Required Uptime**: 99.9% for OAuth services
- **Max Response Time**: 3 seconds for component discovery
- **Error Rate**: < 1% for API calls

---

## ✅ GITHUB INTEGRATION CHECKLIST

### 1. OAuth Configuration ⚠️ REQUIRED
- [ ] **Production OAuth App Created**
  - URL: https://github.com/settings/developers
  - App Name: `Bazaar Production` (not dev/test)
  - Homepage URL: `https://bazaar.it`
  - Callback URL: `https://bazaar.it/api/auth/callback/github`
  - Screenshot taken of settings: ___________

- [ ] **Environment Variables Set**
  ```bash
  # Production .env
  AUTH_GITHUB_ID=_________________ (different from dev)
  AUTH_GITHUB_SECRET=______________ (different from dev)
  NEXTAUTH_URL=https://bazaar.it
  ```
  - Verified in Vercel/hosting dashboard: [ ]
  - Values are NOT the same as development: [ ]

### 2. Database Verification ⚠️ REQUIRED
- [ ] **Tables Exist in Production**
  ```sql
  -- Run this query in production DB
  SELECT COUNT(*) FROM githubConnections;
  -- Expected: Query runs without error
  ```
  - Query executed successfully: [ ]
  - Table has correct schema: [ ]

- [ ] **Migration Backup Created**
  - Production DB backed up before migration: [ ]
  - Backup location: ___________
  - Restore tested: [ ]

### 3. Functional Tests ⚠️ REQUIRED

#### Test A: OAuth Flow
- [ ] **Test Account**: Create test GitHub account
  - Username: `bazaar-test-user`
  - Has at least 3 repositories with React components
  
- [ ] **OAuth Connection Test**
  1. Click "Connect GitHub" in production
  2. Redirects to GitHub OAuth page: [ ]
  3. Authorize app
  4. Redirects back to `https://bazaar.it/projects/*/generate`: [ ]
  5. Shows "Connected" status: [ ]
  6. Username displayed correctly: [ ]

#### Test B: Repository Selection
- [ ] **Repository Loading**
  1. After connection, repos load within 3 seconds: [ ]
  2. Shows correct count (matches GitHub): [ ]
  3. Search filters work: [ ]
  4. Can select multiple repos: [ ]
  5. "Enable Component Discovery" saves selection: [ ]

#### Test C: Component Discovery
- [ ] **Component Detection**
  1. Select repository with known components
  2. Components appear within 5 seconds: [ ]
  3. Can drag component to chat: [ ]
  4. Generates animation successfully: [ ]
  5. Error rate < 1% over 100 attempts: [ ]

### 4. Error Handling Tests ⚠️ REQUIRED
- [ ] **Network Failures**
  - Disconnect internet mid-flow: Shows error message [ ]
  - Reconnect: Recovers gracefully [ ]

- [ ] **Rate Limiting**
  - Make 100 rapid requests: [ ]
  - Rate limit message appears: [ ]
  - Waits and retries automatically: [ ]

- [ ] **Invalid Token**
  - Revoke GitHub token externally
  - System detects and prompts reconnection: [ ]

### 5. Performance Tests ⚠️ REQUIRED
- [ ] **Load Testing**
  ```bash
  # Run load test script
  npm run test:github-load
  ```
  - 100 concurrent users: Pass [ ]
  - Average response time < 3s: [ ]
  - No memory leaks after 1 hour: [ ]

### 6. Security Audit ⚠️ REQUIRED
- [ ] **Token Security**
  - Tokens encrypted in database: [ ]
  - No tokens in logs: [ ]
  - No tokens in error messages: [ ]
  - HTTPS only: [ ]

- [ ] **Scope Verification**
  - Only requested scopes: `read:user`, `repo`: [ ]
  - No write permissions: [ ]

---

## 🎨 FIGMA INTEGRATION CHECKLIST

### 1. OAuth Configuration ⚠️ REQUIRED
- [ ] **Figma App Created**
  - URL: https://www.figma.com/developers/apps
  - App Name: `Bazaar`
  - Website: `https://bazaar.it`
  - Callback URL: `https://bazaar.it/api/auth/figma/callback`
  - Screenshot taken: ___________

- [ ] **Environment Variables Set**
  ```bash
  # Production .env
  FIGMA_CLIENT_ID=_________________
  FIGMA_CLIENT_SECRET=______________
  FIGMA_OAUTH_CALLBACK_URL=https://bazaar.it/api/auth/figma/callback
  FIGMA_PAT=figd___________________ (backup)
  ```
  - Verified in production: [ ]

### 2. OAuth Implementation ⚠️ REQUIRED
- [ ] **Routes Created**
  - `/api/auth/figma/connect` exists: [ ]
  - `/api/auth/figma/callback` exists: [ ]
  - Routes tested locally: [ ]
  - Routes deployed to production: [ ]

### 3. Functional Tests ⚠️ REQUIRED

#### Test A: OAuth Flow
- [ ] **Test Account**: Create Figma test account
  - Has at least 1 design file
  - File has 5+ components
  
- [ ] **Connection Test**
  1. Click "Connect Figma" in production: [ ]
  2. Redirects to Figma OAuth: [ ]
  3. Authorize app: [ ]
  4. Redirects back successfully: [ ]
  5. Shows "Connected" status: [ ]

#### Test B: File Discovery
- [ ] **File Access**
  1. Enter Figma file URL/key: [ ]
  2. Components load within 5 seconds: [ ]
  3. Shows correct component count: [ ]
  4. Component previews visible: [ ]

#### Test C: Component Import
- [ ] **Import Flow**
  1. Select Figma component: [ ]
  2. Drag to chat: [ ]
  3. Generates Remotion code: [ ]
  4. Animation matches design: [ ]
  5. Success rate > 95%: [ ]

### 4. Error Handling ⚠️ REQUIRED
- [ ] **Invalid File Key**
  - Enter invalid key: Shows clear error [ ]
  - Suggests correct format: [ ]

- [ ] **Permission Denied**
  - Try private file without access: [ ]
  - Shows "No access" message: [ ]
  - Suggests solutions: [ ]

### 5. Performance Tests ⚠️ REQUIRED
- [ ] **Large Files**
  - Test with 100+ component file: [ ]
  - Still loads within 10 seconds: [ ]
  - UI remains responsive: [ ]

---

## 🔄 INTEGRATION TESTS

### Cross-Integration Tests ⚠️ REQUIRED
- [ ] **Both Services Connected**
  1. Connect both GitHub and Figma: [ ]
  2. Switch between tabs smoothly: [ ]
  3. No memory leaks: [ ]
  4. Both remain authenticated: [ ]

- [ ] **Mixed Usage**
  1. Drag GitHub component: Success [ ]
  2. Drag Figma component: Success [ ]
  3. Generate 10 scenes alternating: [ ]
  4. All successful: [ ]

---

## 📈 MONITORING SETUP

### Required Monitoring ⚠️ REQUIRED
- [ ] **Error Tracking**
  - Sentry/LogRocket configured: [ ]
  - Alerts set for > 1% error rate: [ ]
  - Dashboard created: [ ]

- [ ] **Analytics**
  - Track connection success rate: [ ]
  - Track component discovery rate: [ ]
  - Track generation success rate: [ ]
  - Weekly report automated: [ ]

- [ ] **Uptime Monitoring**
  - OAuth endpoints monitored: [ ]
  - Alert if down > 1 minute: [ ]
  - Status page updated: [ ]

---

## 🚦 GO/NO-GO DECISION

### Automatic NO-GO if:
- [ ] Any REQUIRED item unchecked
- [ ] Success rate < 95% on any test
- [ ] Response time > 3 seconds consistently
- [ ] Any security items unchecked
- [ ] No backup/rollback plan

### GO Criteria Met:
- [ ] All REQUIRED items checked
- [ ] All tests pass with > 95% success
- [ ] Performance within bounds
- [ ] Monitoring active
- [ ] Team sign-off obtained

---

## 👥 SIGN-OFF REQUIRED

Before launch, the following must sign off:

- [ ] **Engineering Lead**: _________________ Date: _______
  - All technical requirements met
  - Security audit passed
  - Performance acceptable

- [ ] **Product Owner**: _________________ Date: _______
  - User experience validated
  - Features work as specified
  - Error messages user-friendly

- [ ] **DevOps**: _________________ Date: _______
  - Monitoring in place
  - Backup plan ready
  - Rollback tested

---

## 🔙 ROLLBACK PLAN

If issues arise post-launch:

### Immediate Actions (< 5 minutes)
1. **Feature Flag Off**
   ```javascript
   // Set in environment
   ENABLE_GITHUB_INTEGRATION=false
   ENABLE_FIGMA_INTEGRATION=false
   ```

2. **Revert Deployment**
   ```bash
   # Vercel/Platform specific
   vercel rollback [deployment-id]
   ```

### Recovery Actions (< 30 minutes)
1. Identify root cause from monitoring
2. Fix issue in hotfix branch
3. Test fix in staging
4. Deploy fix
5. Re-enable feature flags

### Communication
- [ ] Status page updated within 5 minutes
- [ ] Users notified via in-app message
- [ ] Post-mortem scheduled within 24 hours

---

## 📋 LAUNCH DAY CHECKLIST

### Day of Launch
- [ ] All team members available
- [ ] Monitoring dashboards open
- [ ] Support team briefed
- [ ] Rollback plan printed/accessible
- [ ] Feature flags ready
- [ ] Communication templates ready

### Launch Sequence
1. [ ] Enable for internal team (1 hour test)
2. [ ] Enable for 10% of users (2 hour test)
3. [ ] Monitor metrics, check thresholds
4. [ ] Enable for 50% of users (4 hour test)
5. [ ] Monitor metrics, check thresholds
6. [ ] Enable for 100% of users
7. [ ] Monitor for 24 hours
8. [ ] Launch retrospective

---

## 📊 SUCCESS METRICS (First Week)

Track these KPIs post-launch:

- [ ] **Adoption Rate**: > 30% of users try integration
- [ ] **Success Rate**: > 95% successful connections
- [ ] **Component Discovery**: > 90% find components
- [ ] **Generation Success**: > 85% happy with output
- [ ] **Support Tickets**: < 5% of users need help
- [ ] **Performance**: All APIs < 3s response time

---

## 🎯 FINAL CHECKLIST

**DO NOT LAUNCH UNTIL ALL ITEMS BELOW ARE CHECKED:**

- [ ] All REQUIRED items completed
- [ ] All tests passed with > 95% success rate
- [ ] All sign-offs obtained
- [ ] Monitoring active and tested
- [ ] Rollback plan tested
- [ ] Team ready for launch
- [ ] Communication plan ready

**LAUNCH APPROVED**: [ ] Date: _________ By: _________

---

## 📝 Notes Section

Use this space for any additional notes, issues encountered, or decisions made during the launch preparation:

```
_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________
```

---

*Last Updated: [Date]*
*Next Review: [Date]*
*Document Owner: [Name]*